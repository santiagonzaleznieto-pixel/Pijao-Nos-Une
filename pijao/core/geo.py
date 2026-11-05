"""Geografía sin dependencias: distancias, polígonos de zonas y matemática de mosaicos de mapa."""
from __future__ import annotations

import math
from typing import Iterable, Sequence

RADIO_TIERRA_M = 6371008.8
TILE = 256
MAX_LAT = 85.05112878


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * RADIO_TIERRA_M * math.asin(min(1.0, math.sqrt(a)))


def bbox_radio(lat: float, lon: float, radio_m: float) -> tuple[float, float, float, float]:
    """Devuelve (min_lat, min_lon, max_lat, max_lon) de un cuadro que contiene el círculo."""
    dlat = math.degrees(radio_m / RADIO_TIERRA_M)
    dlon = math.degrees(radio_m / (RADIO_TIERRA_M * max(0.01, math.cos(math.radians(lat)))))
    return (lat - dlat, lon - dlon, lat + dlat, lon + dlon)


def mas_cercano(puntos: Iterable[dict], lat: float, lon: float, max_m: float | None = None,
                clave_lat: str = "lat", clave_lon: str = "lng") -> tuple[dict | None, float]:
    mejor, mejor_d = None, float("inf")
    for p in puntos:
        d = haversine_m(lat, lon, p[clave_lat], p[clave_lon])
        if d < mejor_d:
            mejor, mejor_d = p, d
    if mejor is not None and (max_m is None or mejor_d <= max_m):
        return mejor, mejor_d
    return None, mejor_d


def cercanos(puntos: Iterable[dict], lat: float, lon: float, radio_m: float,
             clave_lat: str = "lat", clave_lon: str = "lng") -> list[tuple[dict, float]]:
    salida = []
    for p in puntos:
        d = haversine_m(lat, lon, p[clave_lat], p[clave_lon])
        if d <= radio_m:
            salida.append((p, d))
    salida.sort(key=lambda t: t[1])
    return salida


# ---------------------------------------------------------------- polígonos

def punto_en_anillo(lat: float, lon: float, anillo: Sequence[Sequence[float]]) -> bool:
    """Anillo en formato GeoJSON: [[lon, lat], ...]. Algoritmo del rayo."""
    dentro = False
    n = len(anillo)
    if n < 3:
        return False
    j = n - 1
    for i in range(n):
        xi, yi = anillo[i][0], anillo[i][1]
        xj, yj = anillo[j][0], anillo[j][1]
        if (yi > lat) != (yj > lat):
            x_cruce = (xj - xi) * (lat - yi) / (yj - yi) + xi
            if lon < x_cruce:
                dentro = not dentro
        j = i
    return dentro


def punto_en_poligono(lat: float, lon: float, geom) -> bool:
    """Acepta un Polygon/MultiPolygon GeoJSON (dict) o la lista de anillos de un Polygon."""
    if not geom:
        return False
    if isinstance(geom, dict):
        tipo = geom.get("type")
        coords = geom.get("coordinates")
        if tipo == "MultiPolygon":
            return any(punto_en_poligono(lat, lon, poly) for poly in coords or [])
        geom = coords
    if not geom:
        return False
    if not punto_en_anillo(lat, lon, geom[0]):
        return False
    return not any(punto_en_anillo(lat, lon, hueco) for hueco in geom[1:])


def zona_de_punto(lat: float, lon: float, zonas: Iterable[dict]) -> dict | None:
    """Devuelve la primera zona (con clave 'poligono') que contiene el punto."""
    for z in zonas:
        if punto_en_poligono(lat, lon, z.get("poligono")):
            return z
    return None


def anillos_de_zona(geom) -> list[list[tuple[float, float]]]:
    """Convierte un polígono GeoJSON en una lista de anillos [(lat, lon), ...] para dibujar."""
    if not geom:
        return []
    if isinstance(geom, dict):
        coords = geom.get("coordinates") or []
        if geom.get("type") == "MultiPolygon":
            salida = []
            for poly in coords:
                salida.extend([[(p[1], p[0]) for p in poly[0]]] if poly else [])
            return salida
        geom = coords
    return [[(p[1], p[0]) for p in geom[0]]] if geom else []


# ------------------------------------------------------------ mosaicos de mapa

def mundo_px(z: int) -> float:
    return TILE * (2 ** z)


def lonlat_a_px(lat: float, lon: float, z: int) -> tuple[float, float]:
    lat = max(-MAX_LAT, min(MAX_LAT, lat))
    s = mundo_px(z)
    x = (lon + 180.0) / 360.0 * s
    siny = math.sin(math.radians(lat))
    y = (0.5 - math.log((1 + siny) / (1 - siny)) / (4 * math.pi)) * s
    return x, y


def px_a_lonlat(x: float, y: float, z: int) -> tuple[float, float]:
    """Devuelve (lat, lon)."""
    s = mundo_px(z)
    lon = x / s * 360.0 - 180.0
    n = math.pi - 2 * math.pi * y / s
    lat = math.degrees(math.atan(math.sinh(n)))
    return lat, lon


def metros_por_pixel(lat: float, z: int) -> float:
    return 156543.03392 * math.cos(math.radians(lat)) / (2 ** z)


def mosaico_de_punto(lat: float, lon: float, z: int) -> tuple[int, int]:
    x, y = lonlat_a_px(lat, lon, z)
    return int(x // TILE), int(y // TILE)


def mosaicos_en_bbox(min_lat: float, min_lon: float, max_lat: float, max_lon: float, z: int) -> list[tuple[int, int, int]]:
    x0, y1 = mosaico_de_punto(min_lat, min_lon, z)
    x1, y0 = mosaico_de_punto(max_lat, max_lon, z)
    n = 2 ** z
    salida = []
    for x in range(max(0, x0), min(n - 1, x1) + 1):
        for y in range(max(0, y0), min(n - 1, y1) + 1):
            salida.append((z, x, y))
    return salida


def contar_mosaicos(min_lat: float, min_lon: float, max_lat: float, max_lon: float, zmin: int, zmax: int) -> int:
    return sum(len(mosaicos_en_bbox(min_lat, min_lon, max_lat, max_lon, z)) for z in range(zmin, zmax + 1))


# ---------------------------------------------------------------- agrupación

def agrupar(puntos: Sequence[dict], z: int, celda_px: float = 56.0,
            clave_lat: str = "lat", clave_lon: str = "lng") -> list[dict]:
    """Agrupa puntos en celdas de pantalla. Cada grupo: {lat, lon, n, items}."""
    celdas: dict[tuple[int, int], dict] = {}
    for p in puntos:
        px, py = lonlat_a_px(p[clave_lat], p[clave_lon], z)
        k = (int(px // celda_px), int(py // celda_px))
        g = celdas.get(k)
        if g is None:
            g = {"lat": 0.0, "lon": 0.0, "n": 0, "items": []}
            celdas[k] = g
        g["lat"] += p[clave_lat]
        g["lon"] += p[clave_lon]
        g["n"] += 1
        g["items"].append(p)
    for g in celdas.values():
        g["lat"] /= g["n"]
        g["lon"] /= g["n"]
    return list(celdas.values())
