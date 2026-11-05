"""Catálogos C-01 a C-20 (sección 19.3 del documento maestro).

Cada catálogo es una lista de (clave, etiqueta). Las claves son las que se
guardan en la base de datos; las etiquetas son lo que ve el usuario.
"""
from __future__ import annotations

CATALOGOS: dict[str, dict] = {
    "C-01": {"nombre": "Estados de la vivienda", "opciones": [
        ("por_visitar", "Por visitar"),
        ("visitada_conversacion", "Visitada con conversación"),
        ("visitada_sin_contacto", "Visitada sin contacto"),
        ("requiere_seguimiento", "Requiere seguimiento"),
        ("no_contactar", "No contactar"),
        ("deshabitada", "Deshabitada o sin uso"),
        ("direccion_inexistente", "Dirección inexistente o con error"),
        ("fuera_de_pijao", "Fuera de Pijao"),
    ]},
    "C-02": {"nombre": "Resultado del contacto", "opciones": [
        ("conversacion_completa", "Conversación completa"),
        ("conversacion_breve", "Conversación breve"),
        ("dejo_informacion", "Dejó información"),
        ("nadie_en_casa", "Nadie en casa"),
        ("pidio_volver", "Pidió volver"),
        ("rechazo", "Rechazó"),
        ("pidio_no_ser_visitado", "Pidió no ser visitado"),
        ("casa_cerrada_deshabitada", "Casa cerrada o deshabitada"),
        ("direccion_erronea", "Dirección errónea"),
    ]},
    "C-03": {"nombre": "Tipos de vivienda", "opciones": [
        ("casa_urbana", "Casa urbana"),
        ("apartamento", "Apartamento"),
        ("finca_rural", "Finca o casa rural"),
        ("casa_con_local", "Casa con local"),
        ("lote_construccion", "Lote o en construcción"),
        ("alojamiento_turistico", "Alojamiento turístico"),
        ("otro", "Otro"),
    ]},
    "C-04": {"nombre": "Tenencia", "opciones": [
        ("propia", "Propia"),
        ("arrendada", "Arrendada"),
        ("familiar_prestada", "Familiar o prestada"),
        ("administrada", "Administrada (mayordomo o administrador)"),
        ("otra", "Otra"),
    ]},
    "C-05": {"nombre": "Servicios", "opciones": [
        ("agua_acueducto", "Agua del acueducto"),
        ("agua_nacimiento", "Agua de nacimiento u otra fuente"),
        ("alcantarillado", "Alcantarillado"),
        ("pozo_septico", "Pozo séptico"),
        ("energia", "Energía eléctrica"),
        ("gas", "Gas"),
        ("internet", "Internet"),
        ("basura", "Recolección de basura"),
        ("senal_celular", "Señal de celular"),
    ]},
    "C-06": {"nombre": "Vía de acceso", "opciones": [
        ("pavimentada", "Pavimentada"),
        ("placa_huella", "Placa huella"),
        ("destapada", "Destapada transitable"),
        ("camino", "Camino o sendero"),
        ("dificil_lluvia", "Difícil en lluvia"),
    ]},
    "C-07": {"nombre": "Ocupación o actividad", "opciones": [
        ("caficultor", "Caficultor propietario"),
        ("jornalero", "Jornalero o recolector"),
        ("mayordomo", "Mayordomo"),
        ("otro_cultivo", "Otro cultivo"),
        ("ganaderia", "Ganadería"),
        ("comerciante", "Comerciante"),
        ("empleado_privado", "Empleado privado"),
        ("servidor_publico", "Servidor público"),
        ("docente", "Docente"),
        ("transportador", "Transportador"),
        ("turismo", "Turismo y hospitalidad"),
        ("construccion", "Construcción"),
        ("independiente", "Independiente u oficios varios"),
        ("pensionado", "Pensionado"),
        ("ama_de_casa", "Ama de casa"),
        ("estudiante", "Estudiante"),
        ("sin_empleo", "Sin empleo"),
        ("otro", "Otro"),
    ]},
    "C-08": {"nombre": "Temas de necesidades (ejes del programa)", "opciones": [
        ("educacion", "Educación y conocimiento"),
        ("deporte_juventud", "Deporte y juventud"),
        ("campo_cafe", "Campo y café"),
        ("vivienda_entorno", "Vivienda y entorno"),
        ("bienestar_animal", "Bienestar animal"),
        ("vias_movilidad", "Vías, movilidad y conectividad"),
        ("agua_ambiente", "Agua y medio ambiente"),
        ("turismo_cultura", "Turismo y cultura"),
        ("salud", "Salud y bienestar"),
        ("seguridad", "Seguridad y convivencia"),
        ("empleo_emprendimiento", "Empleo y emprendimiento"),
        ("poblaciones", "Atención a poblaciones específicas"),
        ("gobierno_cercano", "Gobierno cercano y transparente"),
        ("otro", "Otro"),
    ]},
    "C-09": {"nombre": "Simpatía [SENSIBLE]", "opciones": [
        ("no_registrado", "No registrado"),
        ("apoya", "Apoya"),
        ("simpatiza", "Simpatiza"),
        ("neutral", "Neutral"),
        ("indeciso", "Indeciso"),
        ("no_apoya", "No apoya"),
        ("prefiere_no_decir", "Prefiere no decir"),
    ]},
    "C-10": {"nombre": "Canales de contacto", "opciones": [
        ("whatsapp", "WhatsApp"),
        ("llamada", "Llamada"),
        ("sms", "SMS"),
        ("correo", "Correo"),
        ("visita", "Visita"),
        ("ninguno", "Ninguno"),
    ]},
    "C-11": {"nombre": "Rangos de edad", "opciones": [
        ("0-5", "0 a 5"), ("6-12", "6 a 12"), ("13-17", "13 a 17"),
        ("18-24", "18 a 24"), ("25-34", "25 a 34"), ("35-44", "35 a 44"),
        ("45-54", "45 a 54"), ("55-64", "55 a 64"), ("65+", "65 o más"),
    ]},
    "C-12": {"nombre": "Tipos de evento", "opciones": [
        ("reunion_vereda", "Reunión de vereda"),
        ("reunion_barrio", "Reunión de barrio"),
        ("tertulia_casa", "Tertulia en casa"),
        ("cabildo_foro", "Cabildo o foro"),
        ("jornada_escucha", "Jornada de escucha"),
        ("deportiva_cultural", "Actividad deportiva o cultural"),
        ("capacitacion", "Capacitación"),
        ("reunion_gremios", "Reunión con gremios u organizaciones"),
        ("cierre_campana", "Cierre de campaña"),
        ("otro", "Otro"),
    ]},
    "C-13": {"nombre": "Tipos de tarea", "opciones": [
        ("visitar", "Visitar"),
        ("seguimiento", "Seguimiento"),
        ("llamar", "Llamar"),
        ("verificar_registro", "Verificar registro"),
        ("repartir_material", "Repartir material"),
        ("apoyar_evento", "Apoyar evento"),
        ("propaganda", "Instalar o retirar propaganda"),
        ("capacitar", "Capacitar"),
        ("otra", "Otra"),
    ]},
    "C-14": {"nombre": "Categorías de gasto", "opciones": [
        ("propaganda_impresos", "Propaganda e impresos"),
        ("eventos_reuniones", "Eventos y reuniones"),
        ("transporte_logistica", "Transporte y logística"),
        ("alimentacion_equipo", "Alimentación del equipo"),
        ("personal_honorarios", "Personal y honorarios"),
        ("sede_servicios", "Sede y servicios"),
        ("comunicaciones_digital", "Comunicaciones y publicidad digital"),
        ("material_oficina", "Material de oficina"),
        ("asesoria_legal_contable", "Asesoría legal y contable"),
        ("tecnologia", "Tecnología"),
        ("testigos", "Testigos electorales"),
        ("otros", "Otros"),
    ]},
    "C-15": {"nombre": "Tipos de propaganda", "opciones": [
        ("valla", "Valla"), ("pendon", "Pendón"), ("afiche", "Afiche"),
        ("volante", "Volante"), ("vehiculo", "Vehículo con propaganda"),
        ("perifoneo", "Perifoneo"), ("gorra_camiseta", "Gorra o camiseta"),
        ("pieza_digital", "Pieza digital"), ("mural", "Mural"),
    ]},
    "C-16": {"nombre": "Motivos de no contacto", "opciones": [
        ("nadie_en_casa", "Nadie en casa"),
        ("casa_cerrada", "Casa cerrada"),
        ("rechazo", "Rechazó hablar"),
        ("pidio_volver", "Pidió volver"),
        ("direccion_erronea", "Dirección errónea"),
        ("perro_obstaculo", "Perro u obstáculo"),
        ("riesgo_seguridad", "Riesgo de seguridad"),
        ("otro", "Otro"),
    ]},
    "C-17": {"nombre": "Tipos de incidente", "opciones": [
        ("seguridad_personal", "Seguridad personal"),
        ("amenaza_hostigamiento", "Amenaza u hostigamiento"),
        ("compra_votos_terceros", "Sospecha de compra de votos por terceros"),
        ("constrenimiento", "Constreñimiento"),
        ("rumor_desinformacion", "Rumor o desinformación"),
        ("dano_propaganda", "Daño a propaganda"),
        ("perdida_telefono_datos", "Pérdida de teléfono o fuga de datos"),
        ("queja_colaborador", "Queja sobre un colaborador"),
        ("irregularidad_mesa", "Irregularidad en una mesa de votación"),
        ("otro", "Otro"),
    ]},
    "C-18": {"nombre": "Solicitudes de titulares", "opciones": [
        ("consulta", "Consulta"),
        ("actualizacion", "Actualización o corrección"),
        ("supresion", "Supresión (eliminar mis datos)"),
        ("revocatoria", "Revocatoria de autorización"),
        ("queja", "Queja"),
    ]},
    "C-19": {"nombre": "Estados de una necesidad", "opciones": [
        ("recibida", "Recibida"), ("clasificada", "Clasificada"),
        ("agrupada", "Agrupada"), ("evaluada", "Evaluada"),
        ("incluida_programa", "Incluida en el programa"),
        ("derivada", "Derivada"), ("no_viable", "No viable"),
        ("comunicada", "Comunicada"), ("cerrada", "Cerrada"),
    ]},
    "C-20": {"nombre": "Motivos de ubicación manual", "opciones": [
        ("pendiente_inaccesible", "Pendiente empinada o inaccesible"),
        ("camino_privado", "Camino privado cerrado"),
        ("animal_bravo", "Animal bravo"),
        ("riesgo_seguridad", "Riesgo de seguridad"),
        ("mal_gps", "Mal GPS"),
        ("otro", "Otro"),
    ]},
}

