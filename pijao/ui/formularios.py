"""Piezas de formulario reutilizables: selector con título, casilla, campo con título y firma con el dedo."""
from __future__ import annotations

from kivy.graphics import Color, Line
from kivy.metrics import dp
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.checkbox import CheckBox
from kivy.uix.spinner import Spinner
from kivy.uix.widget import Widget

from ..core.catalogos import CATALOGOS
from .tema import AZUL, CLARO, GRIS, TEXTO, Campo, etiqueta, pintar

ELEGIR = "Elegir…"


def opciones(cat: str) -> list[tuple[str, str]]:
    return [(c, e) for c, e in CATALOGOS[cat]["opciones"]]


def entero(texto) -> int | None:
    try:
        return int(str(texto).strip())
    except ValueError:
        return None


class Selector(BoxLayout):
    """Título pequeño + lista desplegable. `valor` devuelve la clave elegida (o None)."""

    def __init__(self, titulo: str, opciones_: list[tuple[str, str]], **kw):
        kw.setdefault("size_hint_y", None)
        kw.setdefault("height", dp(80))
        super().__init__(orientation="vertical", spacing=dp(2), **kw)
        self._clave = {e: c for c, e in opciones_}
        self._etq = {c: e for c, e in opciones_}
        self.add_widget(etiqueta(titulo, 12, GRIS))
        self.sp = Spinner(text=ELEGIR, values=[e for _, e in opciones_], size_hint_y=None, height=dp(48),
                          background_normal="", background_color=CLARO, color=TEXTO)
        self.add_widget(self.sp)

    def poner_opciones(self, opciones_: list[tuple[str, str]]) -> None:
        self._clave = {e: c for c, e in opciones_}
        self._etq = {c: e for c, e in opciones_}
        self.sp.values = [e for _, e in opciones_]
        if self.sp.text not in self._clave:
            self.sp.text = ELEGIR

    @property
    def valor(self):
        return self._clave.get(self.sp.text)

    def fijar(self, clave) -> None:
        self.sp.text = self._etq.get(clave, ELEGIR)


class Casilla(BoxLayout):
    def __init__(self, texto: str, activo: bool = False, **kw):
        kw.setdefault("size_hint_y", None)
        kw.setdefault("height", dp(46))
        super().__init__(spacing=dp(8), **kw)
        self.ck = CheckBox(active=activo, size_hint=(None, None), size=(dp(40), dp(40)))
        self.add_widget(self.ck)
        self.add_widget(etiqueta(texto, 13, TEXTO))

    @property
    def activo(self) -> bool:
        return bool(self.ck.active)

    @activo.setter
    def activo(self, v: bool) -> None:
        self.ck.active = bool(v)


class ConTitulo(BoxLayout):
    """Campo de texto con un título pequeño encima."""

    def __init__(self, titulo: str, pista: str = "", **kw):
        multi = kw.pop("multilinea", False)
        tipo = kw.pop("input_type", "text")
        campo = Campo(pista or titulo, multilinea=multi, input_type=tipo)
        kw.setdefault("size_hint_y", None)
        kw.setdefault("height", campo.height + dp(24))
        super().__init__(orientation="vertical", spacing=dp(2), **kw)
        self.campo = campo
        self.add_widget(etiqueta(titulo, 12, GRIS))
        self.add_widget(campo)

    @property
    def text(self) -> str:
        return self.campo.text

    @text.setter
    def text(self, v: str) -> None:
        self.campo.text = v


class Firma(Widget):
    """Lienzo para firmar con el dedo. Guarda los trazos (coordenadas relativas) como evidencia."""

    def __init__(self, **kw):
        kw.setdefault("size_hint_y", None)
        kw.setdefault("height", dp(190))
        super().__init__(**kw)
        self.trazos: list[list[list[float]]] = []
        pintar(self, CLARO, 14)
        self.bind(pos=self._redibujar, size=self._redibujar)

    def trazo_nuevo(self, x: float, y: float) -> None:
        self.trazos.append([[x, y]])
        self._redibujar()

    def punto(self, x: float, y: float) -> None:
        if self.trazos:
            self.trazos[-1].append([x, y])
            self._redibujar()

    def borrar(self) -> None:
        self.trazos = []
        self._redibujar()

    @property
    def vacia(self) -> bool:
        return sum(len(t) for t in self.trazos) < 8

    def a_datos(self) -> list:
        w, h = max(self.width, 1), max(self.height, 1)
        return [[[round((x - self.x) / w, 3), round((y - self.y) / h, 3)] for x, y in t] for t in self.trazos]

    def _redibujar(self, *_):
        self.canvas.after.clear()
        with self.canvas.after:
            Color(*AZUL)
            for t in self.trazos:
                if len(t) > 1:
                    Line(points=[c for p in t for c in p], width=dp(2.2))

    def on_touch_down(self, touch):
        if not self.collide_point(*touch.pos):
            return super().on_touch_down(touch)
        touch.grab(self)
        self.trazo_nuevo(touch.x, touch.y)
        return True

    def on_touch_move(self, touch):
        if touch.grab_current is self:
            self.punto(touch.x, touch.y)
            return True
        return super().on_touch_move(touch)

    def on_touch_up(self, touch):
        if touch.grab_current is self:
            touch.ungrab(self)
            return True
        return super().on_touch_up(touch)
