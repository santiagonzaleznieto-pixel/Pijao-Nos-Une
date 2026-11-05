"""Aplicación Kivy: bienvenida animada, ingreso, estructura principal y registro de visitas."""
from __future__ import annotations

import json
import os
import traceback

from kivy.app import App
from kivy.core.window import Window
from kivy.uix.screenmanager import FadeTransition, ScreenManager

from ..data.localdb import LocalDB
from ..data.remoto import Remoto
from ..servicios.aplicacion import Aplicacion
from .curso import CursoScreen
from .errores import PantallaFallo
from .login import LoginScreen, RegistroScreen
from .permisos import PermisosScreen
from .principal import PrincipalScreen
from .splash import SplashScreen
from .tema import FONDO
from .visita import PantallaVisita


def _config() -> dict:
    """En Android no hay variables de entorno: se lee config.json (solo URL y clave anon, nunca service_role)."""
    ruta = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "config.json")
    try:
        with open(ruta, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


class PijaoApp(App):
    title = "Pijao nos une"

    def build(self):
        cfg = _config()
        Window.clearcolor = FONDO
        Window.softinput_mode = "below_target"
        db = LocalDB(os.path.join(self.user_data_dir, "pijao.db"))
        remoto = Remoto(os.environ.get("PIJAO_SUPABASE_URL") or cfg.get("supabase_url", ""),
                        os.environ.get("PIJAO_SUPABASE_ANON_KEY") or cfg.get("supabase_anon_key", ""),
                        al_cambiar_tokens=lambda t: db.set_meta("tokens", t))
        t = db.get_meta("tokens")
        if t:
            remoto.cargar_tokens(t.get("access_token"), t.get("refresh_token"), t.get("expira_en", 0.0), t.get("usuario_id"))
        self.logica = Aplicacion(db, remoto)
        sm = ScreenManager(transition=FadeTransition(duration=.55))
        for nombre, clase in (("splash", SplashScreen), ("login", LoginScreen), ("registro", RegistroScreen),
                              ("curso", CursoScreen), ("principal", PrincipalScreen), ("visita", PantallaVisita), ("permisos", PermisosScreen)):
            try:
                sm.add_widget(clase(self.logica))
            except Exception:                           # noqa: BLE001 - la app abre igual y muestra el error
                sm.add_widget(PantallaFallo(nombre, traceback.format_exc()))
        return sm
