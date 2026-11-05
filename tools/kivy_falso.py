"""Emulador mínimo de Kivy: valida propiedades, enlaces (bind), pantallas e instrucciones gráficas igual que Kivy 2.3,
para poder ejecutar TODA la interfaz sin celular. Sirve para detectar errores como «propiedad inexistente» antes de compilar."""
import copy
import sys
import tempfile
import threading
import time
import types


def _mod(nombre, **attrs):
    m = types.ModuleType(nombre)
    m.__dict__.update(attrs)
    sys.modules[nombre] = m
    return m


class Propiedad:
    def __init__(self, v=None, **k):
        self.v = v


def _P(v=None, **k):
    return Propiedad(v)


class Meta(type):
    def __new__(mcs, nombre, bases, ns):
        decl = {k: v.v for k, v in ns.items() if isinstance(v, Propiedad)}
        for k in decl:
            ns.pop(k)
        cls = super().__new__(mcs, nombre, bases, ns)
        cls._decl, cls._props_c, cls._evs_c = decl, set(ns.get("PROPS", ())) | set(decl), set(ns.get("EVENTS", ()))
        return cls


def _union(cls, attr):
    s = set()
    for c in cls.__mro__:
        s |= getattr(c, attr, set()) if "_c" in attr else set()
    return s


class EventDispatcher(metaclass=Meta):
    def __init__(self, **kw):
        object.__setattr__(self, "_binds", {})
        props, evs = _union(type(self), "_props_c"), _union(type(self), "_evs_c")
        malos = [k for k in kw if k not in props and k not in evs]
        if malos:
            raise TypeError(f"Properties {malos} passed to __init__ may not be existing property names. Valid properties are {sorted(props)}")
        for c in reversed(type(self).__mro__):
            for k, v in getattr(c, "_decl", {}).items():
                self.__dict__[k] = copy.copy(v)
        self._iniciar_widget()
        for k, v in kw.items():
            if k in evs:
                self.bind(**{k: v})
            else:
                setattr(self, k, v)

    def _iniciar_widget(self):
        pass

    def __setattr__(self, n, v):
        if n in _union(type(self), "_props_c"):
            viejo = getattr(self, n, None)
            object.__setattr__(self, n, v)
            nuevo = getattr(self, n, None)
            if viejo != nuevo:
                for cb in list(self._binds.get(n, [])):
                    cb(self, nuevo)
        else:
            object.__setattr__(self, n, v)

    def bind(self, **kw):
        props, evs = _union(type(self), "_props_c"), _union(type(self), "_evs_c")
        for k, cb in kw.items():
            if k not in props and k not in evs:
                raise KeyError(f"{type(self).__name__} no tiene la propiedad ni el evento '{k}' (bind)")
            self._binds.setdefault(k, []).append(cb)

    def unbind(self, **kw):
        for k, cb in kw.items():
            if cb is None:
                raise TypeError("unbind con None")
            try:
                self._binds.get(k, []).remove(cb)
            except ValueError:
                pass

    def setter(self, n):
        return lambda inst, v: setattr(self, n, v)

    def dispatch(self, ev, *a):
        r = getattr(self, ev, None)
        if callable(r):
            r(*a)
        for cb in list(self._binds.get(ev, [])):
            cb(self, *a)


# ---------------------------------------------------------------- gráficos
class _Lienzo:
    actual = None

    def __init__(self):
        self.items = []
        self.before = _Grupo(self)
        self.after = _Grupo(self)

    def __enter__(self):
        _Lienzo.actual = self
        return self

    def __exit__(self, *a):
        _Lienzo.actual = None

    def add(self, x):
        self.items.append(x)

    def clear(self):
        self.items = []


class _Grupo(_Lienzo):
    def __init__(self, padre):
        self.items = []


class _Instr:
    VALIDOS = ()

    def __init__(self, *a, **k):
        malos = [x for x in k if x not in self.VALIDOS]
        if malos:
            raise TypeError(f"{type(self).__name__}: argumentos no válidos {malos}")
        self.__dict__.update(k)
        for x in ("pos", "size"):
            if x in k and (len(k[x]) != 2 or any(v is None for v in k[x])):
                raise ValueError(f"{type(self).__name__}.{x} inválido: {k[x]}")
        if _Lienzo.actual is not None:
            _Lienzo.actual.add(self)


