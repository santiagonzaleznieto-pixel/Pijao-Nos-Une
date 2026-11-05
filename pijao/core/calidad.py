"""Semáforo de calidad del registro (6.4) y señales anti-fraude (6.5)."""
from __future__ import annotations

from datetime import datetime

from . import reglas
from .catalogos import RESULTADOS_CON_CONTACTO
from .geo import haversine_m

ORDEN = {"verde": 0, "amarillo": 1, "rojo": 2}


def _peor(a: str, b: str) -> str:
    return a if ORDEN[a] >= ORDEN[b] else b


def tiene_consentimiento(draft: dict, persona_id: str | None, proposito: str) -> bool:
    for c in draft.get("consentimientos", []):
        if c.get("proposito") == proposito and c.get("estado", "vigente") == "vigente":
            if persona_id is None or c.get("persona_id") in (persona_id, None):
                return True
    return False


def evaluar_registro(draft: dict, params: dict | None = None) -> tuple[str, list[str]]:
    """Devuelve (color, motivos). Rojo no cuenta en las estadísticas oficiales hasta corregirse."""
    color, motivos = "verde", []
    viv = draft.get("vivienda", {})
    vis = draft.get("visita", {})
    fuente = viv.get("fuente_ubicacion", "gps")
    prec = viv.get("precision_m")
    if fuente == "gps" and not reglas.gps_aceptable(prec, params):
        color = _peor(color, "rojo")
        motivos.append("La precisión del GPS es débil (más de %s m)." % reglas.param(params, "precision_min_m"))
    if fuente == "manual" and not vis.get("motivo_manual"):
        color = _peor(color, "amarillo")
        motivos.append("Falta el motivo de la ubicación manual.")
    if reglas.requiere_foto_fachada(vis, bool(viv.get("es_reconocimiento"))):
        if not any(f.get("tipo") == "fachada" for f in draft.get("fotos", [])):
            color = _peor(color, "rojo")
            motivos.append("Falta la foto de fachada.")
    resultado = vis.get("resultado")
    if resultado in RESULTADOS_CON_CONTACTO and not vis.get("autorizacion_verbal"):
        color = _peor(color, "rojo")
        motivos.append("Falta la autorización verbal para registrar la visita.")
    for p in draft.get("personas", []):
        if not tiene_consentimiento(draft, p.get("id"), "datos_personales"):
            color = _peor(color, "rojo")
            motivos.append("Falta la autorización de datos de %s." % (p.get("primer_nombre") or "una persona"))
    hog = draft.get("hogar")
    if hog and resultado in RESULTADOS_CON_CONTACTO:
        if not (hog.get("sosten_relacion") or hog.get("sosten_persona_id")):
            color = _peor(color, "amarillo")
            motivos.append("Falta el principal sostén del hogar.")
    return color, motivos


def ritmo_sospechoso(fechas_previas_usuario: list, fecha_nueva, params: dict | None = None) -> bool:
    """Más de un registro completo cada 90 segundos por el mismo colaborador."""
    nueva = reglas.parse_iso(fecha_nueva)
    if nueva is None:
        return False
    limite = reglas.param(params, "ritmo_sospechoso_seg")
    for f in fechas_previas_usuario:
        d = reglas.parse_iso(f)
        if d is not None and abs((nueva - d).total_seconds()) < limite:
            return True
    return False


def salto_imposible(prev: dict | None, nueva: dict, params: dict | None = None) -> bool:
    """Dos registros a una velocidad imposible a pie (por defecto más de 15 m/s)."""
    if not prev:
        return False
    t1, t2 = reglas.parse_iso(prev.get("fecha")), reglas.parse_iso(nueva.get("fecha"))
    if t1 is None or t2 is None:
        return False
    dt = abs((t2 - t1).total_seconds())
    d = haversine_m(prev["lat"], prev["lng"], nueva["lat"], nueva["lng"])
    if dt <= 0:
        return d > reglas.param(params, "radio_duplicados_m")
    return d / dt > reglas.param(params, "velocidad_max_ms") and d > 100


def fuera_de_zona_asignada(zona_id: str | None, zonas_asignadas: list) -> bool:
    return bool(zonas_asignadas) and zona_id is not None and zona_id not in zonas_asignadas


def fuera_de_horario(dt_local: datetime, ini: int = 6, fin: int = 20) -> bool:
    return not (ini <= dt_local.hour < fin)