SUBTEMAS: dict[str, list[str]] = {
    "educacion": ["Acceso y calidad", "Transporte y restaurante escolar", "Conectividad educativa",
                  "Educación técnica y superior", "Bibliotecas"],
    "deporte_juventud": ["Escenarios deportivos", "Escuelas de formación", "Oportunidades para jóvenes",
                         "Emprendimiento juvenil"],
    "campo_cafe": ["Precios", "Asistencia técnica", "Comercialización", "Mercados campesinos",
                   "Seguridad alimentaria", "Relevo generacional", "Insumos"],
    "vivienda_entorno": ["Mejoramiento", "Titulación", "Servicios domiciliarios", "Espacio público"],
    "bienestar_animal": ["Vacunación", "Esterilización", "Maltrato", "Fauna"],
    "vias_movilidad": ["Vías urbanas", "Vías rurales", "Transporte veredal", "Señal celular", "Internet"],
    "agua_ambiente": ["Acueducto", "Saneamiento", "Residuos", "Gestión del riesgo", "Protección de nacimientos y ríos"],
    "turismo_cultura": ["Promoción turística", "Turismo de naturaleza", "Formación artística", "Patrimonio",
                        "Festivales", "Emprendimientos culturales"],
    "salud": ["Acceso a servicios", "Puesto de salud", "Primera infancia", "Salud mental"],
    "seguridad": ["Seguridad", "Convivencia", "Prevención de violencias"],
    "empleo_emprendimiento": ["Empleo local", "Formación para el trabajo", "Apoyo a pequeños negocios"],
    "poblaciones": ["Adultos mayores", "Mujeres", "Jóvenes", "Personas con discapacidad", "Víctimas"],
    "gobierno_cercano": ["Atención al ciudadano", "Trámites", "Rendición de cuentas", "Participación"],
    "otro": [],
}

