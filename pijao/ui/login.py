"""Ingreso con hoja inferior (como la referencia), carga animada y registro con código de invitación."""
from __future__ import annotations

import os

from kivy.animation import Animation
from kivy.graphics import Color, Ellipse, Rectangle
from kivy.metrics import dp
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.checkbox import CheckBox
from kivy.uix.floatlayout import FloatLayout
from kivy.uix.image import Image
from kivy.uix.scrollview import ScrollView
from kivy.uix.screenmanager import Screen
from kivy.uix.spinner import Spinner

from .tema import (ASSETS, AZUL, BLANCO, CLARO, FONDO, GRIS, NARANJA, ROJO, TEXTO, Boton, Campo, Girando, Tarjeta,
                   dialogo, en_hilo, etiqueta, pintar, texto_error)

MENSAJE_ESTADO = {
    "pendiente": "Tu cuenta espera la aprobación del Director.",
    "suspendido": "Tu cuenta está suspendida. Habla con el Director.",
    "baja": "Tu cuenta fue dada de baja.",
}


def _fondo_suave(root):
    with root.canvas.before:
        Color(*FONDO)
        f = Rectangle(pos=root.pos, size=root.size)
        Color(*AZUL[:3], .08)
        a = Ellipse(size=(dp(420), dp(420)))
        Color(*NARANJA[:3], .10)
        b = Ellipse(size=(dp(300), dp(300)))

    def poner(*_):
        f.pos, f.size = root.pos, root.size
        a.pos = (root.right - dp(260), root.top - dp(260))
        b.pos = (root.x - dp(120), root.top - dp(330))
    root.bind(pos=poner, size=poner)


class LoginScreen(Screen):
    def __init__(self, app_logica, **kw):
        super().__init__(name="login", **kw)
        self.logica = app_logica
        self.root_ = FloatLayout()
        _fondo_suave(self.root_)
        self.logo = Image(source=os.path.join(ASSETS, "logo.png"), size_hint=(None, None), size=(dp(210), dp(210)),
                          pos_hint={"center_x": .5, "top": .97}, fit_mode="contain", opacity=0)
        self.root_.add_widget(self.logo)
        self.hoja = BoxLayout(orientation="vertical", size_hint=(1, None), height=dp(410), padding=[dp(24), dp(24), dp(24), dp(16)],
                              spacing=dp(12), pos=(0, -dp(420)))
        pintar(self.hoja, BLANCO, lados=[dp(30), dp(30), 0, 0])
        self.hoja.add_widget(etiqueta("Bienvenido", 26, TEXTO, True))
        self.hoja.add_widget(etiqueta("Ingresa para continuar con tu trabajo de campo.", 14, GRIS))
        self.correo = Campo("Correo electrónico", input_type="mail")
        self.clave = Campo("Contraseña", clave=True)
        self.error = etiqueta("", 13, ROJO)
        self.hoja.add_widget(self.correo)
        self.hoja.add_widget(self.clave)
        self.hoja.add_widget(self.error)
        self.hoja.add_widget(Boton("Ingresar", on_release=self.entrar))
        self.hoja.add_widget(Boton("Tengo un código de invitación", color=CLARO, texto_color=AZUL,
                                   on_release=lambda *_: setattr(self.manager, "current", "registro")))
        self.root_.add_widget(self.hoja)
        self.carga = FloatLayout()
        with self.carga.canvas.before:
            Color(1, 1, 1, .92)
            r = Rectangle(pos=self.carga.pos, size=self.carga.size)
        self.carga.bind(pos=lambda _, v: setattr(r, "pos", v), size=lambda _, v: setattr(r, "size", v))
        self.giro = Girando(pos_hint={"center_x": .5, "center_y": .55})
        self.texto_carga = etiqueta("Ingresando…", 16, TEXTO, halign="center", size_hint=(.8, None), pos_hint={"center_x": .5, "center_y": .45})
        self.carga.add_widget(self.giro)
        self.carga.add_widget(self.texto_carga)
        self.add_widget(self.root_)

    def on_pre_enter(self, *_):
        self.hoja.pos = (0, -dp(420))
        self.logo.opacity = 0
        self.clave.text, self.error.text = "", ""

    def on_enter(self, *_):
        Animation(opacity=1, d=.8, t="out_quad").start(self.logo)
        Animation(y=0, d=.75, t="out_cubic").start(self.hoja)

    def _cargando(self, si: bool, texto: str = "") -> None:
        if si:
            self.texto_carga.text = texto
            self.root_.add_widget(self.carga)
            self.giro.iniciar()
        elif self.carga.parent:
            self.root_.remove_widget(self.carga)

    def entrar(self, *_):
        c, p = self.correo.text.strip(), self.clave.text
        if not c or not p:
            self.error.text = "Escribe tu correo y tu contraseña."
            return
        self.error.text = ""
        self._cargando(True, "Ingresando…")
        en_hilo(lambda: self.logica.iniciar_sesion(c, p), self._listo, self._fallo)

    def _listo(self, perfil):
        self._cargando(False)
        if perfil.estado == "aprobado":                 # aprobada por el Director: falta aceptar acuerdos y hacer el curso
            self.manager.get_screen("curso").iniciar()
            self.manager.current = "curso"
            return
        if not perfil.activo:
            self.error.text = MENSAJE_ESTADO.get(perfil.estado, "Tu cuenta todavía no está activa.")
            en_hilo(self.logica.cerrar_sesion)          # usa la red: no congelar la pantalla
            return
        self.manager.current = "principal"

    def _fallo(self, e):
        self._cargando(False)
        self.error.text = texto_error(e)


