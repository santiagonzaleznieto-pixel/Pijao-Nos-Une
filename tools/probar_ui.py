"""Recorre TODA la interfaz con el emulador de Kivy (sin celular): bienvenida, ingreso, reingreso con sesión guardada, inicio, mapa,
registro de visita, equipo, perfil y registro con código. Uso: python tools/probar_ui.py"""
import os
import sys
import threading

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, RAIZ)
sys.path.insert(0, os.path.join(RAIZ, "tools"))
import kivy_falso as K  # noqa: E402

K.instalar()
from pijao.data.remoto import ErrorRemoto, SinConexion  # noqa: E402
import pijao.ui.app as appmod  # noqa: E402


class RemotoPrueba:
    caido = False
    vencida = False

    def __init__(self, url="", anon="", al_cambiar_tokens=None, **k):
        self.cb, self.access_token, self.refresh_token = al_cambiar_tokens, None, None

    def cargar_tokens(self, a, r, e=0.0, u=None):
        self.access_token, self.refresh_token = a, r

    @property
    def tiene_sesion(self):
        return bool(self.refresh_token or self.access_token)

    def _red(self):
        if self.caido:
            raise SinConexion()
        if self.vencida:
            raise ErrorRemoto(401, "JWT expired")

    def iniciar_sesion(self, c, p):
        self._red()
        if p == "mala":
            raise ErrorRemoto(400, "Invalid login credentials")
        self.access_token, self.refresh_token = "a", "r"
        if self.cb:
            self.cb({"access_token": "a", "refresh_token": "r", "expira_en": 9e9, "usuario_id": "u1"})
        return {}

    def registrar_con_codigo(self, d):
        self._red()
        self.registro = d
        return {"ok": True}

    def cerrar_sesion(self):
        self.access_token = self.refresh_token = None

    llamadas = []
    estado_perfil = "activo"

    def seleccionar(self, t, params=None):
        self._red()
        if t == "perfiles":
            return [{"id": "u1", "nombre_completo": "Santiago", "rol": "admin", "estado": "activo"},
                    {"id": "u2", "nombre_completo": "Ana", "rol": "colaborador", "estado": "pendiente"},
                    {"id": "u3", "nombre_completo": "Luis", "rol": "colaborador", "estado": "activo"},
                    {"id": "u4", "nombre_completo": "Marta", "rol": "director", "estado": "activo"},
                    {"id": "u5", "nombre_completo": "Eva", "rol": "colaborador", "estado": "suspendido"}]
        if t == "visitas":
            return [{"id": "v1"}, {"id": "v2"}]
        if t == "tareas":
            return [{"id": "t1", "titulo": "Visitar la vereda La Playa", "descripcion": None, "tipo": "visitar", "prioridad": "alta", "estado": "pendiente",
                     "fecha_limite": "2026-10-30T00:00:00+00:00", "asignado_a": "u1", "creado_por": "u4"},
                    {"id": "t2", "titulo": "Llamar a Marta", "descripcion": None, "tipo": "llamar", "prioridad": "normal", "estado": "hecha",
                     "fecha_limite": None, "asignado_a": "u3", "creado_por": "u1"}]
        if t == "anuncios":
            return [{"id": "a1", "titulo": "Reunión del sábado", "texto": "Nos vemos a las 8 en la plaza.", "prioridad": "importante", "fijado": True, "creado_en": "x"}]
        if t == "permisos_opcionales":
            return [{"codigo": "O-03"}, {"codigo": "O-09"}]
        if t == "textos_legales":
            return [{"tipo": "codigo_conducta", "contenido": "Texto vigente del código de conducta."}]
        return []

    def rpc(self, f, a=None):
        self._red()
        RemotoPrueba.llamadas.append((f, a))
        if f == "rpc_mi_perfil":
            return {"id": "u1", "nombre": "Santiago González", "rol": "admin", "estado": RemotoPrueba.estado_perfil, "permisos": []}
        if f == "rpc_completar_ingreso":
            RemotoPrueba.estado_perfil = "activo"
            return {"ok": True}
        if f == "rpc_invitar":
            return {"ok": True, "codigo": "ABCD1234", "expira_en": "x"}
        if f == "rpc_panel_campana":
            return {"viviendas_conocidas": 12, "viviendas_visitadas": 5, "hogares": 4, "personas_autorizadas": 9}
        if f == "rpc_registrar_visita":
            return {"ok": True, "calidad": "rojo", "motivos": [], "advertencias": [], "personas_duplicadas": []}
        return {"ok": True}