class Color(_Instr):
    VALIDOS = ("rgba", "r", "g", "b", "a")

    def __init__(self, *a, **k):
        if a and not 3 <= len(a) <= 4:
            raise ValueError("Color necesita 3 o 4 valores")
        self.rgba = tuple(a) if a else (1, 1, 1, 1)
        super().__init__(**k)


class Rectangle(_Instr):
    VALIDOS = ("pos", "size", "texture", "source", "tex_coords")


class Ellipse(_Instr):
    VALIDOS = ("pos", "size", "texture", "source", "tex_coords", "angle_start", "angle_end", "segments")


class RoundedRectangle(_Instr):
    VALIDOS = ("pos", "size", "texture", "source", "tex_coords", "radius", "segments")

    def __init__(self, **k):
        r = k.get("radius")
        if r is not None and not 1 <= len(r) <= 4:
            raise ValueError("radius necesita de 1 a 4 valores")
        super().__init__(**k)


class Triangle(_Instr):
    VALIDOS = ("points",)

    def __init__(self, **k):
        if len(k.get("points", [])) != 6:
            raise ValueError("Triangle necesita 6 coordenadas")
        super().__init__(**k)


class Quad(_Instr):
    VALIDOS = ("points",)

    def __init__(self, **k):
        if len(k.get("points", [])) != 8:
            raise ValueError("Quad necesita 8 coordenadas")
        super().__init__(**k)


class Line(_Instr):
    VALIDOS = ("points", "circle", "ellipse", "rectangle", "rounded_rectangle", "bezier", "width", "cap", "joint", "close", "dash_length",
               "dash_offset", "dashes", "cap_precision", "joint_precision", "texture", "source")

    def __init__(self, **k):
        if "circle" in k and not 3 <= len(k["circle"]) <= 6:
            raise ValueError("Line.circle inválido")
        if "rounded_rectangle" in k and len(k["rounded_rectangle"]) < 5:
            raise ValueError("Line.rounded_rectangle inválido")
        if "cap" in k and k["cap"] not in ("none", "square", "round"):
            raise ValueError("Line.cap inválido")
        super().__init__(**k)


# ---------------------------------------------------------------- widgets
W = ("x", "y", "width", "height", "pos", "size", "size_hint", "size_hint_x", "size_hint_y", "size_hint_min", "size_hint_min_x",
     "size_hint_min_y", "size_hint_max", "size_hint_max_x", "size_hint_max_y", "pos_hint", "opacity", "disabled", "center", "center_x",
     "center_y", "right", "top", "parent", "children", "cls", "ids", "motion_filter")


class Widget(EventDispatcher):
    PROPS = W
    EVENTS = ("on_touch_down", "on_touch_move", "on_touch_up", "on_kv_post")

    def _iniciar_widget(self):
        d = self.__dict__
        d.update(x=0, y=0, width=100, height=100, shx=1, shy=1, pos_hint={}, opacity=1, disabled=False, children=[], parent=None, ids={}, cls=[])
        d["canvas"] = _Lienzo()

    pos = property(lambda s: (s.x, s.y), lambda s, v: (setattr(s, "x", v[0]), setattr(s, "y", v[1])))
    size = property(lambda s: (s.width, s.height), lambda s, v: (setattr(s, "width", v[0]), setattr(s, "height", v[1])))
    size_hint = property(lambda s: (s.shx, s.shy), lambda s, v: (setattr(s, "shx", v[0]), setattr(s, "shy", v[1])))
    size_hint_x = property(lambda s: s.shx, lambda s, v: setattr(s, "shx", v))
    size_hint_y = property(lambda s: s.shy, lambda s, v: setattr(s, "shy", v))
    center_x = property(lambda s: s.x + s.width / 2, lambda s, v: setattr(s, "x", v - s.width / 2))
    center_y = property(lambda s: s.y + s.height / 2, lambda s, v: setattr(s, "y", v - s.height / 2))
    center = property(lambda s: (s.center_x, s.center_y), lambda s, v: (setattr(s, "center_x", v[0]), setattr(s, "center_y", v[1])))
    right = property(lambda s: s.x + s.width)
    top = property(lambda s: s.y + s.height)

    def add_widget(self, w, *a, **k):
        if w.parent is not None:
            raise Exception(f"Cannot add {w}, it already has a parent {w.parent}")
        w.parent = self
        self.children.insert(0, w)

    def remove_widget(self, w):
        if w in self.children:
            self.children.remove(w)
            w.parent = None

    def clear_widgets(self):
        for w in list(self.children):
            self.remove_widget(w)


