"""Estructura principal: páginas (Inicio, Mapa, Equipo, Perfil) y barra de navegación inferior."""
from __future__ import annotations

import os
import webbrowser
from urllib.parse import quote

from kivy.app import App
from kivy.core.clipboard import Clipboard
from kivy.graphics import Color, Ellipse
from kivy.metrics import dp
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.floatlayout import FloatLayout
from kivy.uix.image import Image
from kivy.uix.scrollview import ScrollView
from kivy.uix.screenmanager import FadeTransition, Screen, ScreenManager
from kivy.uix.spinner import Spinner

from .mapa import PantallaMapa
from .tareas import TareasPage
from .tema import (ASSETS, AZUL, AZUL_OSC, BLANCO, CLARO, GRIS, NARANJA, ROJO, TEXTO, VERDE, Boton, BotonRedondo, Campo, ItemNav,
                   Tarjeta, TileSeccion, dialogo, en_hilo, etiqueta, pintar, texto_error)

ROLES = {"admin": "Administrador", "director": "Director", "colaborador": "Colaborador"}
ESTADOS = {"pendiente": "Pendiente", "aprobado": "Aprobado", "activo": "Activo", "suspendido": "Suspendido", "baja": "Baja"}


def _pagina(name):
    s = Screen(name=name)
    sv = ScrollView(do_scroll_x=False, bar_width=0)
    col = BoxLayout(orientation="vertical", size_hint_y=None, padding=[dp(16), dp(18), dp(16), dp(24)], spacing=dp(14))
    col.bind(minimum_height=col.setter("height"))
    sv.add_widget(col)
    s.add_widget(sv)
    return s, col


def _titulo(texto):
    c = BoxLayout(size_hint_y=None, height=dp(28), padding=[dp(18), 0, 0, 0])
    c.add_widget(etiqueta(texto, 18, TEXTO, True))
    return c


def _carril(alto):
    """Fila que se desliza hacia los lados (como las categorías del video)."""
    fila = BoxLayout(size_hint=(None, 1), spacing=dp(12), padding=[dp(16), 0, dp(16), 0])
    fila.bind(minimum_width=fila.setter("width"))
    sv = ScrollView(do_scroll_y=False, size_hint_y=None, height=alto, bar_width=0)
    sv.add_widget(fila)
    return sv, fila


