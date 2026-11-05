"""Si algo falla, la app no se cierra en silencio: guarda el error y lo muestra para poder enviarlo."""
from __future__ import annotations

import os
import time
import traceback

from kivy.app import App
from kivy.base import ExceptionHandler, ExceptionManager
from kivy.clock import Clock
from kivy.metrics import dp
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.button import Button
from kivy.uix.popup import Popup
from kivy.uix.screenmanager import Screen
from kivy.uix.textinput import TextInput


class Manejador(ExceptionHandler):
    vistos: set = set()

    def handle_exception(self, inst):
        texto = "".join(traceback.format_exception(type(inst), inst, inst.__traceback__))
        try:
            app = App.get_running_app()
            with open(os.path.join(app.user_data_dir, "errores.log"), "a", encoding="utf-8") as f:
                f.write(time.strftime("%Y-%m-%d %H:%M:%S") + "\n" + texto + "\n")
        except Exception:                           # noqa: BLE001
            pass
        clave = texto[-300:]
        if clave not in self.vistos and len(self.vistos) < 3:
            self.vistos.add(clave)
            Clock.schedule_once(lambda dt: mostrar(texto), 0)
        return ExceptionManager.PASS


def mostrar(texto: str) -> None:
    caja = BoxLayout(orientation="vertical", padding=dp(8), spacing=dp(8))
    caja.add_widget(TextInput(text=texto, readonly=True, font_size="11sp"))
    cerrar = Button(text="Cerrar", size_hint_y=None, height=dp(48))
    caja.add_widget(cerrar)
    pop = Popup(title="Ocurrió un error (toma una captura y envíamela)", content=caja, size_hint=(.96, .8))
    cerrar.bind(on_release=pop.dismiss)
    pop.open()


def instalar() -> None:
    ExceptionManager.add_handler(Manejador())


class PantallaFallo(Screen):
    """Ocupa el lugar de una pantalla que no pudo construirse, para que la app abra igual y se vea el error."""

    def __init__(self, nombre: str, texto: str, **kw):
        super().__init__(name=nombre, **kw)
        self.add_widget(TextInput(text=f"La pantalla «{nombre}» falló. Toma una captura y envíala:\n\n{texto}", readonly=True, font_size="11sp"))
