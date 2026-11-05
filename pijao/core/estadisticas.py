"""Indicadores del panel de campaña (9.3, 9.7) con la regla de 'menos de 5' (R-29)."""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone

from . import reglas
from .validadores import contar_adultos

TZ_BOGOTA = timezone(timedelta(hours=-5))


def umbral(n, minimo: int = 5) -> str:
    """Los grupos de 1 a 4 se muestran como 'menos de 5' para no identificar a nadie."""
    if n is None:
        return "—"
    n = int(n)
    if 0 < n < minimo:
        return f"menos de {minimo}"
    return str(n)


def _pct(a, b) -> float:
    return round(100.0 * a / b, 1) if b else 0.0


def _fecha_local(s) -> datetime | None:
    d = reglas.parse_iso(s)
    return d.astimezone(TZ_BOGOTA) if d else None


def panel_campana(viviendas: list[dict], visitas: list[dict], hogares: list[dict], personas: list[dict],
                  necesidades: list[dict], ahora: datetime | None = None, minimo: int = 5) -> dict:
    ahora = (ahora or reglas.ahora_utc()).astimezone(TZ_BOGOTA)
    viv = [v for v in viviendas if not v.get("eliminado_en")]
    vis = [v for v in visitas if not v.get("eliminado_en")]
    completas = [v for v in vis if v.get("calidad") == "verde"]
    ids_visitadas = {v["vivienda_id"] for v in completas}
    conocidas = len(viv)
    con_contacto = [v for v in completas if reglas.hubo_contacto(v.get("resultado"))]

    hog = [h for h in hogares if not h.get("eliminado_en")]
    hogares_visitados = len(hog)
    ids_hogar_con_contacto = {p.get("hogar_id") for p in personas
                              if not p.get("eliminado_en") and p.get("tiene_contacto_autorizado")}
    pers_aut = [p for p in personas if not p.get("eliminado_en") and p.get("estado") != "no_contactar"]

    por_tema = Counter(n.get("tema") for n in necesidades if n.get("tema"))
    temas = [{"tema": t, "n": n, "texto": umbral(n, minimo)} for t, n in por_tema.most_common(10)]

    zonas: dict = {}
    for v in viv:
        z = v.get("zona_id") or "sin_zona"
        zonas.setdefault(z, {"zona_id": z, "conocidas": 0, "visitadas": 0})
        zonas[z]["conocidas"] += 1
        if v["id"] in ids_visitadas:
            zonas[z]["visitadas"] += 1
    por_zona = []
    for z in zonas.values():
        z["cobertura_pct"] = _pct(z["visitadas"], z["conocidas"])
        z["texto_conocidas"] = umbral(z["conocidas"], minimo)
        por_zona.append(z)
    por_zona.sort(key=lambda z: z["cobertura_pct"])

    dias = {}
    for i in range(30):
        d = (ahora - timedelta(days=i)).date()
        dias[d.isoformat()] = 0
    for v in completas:
        f = _fecha_local(v.get("fecha"))
        if f and f.date().isoformat() in dias:
            dias[f.date().isoformat()] += 1
    visitas_por_dia = sorted(dias.items())

    return {
        "viviendas_conocidas": conocidas,
        "viviendas_visitadas": len(ids_visitadas),
        "cobertura_pct": _pct(len(ids_visitadas), conocidas),
        "tasa_contacto_pct": _pct(len(con_contacto), len(completas)),
        "hogares": hogares_visitados,
        "hogares_con_contacto_autorizado": len(ids_hogar_con_contacto),
        "hogares_con_contacto_pct": _pct(len(ids_hogar_con_contacto), hogares_visitados),
        "personas_autorizadas": len(pers_aut),
        "personas_por_hogar": round(sum(int(h.get("total_personas") or 0) for h in hog) / hogares_visitados, 1) if hogares_visitados else 0.0,
        "electores_por_hogar": round(sum(contar_adultos(h.get("edades")) for h in hog) / hogares_visitados, 1) if hogares_visitados else 0.0,
        "primeros_votantes": sum(int(h.get("futuros_primeros_votantes") or 0) for h in hog),
        "hogares_jefatura_femenina": sum(1 for h in hog if h.get("jefatura_femenina")),
        "necesidades_por_tema": temas,
        "por_zona": por_zona,
        "visitas_por_dia": visitas_por_dia,
        "registros_incompletos": len([v for v in vis if v.get("calidad") in ("amarillo", "rojo")]),
    }


def panel_personal(usuario_id: str, visitas: list[dict], tareas: list[dict], borradores: int = 0,
                   por_enviar: int = 0, ahora: datetime | None = None) -> dict:
    ahora_utc = ahora or reglas.ahora_utc()
    ahora_local = ahora_utc.astimezone(TZ_BOGOTA)
    inicio_dia = ahora_local.replace(hour=0, minute=0, second=0, microsecond=0)
    inicio_semana = inicio_dia - timedelta(days=ahora_local.weekday())
    mias = [v for v in visitas if v.get("usuario_id") == usuario_id and not v.get("eliminado_en")]

    def _desde(corte):
        n = 0
        for v in mias:
            f = _fecha_local(v.get("fecha"))
            if f and f >= corte:
                n += 1
        return n

    vencidos = 0
    for t in tareas:
        if t.get("asignado_a") != usuario_id or t.get("estado") not in ("pendiente", "en_curso", "bloqueada"):
            continue
        lim = reglas.parse_iso(t.get("fecha_limite"))
        if lim and lim < ahora_utc:
            vencidos += 1
    pendientes = len([t for t in tareas if t.get("asignado_a") == usuario_id
                      and t.get("estado") in ("pendiente", "en_curso", "bloqueada")])
    semaforo = [v.get("calidad") for v in mias[-20:]]
    return {
        "hoy": _desde(inicio_dia),
        "semana": _desde(inicio_semana),
        "total": len(mias),
        "tareas_pendientes": pendientes,
        "tareas_vencidas": vencidos,
        "borradores": borradores,
        "por_enviar": por_enviar,
        "calidad_reciente": {c: semaforo.count(c) for c in ("verde", "amarillo", "rojo")},
    }