class InicioPage(Screen):
    def __init__(self, logica, ir, **kw):
        super().__init__(name="inicio", **kw)
        self.logica, self.ir = logica, ir
        sv = ScrollView(do_scroll_x=False, bar_width=0)
        self.col = BoxLayout(orientation="vertical", size_hint_y=None, spacing=dp(16), padding=[0, 0, 0, dp(24)])
        self.col.bind(minimum_height=self.col.setter("height"))
        sv.add_widget(self.col)
        self.add_widget(sv)

        banda = BoxLayout(orientation="vertical", size_hint_y=None, padding=[dp(18), dp(24), dp(18), dp(24)], spacing=dp(16))
        banda.bind(minimum_height=banda.setter("height"))
        pintar(banda, AZUL, lados=[0, 0, dp(32), dp(32)])
        with banda.canvas.before:
            Color(1, 1, 1, .07)
            c1 = Ellipse(size=(dp(230), dp(230)))
            Color(*NARANJA[:3], .22)
            c2 = Ellipse(size=(dp(110), dp(110)))

        def deco(*_):
            c1.pos = (banda.right - dp(140), banda.top - dp(140))
            c2.pos = (banda.x - dp(40), banda.y + dp(24))
        banda.bind(pos=deco, size=deco)
        fila = BoxLayout(size_hint_y=None, height=dp(52), spacing=dp(10))
        textos = BoxLayout(orientation="vertical")
        self.rol, self.saludo = etiqueta("", 12, (1, 1, 1, .78)), etiqueta("", 22, BLANCO, True)
        textos.add_widget(self.rol)
        textos.add_widget(self.saludo)
        fila.add_widget(textos)
        fila.add_widget(BotonRedondo("sync", on_release=lambda *_: self.sincronizar()))
        banda.add_widget(fila)

        hero = BoxLayout(size_hint_y=None, height=dp(190), padding=dp(16), spacing=dp(8))
        pintar(hero, NARANJA, 26)
        izq = BoxLayout(orientation="vertical", spacing=dp(2))
        self.hoy, self.sub = etiqueta("–", 46, BLANCO, True), etiqueta("", 12, (1, 1, 1, .92))
        for w in (etiqueta("Tus visitas de hoy", 13, (1, 1, 1, .92)), self.hoy, self.sub,
                  Boton("Registrar visita", color=AZUL_OSC, height=dp(42), on_release=lambda *_: self.ir("mapa"))):
            izq.add_widget(w)
        der = FloatLayout(size_hint_x=.42)
        disco = FloatLayout(size_hint=(None, None), size=(dp(104), dp(104)), pos_hint={"center_x": .5, "center_y": .5})
        pintar(disco, BLANCO, 52)
        disco.add_widget(Image(source=os.path.join(ASSETS, "logo.png"), size_hint=(.92, .92), pos_hint={"center_x": .5, "center_y": .5}, fit_mode="contain"))
        der.add_widget(disco)
        hero.add_widget(izq)
        hero.add_widget(der)
        banda.add_widget(hero)
        self.col.add_widget(banda)

        self.col.add_widget(_titulo("Secciones"))
        sc, self.tiles = _carril(dp(122))
        self.col.add_widget(sc)
        self.col.add_widget(_titulo("Tu avance"))
        sc, fila_n = _carril(dp(108))
        self.n = {}
        for clave, titulo, color in (("casas", "Casas en el mapa", AZUL), ("por_enviar", "Por enviar", NARANJA),
                                     ("visitadas", "Casas visitadas", VERDE), ("personas", "Personas con autorización", AZUL_OSC)):
            t = Tarjeta(size_hint=(None, None), width=dp(150), padding=dp(14), spacing=dp(2))
            t.add_widget(etiqueta(titulo, 12, GRIS))
            self.n[clave] = etiqueta("–", 30, color, True)
            t.add_widget(self.n[clave])
            fila_n.add_widget(t)
        self.col.add_widget(sc)
        self.estado = etiqueta("", 12, GRIS, halign="center")
        self.col.add_widget(self.estado)

    def _armar_tiles(self):
        self.tiles.clear_widgets()
        items = [("mapa", "Mapa", "mapa"), ("casa", "Registrar", "mapa"), ("visita", "Tareas", "tareas"), ("sync", "Sincronizar", None)]
        if self.logica.puede_gestionar_equipo:
            items.append(("equipo", "Equipo", "equipo"))
        items.append(("perfil", "Perfil", "perfil"))
        for tipo, texto, destino in items:
            t = TileSeccion(tipo, texto)
            t.bind(on_release=(lambda *_: self.sincronizar()) if destino is None else (lambda *_, d=destino: self.ir(d)))
            self.tiles.add_widget(t)

    def on_pre_enter(self, *_):
        p = self.logica.perfil
        if p:
            self.saludo.text = f"Hola, {p.nombre.split()[0] if p.nombre else ''}"
            self.rol.text = ROLES.get(p.rol, p.rol)
        self._armar_tiles()
        self.pintar(self.logica.estadisticas_locales())
        en_hilo(self.logica.estadisticas, self.pintar, lambda e: setattr(self.estado, "text", "Sin conexión: se muestran los últimos datos."))

    def pintar(self, d: dict) -> None:
        if d.get("sesion_vencida"):                         # la sesión guardada ya no sirve: volver a ingresar
            en_hilo(self.logica.cerrar_sesion)              # sin borrar datos: es la misma persona y puede tener trabajo sin enviar
            App.get_running_app().root.current = "login"
            return
        f = lambda k: str(d[k]) if d.get(k) is not None else "–"
        self.hoy.text = f("mis_visitas_hoy")
        self.sub.text = f"{f('casas')} casas registradas por el equipo"
        for k, w in self.n.items():
            w.text = f(k)
        if "en_linea" in d:
            self.estado.text = "Datos actualizados." if d["en_linea"] else "Sin conexión: se muestran los últimos datos."

    def sincronizar(self):
        self.estado.text = "Sincronizando…"
        en_hilo(self.logica.sincronizar, lambda r: (setattr(self.estado, "text", "Sin conexión: se enviará luego." if r.get("sin_conexion") else (r.get("error") or "Sincronizado.")), self.on_pre_enter()))


