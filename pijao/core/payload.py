"""Borrador de visita (flujo de 12 pasos de la sección 6) y el paquete que viaja al servidor."""
from __future__ import annotations

import copy
import uuid

from .reglas import iso
from .validadores import limpiar_vacios

COLUMNAS_VIVIENDA = (
    "id", "lat", "lng", "precision_m", "altitud_m", "fuente_ubicacion", "zona_id", "zona_urbana_rural",
    "barrio_vereda", "direccion", "complemento", "nombre_finca", "indicaciones", "referencia",
    "tipo_vivienda", "estado_ocupacion", "tenencia", "servicios", "via_acceso", "riesgos",
    "actividad_economica", "es_reconocimiento",
)
COLUMNAS_HOGAR = (
    "id", "vivienda_id", "total_personas", "edades", "mujeres", "hombres", "votantes_pijao_est",
    "votantes_otro_mpio_est", "votantes_no_sabe_est", "futuros_primeros_votantes", "sosten_persona_id",
    "sosten_relacion", "sosten_sexo", "sosten_ocupacion", "sosten_situacion_laboral", "familiares_fuera",
    "mascotas", "otros_hogares",
)
COLUMNAS_PERSONA = (
    "id", "hogar_id", "vivienda_id", "primer_nombre", "segundo_nombre", "primer_apellido", "segundo_apellido",
    "apodo", "tipo_documento", "fecha_nacimiento", "mayor_edad_confirmada", "sexo", "ocupacion",
    "telefono_es_whatsapp", "canal_preferido", "mejor_horario", "anios_en_pijao", "vive_en_otra_ciudad",
    "vota_en_pijao", "puesto_votacion", "mesa_votacion", "interes_info", "voluntario", "anfitrion",
    "temas_interes",
    # datos sensibles: viajan en claro solo hasta el servidor, que los cifra
    "cedula", "telefono", "telefono2", "correo", "simpatia",
)
COLUMNAS_NECESIDAD = ("id", "hogar_id", "vivienda_id", "zona_id", "tema", "prioridad", "texto", "alcance",
                      "desea_respuesta", "origen")
COLUMNAS_VISITA = (
    "id", "vivienda_id", "hogar_id", "fecha", "resultado", "autorizacion_verbal", "notas",
    "seguimiento_requerido", "seguimiento_fecha", "seguimiento_motivo", "seguimiento_asignado_a",
    "volante_entregado", "ubicacion_manual", "motivo_manual", "no_autorizo_foto",
    "dispositivo_lat", "dispositivo_lng", "dispositivo_precision_m",
)
COLUMNAS_FOTO = ("id", "vivienda_id", "visita_id", "tipo", "storage_path", "lat", "lng", "tomada_en",
                 "tam_bytes", "hash", "con_personas")
COLUMNAS_CONSENTIMIENTO = ("id", "persona_id", "hogar_id", "vivienda_id", "proposito", "version_texto", "metodo",
                           "otorgado_en", "lat", "lng", "evidencia", "estado")


def nuevo_id() -> str:
    return str(uuid.uuid4())


def borrador_vacio(usuario_id: str, vivienda_existente: dict | None = None, *, lat=None, lng=None,
                   precision_m=None, altitud_m=None) -> dict:
    """Crea el borrador. Si la vivienda ya existe en el mapa, solo se agrega una visita (6.7)."""
    existente = vivienda_existente is not None
    if existente:
        viv = {"id": vivienda_existente["id"], "lat": vivienda_existente.get("lat"), "lng": vivienda_existente.get("lng"),
               "direccion": vivienda_existente.get("direccion"), "barrio_vereda": vivienda_existente.get("barrio_vereda")}
    else:
        viv = {"id": nuevo_id(), "lat": lat, "lng": lng, "precision_m": precision_m, "altitud_m": altitud_m,
               "fuente_ubicacion": "gps", "es_reconocimiento": False, "servicios": [], "riesgos": []}
    return {
        "id": nuevo_id(),
        "usuario_id": usuario_id,
        "creado_en": iso(),
        "paso": 0,
        "vivienda_existente": existente,
        "vivienda": viv,
        "visita": {"resultado": None, "autorizacion_verbal": False, "notas": "", "seguimiento_requerido": False,
                   "volante_entregado": False, "ubicacion_manual": False, "no_autorizo_foto": False},
        "hogar": None,
        "personas": [],
        "necesidades": [],
        "consentimientos": [],
        "fotos": [],
        "dispositivo": {},
    }


