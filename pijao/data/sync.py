"""Sincronización (secciones 5.13, 8.7 y 17.3).

- Primero se envía la cola (datos) y luego las fotos; si una foto falla, el registro no se pierde.
- Un registro local nunca se borra hasta que el servidor confirma que lo recibió.
- Después se traen los cambios del servidor por cursor (actualizado_en, id).
"""
from __future__ import annotations

import json
import os
from typing import Callable

from .localdb import LocalDB
from .remoto import ErrorRemoto, Remoto, SinConexion

LOTE = 500

# (tabla remota, tabla local, columna de id)
TABLAS_PULL = [
    ("catalogos", "catalogos", "id"),
    ("configuracion", "configuracion", "clave"),
    ("zonas", "zonas", "id"),
    ("viviendas", "viviendas", "id"),
    ("hogares", "hogares", "id"),
    ("visitas", "visitas", "id"),
    ("personas_v", "personas", "id"),
    ("fotos", "fotos", "id"),
    ("necesidades", "necesidades", "id"),
    ("tareas", "tareas", "id"),
    ("anuncios", "anuncios", "id"),
]

TRANSITORIOS = (429, 500, 502, 503, 504)


class SyncEngine:
    def __init__(self, db: LocalDB, remoto: Remoto, on_evento: Callable[[str, dict], None] | None = None):
        self.db = db
        self.remoto = remoto
        self.on_evento = on_evento or (lambda nombre, datos: None)
        self.sesion_expirada = False

    # ------------------------------------------------------------------ envío
    def push(self) -> dict:
        res = {"enviados": 0, "errores": 0, "detenido": False}
        for item in self.db.outbox_siguientes(100):
            try:
                self._enviar(item)
            except SinConexion:
                res["detenido"] = True
                break
            except ErrorRemoto as e:
                if e.status == 401:
                    self.sesion_expirada = True
                    self.db.outbox_marcar(item["id"], "reintento", e.mensaje, sumar_intento=True)
                    res["detenido"] = True
                    self.on_evento("sesion_expirada", {})
                    break
                if e.status in TRANSITORIOS:
                    self.db.outbox_marcar(item["id"], "reintento", e.mensaje, sumar_intento=True)
                    res["detenido"] = True
                    break
                self.db.outbox_marcar(item["id"], "error", e.mensaje, sumar_intento=True)
                res["errores"] += 1
                self.on_evento("error_envio", {"id": item["id"], "tipo": item["tipo"], "mensaje": e.mensaje})
            except Exception as e:  # defecto inesperado: se marca para revisar, no se pierde
                self.db.outbox_marcar(item["id"], "error", f"{type(e).__name__}: {e}", sumar_intento=True)
                res["errores"] += 1
            else:
                self.db.outbox_marcar(item["id"], "enviado")
                self.db.outbox_vaciar_payload(item["id"])
                res["enviados"] += 1
        return res

    def _enviar(self, item: dict) -> None:
        tipo = item["tipo"]
        p = json.loads(item["payload"] or "{}")
        rpc = self.remoto.rpc
        if tipo == "registrar_visita":
            r = rpc("rpc_registrar_visita", {"p": p}) or {}
            self._tras_visita(p, r)
        elif tipo == "tarea_estado":
            rpc("rpc_tarea_actualizar", {"p_id": p["id"], "p_estado": p["estado"], "p_nota": p.get("nota")})
        elif tipo == "incidente":
            rpc("rpc_incidente", {"p": p})
        elif tipo == "solicitud_titular":
            rpc("rpc_solicitud_titular", {"p": p})
        elif tipo == "no_contactar":
            rpc("rpc_marcar_no_contactar", {"p_persona": p["persona_id"], "p_motivo": p.get("motivo")})
        elif tipo == "jornada_iniciar":
            rpc("rpc_jornada_iniciar", {})
        elif tipo == "jornada_terminar":
            rpc("rpc_jornada_terminar", {})
        elif tipo == "ubicaciones":
            rpc("rpc_ubicaciones", {"p": p.get("puntos", [])})
        elif tipo == "sos":
            rpc("rpc_sos", {"p_lat": p.get("lat"), "p_lng": p.get("lng"), "p_nota": p.get("nota")})
        elif tipo == "eliminar":
            rpc("rpc_eliminar_registro", {"p_tabla": p["tabla"], "p_id": p["id"], "p_motivo": p.get("motivo", "")})
        elif tipo == "anuncio_leido":
            rpc("rpc_anuncio_leido", {"p_id": p["id"]})
        elif tipo == "reconocimiento":
            rpc("rpc_registrar_reconocimiento", {"p": p})
            self.db.marcar_enviado("viviendas", p["vivienda"]["id"])
        elif tipo == "editar_visita":
            rpc("rpc_editar_visita", {"p_id": p["id"], "p": p.get("cambios", {})})
        elif tipo == "completar_ingreso":
            rpc("rpc_completar_ingreso", {"p_puntaje": p["puntaje"], "p_acuerdos_version": p["acuerdos_version"]})
        else:
            raise ErrorRemoto(400, f"Tipo de envío desconocido: {tipo}")

    def _tras_visita(self, payload: dict, respuesta: dict) -> None:
        viv_id = (payload.get("vivienda") or {}).get("id")
        vis_id = (payload.get("visita") or {}).get("id")
        if viv_id:
            self.db.marcar_enviado("viviendas", viv_id, {"calidad": respuesta.get("calidad")} if respuesta.get("calidad") else None)
        if vis_id:
            self.db.marcar_enviado("visitas", vis_id, {"calidad": respuesta.get("calidad")} if respuesta.get("calidad") else None)
        for p in payload.get("personas", []):
            self.db.marcar_enviado("personas", p["id"])
        if (payload.get("hogar") or {}).get("id"):
            self.db.marcar_enviado("hogares", payload["hogar"]["id"])
        for n in payload.get("necesidades", []):
            self.db.marcar_enviado("necesidades", n["id"])
        for f in payload.get("fotos", []):
            self.db.marcar_enviado("fotos", f["id"])
        self.on_evento("visita_enviada", {"visita_id": vis_id, "respuesta": respuesta})

    # ------------------------------------------------------------------ fotos
    def push_fotos(self) -> dict:
        res = {"subidas": 0, "errores": 0, "detenido": False}
        for s in self.db.subidas_pendientes():
            if s.get("outbox_id"):
                ob = self.db.outbox_obtener(s["outbox_id"])
                if ob and ob["estado"] != "enviado":
                    continue                     # primero debe existir el registro de la visita en el servidor
            try:
                if not os.path.exists(s["archivo"]):
                    self.db.subida_marcar(s["id"], "error", "El archivo ya no existe en el teléfono")
                    res["errores"] += 1
                    continue
                with open(s["archivo"], "rb") as fh:
                    datos = fh.read()
                self.remoto.subir(s["bucket"], s["ruta"], datos, "image/jpeg")
                try:
                    self.remoto.rpc("rpc_foto_subida", {"p_id": s["id"]})
                except ErrorRemoto:
                    pass
                self.db.subida_marcar(s["id"], "subida")
                res["subidas"] += 1
            except SinConexion:
                res["detenido"] = True
                break
            except ErrorRemoto as e:
                transitorio = e.status in TRANSITORIOS or e.status == 401
                self.db.subida_marcar(s["id"], "reintento" if transitorio else "error", e.mensaje, sumar_intento=True)
                if transitorio:
                    res["detenido"] = True
                    break
                res["errores"] += 1
        return res

    # ------------------------------------------------------------------ descarga
    def pull(self) -> int:
        total = 0
        for remota, local, clave in TABLAS_PULL:
            total += self._pull_tabla(remota, local, clave)
        self._guardar_parametros()
        return total

    def _pull_tabla(self, remota: str, local: str, clave: str) -> int:
        cursor = self.db.get_meta(f"cursor:{remota}")
        total = 0
        while True:
            params = {"select": "*", "order": f"actualizado_en.asc,{clave}.asc", "limit": str(LOTE)}
            if cursor:
                t, i = cursor["t"], cursor["id"]
                params["or"] = f"(actualizado_en.gt.{t},and(actualizado_en.eq.{t},{clave}.gt.{i}))"
            filas = self.remoto.seleccionar(remota, params)
            if not filas:
                break
            for f in filas:
                ident = str(f[clave])
                if self.db.esta_pendiente(local, ident):
                    continue                     # lo que tengo sin enviar manda sobre la copia del servidor
                f = dict(f)
                f["id"] = ident if clave != "id" else f["id"]
                self.db.upsert(local, f, actualizado_en=f.get("actualizado_en"))
            ult = filas[-1]
            cursor = {"t": ult["actualizado_en"], "id": str(ult[clave])}
            self.db.set_meta(f"cursor:{remota}", cursor)
            total += len(filas)
            if len(filas) < LOTE:
                break
        return total

    def _guardar_parametros(self) -> None:
        params = {}
        for c in self.db.listar("configuracion"):
            params[c.get("clave") or c.get("id")] = c.get("valor")
        if params:
            self.db.set_meta("params", params)

    # ------------------------------------------------------------------ todo junto
    def sincronizar(self) -> dict:
        res = {"push": {}, "fotos": {}, "pull": 0, "sin_conexion": False, "error": None}
        try:
            res["push"] = self.push()
            res["fotos"] = self.push_fotos() if not res["push"].get("detenido") else {}
            if not res["push"].get("detenido"):
                res["pull"] = self.pull()
        except SinConexion:
            res["sin_conexion"] = True
        except ErrorRemoto as e:
            res["error"] = e.mensaje
            if e.status == 401:
                self.sesion_expirada = True
        if res["push"].get("detenido"):
            res["sin_conexion"] = True
        self.on_evento("sincronizado", res)
        return res
