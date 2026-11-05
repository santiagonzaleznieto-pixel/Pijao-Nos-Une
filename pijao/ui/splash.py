"""Bienvenida animada: el logo aparece con un pulso suave, entra el lema y una barra fina de carga."""
from __future__ import annotations

import os

from kivy.animation import Animation
from kivy.clock import Clock
from kivy.graphics import Color, Ellipse, Rectangle, RoundedRectangle
from kivy.metrics import dp
from kivy.properties import NumericProperty
from kivy.uix.floatlayout import FloatLayout
from kivy.uix.image import Image
from kivy.uix.screenmanager import Screen
from kivy.uix.widget import Widget

from .tema import ASSETS, AZUL, BLANCO, GRIS, LINEA, NARANJA, etiqueta


class Barra(Widget):
    progreso = NumericProperty(0)

    def __init__(self, **kw):
        super().__init__(size_hint=(None, None), size=(dp(150), dp(4)), **kw)
        self.bind(progreso=self._d, pos=self._d, size=self._d)

    def _d(self, *_):
        self.canvas.clear()
        with self.canvas:
            Color(*LINEA)
            RoundedRectangle(pos=self.pos, size=self.size, radius=[dp(2)])
            Color(*NARANJA)
            RoundedRectangle(pos=self.pos, size=(self.width * self.progreso, self.height), radius=[dp(2)])


class SplashScreen(Screen):
    def __init__(self, app_logica, **kw):
        super().__init__(name="splash", **kw)
        self.logica = app_logica
        self.lado = dp(250)
        r = FloatLayout()
        with r.canvas.before:
            Color(*BLANCO)
            fondo = Rectangle(pos=r.pos, size=r.size)
        r.bind(pos=lambda _, v: setattr(fondo, "pos", v), size=lambda _, v: setattr(fondo, "size", v))
        self.aro = Widget(size_hint=(None, None), size=(self.lado * .7,) * 2, pos_hint={"center_x": .5, "center_y": .58}, opacity=0)
        with self.aro.canvas:
            Color(*AZUL[:3], .12)
            el = Ellipse(pos=self.aro.pos, size=self.aro.size)
        self.aro.bind(pos=lambda _, v: setattr(el, "pos", v), size=lambda _, v: setattr(el, "size", v))
        self.logo = Image(source=os.path.join(ASSETS, "logo.png"), size_hint=(None, None), size=(self.lado * .72,) * 2,
                          pos_hint={"center_x": .5, "center_y": .58}, opacity=0, fit_mode="contain")
        self.lema = etiqueta("Escuchamos. Registramos. Construimos juntos.", 14, GRIS, halign="center",
                             size_hint=(.8, None), pos_hint={"center_x": .5, "center_y": .30}, opacity=0)
        self.barra = Barra(pos_hint={"center_x": .5, "y": .12})
        for w in (self.aro, self.logo, self.lema, self.barra):
            r.add_widget(w)
        self.add_widget(r)

    def on_enter(self, *_):
        L = self.lado
        Animation(opacity=1, d=1.0, t="out_quad").start(self.logo)
        Animation(size=(L, L), d=1.7, t="out_expo").start(self.logo)
        self.aro.opacity = .9
        Animation(size=(L * 1.4, L * 1.4), opacity=0, d=2.0, t="out_quart").start(self.aro)
        Clock.schedule_once(lambda dt: Animation(opacity=1, d=.9, t="out_cubic").start(self.lema), .9)
        Animation(progreso=1, d=2.6, t="in_out_sine").start(self.barra)
        Clock.schedule_once(self._siguiente, 3.3)

    def _siguiente(self, dt):
        try:
            p = self.logica.perfil_guardado()
            sesion = bool(p and self.logica.remoto.tiene_sesion)
            destino = "principal" if (sesion and p.activo) else "curso" if (sesion and p.estado == "aprobado") else "login"
            if destino == "curso":
                self.manager.get_screen("curso").iniciar()
        except Exception:                           # noqa: BLE001 - ante cualquier duda, ir al ingreso
            destino = "login"
        self.manager.current = destino
