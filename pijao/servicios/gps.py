"""GPS: lógica de lecturas (sin Kivy, se prueba) y adaptador para Android (plyer)."""
from __future__ import annotations

import os
import time

PRECISION_MAX_REGISTRO_M = 20.0     # sección 5.4: peor que 20 m no se registra


def calidad_senal(precision_m: float | None) -> str:
    if precision_m is None:
        return "sin señal"
    return "buena" if precision_m < 10 else "regular" if precision_m <= 20 else "débil"


class Muestreo:
    """Junta lecturas durante unos segundos y se queda con la de mejor precisión (sección 5.4)."""

    def __init__(self, duracion_s: float = 9.0, reloj=time.monotonic):
        self.duracion_s, self._reloj = duracion_s, reloj
        self._t0 = reloj()
        self.lecturas: list[dict] = []

    def agregar(self, lectura: dict) -> None:
        if lectura.get("previa"):                    # una ubicación guardada de antes no sirve para registrar
            return
        if lectura.get("lat") is not None and lectura.get("lng") is not None and lectura.get("precision_m") is not None:
            self.lecturas.append(lectura)

    def mejor(self) -> dict | None:
        return min(self.lecturas, key=lambda x: x["precision_m"], default=None)

    @property
    def terminado(self) -> bool:
        return self._reloj() - self._t0 >= self.duracion_s


class ServicioGPS:
    """Pide el permiso y entrega lecturas por `al_leer(dict)`. Con PIJAO_GPS_FALSO=1 simula una en el computador."""

    def __init__(self, al_leer, al_error=None):
        self.al_leer, self.al_error = al_leer, al_error
        self.activo, self.error, self.ultima, self.aviso = False, None, None, None

    def iniciar(self) -> None:
        if self.activo:
            return
        if os.environ.get("PIJAO_GPS_FALSO"):
            from kivy.clock import Clock
            Clock.schedule_interval(lambda dt: self._recibir(lat=4.3333, lon=-75.7, accuracy=8.0, altitude=1500.0), 1)
            self.activo = True
            return
        try:
            from android.permissions import Permission, request_permissions
        except ImportError:                      # no es Android
            return self._arrancar()
        request_permissions([Permission.ACCESS_FINE_LOCATION, Permission.ACCESS_COARSE_LOCATION], self._permisos)

    def _permisos(self, permisos, concedidos) -> None:
        if concedidos and all(concedidos):
            self._arrancar()
        else:
            self._fallo("Sin permiso de ubicación. Actívalo en Ajustes > Aplicaciones > Pijao nos une.")

    def _arrancar(self) -> None:
        try:
            from plyer import gps
            gps.configure(on_location=self._recibir, on_status=lambda *a, **k: None)
            gps.start(minTime=1000, minDistance=0)
            self.activo = True
            self._estado_android()
        except Exception as e:                   # noqa: BLE001 - se muestra al usuario
            self._fallo(f"No se pudo iniciar el GPS: {e}")

    def _info_android(self):
        """(proveedores encendidos, última ubicación conocida) usando Android directamente; (None, None) si no se puede."""
        try:
            from jnius import autoclass
            actividad = autoclass("org.kivy.android.PythonActivity").mActivity
            lm = actividad.getSystemService(autoclass("android.content.Context").LOCATION_SERVICE)
            habilitados = [str(p) for p in lm.getProviders(True).toArray()]
            mejor = None
            for p in habilitados:
                loc = lm.getLastKnownLocation(p)
                if loc is not None and (mejor is None or loc.getTime() > mejor.getTime()):
                    mejor = loc
            if mejor is None:
                return habilitados, None
            return habilitados, {"lat": mejor.getLatitude(), "lng": mejor.getLongitude(), "precision_m": float(mejor.getAccuracy()),
                                 "altitud_m": mejor.getAltitude(), "previa": True}
        except Exception:                            # noqa: BLE001 - no es Android o no hay permiso
            return None, None

    def _estado_android(self) -> None:
        habilitados, previa = self._info_android()
        if habilitados is not None and not habilitados:
            self.aviso = "El GPS está apagado. Actívalo en los ajustes del teléfono."
        else:
            self.aviso = "Buscando señal… sal a un lugar abierto."
        if previa:
            from kivy.clock import Clock
            Clock.schedule_once(lambda dt: self.al_leer(previa), 0)

    def _fallo(self, texto: str) -> None:
        self.error = texto
        if self.al_error:
            from kivy.clock import Clock
            Clock.schedule_once(lambda dt: self.al_error(texto), 0)

    def _recibir(self, **kw) -> None:
        if kw.get("lat") is None:
            return
        lectura = {"lat": kw["lat"], "lng": kw.get("lon"), "precision_m": kw.get("accuracy"), "altitud_m": kw.get("altitude")}
        self.ultima, self.aviso = lectura, None
        from kivy.clock import Clock
        Clock.schedule_once(lambda dt: self.al_leer(lectura), 0)    # plyer llama desde otro hilo

    def detener(self) -> None:
        if not self.activo or os.environ.get("PIJAO_GPS_FALSO"):
            return
        try:
            from plyer import gps
            gps.stop()
        except Exception:                        # noqa: BLE001
            pass
        self.activo = False
