"""Identidad visual (azul, verde y naranja del logo) y piezas reutilizables."""
from __future__ import annotations

import math
import os
import threading

from kivy.clock import Clock
from kivy.graphics import Color, Ellipse, Line, Rectangle, RoundedRectangle, Triangle
from kivy.metrics import dp, sp
from kivy.properties import ListProperty, NumericProperty, StringProperty
from kivy.animation import Animation
from kivy.uix.anchorlayout import AnchorLayout
from kivy.uix.behaviors import ButtonBehavior
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.floatlayout import FloatLayout
from kivy.uix.button import Button
from kivy.uix.label import Label
from kivy.uix.popup import Popup
from kivy.uix.textinput import TextInput
from kivy.uix.widget import Widget

ASSETS = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "assets"))
AZUL, AZUL_OSC = (.106, .247, .545, 1), (.043, .165, .376, 1)
VERDE, NARANJA, ROJO = (.18, .64, .45, 1), (.949, .549, .157, 1), (.80, .20, .20, 1)
FONDO, BLANCO, TEXTO, GRIS, LINEA = (.953, .965, .984, 1), (1, 1, 1, 1), (.10, .13, .20, 1), (.45, .50, .58, 1), (.88, .91, .95, 1)
CLARO = (.94, .95, .97, 1)


def pintar(w, color, radio=18, lados=None):
    """Fondo redondeado que acompaña al widget. Devuelve el Color para poder cambiarlo."""
    with w.canvas.before:
        c = Color(*color)
        f = RoundedRectangle(pos=w.pos, size=w.size, radius=lados or [dp(radio)] * 4)
    w.bind(pos=lambda _, v: setattr(f, "pos", v), size=lambda _, v: setattr(f, "size", v))
    return c


def etiqueta(texto, tam=14, color=TEXTO, negrita=False, **kw):
    l = Label(text=texto, font_size=sp(tam), color=color, bold=negrita, halign=kw.pop("halign", "left"),
              valign="middle", size_hint_y=None, **kw)
    l.bind(width=lambda w, v: setattr(w, "text_size", (v, None)))
    l.bind(texture_size=lambda w, s: setattr(w, "height", max(s[1], dp(20))))
    return l


class Tarjeta(BoxLayout):
    def __init__(self, color=BLANCO, radio=20, **kw):
        kw.setdefault("orientation", "vertical")
        kw.setdefault("padding", dp(16))
        kw.setdefault("spacing", dp(8))
        kw.setdefault("size_hint_y", None)
        super().__init__(**kw)
        pintar(self, color, radio)
        self.bind(minimum_height=lambda _, h: setattr(self, "height", h))


class Boton(Button):
    def __init__(self, texto, color=NARANJA, texto_color=BLANCO, radio=26, **kw):
        kw.setdefault("size_hint_y", None)
        kw.setdefault("height", dp(52))
        super().__init__(text=texto, background_normal="", background_down="", background_color=(0, 0, 0, 0),
                         color=texto_color, bold=True, **kw)
        self._base = color
        self._c = pintar(self, color, radio)
        self.bind(state=lambda _, e: setattr(self._c, "rgba", tuple(x * .85 for x in color[:3]) + (1,) if e == "down" else color))


class Campo(BoxLayout):
    """Campo de texto: contenedor redondeado + TextInput transparente con el texto centrado según su altura de línea."""

    def __init__(self, pista, clave=False, multilinea=False, input_type="text", **kw):
        kw.setdefault("size_hint_y", None)
        kw.setdefault("height", dp(96) if multilinea else dp(52))
        super().__init__(padding=[dp(16), dp(6)], **kw)
        self._c = pintar(self, CLARO, 16)
        self.ti = TextInput(hint_text=pista, password=clave, multiline=multilinea, input_type=input_type,
                            background_normal="", background_active="", background_color=(0, 0, 0, 0),
                            foreground_color=TEXTO, hint_text_color=(.42, .47, .55, 1), cursor_color=AZUL,
                            font_size=sp(16), padding=[0, dp(10) if multilinea else 0, 0, 0], write_tab=False)
        if not multilinea:
            self.ti.bind(height=self._centrar)
            Clock.schedule_once(self._centrar, 0)
            Clock.schedule_once(self._centrar, .3)
        self.ti.bind(focus=lambda _, f: setattr(self._c, "rgba", (.89, .93, .99, 1) if f else CLARO))
        self.add_widget(self.ti)

    def _centrar(self, *_):
        try:
            lh = self.ti.line_height
        except Exception:                           # noqa: BLE001
            lh = self.ti.font_size * 1.4
        py = max(0, (self.ti.height - lh) / 2)
        self.ti.padding = [0, py, 0, py]

    @property
    def text(self):
        return self.ti.text

    @text.setter
    def text(self, valor):
        self.ti.text = valor