class EquipoPage(Screen):
    def __init__(self, logica, **kw):
        super().__init__(name="equipo", **kw)
        self.logica = logica
        sv = ScrollView(do_scroll_x=False, bar_width=0)
        col = BoxLayout(orientation="vertical", size_hint_y=None, padding=[dp(16), dp(18), dp(16), dp(24)], spacing=dp(14))
        col.bind(minimum_height=col.setter("height"))
        sv.add_widget(col)
        self.add_widget(sv)
        col.add_widget(etiqueta("Equipo", 24, TEXTO, True))
        inv = Tarjeta()
        inv.add_widget(etiqueta("Invitar a una persona", 16, TEXTO, True))
        inv.add_widget(etiqueta("Se genera un código de un solo uso. Quien lo reciba crea su cuenta con ese código.", 12, GRIS))
        self.nombre, self.cel, self.mail = Campo("Nombre completo"), Campo("Celular (opcional)", input_type="number"), Campo("Correo (opcional)")
        self.rol = Spinner(text="Colaborador", values=["Colaborador"], size_hint_y=None, height=dp(50),
                           background_normal="", background_color=CLARO, color=TEXTO)
        self.msg = etiqueta("", 13, ROJO)
        for w in (self.nombre, self.cel, self.mail, self.rol, self.msg, Boton("Crear invitación", on_release=self.invitar)):
            inv.add_widget(w)
        col.add_widget(inv)
        self.pend, self.eq = Tarjeta(), Tarjeta()
        col.add_widget(self.pend)
        col.add_widget(self.eq)

    def on_pre_enter(self, *_):
        self.rol.values = ["Colaborador", "Director"] if self.logica.perfil and self.logica.perfil.rol == "admin" else ["Colaborador"]
        self.cargar()

    def cargar(self):
        en_hilo(self.logica.equipo, self._pintar, lambda e: setattr(self.msg, "text", texto_error(e)))

    def _fila(self, tarjeta, f, texto_boton=None, accion=None, color=NARANJA, permisos=False):
        fila = BoxLayout(size_hint_y=None, height=dp(52), spacing=dp(8))
        fila.add_widget(etiqueta(f"{f['nombre_completo']}\n{ROLES.get(f['rol'], f['rol'])} · {ESTADOS.get(f['estado'], f['estado'])}", 13, TEXTO))
        if permisos:
            fila.add_widget(Boton("Permisos", color=CLARO, texto_color=AZUL, height=dp(40), size_hint_x=.3,
                                  on_release=lambda *_: App.get_running_app().root.get_screen("permisos").abrir(f)))
        if texto_boton:
            fila.add_widget(Boton(texto_boton, color=color, height=dp(40), size_hint_x=.38, on_release=lambda *_: accion(f)))
        tarjeta.add_widget(fila)

    def _pintar(self, filas):
        yo = self.logica.perfil.id if self.logica.perfil else None
        self.pend.clear_widgets()
        self.eq.clear_widgets()
        self.pend.add_widget(etiqueta("Solicitudes por aprobar", 16, TEXTO, True))
        pend = [f for f in filas if f["estado"] == "pendiente"]
        if not pend:
            self.pend.add_widget(etiqueta("No hay solicitudes pendientes.", 13, GRIS))
        for f in pend:
            self._fila(self.pend, f, "Aprobar", lambda f: self._accion(self.logica.aprobar, f))
        self.eq.add_widget(etiqueta("Personas del equipo", 16, TEXTO, True))
        for f in filas:
            if f["estado"] == "pendiente" or f["id"] == yo:
                continue
            if f["rol"] == "admin" or (f["rol"] == "director" and self.logica.perfil.rol != "admin"):
                self._fila(self.eq, f)
            elif f["estado"] == "suspendido":
                self._fila(self.eq, f, "Reactivar", lambda f: self._accion(self.logica.reactivar, f), VERDE)
            else:
                self._fila(self.eq, f, "Suspender", lambda f: self._accion(lambda i: self.logica.suspender(i, "Suspendida desde la app"), f), ROJO,
                           permisos=f["rol"] == "colaborador" and f["estado"] == "activo")

    def _accion(self, fn, f):
        en_hilo(lambda: fn(f["id"]), lambda _: self.cargar(), lambda e: setattr(self.msg, "text", texto_error(e)))

    def invitar(self, *_):
        self.msg.text = ""
        nombre = self.nombre.text.strip()
        if not nombre:
            self.msg.text = "Escribe el nombre de la persona."
            return
        rol = "director" if self.rol.text == "Director" else "colaborador"
        en_hilo(lambda: self.logica.invitar(nombre, self.cel.text, self.mail.text, rol), lambda r: self._listo(nombre, r),
                lambda e: setattr(self.msg, "text", texto_error(e)))

    def _listo(self, nombre, r):
        cod = r["codigo"]
        txt = f"Hola {nombre}, te invito a Pijao nos une. Descarga la app y crea tu cuenta con este código: {cod} (vence en 72 horas)."
        self.nombre.text = self.cel.text = self.mail.text = ""
        dialogo("Invitación creada", f"Código de {nombre}:\n\n{cod}\n\nSirve una sola vez y vence en 72 horas.",
                [("Copiar", lambda: Clipboard.copy(txt)), ("WhatsApp", lambda: webbrowser.open("https://wa.me/?text=" + quote(txt))), ("Cerrar", None)])


