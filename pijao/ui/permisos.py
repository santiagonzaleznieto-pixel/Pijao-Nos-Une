"""Permisos opcionales de un colaborador (4.5 a 4.7): plantillas, vencimiento y uno por uno."""
from __future__ import annotations

from kivy.app import App
from kivy.metrics import dp
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.scrollview import ScrollView
from kivy.uix.screenmanager import Screen

from ..core.permisos import PERMISOS, PLANTILLAS
from .formularios import Casilla, Selector
from .tema import AZUL, CLARO, GRIS, ROJO, TEXTO, Boton, Tarjeta, dialogo, en_hilo, etiqueta, texto_error

VENCE = [("0", "Sin vencimiento"), ("7", "7 días"), ("30", "30 días"), ("90", "90 días")]


class PermisosScreen(Screen):
    def __init__(self, logica, **kw):
        super().__init__(name="permisos", **kw)
        self.logica, self.persona, self.casillas = logica, None, {}
        sv = ScrollView(do_scroll_x=False, bar_width=0)
        self.col = BoxLayout(orientation="vertical", size_hint_y=None, padding=[dp(16), dp(18), dp(16), dp(24)], spacing=dp(12))
        self.col.bind(minimum_height=self.col.setter("height"))
        sv.add_widget(self.col)
        self.add_widget(sv)
        self.titulo, self.msg = etiqueta("", 22, TEXTO, True), etiqueta("", 13, ROJO)
        self.plantilla, self.vence = Selector("Plantilla de permisos", [(n, n) for n in PLANTILLAS]), Selector("Duración", VENCE)
        self.lista = Tarjeta()
        for c, d in PERMISOS.items():
            self.casillas[c] = Casilla(f"{d.nombre}" + ("  ·  riesgo alto" if d.riesgo == "alto" else ""))
            self.lista.add_widget(self.casillas[c])
        for w in (self.titulo, etiqueta("Los permisos opcionales amplían lo que puede ver o hacer. Todo cambio queda en la auditoría. Los de riesgo alto "
                                        "también exigen verificación en dos pasos (llega en la siguiente parte).", 12, GRIS),
                  self.plantilla, self.vence, Boton("Aplicar plantilla", color=CLARO, texto_color=AZUL, on_release=lambda *_: self.aplicar()),
                  self.lista, self.msg, Boton("Guardar cambios", on_release=lambda *_: self.guardar()),
                  Boton("Volver", color=CLARO, texto_color=AZUL, on_release=lambda *_: self.volver())):
            self.col.add_widget(w)

    def abrir(self, persona: dict) -> None:
        self.persona, self.msg.text = persona, ""
        self.titulo.text = f"Permisos de {persona['nombre_completo']}"
        for c in self.casillas.values():
            c.activo = False
        en_hilo(lambda: self.logica.permisos_activos(persona["id"]), self._marcar, lambda e: setattr(self.msg, "text", texto_error(e)))
        App.get_running_app().root.current = "permisos"

    def _marcar(self, activos: set) -> None:
        for c, w in self.casillas.items():
            w.activo = c in activos

    def _dias(self):
        d = int(self.vence.valor or 0)
        return d or None

    def aplicar(self) -> None:
        nombre = self.plantilla.valor
        if not nombre:
            self.msg.text = "Elige una plantilla."
            return
        en_hilo(lambda: self.logica.aplicar_plantilla(self.persona["id"], nombre, self._dias()), lambda _: self.abrir(self.persona),
                lambda e: setattr(self.msg, "text", texto_error(e)))

    def guardar(self) -> None:
        quedan = {c for c, w in self.casillas.items() if w.activo}
        en_hilo(lambda: self.logica.guardar_permisos(self.persona["id"], quedan, self._dias()),
                lambda n: dialogo("Permisos guardados", f"Se hicieron {n} cambios." if n else "No había cambios.", [("Listo", None)]),
                lambda e: setattr(self.msg, "text", texto_error(e)))

    def volver(self) -> None:
        App.get_running_app().root.current = "principal"