class RegistroScreen(Screen):
    def __init__(self, app_logica, **kw):
        super().__init__(name="registro", **kw)
        self.logica = app_logica
        raiz = FloatLayout()
        _fondo_suave(raiz)
        sv = ScrollView(do_scroll_x=False, bar_width=0)
        col = BoxLayout(orientation="vertical", size_hint_y=None, padding=dp(16), spacing=dp(12))
        col.bind(minimum_height=col.setter("height"))
        col.add_widget(etiqueta("Crear mi cuenta", 26, TEXTO, True))
        col.add_widget(etiqueta("Necesitas el código que te dio el Director o el Administrador.", 14, GRIS))
        t = Tarjeta()
        self.codigo = Campo("Código de invitación")
        self.nombre = Campo("Nombre completo")
        self.celular = Campo("Celular", input_type="number")
        self.correo = Campo("Correo electrónico", input_type="mail")
        self.clave = Campo("Contraseña (mínimo 12 caracteres)", clave=True)
        self.tipo = Spinner(text="Voluntario", values=["Voluntario", "Contratado"], size_hint_y=None, height=dp(50),
                            background_normal="", background_color=CLARO, color=TEXTO)
        for w in (self.codigo, self.nombre, self.celular, self.correo, self.clave, self.tipo):
            t.add_widget(w)
        self.mayor = CheckBox(size_hint=(None, None), size=(dp(40), dp(40)))
        self.servidor = CheckBox(size_hint=(None, None), size=(dp(40), dp(40)))
        for ck, txt in ((self.mayor, "Declaro que soy mayor de 18 años"), (self.servidor, "Soy servidor público o contratista del Estado")):
            f = BoxLayout(size_hint_y=None, height=dp(44), spacing=dp(8))
            f.add_widget(ck)
            f.add_widget(etiqueta(txt, 13, TEXTO))
            t.add_widget(f)
        self.error = etiqueta("", 13, ROJO)
        t.add_widget(self.error)
        t.add_widget(Boton("Crear cuenta", on_release=self.crear))
        t.add_widget(Boton("Volver", color=CLARO, texto_color=AZUL, on_release=lambda *_: setattr(self.manager, "current", "login")))
        col.add_widget(t)
        sv.add_widget(col)
        raiz.add_widget(sv)
        self.add_widget(raiz)

    def crear(self, *_):
        self.error.text = ""
        datos = dict(nombre=self.nombre.text, celular=self.celular.text, correo=self.correo.text, clave=self.clave.text,
                     codigo=self.codigo.text, mayor=self.mayor.active, servidor=self.servidor.active,
                     tipo="contratado" if self.tipo.text == "Contratado" else "voluntario")
        errores = self.logica.errores_registro(datos)
        if errores:
            self.error.text = errores
            return
        en_hilo(lambda: self.logica.registrar_con_codigo(**datos), self._ok, lambda e: setattr(self.error, "text", texto_error(e)))

    def _ok(self, _):
        dialogo("Cuenta creada", "Tu cuenta quedó creada y no necesitas confirmar el correo. Si el Director debe aprobarla, te avisará; después ingresa con tu correo y contraseña.",
                [("Entendido", lambda: setattr(self.manager, "current", "login"))])
