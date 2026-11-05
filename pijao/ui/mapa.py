"""Pantalla del mapa (cap. 5): mapa real, mi ubicación, puntos por estado, filtros, «Registrar aquí» y ubicación manual."""
from __future__ import annotations

import os
import webbrowser

import requests
from kivy.app import App
from kivy.clock import Clock
from kivy.graphics import Color, Ellipse, Line, Quad, Rectangle, Triangle
from kivy.metrics import dp
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.button import Button
from kivy.uix.checkbox import CheckBox
from kivy.uix.floatlayout import FloatLayout
from kivy.uix.label import Label
from kivy.uix.screenmanager import Screen
from kivy.uix.spinner import Spinner
from kivy_garden.mapview import MapMarker, MapSource, MapView

from ..core import geo
from ..servicios.gps import PRECISION_MAX_REGISTRO_M, Muestreo, ServicioGPS, calidad_senal
from .tema import (AZUL, BLANCO, CLARO, GRIS, NARANJA, TEXTO, Boton, Icono, dialogo, en_hilo, etiqueta, pintar)

CENTRO = (4.3333, -75.7000)     # Pijao (aproximado)
ESTILO = {                      # estado: (color, forma, etiqueta) · cada estado se distingue por color y forma (5.6)
    "por_visitar": ((.55, .55, .55), "circulo", "Por visitar"),
    "visitada_conversacion": ((.13, .60, .30), "cuadrado", "Visitada, hubo conversación"),
    "visitada_sin_contacto": ((.95, .80, .10), "rombo", "Visitada, sin contacto"),
    "requiere_seguimiento": ((.95, .50, .10), "triangulo", "Requiere seguimiento"),
    "no_contactar": ((0, 0, 0), "cuadrado", "No contactar: no volver"),
    "deshabitada": ((.70, .70, .70), "anillo", "Deshabitada o sin uso"),
    "direccion_inexistente": ((.85, .20, .20), "anillo", "Dirección inexistente"),
    "fuera_de_pijao": ((.85, .20, .20), "anillo", "Fuera de Pijao"),
}
MOTIVOS = [("mal_gps", "Mal GPS"), ("pendiente_inaccesible", "Pendiente empinada o inaccesible"), ("camino_privado", "Camino privado cerrado"),
           ("animal_bravo", "Animal bravo"), ("riesgo_seguridad", "Riesgo de seguridad"), ("otro", "Otro")]


def _fondo(widget, rgba=(0, 0, 0, .65)) -> None:
    with widget.canvas.before:
        Color(*rgba)
        r = Rectangle(pos=widget.pos, size=widget.size)
    widget.bind(pos=lambda w, v: setattr(r, "pos", v), size=lambda w, v: setattr(r, "size", v))


class _Marcador(MapMarker):
    """Marcador dibujado con formas (sin imágenes)."""

    def __init__(self, lado: float, **kw):
        super().__init__(anchor_x=.5, anchor_y=.5, **kw)
        self.source = ""
        self.size_hint = (None, None)
        self.size = (dp(lado), dp(lado))
        self.bind(pos=self._dibujar, size=self._dibujar)

    def _dibujar(self, *_):
        raise NotImplementedError


class Punto(_Marcador):
    def __init__(self, dato: dict, al_tocar, **kw):
        super().__init__(26, lat=dato["lat"], lon=dato["lng"], **kw)
        self.dato = dato
        self.bind(on_release=lambda *_: al_tocar(self.dato))
        self._dibujar()

    def _dibujar(self, *_):
        color, forma, _ = ESTILO.get(self.dato.get("estado"), ESTILO["por_visitar"])
        x, y, w, h = self.x, self.y, self.width, self.height
        self.canvas.after.clear()
        with self.canvas.after:
            Color(1, 1, 1, 1)                                   # borde blanco (y más grueso si falta enviarlo)
            g = dp(3) if self.dato.get("pendiente") else dp(1.5)
            Ellipse(pos=(x - g, y - g), size=(w + 2 * g, h + 2 * g))
            Color(*color, 1)
            if forma == "cuadrado":
                Rectangle(pos=(x, y), size=(w, h))
            elif forma == "rombo":
                Quad(points=[x + w / 2, y, x + w, y + h / 2, x + w / 2, y + h, x, y + h / 2])
            elif forma == "triangulo":
                Triangle(points=[x, y, x + w, y, x + w / 2, y + h])
            elif forma == "anillo":
                Line(circle=(x + w / 2, y + h / 2, w / 2 - dp(2)), width=dp(2))
            else:
                Ellipse(pos=(x, y), size=(w, h))


