"""Protección estándar de datos personales (sección 7.4): qué ve cada quien."""
from __future__ import annotations

import re

PUNTO = "\u2022"


def mascara_cedula(valor) -> str:
    """Solo los últimos 3 dígitos."""
    d = re.sub(r"\D", "", str(valor or ""))
    if not d:
        return ""
    return PUNTO * max(0, len(d) - 3) + d[-3:]


def mascara_telefono(valor) -> str:
    """Solo los últimos 4 dígitos."""
    d = re.sub(r"\D", "", str(valor or ""))
    if not d:
        return ""
    return PUNTO * max(0, len(d) - 4) + d[-4:]


def mascara_correo(valor) -> str:
    s = (valor or "").strip()
    if "@" not in s:
        return ""
    usuario, dominio = s.split("@", 1)
    host, _, tld = dominio.rpartition(".")
    if not host:
        host, tld = dominio, ""
    u = (usuario[:1] + PUNTO * 3) if usuario else PUNTO * 3
    h = (host[:1] + PUNTO * 3) if host else PUNTO * 3
    return f"{u}@{h}" + (f".{tld}" if tld else "")


def nombre_visible(primer_nombre, primer_apellido) -> str:
    return " ".join(x.strip() for x in (primer_nombre or "", primer_apellido or "") if x and x.strip())


def nombre_completo(p: dict) -> str:
    partes = [p.get("primer_nombre"), p.get("segundo_nombre"), p.get("primer_apellido"), p.get("segundo_apellido")]
    return " ".join(x.strip() for x in partes if x and str(x).strip())


def vista_local_de_persona(p: dict, edad_anios: int | None = None) -> dict:
    """Versión enmascarada que se guarda en el teléfono (lo sensible solo viaja en la cola de envío)."""
    return {
        "id": p.get("id"),
        "hogar_id": p.get("hogar_id"),
        "vivienda_id": p.get("vivienda_id"),
        "nombre_visible": nombre_visible(p.get("primer_nombre"), p.get("primer_apellido")),
        "apodo": p.get("apodo"),
        "edad_anios": edad_anios,
        "sexo": p.get("sexo"),
        "ocupacion": p.get("ocupacion"),
        "cedula_ult3": re.sub(r"\D", "", str(p.get("cedula") or ""))[-3:] or None,
        "telefono_ult4": re.sub(r"\D", "", str(p.get("telefono") or ""))[-4:] or None,
        "correo_parcial": mascara_correo(p.get("correo")) or None,
        "canal_preferido": p.get("canal_preferido"),
        "vota_en_pijao": p.get("vota_en_pijao"),
        "interes_info": p.get("interes_info"),
        "voluntario": p.get("voluntario"),
        "anfitrion": p.get("anfitrion"),
        "estado": p.get("estado") or "activa",
        "creado_por": p.get("creado_por"),
        "creado_en": p.get("creado_en"),
    }


def vista_para_pantalla(persona_v: dict, completa: dict | None = None) -> dict:
    """Combina la vista enmascarada (la que llega siempre) con los datos completos si el servidor los entregó."""
    v = dict(persona_v)
    v["cedula_txt"] = ""
    v["telefono_txt"] = ""
    v["correo_txt"] = ""
    v["nacimiento_txt"] = ""
    v["simpatia_txt"] = ""
    if persona_v.get("cedula_ult3"):
        v["cedula_txt"] = PUNTO * 6 + str(persona_v["cedula_ult3"])
    if persona_v.get("telefono_ult4"):
        v["telefono_txt"] = PUNTO * 6 + str(persona_v["telefono_ult4"])
    v["correo_txt"] = persona_v.get("correo_parcial") or ""
    if persona_v.get("edad_anios") is not None:
        v["nacimiento_txt"] = f"{persona_v['edad_anios']} años"
    if completa:
        v["cedula_txt"] = completa.get("cedula") or v["cedula_txt"]
        v["telefono_txt"] = completa.get("telefono") or v["telefono_txt"]
        v["correo_txt"] = completa.get("correo") or v["correo_txt"]
        if completa.get("fecha_nacimiento"):
            v["nacimiento_txt"] = completa["fecha_nacimiento"]
        if completa.get("simpatia"):
            v["simpatia_txt"] = completa["simpatia"]
    return v