# Resultado del contacto (C-02) -> estado de la vivienda (C-01)
ESTADO_POR_RESULTADO: dict[str, str] = {
    "conversacion_completa": "visitada_conversacion",
    "conversacion_breve": "visitada_conversacion",
    "dejo_informacion": "visitada_sin_contacto",
    "nadie_en_casa": "visitada_sin_contacto",
    "pidio_volver": "requiere_seguimiento",
    "rechazo": "visitada_sin_contacto",
    "pidio_no_ser_visitado": "no_contactar",
    "casa_cerrada_deshabitada": "deshabitada",
    "direccion_erronea": "direccion_inexistente",
}

# Resultados en los que sí hubo conversación con alguien del hogar
RESULTADOS_CON_CONTACTO = {"conversacion_completa", "conversacion_breve", "pidio_volver"}
# Resultados en los que solo se guarda el punto (sin hogar ni personas)
RESULTADOS_SOLO_PUNTO = {"nadie_en_casa", "casa_cerrada_deshabitada", "direccion_erronea",
                         "rechazo", "pidio_no_ser_visitado", "dejo_informacion"}

RANGOS_MENORES = ("0-5", "6-12", "13-17")
RANGOS_ADULTOS = ("18-24", "25-34", "35-44", "45-54", "55-64", "65+")


def opciones(codigo: str) -> list[tuple[str, str]]:
    return list(CATALOGOS[codigo]["opciones"])


def claves(codigo: str) -> list[str]:
    return [k for k, _ in CATALOGOS[codigo]["opciones"]]


def etiquetas(codigo: str) -> list[str]:
    return [e for _, e in CATALOGOS[codigo]["opciones"]]


def etiqueta(codigo: str, clave: str | None, defecto: str = "") -> str:
    for k, e in CATALOGOS[codigo]["opciones"]:
        if k == clave:
            return e
    return defecto or (clave or "")


def clave_de_etiqueta(codigo: str, texto: str | None) -> str | None:
    for k, e in CATALOGOS[codigo]["opciones"]:
        if e == texto:
            return k
    return None
