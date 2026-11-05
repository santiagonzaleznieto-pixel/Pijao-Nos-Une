"""Reglas de negocio (sección 19.2) y valores de control (19.1).

Estos valores son los iniciales; el Administrador los puede cambiar en la tabla
`configuracion` y la app los descarga al sincronizar.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from .catalogos import ESTADO_POR_RESULTADO, RESULTADOS_CON_CONTACTO

PARAMS_POR_DEFECTO: dict = {
    "radio_duplicados_m": 15,
    "distancia_max_registro_m": 50,
    "precision_min_m": 20,
    "ubicacion_manual_max_m": 100,
    "ajuste_pin_max_m": 30,
    "ventana_edicion_h": 72,
    "fotos_max_visita": 6,
    "foto_lado_max_px": 1280,
    "foto_peso_objetivo_kb": 300,
    "invitacion_horas": 72,
    "sesion_colaborador_dias": 14,
    "sesion_director_dias": 7,
    "sesion_admin_horas": 12,
    "inactividad_suspension_dias": 30,
    "max_dispositivos": 2,
    "intentos_fallidos": 5,
    "bloqueo_min": 15,
    "grupo_minimo": 5,
    "verificacion_porcentaje": 5,
    "retencion_ubicacion_dias": 7,
    "papelera_dias": 30,
    "mensajes_hora_ini": 8,
    "mensajes_hora_fin": 20,
    "silencio_ini": 21,
    "silencio_fin": 6,
    "alertas_tope": [70, 85, 95, 100],
    "curso_minimo": 80,
    "certificado_meses": 6,
    "titulares_plazo_interno_dias": 5,
    "ritmo_sospechoso_seg": 90,
    "velocidad_max_ms": 15.0,
    "gps_muestreo_seg": 9,
    "jornada_intervalo_seg": 30,
    "centro_lat": 4.3333,
    "centro_lng": -75.7000,
    "radio_municipio_km": 30,
}


def param(params: dict | None, clave: str):
    if params and clave in params and params[clave] is not None:
        return params[clave]
    return PARAMS_POR_DEFECTO[clave]


def ahora_utc() -> datetime:
    return datetime.now(timezone.utc)


def parse_iso(s) -> datetime | None:
    if s is None or s == "":
        return None
    if isinstance(s, datetime):
        return s if s.tzinfo else s.replace(tzinfo=timezone.utc)
    t = str(s).strip().replace("Z", "+00:00")
    try:
        d = datetime.fromisoformat(t)
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def iso(dt: datetime | None = None) -> str:
    return (dt or ahora_utc()).astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


# ------------------------------------------------------------ ubicación (R-08 a R-12)

def puede_registrar_aqui(distancia_telefono_punto_m: float, params: dict | None = None) -> bool:
    """R-09: el teléfono debe estar a 50 m o menos del punto."""
    return distancia_telefono_punto_m <= param(params, "distancia_max_registro_m")


def gps_aceptable(precision_m: float | None, params: dict | None = None) -> bool:
    """R-10: precisión de 20 m o menos."""
    return precision_m is not None and precision_m <= param(params, "precision_min_m")


def clasificar_ubicacion_manual(distancia_m: float, params: dict | None = None) -> str:
    """R-12: 'ok' hasta 100 m del teléfono; más lejos es 'diferido' (pendiente de aprobación)."""
    return "ok" if distancia_m <= param(params, "ubicacion_manual_max_m") else "diferido"


def hay_duplicado(distancia_m: float, params: dict | None = None) -> bool:
    """R-08: otra vivienda a menos de 15 m."""
    return distancia_m <= param(params, "radio_duplicados_m")


def dentro_del_municipio(lat: float, lon: float, params: dict | None = None) -> bool:
    from .geo import haversine_m
    d = haversine_m(lat, lon, param(params, "centro_lat"), param(params, "centro_lng"))
    return d <= param(params, "radio_municipio_km") * 1000


# ------------------------------------------------------------ edición (R-22)

def ventana_edicion_abierta(creado_en, ahora: datetime | None = None, params: dict | None = None) -> bool:
    c = parse_iso(creado_en)
    if c is None:
        return False
    ahora = ahora or ahora_utc()
    return ahora - c <= timedelta(hours=param(params, "ventana_edicion_h"))


def puede_editar_registro(perfil, autor_id: str | None, creado_en, zona_id=None,
                          ahora: datetime | None = None, params: dict | None = None) -> bool:
    """El autor edita 72 horas; Director, Administrador y quien tenga O-06 siempre."""
    if perfil.es_staff or perfil.tiene("O-06", zona_id):
        return True
    return autor_id == perfil.id and ventana_edicion_abierta(creado_en, ahora, params)


# ------------------------------------------------------------ visitas

def estado_vivienda_por_resultado(resultado: str | None) -> str:
    return ESTADO_POR_RESULTADO.get(resultado or "", "visitada_sin_contacto")


def hubo_contacto(resultado: str | None) -> bool:
    return resultado in RESULTADOS_CON_CONTACTO


def requiere_foto_fachada(visita: dict, es_reconocimiento: bool = False) -> bool:
    """R-13: toda vivienda lleva foto de fachada, salvo 'No autorizó la foto' o el modo reconocimiento rápido."""
    if es_reconocimiento:
        return False
    return not visita.get("no_autorizo_foto")


def plazo_titulares(recibida, params: dict | None = None) -> datetime | None:
    """Plazo interno (5 días hábiles) para responder una solicitud de titular de datos."""
    d = parse_iso(recibida)
    if d is None:
        return None
    dias = param(params, "titulares_plazo_interno_dias")
    while dias > 0:
        d += timedelta(days=1)
        if d.weekday() < 5:
            dias -= 1
    return d


def dentro_de_horario_mensajes(dt_local: datetime, params: dict | None = None) -> bool:
    """R-35: de 8 a. m. a 8 p. m."""
    return param(params, "mensajes_hora_ini") <= dt_local.hour < param(params, "mensajes_hora_fin")


def alerta_tope(porcentaje: float, params: dict | None = None) -> int | None:
    """Devuelve el umbral más alto alcanzado (70, 85, 95 o 100) o None."""
    alcanzados = [u for u in param(params, "alertas_tope") if porcentaje >= u]
    return max(alcanzados) if alcanzados else None