class PerfilPage(Screen):
    def __init__(self, logica, salir, **kw):
        super().__init__(name="perfil", **kw)
        self.logica = logica
        sv = ScrollView(do_scroll_x=False, bar_width=0)
        col = BoxLayout(orientation="vertical", size_hint_y=None, padding=[dp(16), dp(18), dp(16), dp(24)], spacing=dp(14))
        col.bind(minimum_height=col.setter("height"))
        sv.add_widget(col)
        self.add_widget(sv)
        col.add_widget(etiqueta("Mi perfil", 24, TEXTO, True))
        t = Tarjeta()
        self.nombre, self.rol, self.estado = etiqueta("", 18, TEXTO, True), etiqueta("", 14, GRIS), etiqueta("", 14, GRIS)
        for w in (self.nombre, self.rol, self.estado):
            t.add_widget(w)
        col.add_widget(t)
        col.add_widget(Boton("Cerrar sesión", color=CLARO, texto_color=ROJO, on_release=lambda *_: salir()))
        col.add_widget(etiqueta("Pijao nos une · versión 0.10.1", 12, GRIS, halign="center"))

    def on_pre_enter(self, *_):
        p = self.logica.perfil
        if p:
            self.nombre.text, self.rol.text, self.estado.text = p.nombre, ROLES.get(p.rol, p.rol), "Estado: " + ESTADOS.get(p.estado, p.estado)


class PrincipalScreen(Screen):
    def __init__(self, logica, **kw):
        super().__init__(name="principal", **kw)
        self.logica = logica
        raiz = BoxLayout(orientation="vertical")
        self.paginas = ScreenManager(transition=FadeTransition(duration=.18))
        self.mapa = PantallaMapa(logica)
        self.paginas.add_widget(InicioPage(logica, self.ir))
        self.paginas.add_widget(self.mapa)
        self.paginas.add_widget(TareasPage(logica))
        self.paginas.add_widget(PerfilPage(logica, self.salir))
        self.equipo = None
        self.botones = {}
        self.nav = BoxLayout(size_hint_y=None, height=dp(66), padding=[dp(8), 0])
        pintar(self.nav, BLANCO, 0)
        raiz.add_widget(self.paginas)
        raiz.add_widget(self.nav)
        self.add_widget(raiz)

    def on_pre_enter(self, *_):
        if self.logica.puede_gestionar_equipo and self.equipo is None:
            self.equipo = EquipoPage(self.logica)
            self.paginas.add_widget(self.equipo)
        items = [("casa", "Inicio", "inicio"), ("mapa_nav", "Mapa", "mapa"), ("visita", "Tareas", "tareas")] \
            + ([("equipo", "Equipo", "equipo")] if self.equipo else []) + [("perfil", "Perfil", "perfil")]
        self.nav.clear_widgets()
        self.botones = {}
        for tipo, texto, destino in items:
            b = ItemNav(tipo, texto)
            b.bind(on_release=lambda _, d=destino: self.ir(d))
            self.botones[destino] = b
            self.nav.add_widget(b)
        self.ir("inicio")

    def ir(self, nombre: str) -> None:
        if self.paginas.current == nombre:                  # ya estaba ahí: refrescar a mano
            self.paginas.get_screen(nombre).on_pre_enter()
        else:
            self.paginas.current = nombre
        for k, b in self.botones.items():
            b.activar(k == nombre)

    def salir(self) -> None:
        pendientes = self.logica.estado_cola().get("por_enviar", 0)
        if pendientes:
            return dialogo("Tienes registros sin enviar",
                           f"Hay {pendientes} registro(s) que aún no llegan al servidor. Sincroniza con internet antes de cerrar sesión "
                           "para que queden a tu nombre.", [("Cerrar igual", self._salir), ("Cancelar", None)])
        self._salir()

    def _salir(self) -> None:
        self.mapa.gps.detener()
        self.logica.cerrar_sesion(borrar_datos=True)    # no deja datos de personas en el teléfono al salir
        self.mapa.refrescar()
        if self.equipo is not None:
            self.paginas.remove_widget(self.equipo)
            self.equipo = None
        self.manager.current = "login"