class Layout(Widget):
    pass


class BoxLayout(Layout):
    PROPS = ("orientation", "padding", "spacing", "minimum_height", "minimum_width", "minimum_size")
    orientation = _P("horizontal")
    padding = _P(0)
    spacing = _P(0)


class FloatLayout(Layout):
    pass


class AnchorLayout(Layout):
    PROPS = ("anchor_x", "anchor_y", "padding")


class GridLayout(Layout):
    PROPS = ("cols", "rows", "padding", "spacing", "minimum_height", "minimum_width", "minimum_size", "col_default_width", "col_force_default",
             "row_default_height", "row_force_default", "cols_minimum", "rows_minimum")


class ScrollView(Widget):
    PROPS = ("scroll_x", "scroll_y", "do_scroll_x", "do_scroll_y", "do_scroll", "bar_width", "bar_color", "bar_inactive_color", "bar_margin",
             "bar_pos_x", "bar_pos_y", "bar_pos", "effect_cls", "scroll_distance", "scroll_timeout", "scroll_type", "viewport_size")

    def add_widget(self, w, *a, **k):
        if self.children:
            raise Exception("ScrollView accepts only one widget")
        super().add_widget(w)


LABEL = ("text", "text_size", "font_size", "font_name", "font_context", "font_family", "font_features", "font_hinting", "font_kerning",
         "font_blended", "color", "disabled_color", "bold", "italic", "underline", "strikethrough", "halign", "valign", "padding", "padding_x",
         "padding_y", "markup", "shorten", "shorten_from", "split_str", "unicode_errors", "max_lines", "line_height", "mipmap", "texture",
         "texture_size", "refs", "anchors", "outline_width", "outline_color", "text_language", "base_direction", "strip")


class Label(Widget):
    PROPS = LABEL
    text = _P("")

    def _iniciar_widget(self):
        super()._iniciar_widget()
        self.__dict__.update(color=(1, 1, 1, 1), font_size=15, texture_size=(0, 0), halign="auto", valign="bottom", bold=False, text_size=(None, None))

    def __setattr__(self, n, v):
        super().__setattr__(n, v)
        if n in ("text", "font_size"):
            super().__setattr__("texture_size", (8 * len(self.text), 16 if self.text else 0))


class ButtonBehavior(EventDispatcher):
    PROPS = ("state", "always_release", "min_state_time", "last_touch")
    EVENTS = ("on_press", "on_release")
    state = _P("normal")


class Button(ButtonBehavior, Label):
    PROPS = ("background_normal", "background_down", "background_disabled_normal", "background_disabled_down", "background_color", "border")


class Spinner(Button):
    PROPS = ("values", "option_cls", "dropdown_cls", "is_open", "sync_height", "text_autoupdate")
    values = _P([])


class CheckBox(ButtonBehavior, Widget):
    PROPS = ("active", "group", "allow_no_selection", "color", "background_checkbox_normal", "background_checkbox_down")
    active = _P(False)


class TextInput(Widget):
    PROPS = ("text", "hint_text", "hint_text_color", "password", "password_mask", "multiline", "input_type", "foreground_color", "background_color",
             "background_normal", "background_active", "background_disabled_normal", "border", "cursor_color", "cursor_width", "padding",
             "padding_x", "padding_y", "font_size", "font_name", "line_spacing", "write_tab", "readonly", "focus", "keyboard_suggestions",
             "disabled_foreground_color", "selection_color", "scroll_x", "scroll_y", "minimum_height", "halign", "use_bubble", "use_handles")
    EVENTS = ("on_text_validate",)
    text = _P("")
    focus = _P(False)
    padding = _P([6, 6, 6, 6])
    line_height = property(lambda s: 20)

    def _iniciar_widget(self):
        super()._iniciar_widget()
        self.__dict__.update(font_size=15, foreground_color=(0, 0, 0, 1), multiline=True, password=False)