class YoSoy(_Marcador):
    """Punto azul con un círculo que muestra la precisión del GPS (5.3)."""
    radio_px = 0.0

    def __init__(self, **kw):
        super().__init__(18, **kw)
        self._dibujar()

    def _dibujar(self, *_):
        cx, cy = self.center
        self.canvas.after.clear()
        with self.canvas.after:
            if self.radio_px > dp(10):
                Color(.2, .5, 1, .18)
                Ellipse(pos=(cx - self.radio_px, cy - self.radio_px), size=(2 * self.radio_px, 2 * self.radio_px))
            Color(1, 1, 1, 1)
            Ellipse(pos=(self.x - 2, self.y - 2), size=(self.width + 4, self.height + 4))
            Color(.15, .45, .95, 1)
            Ellipse(pos=self.pos, size=self.size)


class PantallaMapa(Screen):
    def __init__(self, app_logica, **kw):
        super().__init__(name="mapa", **kw)
        self.logica = app_logica
        self.gps = ServicioGPS(self._lectura, self._error_gps)
        self.mi_pos, self.muestreo, self.yo, self.marcadores, self.satelite = None, None, None, [], False
        self._probado, self._centrado, self.ocultos, self.manual = False, False, set(), False

        raiz = FloatLayout()
        extra = {}
        app = App.get_running_app()
        if hasattr(MapView, "cache_dir") and app:
            carpeta = os.path.join(app.user_data_dir, "mapa")
            os.makedirs(carpeta, exist_ok=True)
            extra["cache_dir"] = carpeta
        self.mapa = MapView(lat=CENTRO[0], lon=CENTRO[1], zoom=15, **extra)
        self.fuente_calles = self.mapa.map_source
        self.fuente_sat = MapSource(
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            cache_key="esri-world-imagery", min_zoom=1, max_zoom=19, tile_size=256, image_ext="jpg",
            attribution="Imágenes: Esri, Maxar, Earthstar Geographics")
        self.mapa.bind(zoom=lambda *_: self._precision_visual())
        raiz.add_widget(self.mapa)

        self.estado = Label(size_hint=(1, None), height=dp(34), pos_hint={"top": 1}, font_size="13sp")
        _fondo(self.estado)
        raiz.add_widget(self.estado)
        self.btn_capa = self._boton(raiz, "Satélite", self.cambiar_capa, {"right": .98, "top": .93}, 104)
        self.btn_filtros = self._boton(raiz, "Filtros", lambda *_: self.filtros(), {"right": .98, "top": .86}, 104)
        self._boton(raiz, "Sincronizar", lambda *_: self.sincronizar(), {"x": .02, "top": .93}, 110)
        self.btn_centrar = self._boton(raiz, "Centrar en mí", lambda *_: self.centrar(), {"x": .02, "y": .13}, 130)
        self.btn_registrar = Button(text="Registrar aquí", size_hint=(.7, None), height=dp(58), pos_hint={"center_x": .5, "y": .02},
                                    background_normal="", background_color=NARANJA, bold=True)
        self.btn_registrar.bind(on_release=lambda *_: self.registrar_aqui())
        raiz.add_widget(self.btn_registrar)

        self.ficha = BoxLayout(orientation="vertical", size_hint=(1, None), height=dp(170), padding=dp(12), spacing=dp(6),
                               pos_hint={"x": 0, "y": 0}, opacity=0, disabled=True)
        _fondo(self.ficha, (.1, .1, .12, .95))
        self.ficha_titulo = Label(bold=True, font_size="17sp", size_hint_y=None, height=dp(30))
        self.ficha_info = Label(size_hint_y=None, height=dp(44))
        fila = BoxLayout(spacing=dp(8), size_hint_y=None, height=dp(48))
        self.btn_agregar, self.btn_llegar = Button(text="Agregar visita"), Button(text="Cómo llegar")
        for b in (self.btn_agregar, self.btn_llegar, Button(text="Cerrar", on_release=lambda *_: self._ocultar_ficha())):
            fila.add_widget(b)
        for w in (self.ficha_titulo, self.ficha_info, fila):
            self.ficha.add_widget(w)
        raiz.add_widget(self.ficha)

        # modo «marcar en el mapa» (ubicación manual, 5.5): una cruz al centro y un panel inferior
        self.cruz = Icono("mapa_nav", NARANJA, size=(dp(44), dp(44)), pos_hint={"center_x": .5, "y": .5}, opacity=0)
        raiz.add_widget(self.cruz)
        self.panel = BoxLayout(orientation="vertical", size_hint=(1, None), height=dp(210), padding=dp(14), spacing=dp(8),
                               pos_hint={"x": 0, "y": 0}, opacity=0, disabled=True)
        pintar(self.panel, BLANCO, lados=[dp(24), dp(24), 0, 0])
        self.panel.add_widget(etiqueta("Mueve el mapa hasta que la cruz quede sobre la casa.", 13, TEXTO))
        self.motivo = Spinner(text="Motivo: Mal GPS", values=["Motivo: " + e for _, e in MOTIVOS], size_hint_y=None, height=dp(46),
                              background_normal="", background_color=CLARO, color=TEXTO)
        fila2 = BoxLayout(spacing=dp(8), size_hint_y=None, height=dp(50))
        fila2.add_widget(Boton("Usar este punto", height=dp(48), on_release=lambda *_: self.usar_punto()))
        fila2.add_widget(Boton("Cancelar", color=CLARO, texto_color=AZUL, height=dp(48), on_release=lambda *_: self.modo_manual(False)))
        for w in (self.motivo, fila2):
            self.panel.add_widget(w)
        raiz.add_widget(self.panel)
        self.add_widget(raiz)

    @staticmethod
    def _boton(raiz, texto, accion, pos, ancho):
        b = Button(text=texto, size_hint=(None, None), size=(dp(ancho), dp(40)), pos_hint=pos, background_color=(.1, .1, .12, .85))
        b.bind(on_release=accion)
        raiz.add_widget(b)
        return b

    # ------------------------------------------------------------------ ciclo de vida
    def on_pre_enter(self, *_):
        self.gps.iniciar()
        self.refrescar()
        if not self._centrado:                      # a veces el mapa ignora el zoom inicial: se fija ya con el mapa dibujado
            self._centrado = True
            Clock.schedule_once(self._centro_inicial, .4)
            Clock.schedule_once(self._centro_inicial, 1.5)
        if not self._probado:
            self._probado = True
            self._probar_mapa()

    def _centro_inicial(self, *_):
        if self.mi_pos is None:
            self.mapa.zoom = 15
            self.mapa.center_on(*CENTRO)

    def _probar_mapa(self) -> None:
        """Si los mosaicos de calles no se pueden bajar, avisa y pasa a satélite en vez de dejar el mapa gris."""
        def probar():
            try:
                return requests.get("https://tile.openstreetmap.org/15/9493/15989.png", timeout=8).status_code
            except Exception as e:                  # noqa: BLE001
                return str(e)[:60]

        def listo(r):
            if r != 200:
                self.satelite = False
                self.cambiar_capa()
                self._estado(f"Mapa de calles no disponible ({r}). Mostrando satélite.")
        en_hilo(probar, listo)

    def refrescar(self) -> None:
        for m in self.marcadores:
            self.mapa.remove_marker(m)
        self.marcadores = []
        for d in self.logica.puntos_mapa():
            if d.get("lat") is not None and d.get("lng") is not None and d.get("estado") not in self.ocultos:
                m = Punto(d, self._tocar_punto)
                self.mapa.add_marker(m)
                self.marcadores.append(m)
        self._estado()

    def _estado(self, extra: str = "") -> None:
        p = self.mi_pos["precision_m"] if self.mi_pos else None
        if p is not None:
            gps = f"GPS ±{p:.0f} m ({calidad_senal(p)})"
        else:
            gps = self.gps.error or self.gps.aviso or "Buscando GPS…"
        self.estado.text = extra or f"{len(self.marcadores)} casas · {self.logica.estado_cola()['por_enviar']} por enviar · {gps}"

    # ------------------------------------------------------------------ ubicación
    def _lectura(self, l: dict) -> None:
        if self.mi_pos and l.get("previa") and not self.mi_pos.get("previa"):
            return                                              # ya hay una lectura en vivo; la guardada de antes sobra
        self.mi_pos = l
        if self.muestreo:
            self.muestreo.agregar(l)
        primera = self.yo is None
        if not primera:
            self.mapa.remove_marker(self.yo)
        else:
            self.yo = YoSoy()
        self.yo.lat, self.yo.lon = l["lat"], l["lng"]
        self.mapa.add_marker(self.yo)
        self._precision_visual()
        if primera:
            self.mapa.zoom = 17
            self.mapa.center_on(l["lat"], l["lng"])
        if not self.muestreo:
            self._estado()

    def _precision_visual(self) -> None:
        if self.yo and self.mi_pos and self.mi_pos.get("precision_m"):
            self.yo.radio_px = self.mi_pos["precision_m"] / geo.metros_por_pixel(self.mi_pos["lat"], int(self.mapa.zoom)) * dp(1)
            self.yo._dibujar()

    def _error_gps(self, texto: str) -> None:
        self._estado(texto)

    def centrar(self) -> None:
        if self.mi_pos:
            self.mapa.center_on(self.mi_pos["lat"], self.mi_pos["lng"])
        else:
            dialogo("Sin ubicación", (self.gps.error or self.gps.aviso or "Todavía no hay señal de GPS.") + "\nSal a un lugar abierto y espera unos segundos.",
                    [("Entendido", None)])

    def cambiar_capa(self, *_) -> None:
        self.satelite = not self.satelite
        self.mapa.map_source = self.fuente_sat if self.satelite else self.fuente_calles
        self.btn_capa.text = "Calles" if self.satelite else "Satélite"

    def filtros(self) -> None:
        """Muestra u oculta puntos según su estado (5.8)."""
        caja = BoxLayout(orientation="vertical", spacing=dp(2))
        marcas = {}
        for clave, (_, _, etq) in ESTILO.items():
            f = BoxLayout(size_hint_y=None, height=dp(38))
            ck = CheckBox(active=clave not in self.ocultos, size_hint=(None, None), size=(dp(38), dp(38)))
            marcas[clave] = ck
            f.add_widget(ck)
            f.add_widget(etiqueta(etq, 13, TEXTO))
            caja.add_widget(f)

        def aplicar():
            self.ocultos = {k for k, c in marcas.items() if not c.active}
            self.refrescar()
        dialogo("Qué puntos mostrar", "", [("Aplicar", aplicar), ("Cancelar", None)], contenido=caja)

    # ------------------------------------------------------------------ «Registrar aquí» (5.4)
    def registrar_aqui(self) -> None:
        if self.muestreo:
            return
        if not self.gps.activo:
            self.gps.iniciar()
            return dialogo("GPS apagado", (self.gps.error or "Estoy activando el GPS.") + "\nPuedes esperar unos segundos o marcar la casa en el mapa.",
                           [("Marcar en el mapa", lambda: self.modo_manual(True)), ("Entendido", None)])
        self.muestreo = Muestreo(9.0)
        self.btn_registrar.disabled = True
        Clock.schedule_interval(self._tick, .5)

    def _tick(self, dt) -> bool:
        mejor = self.muestreo.mejor()
        self.btn_registrar.text = f"Tomando ubicación… ±{mejor['precision_m']:.0f} m" if mejor else "Tomando ubicación… esperando señal"
        if not self.muestreo.terminado:
            return True
        m, self.muestreo = self.muestreo.mejor(), None
        self.btn_registrar.text, self.btn_registrar.disabled = "Registrar aquí", False
        self._fin_muestreo(m)
        return False

    def _fin_muestreo(self, m) -> None:
        otras = [("Marcar en el mapa", lambda: self.modo_manual(True)), ("Cancelar", None)]
        if m is None:
            return dialogo("Sin señal de GPS", (self.gps.aviso or "No hubo lecturas.") + "\nSal a un lugar abierto o marca la casa en el mapa.",
                           [("Reintentar", self.registrar_aqui)] + otras)
        if m["precision_m"] > PRECISION_MAX_REGISTRO_M:
            return dialogo("Precisión insuficiente", f"La mejor lectura fue de ±{m['precision_m']:.0f} m y se necesita ±{PRECISION_MAX_REGISTRO_M:.0f} m o menos. "
                           "Espera en un lugar abierto o marca la casa en el mapa.", [("Reintentar", self.registrar_aqui)] + otras)
        self._continuar(m)

    def _continuar(self, m: dict) -> None:
        cerca = self.logica.cercanas(m["lat"], m["lng"], 15)
        if not cerca:
            return self._abrir_visita(m)
        p, d = cerca[0]
        if p.get("estado") == "no_contactar":
            return dialogo("No contactar", "Esta vivienda está marcada como «No contactar». No debe visitarse.", [("Entendido", None)])
        dialogo("¿Ya existe esta casa?", f"Hay una vivienda registrada a {d:.0f} m ({ESTILO.get(p.get('estado'), ESTILO['por_visitar'])[2]}).",
                [("Es esta: agregar visita", lambda: self._abrir_visita(m, p)), ("Es otra casa", lambda: self._abrir_visita(m)), ("Cancelar", None)])

    def _abrir_visita(self, lectura: dict, vivienda: dict | None = None) -> None:
        self.modo_manual(False)
        App.get_running_app().root.get_screen("visita").abrir(lectura, vivienda)

    # ------------------------------------------------------------------ ubicación manual (5.5)
    def modo_manual(self, si: bool) -> None:
        self.manual = si
        self.cruz.opacity = 1 if si else 0
        self.panel.opacity, self.panel.disabled = (1, False) if si else (0, True)
        self.btn_registrar.opacity, self.btn_registrar.disabled = (0, True) if si else (1, self.muestreo is not None)
        if si:
            self._ocultar_ficha()
            self.btn_registrar.opacity, self.btn_registrar.disabled = 0, True

    def usar_punto(self) -> None:
        clave = dict((f"Motivo: {e}", k) for k, e in MOTIVOS).get(self.motivo.text, "otro")
        lectura = {"lat": self.mapa.lat, "lng": self.mapa.lon, "precision_m": None, "manual": True, "motivo": clave, "dispositivo": self.mi_pos}
        if self.mi_pos:
            d = geo.haversine_m(self.mi_pos["lat"], self.mi_pos["lng"], lectura["lat"], lectura["lng"])
            if d > 100:
                return dialogo("Lejos de tu ubicación", f"El punto está a {d:.0f} m de ti. Si sigues, el registro queda pendiente de aprobación del Director (registro diferido).",
                               [("Seguir", lambda: self._continuar(lectura)), ("Cancelar", None)])
        self._continuar(lectura)

    # ------------------------------------------------------------------ ficha rápida (5.7)
    def _tocar_punto(self, d: dict) -> None:
        _, _, etiqueta_ = ESTILO.get(d.get("estado"), ESTILO["por_visitar"])
        dist = f"A {geo.haversine_m(self.mi_pos['lat'], self.mi_pos['lng'], d['lat'], d['lng']):.0f} m de ti. " if self.mi_pos else ""
        self.ficha_titulo.text = etiqueta_
        self.ficha_info.text = dist + ("Pendiente de enviar." if d.get("pendiente") else "Sincronizada.")
        self.btn_agregar.disabled = d.get("estado") == "no_contactar"
        for nombre, boton in (("_h_agregar", self.btn_agregar), ("_h_llegar", self.btn_llegar)):
            viejo = getattr(self, nombre, None)
            if viejo:
                boton.unbind(on_release=viejo)
        self._h_agregar = lambda *_: self._agregar_visita(d)
        self._h_llegar = lambda *_: webbrowser.open(f"https://www.google.com/maps/dir/?api=1&destination={d['lat']},{d['lng']}")
        self.btn_agregar.bind(on_release=self._h_agregar)
        self.btn_llegar.bind(on_release=self._h_llegar)
        self.ficha.opacity, self.ficha.disabled = 1, False
        self.btn_registrar.opacity, self.btn_registrar.disabled = 0, True

    def _ocultar_ficha(self) -> None:
        self.ficha.opacity, self.ficha.disabled = 0, True
        if not self.manual:
            self.btn_registrar.opacity, self.btn_registrar.disabled = 1, False

    def _agregar_visita(self, d: dict) -> None:
        self._ocultar_ficha()
        if not self.mi_pos:
            return dialogo("Sin ubicación", "Necesito tu ubicación para registrar la visita. Espera la señal de GPS o marca la casa en el mapa.",
                           [("Marcar en el mapa", lambda: self.modo_manual(True)), ("Entendido", None)])
        self._abrir_visita(self.mi_pos, d)

    # ------------------------------------------------------------------ otras acciones
    def sincronizar(self) -> None:
        self._estado("Sincronizando…")

        def listo(r):                                   # la red corre en otro hilo para no congelar el mapa
            self.refrescar()
            self._estado("Sin conexión: se enviará luego." if r.get("sin_conexion") else (r.get("error") or "Sincronizado."))
        en_hilo(self.logica.sincronizar, listo, lambda e: self._estado(str(e)))
