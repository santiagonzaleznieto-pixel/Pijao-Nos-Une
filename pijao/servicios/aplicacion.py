"""Lógica de la app sin Kivy: sesión, perfil, visitas y sincronización. Se prueba sin pantalla."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from ..core import geo
from ..core import payload as pl
from ..core.catalogos import ESTADO_POR_RESULTADO
from ..core.curso import VERSION_ACUERDOS
from ..core.permisos import PERMISOS, PLANTILLAS, Perfil
from ..data.localdb import LocalDB
from ..data.remoto import ErrorRemoto, Remoto, SinConexion
from ..data.sync import SyncEngine

RESULTADOS = list(ESTADO_POR_RESULTADO)


class Aplicacion:
    def __init__(self, db: LocalDB, remoto: Remoto, on_evento=None):
        self.db, self.remoto = db, remoto
        self.sync = SyncEngine(db, remoto, on_evento)
        self.perfil: Perfil | None = None

    # ------------------------------------------------------------ sesión
    def iniciar_sesion(self, correo: str, contrasena: str) -> Perfil:
        if not correo or not contrasena:
            raise ValueError("Escribe tu correo y tu contraseña.")
        self.remoto.iniciar_sesion(correo.strip(), contrasena)
        self.perfil = Perfil.desde_rpc(self.remoto.rpc("rpc_mi_perfil"))
        anterior = self.db.get_meta("ultimo_usuario")
        if anterior and anterior != self.perfil.id:
            # Otra persona usó este teléfono: no debe ver la copia local de la anterior (y se descarga de nuevo lo suyo).
            self.db.borrar_datos_locales(conservar_cola=True)
        self.db.set_meta("ultimo_usuario", self.perfil.id)
        self.db.set_meta("perfil", self.perfil.a_dict())
        return self.perfil

    def perfil_guardado(self) -> Perfil | None:
        d = self.db.get_meta("perfil")
        self.perfil = Perfil.desde_rpc(d) if d else None
        return self.perfil

    def cerrar_sesion(self, borrar_datos: bool = False) -> None:
        """Cierra la sesión. Con `borrar_datos` (cierre pedido por la persona) también borra la copia local
        de viviendas, personas y borradores; la cola de envío se conserva para no perder visitas sin enviar."""
        try:
            self.remoto.cerrar_sesion()
        except (SinConexion, ErrorRemoto):
            pass
        self.perfil = None
        self.db.borrar_meta("perfil")
        self.db.borrar_meta("tokens")
        if borrar_datos:
            self.db.borrar_datos_locales(conservar_cola=True)

    # ------------------------------------------------------------ mapa y visitas
    def puntos_mapa(self) -> list[dict]:
        return self.db.todas_las_viviendas_idx()

    def cercanas(self, lat: float, lng: float, radio_m: float = 15.0) -> list[tuple[dict, float]]:
        """Viviendas ya registradas a menos de `radio_m` (R-09/6.2: duplicados a 15 m)."""
        return geo.cercanos(self.puntos_mapa(), lat, lng, radio_m)

    def nueva_visita(self, lat: float, lng: float, precision_m: float | None = None, vivienda: dict | None = None) -> dict:
        if not self.perfil or not self.perfil.activo:
            raise PermissionError("Tu cuenta aún no está activa.")
        return pl.borrador_vacio(self.perfil.id, vivienda, lat=lat, lng=lng, precision_m=precision_m)

    @staticmethod
    def errores_visita(draft: dict) -> list[str]:
        e = []
        v = draft.get("vivienda", {})
        if v.get("lat") is None or v.get("lng") is None:
            e.append("Falta la ubicación de la casa.")
        if draft.get("visita", {}).get("resultado") not in RESULTADOS:
            e.append("Elige el resultado de la visita.")
        return e

    def guardar_visita(self, draft: dict, dispositivo: dict | None = None) -> str:
        """Deja la visita en la cola de envío (funciona sin internet). Devuelve el id de la visita."""
        e = self.errores_visita(draft)
        if e:
            raise ValueError(" ".join(e))
        datos, _fotos = pl.construir_payload(draft, dispositivo)
        ident = self.db.encolar("registrar_visita", datos, id=draft["id"])
        self._vivienda_local(draft)
        return ident

    def _vivienda_local(self, draft: dict) -> None:
        """La casa aparece en el mapa (marcada «por enviar») aunque no haya internet, y cuenta para los duplicados."""
        viv = draft.get("vivienda") or {}
        if not viv.get("id") or viv.get("lat") is None or viv.get("lng") is None:
            return
        local = self.db.get("viviendas", viv["id"]) or {k: v for k, v in viv.items() if k != "solo_visita"}
        estado = ESTADO_POR_RESULTADO.get((draft.get("visita") or {}).get("resultado"))
        if estado:
            local["estado"] = estado
        self.db.upsert("viviendas", local, pendiente=True)

    # ------------------------------------------------------------ sincronización
    def sincronizar(self) -> dict:
        try:
            return {"ok": True, **(self.sync.sincronizar() or {})}
        except SinConexion:
            return {"ok": False, "sin_conexion": True}
        except ErrorRemoto as ex:
            return {"ok": False, "error": ex.mensaje}

    def estado_cola(self) -> dict:
        return self.db.outbox_conteo()

    # ------------------------------------------------------------ inicio: números
    def estadisticas_locales(self) -> dict:
        c = self.db.get_meta("estadisticas", {}) or {}
        pend = self.estado_cola()["por_enviar"]
        return {**c, "casas": c.get("casas", len(self.puntos_mapa())), "por_enviar": pend,
                "mis_visitas_hoy": c.get("mis_visitas_hoy", 0) + pend}

    def estadisticas(self) -> dict:
        """Números del Inicio desde el servidor; si no hay internet se muestran los últimos guardados."""
        en_linea, vencida = True, False
        try:
            panel = self.remoto.rpc("rpc_panel_campana") or {}
            hoy = datetime.now().astimezone().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            mias = self.remoto.seleccionar("visitas", {"select": "id", "usuario_id": f"eq.{self.perfil.id}", "fecha": f"gte.{hoy}",
                                                       "eliminado_en": "is.null"}) if self.perfil else []
            self.db.set_meta("estadisticas", {"casas": panel.get("viviendas_conocidas", 0), "visitadas": panel.get("viviendas_visitadas", 0),
                                              "hogares": panel.get("hogares", 0), "personas": panel.get("personas_autorizadas", 0),
                                              "mis_visitas_hoy": len(mias)})
        except SinConexion:
            en_linea = False
        except ErrorRemoto as e:
            en_linea, vencida = False, e.status in (400, 401, 403)
        return {**self.estadisticas_locales(), "en_linea": en_linea, "sesion_vencida": vencida}

    # ------------------------------------------------------------ equipo y cuentas
    @property
    def puede_gestionar_equipo(self) -> bool:
        return bool(self.perfil and self.perfil.activo and self.perfil.rol in ("admin", "director"))

    def invitar(self, nombre: str, celular: str, correo: str, rol: str) -> dict:
        return self.remoto.rpc("rpc_invitar", {"p_nombre": nombre.strip(), "p_celular": celular.strip() or None,
                                               "p_correo": correo.strip() or None, "p_rol": rol})

    def equipo(self) -> list[dict]:
        return self.remoto.seleccionar("perfiles", {"select": "id,nombre_completo,rol,estado", "order": "creado_en.desc"})

    def aprobar(self, ident: str):
        return self.remoto.rpc("rpc_aprobar_usuario", {"p_id": ident})

    def suspender(self, ident: str, motivo: str):
        return self.remoto.rpc("rpc_suspender_usuario", {"p_id": ident, "p_motivo": motivo})

    def reactivar(self, ident: str):
        return self.remoto.rpc("rpc_reactivar_usuario", {"p_id": ident})

    @staticmethod
    def errores_registro(d: dict) -> str:
        if not d.get("codigo", "").strip():
            return "Escribe el código de invitación."
        if not d.get("nombre", "").strip():
            return "Escribe tu nombre completo."
        if "@" not in d.get("correo", ""):
            return "Escribe un correo válido."
        if len(d.get("clave", "")) < 12:
            return "La contraseña debe tener al menos 12 caracteres."
        if not d.get("mayor"):
            return "Solo pueden registrarse personas mayores de 18 años."
        return ""

    def registrar_con_codigo(self, nombre, celular, correo, clave, codigo, mayor, servidor, tipo):
        e = self.errores_registro({"nombre": nombre, "correo": correo, "clave": clave, "codigo": codigo, "mayor": mayor})
        if e:
            raise ValueError(e)
        return self.remoto.registrar_con_codigo({
            "codigo": codigo.strip().upper(), "nombre": nombre.strip(), "correo": correo.strip(), "clave": clave, "celular": celular.strip(),
            "mayor_de_edad": True, "tipo_vinculacion": tipo, "es_servidor_publico": bool(servidor), "es_contratista_estado": bool(servidor)})

    # ------------------------------------------------------------ ingreso: acuerdos y curso (4.9 y 10.6)
    TEXTOS_ACUERDOS = {
        "acuerdo_confidencialidad": "Me comprometo a mantener en reserva toda la información de personas y hogares a la que acceda por la app, a no compartir capturas ni listas, "
                                    "a no usar los datos para fines propios y a reportar cualquier pérdida del teléfono.",
        "codigo_conducta": "Respeto a toda persona. Nada de compra de votos ni ofrecimiento de favores. No presionar ni amenazar. No desinformar ni atacar la vida privada. "
                           "Privacidad de los datos. No fotografiar menores. Identificarme siempre. Cumplir las normas electorales y denunciar irregularidades. "
                           "No portar armas ni consumir alcohol durante la jornada.",
        "politica_seguridad": "Mantendré el bloqueo de pantalla del teléfono, no prestaré mi cuenta, cerraré sesión si pierdo el teléfono y avisaré de inmediato al Director.",
        "tratamiento_datos": "Trataré los datos personales solo con autorización de su titular, para los fines de la campaña, y atenderé de inmediato cualquier solicitud de "
                             "consulta, corrección, supresión o revocatoria.",
    }

    def textos_acuerdos(self) -> dict:
        textos = dict(self.TEXTOS_ACUERDOS)
        try:
            for f in self.remoto.seleccionar("textos_legales", {"select": "tipo,contenido", "vigente": "eq.true"}):
                if f.get("tipo") in textos and f.get("contenido"):
                    textos[f["tipo"]] = f["contenido"]
        except (SinConexion, ErrorRemoto):
            pass
        return textos

    def refrescar_perfil(self) -> Perfil:
        self.perfil = Perfil.desde_rpc(self.remoto.rpc("rpc_mi_perfil"))
        self.db.set_meta("perfil", self.perfil.a_dict())
        return self.perfil

    def completar_ingreso(self, puntaje: int) -> Perfil:
        self.remoto.rpc("rpc_completar_ingreso", {"p_puntaje": int(puntaje), "p_acuerdos_version": VERSION_ACUERDOS})
        return self.refrescar_perfil()

    def intro_visible(self) -> bool:
        return int(self.db.get_meta("intro_visita", 0) or 0) < 3

    def marcar_intro(self) -> None:
        self.db.set_meta("intro_visita", int(self.db.get_meta("intro_visita", 0) or 0) + 1)

    # ------------------------------------------------------------ calidad de la visita (6.4)
    @staticmethod
    def calidad_estimada(draft: dict) -> tuple[str, list[str]]:
        motivos, rojo = [], False
        v, viv = draft.get("visita", {}), draft.get("vivienda", {})
        if not draft.get("vivienda_existente") and not v.get("no_autorizo_foto") and not draft.get("fotos"):
            rojo = True
            motivos.append("Falta la foto de fachada")
        if v.get("resultado") in ("conversacion_completa", "conversacion_breve", "pidio_volver") and not v.get("autorizacion_verbal"):
            rojo = True
            motivos.append("Falta la autorización verbal")
        if draft.get("personas") and not any(c.get("proposito") == "datos_personales" for c in draft.get("consentimientos", [])):
            rojo = True
            motivos.append("Falta la autorización de datos personales")
        if v.get("ubicacion_manual") and not draft.get("dispositivo"):
            rojo = True
            motivos.append("Ubicación manual sin ubicación del teléfono")
        if rojo:
            return "rojo", motivos
        h = draft.get("hogar")
        if h and not (h.get("sosten_relacion") or any(p.get("es_sosten") for p in draft.get("personas", []))):
            return "amarillo", ["Falta el principal sostén del hogar"]
        return "verde", []

    # ------------------------------------------------------------ tareas y anuncios (10.3 y 10.5)
    @property
    def puede_crear_tareas(self) -> bool:
        return bool(self.perfil and self.perfil.tiene("O-09"))

    @property
    def puede_publicar_anuncios(self) -> bool:
        return bool(self.perfil and self.perfil.tiene("O-11"))

    def tareas(self) -> list[dict]:
        yo = self.perfil.id if self.perfil else ""
        params = {"select": "id,titulo,descripcion,tipo,prioridad,estado,fecha_limite,asignado_a,creado_por", "order": "creado_en.desc", "limit": "60"}
        if not (self.perfil and self.perfil.es_staff):
            params["or"] = f"(asignado_a.eq.{yo},creado_por.eq.{yo})"
        return self.remoto.seleccionar("tareas", params)

    def crear_tarea(self, titulo: str, descripcion: str, tipo: str, prioridad: str, asignado_a: str | None, fecha_limite: str | None):
        if not titulo.strip():
            raise ValueError("Escribe el título de la tarea.")
        return self.remoto.rpc("rpc_crear_tarea", {"p": {"titulo": titulo.strip(), "descripcion": descripcion.strip() or None, "tipo": tipo or "otra",
                                                         "prioridad": prioridad or "normal", "asignado_a": asignado_a or None,
                                                         "fecha_limite": fecha_limite or None}})

    def actualizar_tarea(self, ident: str, estado: str, nota: str | None = None):
        return self.remoto.rpc("rpc_tarea_actualizar", {"p_id": ident, "p_estado": estado, "p_nota": nota})

    def anuncios(self) -> list[dict]:
        return self.remoto.seleccionar("anuncios", {"select": "id,titulo,texto,prioridad,fijado,creado_en", "order": "fijado.desc,creado_en.desc", "limit": "20"})

    def crear_anuncio(self, titulo: str, texto: str, prioridad: str, fijado: bool = False):
        if not titulo.strip() or not texto.strip():
            raise ValueError("Escribe el título y el texto del anuncio.")
        return self.remoto.rpc("rpc_crear_anuncio", {"p": {"titulo": titulo.strip(), "texto": texto.strip(), "prioridad": prioridad or "normal", "fijado": bool(fijado)}})

    def anuncio_leido(self, ident: str):
        return self.remoto.rpc("rpc_anuncio_leido", {"p_id": ident})

    # ------------------------------------------------------------ permisos opcionales (4.5 a 4.7)
    @staticmethod
    def _vence(dias: int | None) -> str | None:
        return (datetime.now(timezone.utc) + timedelta(days=dias)).isoformat() if dias else None

    def permisos_activos(self, usuario_id: str) -> set[str]:
        filas = self.remoto.seleccionar("permisos_opcionales", {"select": "codigo", "usuario_id": f"eq.{usuario_id}", "activo": "eq.true"})
        return {f["codigo"] for f in filas}

    def guardar_permisos(self, usuario_id: str, quedan: set[str], dias: int | None = None) -> int:
        """Aplica solo las diferencias entre lo que tiene y lo que se marcó. Devuelve cuántos cambió."""
        antes = self.permisos_activos(usuario_id)
        cambios = 0
        for codigo in PERMISOS:
            if codigo in quedan and codigo not in antes:
                self.remoto.rpc("rpc_set_permiso", {"p_usuario": usuario_id, "p_codigo": codigo, "p_activo": True, "p_vence": self._vence(dias)})
                cambios += 1
            elif codigo not in quedan and codigo in antes:
                self.remoto.rpc("rpc_set_permiso", {"p_usuario": usuario_id, "p_codigo": codigo, "p_activo": False})
                cambios += 1
        return cambios

    def aplicar_plantilla(self, usuario_id: str, nombre: str, dias: int | None = None):
        if nombre not in PLANTILLAS:
            raise ValueError("Elige una plantilla.")
        return self.remoto.rpc("rpc_aplicar_plantilla", {"p_usuario": usuario_id, "p_nombre": nombre, "p_vence": self._vence(dias)})