class Image(Widget):
    PROPS = ("source", "fit_mode", "texture", "texture_size", "norm_image_size", "image_ratio", "color", "mipmap", "nocache", "reload",
             "anim_delay", "anim_loop", "allow_stretch", "keep_ratio")


class Popup(Widget):
    PROPS = ("title", "title_size", "title_align", "title_font", "title_color", "content", "auto_dismiss", "background", "background_color",
             "border", "separator_color", "separator_height", "attach_to", "overlay_color")
    EVENTS = ("on_open", "on_dismiss")
    abiertos = []

    def open(self, *a):
        Popup.abiertos.append(self)

    def dismiss(self, *a):
        if self in Popup.abiertos:
            Popup.abiertos.remove(self)


class ScreenManagerException(Exception):
    pass


class FadeTransition:
    def __init__(self, **k):
        self.__dict__.update(k)


class Screen(Widget):
    PROPS = ("name", "manager", "transition_progress", "transition_state")
    EVENTS = ("on_pre_enter", "on_enter", "on_pre_leave", "on_leave")
    name = _P("")
    manager = _P(None)


class ScreenManager(Widget):
    PROPS = ("transition", "current", "current_screen", "screens", "screen_names")
    current = _P(None)

    def __setattr__(self, n, v):
        if n == "current" and v is not None:
            self.screen(v)                      # lanza si no existe
            if v == self.__dict__.get("current"):
                return
            nuevo, viejo = self.screen(v), self.__dict__.get("current")
            if viejo:
                self.screen(viejo).dispatch("on_pre_leave")
            nuevo.dispatch("on_pre_enter")
            EventDispatcher.__setattr__(self, n, v)
            nuevo.dispatch("on_enter")
            if viejo:
                self.screen(viejo).dispatch("on_leave")
            return
        super().__setattr__(n, v)

    def screen(self, nombre):
        for s in self.children:
            if s.name == nombre:
                return s
        raise ScreenManagerException(f'No Screen with name "{nombre}".')

    get_screen = screen

    def has_screen(self, nombre):
        return any(s.name == nombre for s in self.children)

    def add_widget(self, w, *a, **k):
        if not isinstance(w, Screen):
            raise ScreenManagerException("ScreenManager solo acepta Screen")
        if self.has_screen(w.name):
            raise ScreenManagerException(f"Ya hay una pantalla llamada {w.name}")
        super().add_widget(w)
        w.manager = self
        if not self.current:
            self.current = w.name

    def remove_widget(self, w):
        super().remove_widget(w)
        w.manager = None


# ---------------------------------------------------------------- mapa, reloj, animación y demás módulos
class MapSource:
    def __init__(self, url=None, cache_key=None, min_zoom=0, max_zoom=19, tile_size=256, image_ext="png", attribution="", subdomains="abc", **k):
        self.url = url


class MapView(Widget):
    PROPS = ("lat", "lon", "zoom", "map_source", "double_tap_zoom", "pause_on_action", "snap_to_zoom", "min_zoom", "max_zoom", "cache_dir")
    map_source = _P("osm")

    def __init__(self, **k):
        self._marcas = []
        super().__init__(**k)

    def add_marker(self, m, layer=None):
        self._marcas.append(m)

    def remove_marker(self, m):
        self._marcas.remove(m)

    def center_on(self, lat, lon):
        self.lat, self.lon = lat, lon


class MapMarker(ButtonBehavior, Image):
    PROPS = ("lat", "lon", "anchor_x", "anchor_y")
    lat = _P(0)
    lon = _P(0)


