"""Tareas (10.3) y anuncios (10.5): lista de lo asignado, crear tareas y publicar avisos para el equipo."""
from __future__ import annotations

from kivy.metrics import dp
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.scrollview import ScrollView
from kivy.uix.screenmanager import Screen

from ..core.validadores import parse_fecha
from .formularios import Casilla, ConTitulo, Selector, opciones
from .tema import AZUL, CLARO, GRIS, NARANJA, ROJO, TEXTO, VERDE, Boton, Tarjeta, dialogo, en_hilo, etiqueta, pintar, texto_error

PRIORIDADES = [("baja", "Baja"), ("normal", "Normal"), ("alta", "Alta")]
PRIO_ANUNCIO = [("normal", "Normal"), ("importante", "Importante"), ("urgente", "Urgente")]
ESTADOS_TAREA = {"pendiente": "Pendiente", "en_curso": "En curso", "hecha": "Hecha", "bloqueada": "Bloqueada", "cancelada": "Cancelada"}
COLOR_ANUNCIO = {"normal": GRIS, "importante": NARANJA, "urgente": ROJO}


class TareasPage(Screen):
    def __init__(self, logica, **kw):
        super().__init__(name="tareas", **kw)
        self.logica, self.nombres = logica, {}
        sv = ScrollView(do_scroll_x=False, bar_width=0)
        self.col = BoxLayout(orientation="vertical", size_hint_y=None, padding=[dp(16), dp(18), dp(16), dp(24)], spacing=dp(14))
        self.col.bind(minimum_height=self.col.setter("height"))
        sv.add_widget(self.col)
        self.add_widget(sv)
        self.titulo, self.msg = etiqueta("Tareas y anuncios", 24, TEXTO, True), etiqueta("", 13, ROJO)
        self.t_anuncios, self.t_publicar, self.t_tareas, self.t_nueva = Tarjeta(), Tarjeta(), Tarjeta(), Tarjeta()
        self._armar_publicar()
        self._armar_nueva()

    # ------------------------------------------------------------------ formularios
    def _armar_publicar(self):
        t = self.t_publicar
        t.add_widget(etiqueta("Publicar un anuncio", 16, TEXTO, True))
        self.a_titulo, self.a_texto = ConTitulo("Título"), ConTitulo("Mensaje para el equipo", multilinea=True)
        self.a_prio, self.a_fijar = Selector("Prioridad", PRIO_ANUNCIO), Casilla("Fijar arriba")
        self.a_msg = etiqueta("", 13, ROJO)
        for w in (self.a_titulo, self.a_texto, self.a_prio, self.a_fijar, self.a_msg, Boton("Publicar", on_release=lambda *_: self.publicar())):
            t.add_widget(w)

    def _armar_nueva(self):
        t = self.t_nueva
        t.add_widget(etiqueta("Nueva tarea", 16, TEXTO, True))
        self.n_titulo, self.n_desc = ConTitulo("¿Qué hay que hacer?"), ConTitulo("Detalle (opcional)", multilinea=True)
        self.n_tipo, self.n_prio = Selector("Tipo", opciones("C-13")), Selector("Prioridad", PRIORIDADES)
        self.n_quien, self.n_fecha = Selector("Asignar a", [("", "A mí")]), ConTitulo("Fecha límite (AAAA-MM-DD, opcional)", "AAAA-MM-DD")
        self.n_msg = etiqueta("", 13, ROJO)
        for w in (self.n_titulo, self.n_desc, self.n_tipo, self.n_prio, self.n_quien, self.n_fecha, self.n_msg,
                  Boton("Crear tarea", on_release=lambda *_: self.crear())):
            t.add_widget(w)

    # ------------------------------------------------------------------ carga
    def on_pre_enter(self, *_):
        self.col.clear_widgets()                       # solo se muestran las tarjetas que esta persona puede usar
        for w in (self.titulo, self.msg, self.t_anuncios, self.t_publicar if self.logica.puede_publicar_anuncios else None, self.t_tareas,
                  self.t_nueva if self.logica.puede_crear_tareas else None):
            if w is not None:
                self.col.add_widget(w)
        self.cargar()

    def cargar(self):
        def traer():
            nombres = {}
            if self.logica.puede_gestionar_equipo or self.logica.puede_crear_tareas:
                try:
                    nombres = {f["id"]: f["nombre_completo"] for f in self.logica.equipo() if f.get("estado") == "activo"}
                except Exception:                         # noqa: BLE001 - sin acceso a la lista: solo "a mí"
                    nombres = {}
            return {"anuncios": self.logica.anuncios(), "tareas": self.logica.tareas(), "nombres": nombres}
        en_hilo(traer, self._pintar, lambda e: setattr(self.msg, "text", texto_error(e)))

    def _pintar(self, d: dict):
        self.msg.text = ""
        self.nombres = d["nombres"]
        yo = self.logica.perfil.id if self.logica.perfil else None
        self.n_quien.poner_opciones([("", "A mí")] + [(i, n) for i, n in d["nombres"].items() if i != yo])
        self.t_anuncios.clear_widgets()
        self.t_anuncios.add_widget(etiqueta("Anuncios", 16, TEXTO, True))
        if not d["anuncios"]:
            self.t_anuncios.add_widget(etiqueta("No hay anuncios.", 13, GRIS))
        for a in d["anuncios"][:6]:
            fila = BoxLayout(size_hint_y=None, height=dp(56), spacing=dp(8))
            fila.add_widget(etiqueta(f"{a['titulo']}\n{a['prioridad'].capitalize()}", 13, COLOR_ANUNCIO.get(a["prioridad"], GRIS), True))
            fila.add_widget(Boton("Leer", color=CLARO, texto_color=AZUL, height=dp(40), size_hint_x=.28, on_release=lambda *_, a=a: self._leer(a)))
            self.t_anuncios.add_widget(fila)
        self.t_tareas.clear_widgets()
        self.t_tareas.add_widget(etiqueta("Tareas", 16, TEXTO, True))
        tareas = [x for x in d["tareas"] if x["estado"] in ("pendiente", "en_curso", "bloqueada")] + [x for x in d["tareas"] if x["estado"] == "hecha"][:5]
        if not tareas:
            self.t_tareas.add_widget(etiqueta("No tienes tareas.", 13, GRIS))
        for x in tareas:
            quien = "Para ti" if x.get("asignado_a") == yo else f"Para {self.nombres.get(x.get('asignado_a'), 'otra persona')}"
            limite = f" · vence {x['fecha_limite'][:10]}" if x.get("fecha_limite") else ""
            self.t_tareas.add_widget(etiqueta(f"{x['titulo']}\n{ESTADOS_TAREA.get(x['estado'], x['estado'])} · {x['prioridad']} · {quien}{limite}", 13, TEXTO))
            if x["estado"] != "hecha":
                fila = BoxLayout(size_hint_y=None, height=dp(44), spacing=dp(8))
                if x["estado"] == "pendiente":
                    fila.add_widget(Boton("En curso", color=CLARO, texto_color=AZUL, height=dp(40), on_release=lambda *_, x=x: self._estado(x, "en_curso")))
                fila.add_widget(Boton("Hecha", color=VERDE, height=dp(40), on_release=lambda *_, x=x: self._estado(x, "hecha")))
                self.t_tareas.add_widget(fila)

    # ------------------------------------------------------------------ acciones
    def _leer(self, a: dict):
        dialogo(a["titulo"], a["texto"], [("Entendido", lambda: en_hilo(lambda: self.logica.anuncio_leido(a["id"])))])

    def _estado(self, x: dict, estado: str):
        en_hilo(lambda: self.logica.actualizar_tarea(x["id"], estado), lambda _: self.cargar(), lambda e: setattr(self.msg, "text", texto_error(e)))

    def publicar(self):
        self.a_msg.text = ""
        titulo, texto, prio, fijar = self.a_titulo.text, self.a_texto.text, self.a_prio.valor or "normal", self.a_fijar.activo

        def listo(_):
            self.a_titulo.text = self.a_texto.text = ""
            self.cargar()
        en_hilo(lambda: self.logica.crear_anuncio(titulo, texto, prio, fijar), listo, lambda e: setattr(self.a_msg, "text", texto_error(e)))

    def crear(self):
        self.n_msg.text = ""
        fecha = None
        if self.n_fecha.text.strip():
            f = parse_fecha(self.n_fecha.text)
            if not f:
                self.n_msg.text = "La fecha límite no es válida (AAAA-MM-DD)."
                return
            fecha = f.isoformat()
        datos = (self.n_titulo.text, self.n_desc.text, self.n_tipo.valor or "otra", self.n_prio.valor or "normal", self.n_quien.valor or None, fecha)

        def listo(_):
            self.n_titulo.text = self.n_desc.text = self.n_fecha.text = ""
            self.cargar()
        en_hilo(lambda: self.logica.crear_tarea(*datos), listo, lambda e: setattr(self.n_msg, "text", texto_error(e)))
