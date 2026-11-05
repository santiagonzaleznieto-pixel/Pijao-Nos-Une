"""Autorización de tratamiento de datos (sección 16.4).

El texto es un MODELO de borrador: lo debe revisar y ajustar el abogado antes de usarse
con familias reales (sección 23.2). La versión se guarda con cada consentimiento.
"""
from __future__ import annotations

import uuid

from .reglas import iso

VERSION_TEXTO = "v1-borrador"

TEXTO_CORTO = (
    "Soy {nombre}, de la campaña Pijao Nos Une, del candidato Jaime González. Quisiera registrar su vivienda y, "
    "si usted lo permite, sus datos de contacto, para conocer las necesidades de su familia, mantenerlo informado "
    "de la campaña y construir el programa de gobierno. Usted puede decir que no, y puede pedir en cualquier "
    "momento que corrijamos o borremos sus datos escribiendo a {correo} o por WhatsApp al {whatsapp}. "
    "No venderemos sus datos ni los entregaremos a otras personas, y los eliminaremos al terminar la campaña. "
    "Sus datos se guardan en servidores de un proveedor tecnológico que puede estar fuera de Colombia. "
    "Aquí tiene nuestra política completa."
)

TEXTO_SENSIBLE = (
    "La simpatía política es un dato sensible. Entiendo que no estoy obligado a responder y que puedo "
    "retirar mi autorización cuando quiera."
)

# (clave, etiqueta, sensible)
PROPOSITOS: list[tuple[str, str, bool]] = [
    ("registro_vivienda", "Registrar mi vivienda y los datos de mi hogar", False),
    ("datos_personales", "Guardar mis datos personales (nombre, documento, contacto)", False),
    ("contacto_whatsapp", "Recibir información de la campaña por WhatsApp", False),
    ("contacto_llamada", "Recibir información de la campaña por llamada", False),
    ("contacto_sms", "Recibir información de la campaña por SMS", False),
    ("contacto_correo", "Recibir información de la campaña por correo", False),
    ("dato_sensible_simpatia", "Registrar mi simpatía (dato sensible, es opcional)", True),
    ("uso_historia", "Usar mi historia o mi frase en las comunicaciones de la campaña", False),
]

CANAL_A_PROPOSITO = {
    "whatsapp": "contacto_whatsapp",
    "llamada": "contacto_llamada",
    "sms": "contacto_sms",
    "correo": "contacto_correo",
}

METODOS = ("firma_pantalla", "verbal", "papel")


def texto_para(nombre_colaborador: str, correo: str = "[correo de atención]", whatsapp: str = "[número de atención]") -> str:
    return TEXTO_CORTO.format(nombre=nombre_colaborador or "[nombre]", correo=correo, whatsapp=whatsapp)


def etiqueta_proposito(clave: str) -> str:
    for k, e, _ in PROPOSITOS:
        if k == clave:
            return e
    return clave


def nuevo_consentimiento(proposito: str, metodo: str, *, persona_id: str | None = None, hogar_id: str | None = None,
                         vivienda_id: str | None = None, lat: float | None = None, lng: float | None = None,
                         evidencia: dict | None = None, otorgado_en: str | None = None) -> dict:
    if metodo not in METODOS:
        raise ValueError("Método de autorización desconocido: %s" % metodo)
    return {
        "id": str(uuid.uuid4()),
        "proposito": proposito,
        "metodo": metodo,
        "persona_id": persona_id,
        "hogar_id": hogar_id,
        "vivienda_id": vivienda_id,
        "version_texto": VERSION_TEXTO,
        "otorgado_en": otorgado_en or iso(),
        "lat": lat,
        "lng": lng,
        "evidencia": evidencia or {},
        "estado": "vigente",
    }


def revocar(consentimiento: dict, motivo: str = "") -> dict:
    c = dict(consentimiento)
    c["estado"] = "revocado"
    c["revocado_en"] = iso()
    c["revocado_motivo"] = motivo
    return c