class _Reloj:
    def __init__(self):
        self.cola, self.t, self.cerrojo = [], 0.0, threading.Lock()

    def schedule_once(self, cb, t=0):
        with self.cerrojo:
            self.cola.append([self.t + (t or 0), cb, None])
        return cb

    def schedule_interval(self, cb, t):
        with self.cerrojo:
            self.cola.append([self.t + t, cb, t])
        return cb

    def unschedule(self, cb):
        with self.cerrojo:
            self.cola = [e for e in self.cola if e[1] is not cb]

    def avanzar(self, seg, paso=.25):
        fin = self.t + seg
        while self.t < fin:
            self.t += paso
            with self.cerrojo:
                listos = [e for e in self.cola if e[0] <= self.t]
            for e in listos:
                r = e[1](paso)
                with self.cerrojo:
                    if e[2] is None or r is False:
                        if e in self.cola:
                            self.cola.remove(e)
                    else:
                        e[0] = self.t + e[2]


Clock = _Reloj()


class Animation:
    def __init__(self, **k):
        self.k = {x: v for x, v in k.items() if x not in ("d", "duration", "t", "transition")}
        self.t = k.get("t", k.get("transition", "linear"))
        if self.t not in ("linear", "out_quad", "out_expo", "out_quart", "out_cubic", "in_out_sine", "in_quad", "out_sine"):
            raise ValueError(f"transición desconocida {self.t}")

    def bind(self, **k):
        pass

    def start(self, w):
        for n, v in self.k.items():
            if not hasattr(w, n):
                raise AttributeError(f"{type(w).__name__} no tiene '{n}' para animar")
            setattr(w, n, v)


class _Ventana:
    clearcolor = (0, 0, 0, 1)
    softinput_mode = ""


class App:
    _corriendo = None

    def __init__(self, **k):
        App._corriendo = self
        self.user_data_dir = tempfile.mkdtemp()
        self.root = None

    @staticmethod
    def get_running_app():
        return App._corriendo


class _Portapapeles:
    copiado = None

    def copy(self, t):
        _Portapapeles.copiado = t


class _GPS:
    def configure(self, **k):
        pass

    def start(self, **k):
        pass

    def stop(self):
        pass


def instalar():
    for n in [m for m in sys.modules if m.startswith(("kivy", "plyer", "kivy_garden"))]:
        del sys.modules[n]
    _mod("kivy")
    _mod("kivy.app", App=App)
    _mod("kivy.clock", Clock=Clock)
    _mod("kivy.metrics", dp=lambda x: x, sp=lambda x: x)
    _mod("kivy.animation", Animation=Animation)
    _mod("kivy.properties", NumericProperty=_P, StringProperty=_P, ListProperty=_P, ObjectProperty=_P, BooleanProperty=_P, DictProperty=_P)
    _mod("kivy.graphics", Color=Color, Ellipse=Ellipse, Line=Line, Quad=Quad, Rectangle=Rectangle, RoundedRectangle=RoundedRectangle, Triangle=Triangle)
    _mod("kivy.core")
    _mod("kivy.core.window", Window=_Ventana())
    _mod("kivy.core.clipboard", Clipboard=_Portapapeles())
    _mod("kivy.base", ExceptionHandler=object, ExceptionManager=types.SimpleNamespace(PASS=1, RAISE=0, add_handler=lambda h: None))
    _mod("kivy.uix")
    for nombre, obj in (("boxlayout", BoxLayout), ("floatlayout", FloatLayout), ("anchorlayout", AnchorLayout), ("gridlayout", GridLayout),
                        ("scrollview", ScrollView), ("label", Label), ("button", Button), ("textinput", TextInput), ("image", Image),
                        ("spinner", Spinner), ("checkbox", CheckBox), ("popup", Popup), ("widget", Widget)):
        _mod("kivy.uix." + nombre, **{obj.__name__: obj})
    _mod("kivy.uix.behaviors", ButtonBehavior=ButtonBehavior)
    _mod("kivy.uix.screenmanager", Screen=Screen, ScreenManager=ScreenManager, FadeTransition=FadeTransition)
    _mod("kivy_garden")
    _mod("kivy_garden.mapview", MapView=MapView, MapMarker=MapMarker, MapSource=MapSource)
    _mod("plyer", gps=_GPS())