class Girando(Widget):
    """Indicador de carga: arco naranja que gira suave."""
    angulo = NumericProperty(0)

    def __init__(self, **kw):
        super().__init__(size_hint=(None, None), size=(dp(56), dp(56)), **kw)
        self.bind(angulo=self._d, pos=self._d, size=self._d)
        self._d()

    def _d(self, *_):
        self.canvas.clear()
        r = self.width / 2 - dp(4)
        with self.canvas:
            Color(*LINEA)
            Line(circle=(self.center_x, self.center_y, r), width=dp(4))
            Color(*NARANJA)
            Line(circle=(self.center_x, self.center_y, r, self.angulo, self.angulo + 110), width=dp(4), cap="round")

    def iniciar(self):
        self.angulo = 0
        a = Animation(angulo=360, d=.9, t="linear")
        a.bind(on_complete=lambda *_: self.iniciar() if self.parent else None)
        a.start(self)


def en_hilo(trabajo, ok=None, fallo=None):
    """Corre una tarea de red sin congelar la pantalla."""
    def correr():
        try:
            r = trabajo()
        except Exception as e:                    # noqa: BLE001 - se muestra al usuario
            Clock.schedule_once(lambda dt, err=e: fallo(err) if fallo else None, 0)
            return
        Clock.schedule_once(lambda dt: ok(r) if ok else None, 0)
    threading.Thread(target=correr, daemon=True).start()


def texto_error(e) -> str:
    m = getattr(e, "mensaje", None) or str(e)
    if e.__class__.__name__ == "SinConexion":
        return "Sin conexión a internet."
    for ing, esp in (("Invalid login", "Correo o contraseña incorrectos."), ("not confirmed", "Confirma tu correo antes de ingresar."),
                     ("already registered", "Ese correo ya tiene una cuenta."), ("Se necesita una invitaci", "El código de invitación no es válido o venció.")):
        if ing in m:
            return esp
    return m or "Ocurrió un error."


def dialogo(titulo, texto, botones, contenido=None):
    caja = BoxLayout(orientation="vertical", padding=dp(14), spacing=dp(12))
    msg = Label(text=texto, halign="center", valign="middle", color=TEXTO)
    msg.bind(size=lambda w, s: setattr(w, "text_size", (s[0], None)))
    caja.add_widget(contenido if contenido is not None else msg)
    pop = Popup(title=titulo, content=caja, size_hint=(.92, None), height=dp(520 if contenido is not None else 320), auto_dismiss=False,
                background="", background_color=BLANCO, title_color=TEXTO, separator_color=NARANJA)
    fila = BoxLayout(size_hint_y=None, height=dp(52), spacing=dp(8))
    for t, f in botones:
        b = Boton(t, color=NARANJA if f else CLARO, texto_color=BLANCO if f else AZUL, height=dp(48))
        b.bind(on_release=lambda *_, f=f: (pop.dismiss(), f() if f else None))
        fila.add_widget(b)
    caja.add_widget(fila)
    pop.open()


