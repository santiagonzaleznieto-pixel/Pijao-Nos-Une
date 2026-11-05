"""Validaciones de datos (secciones 6, 7 y 14.8 del documento maestro)."""
from __future__ import annotations

import re
from datetime import date, datetime

from .catalogos import RANGOS_ADULTOS, RANGOS_MENORES, claves

PALABRAS_SENSIBLES = (
    "enfermo", "enfermedad", "diagnóstico", "diagnostico", "cáncer", "cancer", "vih",
    "religión", "religion", "evangélico", "evangelico", "católico", "catolico",
    "partido", "sindicato", "homosexual", "gay", "lesbiana", "embarazada",
    "discapacidad", "psiquiátrico", "psiquiatrico", "antecedentes", "cárcel", "carcel",
)

PALABRAS_SOSPECHOSAS = (
    "plata", "dinero", "mercado", "mercados", "regalo", "regalos", "pagar", "pagó", "pago",
    "favor", "favores", "soborno", "bulto", "comprar", "a cambio", "prometí", "prometimos",
)


def normalizar_celular(valor) -> str | None:
    """Devuelve 10 dígitos (celular colombiano que empieza por 3) o None."""
    if not valor:
        return None
    d = re.sub(r"\D", "", str(valor))
    if d.startswith("57") and len(d) == 12:
        d = d[2:]
    if len(d) == 10 and d.startswith("3"):
        return d
    return None


def normalizar_telefono(valor) -> str | None:
    """Celular (10 dígitos que empiezan por 3), fijo con indicativo (10 dígitos que empiezan por 60) o fijo local de 7."""
    cel = normalizar_celular(valor)
    if cel:
        return cel
    if not valor:
        return None
    d = re.sub(r"\D", "", str(valor))
    if d.startswith("57") and len(d) == 12:
        d = d[2:]
    if len(d) == 7 or (len(d) == 10 and d.startswith("60")):
        return d
    return None


def validar_cedula(valor) -> tuple[bool, str]:
    if valor is None or str(valor).strip() == "":
        return False, "Escriba el número de documento."
    s = str(valor).strip()
    if not s.isdigit():
        return False, "El documento solo lleva números."
    if not 6 <= len(s) <= 10:
        return False, "El documento debe tener entre 6 y 10 dígitos."
    if len(set(s)) == 1:
        return False, "Ese número no parece un documento real."
    return True, ""


def validar_correo(valor) -> tuple[bool, str]:
    if not valor:
        return False, "Escriba el correo."
    if re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]{2,}", str(valor).strip()):
        return True, ""
    return False, "El correo no parece válido."


def validar_nombre(valor, etiqueta: str = "El nombre") -> tuple[bool, str]:
    s = (valor or "").strip()
    if len(s) < 2:
        return False, f"{etiqueta} debe tener al menos dos letras."
    if re.search(r"[\d_@#$%^&*+=<>/\\|~]", s):
        return False, f"{etiqueta} solo lleva letras, tildes y espacios."
    return True, ""


def parse_fecha(valor) -> date | None:
    """Acepta date, datetime, 'AAAA-MM-DD' o 'DD/MM/AAAA'."""
    if valor is None or valor == "":
        return None
    if isinstance(valor, datetime):
        return valor.date()
    if isinstance(valor, date):
        return valor
    s = str(valor).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def edad(nacimiento, hoy: date | None = None) -> int | None:
    f = parse_fecha(nacimiento)
    if f is None:
        return None
    hoy = hoy or date.today()
    return hoy.year - f.year - ((hoy.month, hoy.day) < (f.month, f.day))


def validar_fecha_nacimiento(valor, hoy: date | None = None) -> tuple[bool, str]:
    f = parse_fecha(valor)
    if f is None:
        return False, "Escriba la fecha como día/mes/año."
    e = edad(f, hoy)
    if e is None or e < 18:
        return False, "Solo se registran personas mayores de 18 años (regla R-16)."
    if e > 110:
        return False, "La fecha de nacimiento no es plausible."
    return True, ""


def validar_edades(total, edades: dict | None) -> tuple[bool, str]:
    """La suma de personas por rango debe dar el total del hogar (paso 5)."""
    try:
        total = int(total)
    except (TypeError, ValueError):
        return False, "Indique cuántas personas viven en el hogar."
    if total < 1:
        return False, "El hogar debe tener al menos una persona."
    edades = edades or {}
    validas = set(claves("C-11"))
    suma = 0
    for k, v in edades.items():
        if k not in validas:
            return False, f"Rango de edad desconocido: {k}."
        try:
            n = int(v or 0)
        except (TypeError, ValueError):
            return False, "Los rangos de edad llevan solo números."
        if n < 0:
            return False, "Los rangos de edad no pueden ser negativos."
        suma += n
    if suma != total:
        return False, f"Los rangos de edad suman {suma} y el hogar tiene {total} personas."
    return True, ""


def contar_adultos(edades: dict | None) -> int:
    edades = edades or {}
    return sum(int(edades.get(k) or 0) for k in RANGOS_ADULTOS)


def contar_menores(edades: dict | None) -> int:
    edades = edades or {}
    return sum(int(edades.get(k) or 0) for k in RANGOS_MENORES)


def avisos_de_nota(texto: str | None) -> list[str]:
    """Advertencias para el paso 'Notas': cédulas o teléfonos escritos a mano y palabras sensibles."""
    if not texto:
        return []
    avisos = []
    if re.search(r"(?<!\d)\d{6,10}(?!\d)", texto):
        avisos.append("Parece que escribió un número de documento o teléfono. Use el campo correspondiente, no la nota.")
    bajo = texto.lower()
    encontradas = sorted({p for p in PALABRAS_SENSIBLES if p in bajo})
    if encontradas:
        avisos.append("No escriba datos sensibles (salud, religión, política de terceros, etc.): " + ", ".join(encontradas) + ".")
    return avisos


def palabras_sospechosas(texto: str | None) -> list[str]:
    """Palabras que sugieren ofrecimientos a cambio de votos (14.8). Pasan a revisión del Director."""
    if not texto:
        return []
    bajo = texto.lower()
    return sorted({p for p in PALABRAS_SOSPECHOSAS if re.search(r"\b" + re.escape(p) + r"\b", bajo)})


def limpiar_vacios(d):
    """Convierte '' en None de forma recursiva (la base de datos no acepta '' en fechas, números ni uuid)."""
    if isinstance(d, dict):
        return {k: limpiar_vacios(v) for k, v in d.items()}
    if isinstance(d, (list, tuple)):
        return [limpiar_vacios(v) for v in d]
    if isinstance(d, str) and d.strip() == "":
        return None
    return d
