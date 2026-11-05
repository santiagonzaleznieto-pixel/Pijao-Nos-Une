import os
import traceback

# Android no trae certificados propios: se usan los de certifi para HTTPS (mapa, Supabase).
try:
    import certifi
    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
except Exception:                                   # noqa: BLE001
    pass
# Los servidores de mapas bloquean el identificador genérico de las librerías: se usa uno propio.
try:
    import requests.utils as _u
    _u.default_user_agent = lambda name="python-requests": "PijaoNosUne/0.9 (app de campo; Android)"
except Exception:                                   # noqa: BLE001
    pass


def _app_de_error(texto):
    from kivy.app import App
    from kivy.uix.scrollview import ScrollView
    from kivy.uix.textinput import TextInput

    class ErrorApp(App):
        def build(self):
            return TextInput(text="La app no pudo iniciar. Toma una captura y envíala:\n\n" + texto, readonly=True, font_size="11sp")
    ErrorApp().run()


if __name__ == "__main__":
    try:
        from pijao.ui.errores import instalar
        from pijao.ui.app import PijaoApp
        instalar()
        PijaoApp().run()
    except Exception:                               # noqa: BLE001
        _app_de_error(traceback.format_exc())
