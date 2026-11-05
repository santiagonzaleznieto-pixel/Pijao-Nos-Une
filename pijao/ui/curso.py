"""Acuerdos y curso de ingreso (4.9 y 10.6): se hacen una vez, después de que el Director aprueba la cuenta."""
from __future__ import annotations

from kivy.app import App
from kivy.metrics import dp
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.checkbox import CheckBox
from kivy.uix.scrollview import ScrollView
from kivy.uix.screenmanager import Screen

from ..core import curso as datos
from .formularios import Casilla
from .tema import AZUL, BLANCO, CLARO, GRIS, ROJO, TEXTO, VERDE, Boton, Tarjeta, en_hilo, etiqueta, pintar, texto_error

ACUERDOS = [("acuerdo_confidencialidad", "Acuerdo de confidencialidad"), ("codigo_conducta", "Código de conducta"),
            ("politica_seguridad", "Política de seguridad de la información"), ("tratamiento_datos", "Compromiso de tratamiento de datos personales")]


class CursoScreen(Screen):
    def __init__(self, app_logica, **kw):
        super().__init__(name="curso", **kw)
        self.logica = app_logica
        raiz = BoxLayout(orientation="vertical")
        self.sv = ScrollView(do_scroll_x=False, bar_width=0)
        self.col = BoxLayout(orientation="vertical", size_hint_y=None, padding=[dp(16), dp(18), dp(16), dp(16)], spacing=dp(12))
        self.col.bind(minimum_height=self.col.setter("height"))
        self.sv.add_widget(self.col)
        self.error = etiqueta("", 13, ROJO)
        pie = BoxLayout(size_hint_y=None, height=dp(68), padding=[dp(16), dp(8)], spacing=dp(10))
        pintar(pie, BLANCO, 0)
        self.btn_atras = Boton("Atrás", color=CLARO, texto_color=AZUL, height=dp(50), size_hint_x=.35)
        self.btn_sig = Boton("Siguiente", height=dp(50))
        pie.add_widget(self.btn_atras)
        pie.add_widget(self.btn_sig)
        raiz.add_widget(self.sv)
        raiz.add_widget(pie)
        self.add_widget(raiz)
        self.fase, self.k, self.resp, self.textos = "acuerdos", 0, {}, dict(self.logica.TEXTOS_ACUERDOS)
        self._h_atras = self._h_sig = None

    def iniciar(self) -> None:
        self.fase, self.k, self.resp, self.marcas = "acuerdos", 0, {}, {}
        self.textos = dict(self.logica.TEXTOS_ACUERDOS)
        self._mostrar()
        en_hilo(self.logica.textos_acuerdos, self._textos_listos)        # versión vigente del servidor, sin congelar la pantalla

    def _textos_listos(self, textos: dict) -> None:
        if self.fase == "acuerdos" and textos != self.textos:
            self.textos = textos
            self._mostrar()

    def _botones(self, atras, f_atras, sig, f_sig) -> None:
        for nombre, boton, f in (("_h_atras", self.btn_atras, f_atras), ("_h_sig", self.btn_sig, f_sig)):
            viejo = getattr(self, nombre)
            if viejo:
                boton.unbind(on_release=viejo)
            nuevo = (lambda *_, f=f: f()) if f else None
            setattr(self, nombre, nuevo)
            if nuevo:
                boton.bind(on_release=nuevo)
        self.btn_atras.text, self.btn_sig.text = atras or "Atrás", sig
        self.btn_atras.disabled = f_atras is None

    def _mostrar(self) -> None:
        self.col.clear_widgets()
        self.error.text = ""
        getattr(self, "_f_" + self.fase)()
        self.col.add_widget(self.error)
        self.sv.scroll_y = 1

    # ------------------------------------------------------------------ acuerdos
    def _f_acuerdos(self):
        self.col.add_widget(etiqueta("Antes de empezar", 24, TEXTO, True))
        self.col.add_widget(etiqueta("Lee y acepta estos cuatro compromisos. Se guardan con la fecha y la versión del texto.", 13, GRIS))
        previas = {k: c.activo for k, c in getattr(self, "marcas", {}).items()}
        self.marcas = {}
        for clave, titulo in ACUERDOS:
            t = Tarjeta()
            t.add_widget(etiqueta(titulo, 15, TEXTO, True))
            t.add_widget(etiqueta(self.textos.get(clave, ""), 13, TEXTO))
            self.marcas[clave] = Casilla("Lo leí y lo acepto", previas.get(clave, False))
            t.add_widget(self.marcas[clave])
            self.col.add_widget(t)

        def sig():
            if not all(c.activo for c in self.marcas.values()):
                self.error.text = "Debes aceptar los cuatro compromisos para continuar."
                return
            self.fase, self.k = "lecciones", 0
            self._mostrar()
        self._botones("Atrás", None, "Continuar al curso", sig)

    # ------------------------------------------------------------------ lecciones
    def _f_lecciones(self):
        titulo, texto = datos.LECCIONES[self.k]
        self.col.add_widget(etiqueta(f"Curso de ingreso · lección {self.k + 1} de {len(datos.LECCIONES)}", 12, GRIS))
        t = Tarjeta()
        t.add_widget(etiqueta(titulo, 20, TEXTO, True))
        t.add_widget(etiqueta(texto, 15, TEXTO))
        self.col.add_widget(t)
        ultima = self.k == len(datos.LECCIONES) - 1

        def atras():
            if self.k == 0:
                self.fase = "acuerdos"
            else:
                self.k -= 1
            self._mostrar()

        def sig():
            if ultima:
                self.fase, self.resp = "examen", {}
            else:
                self.k += 1
            self._mostrar()
        self._botones("Atrás", atras, "Ir a la evaluación" if ultima else "Siguiente", sig)

    # ------------------------------------------------------------------ evaluación
    def _f_examen(self):
        self.col.add_widget(etiqueta(f"Evaluación: {len(datos.PREGUNTAS)} preguntas. Necesitas {datos.APROBADO} % para aprobar.", 13, GRIS))
        for i, (pregunta, ops, _) in enumerate(datos.PREGUNTAS):
            t = Tarjeta()
            t.add_widget(etiqueta(f"{i + 1}. {pregunta}", 14, TEXTO, True))
            for j, op in enumerate(ops):
                fila = BoxLayout(size_hint_y=None, height=dp(44), spacing=dp(8))
                ck = CheckBox(group=f"q{i}", active=self.resp.get(i) == j, size_hint=(None, None), size=(dp(40), dp(40)))
                ck.bind(active=lambda _, activo, i=i, j=j: self.resp.__setitem__(i, j) if activo else None)
                fila.add_widget(ck)
                fila.add_widget(etiqueta(op, 13, TEXTO))
                t.add_widget(fila)
            self.col.add_widget(t)

        def sig():
            if len(self.resp) < len(datos.PREGUNTAS):
                self.error.text = f"Te faltan {len(datos.PREGUNTAS) - len(self.resp)} preguntas por responder."
                return
            self.fase = "resultado"
            self._mostrar()

        def atras():
            self.fase, self.k = "lecciones", len(datos.LECCIONES) - 1
            self._mostrar()
        self._botones("Repasar", atras, "Enviar respuestas", sig)

    # ------------------------------------------------------------------ resultado
    def _f_resultado(self):
        p = datos.puntaje(self.resp)
        ok = datos.aprobado(p)
        t = Tarjeta(color=VERDE if ok else CLARO, radio=26, padding=dp(20))
        t.add_widget(etiqueta(f"{p} %", 54, BLANCO if ok else TEXTO, True, halign="center"))
        t.add_widget(etiqueta("¡Aprobaste!" if ok else f"Necesitas {datos.APROBADO} % para aprobar. Repasa las lecciones e inténtalo de nuevo.", 16,
                              BLANCO if ok else TEXTO, True, halign="center"))
        self.col.add_widget(t)
        if ok:
            self.col.add_widget(etiqueta("Guardando tu ingreso…", 13, GRIS, halign="center"))
            self._botones("Atrás", None, "Entrar a la app", lambda: None)
            self.btn_sig.disabled = True
            en_hilo(lambda: self.logica.completar_ingreso(p), self._listo, self._fallo)
        else:
            def repetir():
                self.fase, self.k, self.resp = "lecciones", 0, {}
                self._mostrar()
            self._botones("Atrás", None, "Repasar el curso", repetir)

    def _listo(self, perfil) -> None:
        self.btn_sig.disabled = False
        self._botones("Atrás", None, "Entrar a la app", self._entrar)
        self._entrar()

    def _fallo(self, e) -> None:
        self.error.text = texto_error(e) + " Toca «Reintentar»."
        self.btn_sig.disabled = False
        self._botones("Atrás", None, "Reintentar", lambda: self._f_resultado_reintentar())

    def _f_resultado_reintentar(self) -> None:
        self._mostrar()

    def _entrar(self) -> None:
        App.get_running_app().root.current = "principal"