class Icono(Widget):
    """Iconos dibujados con formas simples (sin imágenes ni fuentes)."""
    tipo = StringProperty("casa")
    color = ListProperty(AZUL)

    def __init__(self, tipo, color=AZUL, **kw):
        kw.setdefault("size_hint", (None, None))
        kw.setdefault("size", (dp(30), dp(30)))
        super().__init__(**kw)
        self.tipo, self.color = tipo, list(color)
        self.bind(pos=self._d, size=self._d, tipo=self._d, color=self._d)
        self._d()

    def _d(self, *_):
        self.canvas.clear()
        s = min(self.width, self.height)
        with self.canvas:
            getattr(self, "_" + self.tipo, self._casa)(self.center_x - s / 2, self.center_y - s / 2, s)

    def _casa(self, x, y, s):
        Color(*self.color)
        Triangle(points=[x + .06 * s, y + .5 * s, x + .5 * s, y + .92 * s, x + .94 * s, y + .5 * s])
        Rectangle(pos=(x + .18 * s, y + .08 * s), size=(.64 * s, .45 * s))
        Color(*NARANJA)
        Rectangle(pos=(x + .42 * s, y + .08 * s), size=(.16 * s, .27 * s))

    def _mapa(self, x, y, s):
        Color(.89, .93, .99, 1)
        RoundedRectangle(pos=(x, y), size=(s, s), radius=[.22 * s] * 4)
        Color(1, 1, 1, 1)
        Line(points=[x + .08 * s, y + .3 * s, x + .92 * s, y + .3 * s], width=dp(2))
        Line(points=[x + .7 * s, y + .06 * s, x + .7 * s, y + .94 * s], width=dp(2))
        Color(*VERDE[:3], .55)
        RoundedRectangle(pos=(x + .1 * s, y + .06 * s), size=(.42 * s, .17 * s), radius=[.05 * s] * 4)
        self._pin(x, y, s)

    def _pin(self, x, y, s):
        Color(*NARANJA)
        Ellipse(pos=(x + .28 * s, y + .5 * s), size=(.34 * s, .34 * s))
        Triangle(points=[x + .31 * s, y + .58 * s, x + .59 * s, y + .58 * s, x + .45 * s, y + .28 * s])
        Color(1, 1, 1, 1)
        Ellipse(pos=(x + .39 * s, y + .61 * s), size=(.12 * s, .12 * s))

    def _mapa_nav(self, x, y, s):                       # pin del color de la barra
        Color(*self.color)
        Ellipse(pos=(x + .22 * s, y + .42 * s), size=(.56 * s, .56 * s))
        Triangle(points=[x + .27 * s, y + .55 * s, x + .73 * s, y + .55 * s, x + .5 * s, y + .06 * s])
        Color(1, 1, 1, 1)
        Ellipse(pos=(x + .39 * s, y + .59 * s), size=(.22 * s, .22 * s))

    def _visita(self, x, y, s):
        Color(*self.color)
        Line(rounded_rectangle=(x + .18 * s, y + .04 * s, .64 * s, .8 * s, .08 * s), width=dp(2))
        Rectangle(pos=(x + .34 * s, y + .78 * s), size=(.32 * s, .16 * s))
        Color(*NARANJA)
        Line(points=[x + .3 * s, y + .42 * s, x + .45 * s, y + .28 * s, x + .7 * s, y + .6 * s], width=dp(2.4))

    def _equipo(self, x, y, s):
        Color(*self.color)
        for cx in (.3, .7):
            Ellipse(pos=(x + (cx - .13) * s, y + .52 * s), size=(.26 * s, .26 * s))
            RoundedRectangle(pos=(x + (cx - .21) * s, y + .1 * s), size=(.42 * s, .36 * s), radius=[.18 * s, .18 * s, 0, 0])

    def _perfil(self, x, y, s):
        Color(*self.color)
        Ellipse(pos=(x + .32 * s, y + .5 * s), size=(.36 * s, .36 * s))
        RoundedRectangle(pos=(x + .16 * s, y + .06 * s), size=(.68 * s, .38 * s), radius=[.2 * s, .2 * s, 0, 0])

    def _sync(self, x, y, s):
        cx, cy, r = x + .5 * s, y + .5 * s, .3 * s
        Color(*self.color)
        for a0, a1 in ((25, 150), (205, 330)):
            Line(circle=(cx, cy, r, a0, a1), width=dp(2.2), cap="round")
            a = math.radians(a1)
            px, py, tx, ty, nx, ny = cx + r * math.sin(a), cy + r * math.cos(a), math.cos(a), -math.sin(a), math.sin(a), math.cos(a)
            Triangle(points=[px + tx * .18 * s, py + ty * .18 * s, px + nx * .13 * s, py + ny * .13 * s, px - nx * .13 * s, py - ny * .13 * s])


class TileSeccion(ButtonBehavior, BoxLayout):
    """Acceso con una pequeña representación arriba y su nombre abajo (como las categorías del video)."""

    def __init__(self, tipo, texto, **kw):
        super().__init__(orientation="vertical", size_hint=(None, None), size=(dp(86), dp(116)), spacing=dp(6), **kw)
        caja = FloatLayout(size_hint_y=None, height=dp(80))
        pintar(caja, BLANCO, 22)
        caja.add_widget(Icono(tipo, AZUL, size=(dp(44), dp(44)), pos_hint={"center_x": .5, "center_y": .5}))
        self.add_widget(caja)
        self.add_widget(etiqueta(texto, 12, TEXTO, True, halign="center"))


class ItemNav(ButtonBehavior, BoxLayout):
    def __init__(self, tipo, texto, **kw):
        super().__init__(orientation="vertical", spacing=dp(2), padding=[0, dp(6)], **kw)
        self.icono = Icono(tipo, GRIS, size=(dp(26), dp(26)))
        centro = AnchorLayout(anchor_x="center", anchor_y="center", size_hint_y=None, height=dp(30))
        centro.add_widget(self.icono)
        self.texto = Label(text=texto, font_size=sp(11), color=GRIS, size_hint_y=None, height=dp(16))
        self.add_widget(centro)
        self.add_widget(self.texto)

    def activar(self, si: bool) -> None:
        self.icono.color = list(AZUL if si else GRIS)
        self.texto.color = AZUL if si else GRIS
        self.texto.bold = si


class BotonRedondo(ButtonBehavior, FloatLayout):
    def __init__(self, tipo, **kw):
        kw.setdefault("size_hint", (None, None))
        kw.setdefault("size", (dp(46), dp(46)))
        super().__init__(**kw)
        pintar(self, (1, 1, 1, .18), 23)
        self.add_widget(Icono(tipo, BLANCO, size=(dp(24), dp(24)), pos_hint={"center_x": .5, "center_y": .5}))