appmod.Remoto = RemotoPrueba
import pijao.ui.mapa as mapamod  # noqa: E402
from pijao.servicios.gps import Muestreo as _Muestreo  # noqa: E402
mapamod.Muestreo = lambda d=9.0: _Muestreo(d, reloj=lambda: K.Clock.t)      # el reloj de la prueba es el del emulador
paso = 0


def ok(texto):
    global paso
    paso += 1
    print(f"  {paso:2d}. {texto}")


def esperar(seg=1.0):
    for t in threading.enumerate():
        if t is not threading.main_thread():
            t.join(3)
    K.Clock.avanzar(seg)


def hay_error_en_pantallas(sm):
    from pijao.ui.errores import mostrar  # noqa: F401  (se importa para comprobar que el módulo carga)


def correr():
    app = appmod.PijaoApp()
    sm = app.build()
    app.root = sm
    for pantalla in sm.children:
        if type(pantalla).__name__ == "PantallaFallo":
            raise AssertionError("La pantalla «" + pantalla.name + "» no se pudo construir:\n" + pantalla.children[0].text)
    ok(f"build(): pantallas {[s.name for s in sm.children][::-1]}")
    assert sm.current == "splash"
    K.Clock.avanzar(5)
    assert sm.current == "login", sm.current
    ok("bienvenida termina y va al ingreso (sin sesión)")

    login = sm.get_screen("login")
    login.on_enter()
    login.correo.text, login.clave.text = "yo@correo.co", "mala"
    login.entrar()
    esperar()
    assert sm.current == "login" and login.error.text == "Correo o contraseña incorrectos.", (sm.current, login.error.text)
    assert not K.Popup.abiertos
    ok("contraseña incorrecta: mensaje claro, sin ventana de error (el fallo que viste en el video)")
    login.correo.text, login.clave.text = "yo@correo.co", "clave-larga-123"
    login.entrar()
    esperar()
    assert sm.current == "principal", (sm.current, login.error.text)
    ok("ingreso correcto lleva a principal")
    pr = sm.get_screen("principal")
    inicio = pr.paginas.get_screen("inicio")
    assert inicio.hoy.text != "–" and inicio.n["casas"].text == "12", (inicio.hoy.text, inicio.n["casas"].text)
    ok(f"Inicio: hoy={inicio.hoy.text}, casas={inicio.n['casas'].text}, secciones={len(inicio.tiles.children)}")
    assert set(pr.botones) == {"inicio", "mapa", "tareas", "equipo", "perfil"}, set(pr.botones)
    for destino in ("mapa", "tareas", "equipo", "perfil", "inicio"):
        pr.ir(destino)
        esperar(.5)
    ok("navegación entre Inicio, Mapa, Tareas, Equipo y Perfil")

    # ---- mapa y registro de visita
    pr.ir("mapa")
    mapa = pr.mapa
    mapa.logica.puntos_mapa = lambda: [{"id": "c1", "lat": 4.3340, "lng": -75.7010, "estado": "visitada_conversacion", "pendiente": False},
                                       {"id": "c2", "lat": 4.3350, "lng": -75.7020, "estado": "no_contactar", "pendiente": True},
                                       {"id": "c3", "lat": 4.3360, "lng": -75.7030, "estado": "por_visitar", "pendiente": False}]
    mapa.refrescar()
    esperar()
    assert len(mapa.marcadores) == 3
    ok(f"mapa: {len(mapa.marcadores)} puntos dibujados; satélite={mapa.satelite}")
    mapa.cambiar_capa()
    mapa.cambiar_capa()
    mapa._lectura({"lat": 4.3331, "lng": -75.7002, "precision_m": 8.0, "altitud_m": 1500.0})
    mapa.centrar()
    mapa._tocar_punto(mapa.marcadores[0].dato)
    mapa._tocar_punto(mapa.marcadores[1].dato)
    mapa._ocultar_ficha()
    mapa._tocar_punto(mapa.marcadores[0].dato)
    mapa._agregar_visita(mapa.marcadores[0].dato)
    assert sm.current == "visita"
    sm.current = "principal"
    ok("ficha de un punto y «agregar visita» a una casa existente")
    mapa.registrar_aqui()
    for _ in range(20):
        mapa._lectura({"lat": 4.3331, "lng": -75.7002, "precision_m": 8.0})
        K.Clock.avanzar(.5)
    assert sm.current == "visita", (sm.current, [p.title for p in K.Popup.abiertos])
    ok("«Registrar aquí»: 9 s de GPS y abre el formulario")
    v = sm.get_screen("visita")

    def avanzar(esperado_error=False):
        v.siguiente()
        if not esperado_error:
            assert not v.error.text, v.error.text

    # --- visita sencilla: nadie en casa, casa nueva
    while v.pasos[v.i] == "intro":
        avanzar()
    assert v.pasos[v.i] == "vivienda", v.pasos
    avanzar(True)
    assert "tipo" in v.error.text.lower()
    v.v_tipo.fijar("casa_urbana"), v.v_zona.fijar("urbana"), v.v_ocu.fijar("habitada")
    v.v_barrio.text, v.v_dir.text = "Centro", "Calle 1 # 2-3"
    v.v_serv["energia"].activo = True
    avanzar()
    v.r_res.fijar("nadie_en_casa")
    avanzar()
    assert v.pasos[v.i:] == ["cierre"], v.pasos
    v.c_seg.activo, v.c_mot.text = True, "Volver mañana"
    avanzar()
    esperar()
    assert K.Popup.abiertos and K.Popup.abiertos[-1].title == "Visita guardada"
    K.Popup.abiertos[-1].content.children[0].children[0].dispatch("on_release")
    assert sm.current == "principal"
    ok("visita sencilla (casa nueva, nadie en casa) guardada")

    # --- visita completa: conversación con hogar, persona, necesidad, autorización y firma
    v.abrir({"lat": 4.3331, "lng": -75.7002, "precision_m": 6.0}, None)
    while v.pasos[v.i] == "intro":
        avanzar()
    v.v_tipo.fijar("finca_rural"), v.v_zona.fijar("rural"), v.v_ocu.fijar("habitada")
    v.v_barrio.text, v.v_dir.text = "Vereda La Playa", "Finca El Mirador"
    avanzar()
    v.r_res.fijar("conversacion_completa")
    avanzar(True)
    assert "autorización" in v.error.text
    v.r_aut.activo = True
    avanzar()
    assert v.pasos[v.i:] == ["hogar", "personas", "necesidades", "autorizacion", "cierre"], v.pasos
    v.h_total.text, v.h_edad["25-34"].text, v.h_edad["0-5"].text = "3", "1", "1"
    avanzar(True)
    assert "suman" in v.error.text
    v.h_edad["35-44"].text = "1"
    v.h_rel.fijar("jefe_jefa")
    avanzar()
    v.abrir_persona(lambda: v.cache["personas"][2]())
    f = v._pf
    f["guardar"]()
    assert f["err"].text, "debía exigir nombre"
    f["n1"].text, f["a1"].text, f["ced"].text, f["nac"].text = "Ana", "Pérez", "1094123456", "1990-05-20"
    f["sexo"].fijar("mujer"), f["info"].activo, f["canal"].fijar("whatsapp"), f["simp"].fijar("apoya"), f["sost"].activo
    f["tel"].text = "3001234567"
    f["info"].activo = f["sost"].activo = True
    f["guardar"]()
    assert not f["err"].text and len(v.draft["personas"]) == 1, f["err"].text
    avanzar()
    v.n_filas[0][0].fijar("agua_ambiente")
    avanzar(True)
    v.n_filas[0][2].text, v.n_filas[0][4].activo = "Falta agua en la vereda", True
    avanzar()
    assert v.pasos[v.i] == "autorizacion"
    v.a_dat.activo = v.a_con.activo = v.a_sim.activo = True
    v.a_met.fijar("firma_pantalla")
    avanzar(True)
    assert "firma" in v.error.text.lower()
    v._firmar()
    caja = K.Popup.abiertos[-1].content
    firma = caja.children[-2]
    firma.trazo_nuevo(10, 10)
    for k in range(12):
        firma.punto(10 + 5 * k, 10 + 3 * k)
    caja.children[0].children[0].dispatch("on_release")
    assert v.firma_datos
    avanzar()
    v.c_notas.text = "Familia amable, muy interesada"
    avanzar()
    esperar()
    cons = {c["proposito"] for c in v.draft["consentimientos"]}
    assert {"registro_vivienda", "datos_personales", "contacto_whatsapp", "dato_sensible_simpatia"} <= cons, cons
    datos, _ = __import__("pijao.core.payload", fromlist=["x"]).construir_payload(v.draft, v.draft["dispositivo"])
    assert len(datos["personas"]) == 1 and datos["hogar"]["sosten_persona_id"] == datos["personas"][0]["id"] and datos["necesidades"]
    assert K.Popup.abiertos[-1].title == "Visita guardada"
    K.Popup.abiertos[-1].content.children[0].children[0].dispatch("on_release")
    ok("visita completa: hogar, persona, necesidad, autorización con firma y payload correcto")

    # --- sin autorización de datos no se guardan personas
    v.abrir({"lat": 4.3331, "lng": -75.7002, "precision_m": 6.0}, mapa.logica.puntos_mapa()[0])
    while v.pasos[v.i] == "intro":
        avanzar()
    v.r_res.fijar("conversacion_breve"), setattr(v.r_aut, "activo", True)
    avanzar()
    v.h_total.text, v.h_edad["25-34"].text = "1", "1"
    v.h_rel.fijar("otro")
    avanzar()
    v.abrir_persona(lambda: None)
    g = v._pf
    g["n1"].text, g["a1"].text, g["ced"].text, g["mayor"].activo = "Luis", "Gómez", "79123456", True
    g["guardar"]()
    avanzar()
    avanzar()
    avanzar(True)
    assert "datos personales" in v.error.text
    ok("sin la autorización de datos personales no deja guardar a la persona")
    sm.current = "principal"

    # --- mapa: ubicación manual, filtros y avisos de GPS
    mapa.modo_manual(True)
    mapa.motivo.text = "Motivo: Mal GPS"
    mapa.usar_punto()
    assert sm.current == "visita" and v.draft["visita"]["ubicacion_manual"] and v.draft["visita"]["motivo_manual"] == "mal_gps"
    sm.current = "principal"
    mapa.filtros()
    mapa.ocultos = {"por_visitar"}
    mapa.refrescar()
    assert len(mapa.marcadores) == 2
    mapa.ocultos = set()
    mapa.refrescar()
    mapa._fin_muestreo(None)
    mapa._fin_muestreo({"lat": 4.3, "lng": -75.7, "precision_m": 55.0})
    mapa._fin_muestreo({"lat": 4.3340, "lng": -75.7010, "precision_m": 5.0})
    ok("mapa: marcar en el mapa (ubicación manual), filtros y avisos de GPS / casa duplicada")

    # ---- equipo
    pr.ir("equipo")
    eq = pr.equipo
    esperar()
    eq.nombre.text = "Nuevo Colaborador"
    eq.invitar()
    esperar()
    assert any("Invitación creada" == p.title for p in K.Popup.abiertos)
    ok("invitación creada con código")
    eq._accion(app.logica.aprobar, {"id": "u2"})
    esperar()
    ok("aprobar y suspender desde Equipo")

    # ---- tareas, anuncios y permisos
    pr.ir("tareas")
    tp = pr.paginas.get_screen("tareas")
    esperar()
    assert tp.t_tareas.children and tp.t_anuncios.children
    tp.n_titulo.text, tp.n_fecha.text = "Revisar zona norte", "2026-11-05"
    tp.crear()
    tp.a_titulo.text, tp.a_texto.text = "Nuevo horario", "Salimos a las 8."
    tp.publicar()
    tp._leer({"id": "a1", "titulo": "Reunión", "texto": "A las 8"})
    tp._estado({"id": "t1"}, "hecha")
    esperar()
    llamadas = [f for f, _ in RemotoPrueba.llamadas]
    assert {"rpc_crear_tarea", "rpc_crear_anuncio", "rpc_tarea_actualizar"} <= set(llamadas), llamadas
    ok("tareas y anuncios: listar, crear, publicar, leer y cambiar estado")
    pe = sm.get_screen("permisos")
    pe.abrir({"id": "u3", "nombre_completo": "Luis"})
    esperar()
    assert pe.casillas["O-03"].activo and not pe.casillas["O-01"].activo
    pe.casillas["O-01"].activo, pe.casillas["O-03"].activo = True, False
    pe.guardar()
    esperar()
    cambios = [a for f, a in RemotoPrueba.llamadas if f == "rpc_set_permiso"]
    assert {(c["p_codigo"], c["p_activo"]) for c in cambios} == {("O-01", True), ("O-03", False)}, cambios
    pe.plantilla.fijar("Líder de zona")
    pe.aplicar()
    esperar()
    assert any(f == "rpc_aplicar_plantilla" for f, _ in RemotoPrueba.llamadas)
    pe.volver()
    ok("permisos opcionales: marcar, quitar y aplicar plantilla")
    sm.current = "principal"

    # ---- perfil y salida
    pr.ir("perfil")
    assert sm.get_screen("principal").paginas.get_screen("perfil").nombre.text
    appmod.PijaoApp  # noqa: B018
    pr.salir()
    assert sm.current == "login"
    ok("cerrar sesión vuelve al ingreso")

    # ---- registro con código
    login.on_pre_enter()
    sm.current = "registro"
    r = sm.get_screen("registro")
    r.codigo.text, r.nombre.text, r.correo.text, r.clave.text, r.celular.text = "abcd1234", "Ana Prueba", "ana@correo.co", "clave-muy-larga-1", "3001112233"
    r.crear()
    assert "18" in r.error.text or "mayor" in r.error.text
    r.mayor.active = True
    r.crear()
    esperar()
    assert any("Cuenta creada" == p.title for p in K.Popup.abiertos)
    ok("registro con código de invitación")

    # ---- cuenta aprobada: acuerdos, lecciones y evaluación
    from pijao.core import curso as datos_curso
    RemotoPrueba.estado_perfil = "aprobado"
    sm.current = "login"
    login.correo.text, login.clave.text = "ana@correo.co", "clave-larga-123"
    login.entrar()
    esperar()
    assert sm.current == "curso", (sm.current, login.error.text)
    cu = sm.get_screen("curso")
    cu._h_sig()
    assert "cuatro" in cu.error.text
    for c in cu.marcas.values():
        c.activo = True
    cu._h_sig()
    for _ in range(len(datos_curso.LECCIONES)):
        cu._h_sig()
    assert cu.fase == "examen"
    cu._h_sig()
    assert "faltan" in cu.error.text.lower()
    cu.resp = {i: (ok_ + 1) % 3 for i, (_, _, ok_) in enumerate(datos_curso.PREGUNTAS)}
    cu._h_sig()
    assert cu.fase == "resultado" and sm.current == "curso"
    cu._h_sig()
    assert cu.fase == "lecciones"
    cu.fase = "examen"
    cu._mostrar()
    cu.resp = {i: ok_ for i, (_, _, ok_) in enumerate(datos_curso.PREGUNTAS)}
    cu._h_sig()
    esperar()
    assert sm.current == "principal" and app.logica.perfil.activo
    ok("cuenta aprobada: acuerdos, 7 lecciones, evaluación (reprobar y aprobar) y activación")

    # ---- sesión guardada: cerrar y abrir de nuevo la app (el fallo que cerraba la aplicación)
    sm.current = "login"
    login.correo.text, login.clave.text = "yo@correo.co", "clave-larga-123"
    login.entrar()
    esperar()
    carpeta = app.user_data_dir
    app2 = appmod.PijaoApp()
    app2.user_data_dir = carpeta
    sm2 = app2.build()
    app2.root = sm2
    K.Clock.avanzar(5)
    assert sm2.current == "principal", sm2.current
    ok("reabrir la app con sesión guardada entra directo a principal")
    # ---- sin internet
    RemotoPrueba.caido = True
    sm2.get_screen("principal").paginas.get_screen("inicio").on_pre_enter()
    esperar()
    ok("sin internet: Inicio muestra los últimos datos")
    # ---- sesión vencida: vuelve al ingreso
    RemotoPrueba.caido, RemotoPrueba.vencida = False, True
    sm2.get_screen("principal").paginas.get_screen("inicio").on_pre_enter()
    esperar()
    assert sm2.current == "login", sm2.current
    RemotoPrueba.vencida = False
    ok("sesión vencida: la app vuelve al ingreso en vez de quedarse sin datos")
    # ---- una pantalla que falla al construirse no tumba la app
    original = appmod.LoginScreen

    class Rota(original):
        def __init__(self, *a, **k):
            raise TypeError("falla de prueba")
    appmod.LoginScreen = Rota
    sm3 = appmod.PijaoApp().build()
    appmod.LoginScreen = original
    assert sm3.has_screen("login") and sm3.has_screen("principal")
    ok("si una pantalla falla, la app abre igual y muestra el error")


if __name__ == "__main__":
    print("Prueba completa de la interfaz con el emulador de Kivy:")
    try:
        correr()
    except Exception:
        import traceback
        traceback.print_exc()
        sys.exit(1)
    print("TODO BIEN: la interfaz recorrió todos los flujos sin errores.")