def _filtrar(d: dict, columnas) -> dict:
    return {k: d[k] for k in columnas if k in d}


def ruta_foto(vivienda_id: str, foto_id: str) -> str:
    return f"viviendas/{vivienda_id}/{foto_id}.jpg"


def construir_payload(draft: dict, dispositivo: dict | None = None) -> tuple[dict, list[dict]]:
    """Arma el JSON de `rpc_registrar_visita` y la lista de fotos por subir.

    Todos los identificadores nacen en el teléfono (UUID), de modo que reenviar el mismo
    registro no crea duplicados.
    """
    d = copy.deepcopy(draft)
    viv = d["vivienda"]
    vid = viv.get("id") or nuevo_id()
    viv["id"] = vid
    visita = _filtrar(d["visita"], COLUMNAS_VISITA)
    visita["id"] = d["id"]
    visita["vivienda_id"] = vid
    visita.setdefault("fecha", iso())
    dev = dispositivo or d.get("dispositivo") or {}
    visita["dispositivo_lat"] = dev.get("lat")
    visita["dispositivo_lng"] = dev.get("lng")
    visita["dispositivo_precision_m"] = dev.get("precision_m")

    hogar = None
    if d.get("hogar"):
        hogar = _filtrar(d["hogar"], COLUMNAS_HOGAR)
        hogar["id"] = d["hogar"].get("id") or nuevo_id()
        hogar["vivienda_id"] = vid
        visita["hogar_id"] = hogar["id"]

    personas = []
    for p in d.get("personas", []):
        pp = _filtrar(p, COLUMNAS_PERSONA)
        pp["id"] = p.get("id") or nuevo_id()
        pp["vivienda_id"] = vid
        pp["hogar_id"] = hogar["id"] if hogar else None
        personas.append(pp)
        if hogar and p.get("es_sosten"):
            hogar["sosten_persona_id"] = pp["id"]

    necesidades = []
    for n in d.get("necesidades", []):
        nn = _filtrar(n, COLUMNAS_NECESIDAD)
        nn["id"] = n.get("id") or nuevo_id()
        nn["vivienda_id"] = vid
        nn["hogar_id"] = hogar["id"] if hogar else None
        nn["zona_id"] = viv.get("zona_id")
        nn.setdefault("origen", "visita")
        necesidades.append(nn)

    consentimientos = []
    for c in d.get("consentimientos", []):
        cc = _filtrar(c, COLUMNAS_CONSENTIMIENTO)
        cc["vivienda_id"] = vid
        cc["hogar_id"] = hogar["id"] if hogar else None
        consentimientos.append(cc)

    fotos, subidas = [], []
    for f in d.get("fotos", []):
        fid = f.get("id") or nuevo_id()
        ff = _filtrar(f, COLUMNAS_FOTO)
        ff["id"] = fid
        ff["vivienda_id"] = vid
        ff["visita_id"] = d["id"]
        ff["storage_path"] = ruta_foto(vid, fid)
        fotos.append(ff)
        if f.get("archivo_local"):
            subidas.append({"foto_id": fid, "archivo_local": f["archivo_local"], "storage_path": ff["storage_path"]})

    if d.get("vivienda_existente"):
        vivienda_payload = {"id": vid, "solo_visita": True}
    else:
        vivienda_payload = _filtrar(viv, COLUMNAS_VIVIENDA)

    payload = {
        "dispositivo": dev,
        "vivienda": vivienda_payload,
        "visita": visita,
        "hogar": hogar,
        "personas": personas,
        "necesidades": necesidades,
        "consentimientos": consentimientos,
        "fotos": fotos,
    }
    return limpiar_vacios(payload), subidas
