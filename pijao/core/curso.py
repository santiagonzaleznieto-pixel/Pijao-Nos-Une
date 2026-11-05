"""Curso de ingreso (sección 10.6): 7 lecciones cortas y evaluación de 15 preguntas, mínimo 80 %."""
from __future__ import annotations

APROBADO = 80
VERSION_ACUERDOS = "v1-borrador"

LECCIONES = [
    ("1. Pijao nos une", "Es una campaña de escucha. Visitamos las casas para conocer las necesidades de las familias, escuchar y construir juntos "
     "el programa de gobierno. No pedimos nada a cambio: ni votos, ni dinero, ni favores."),
    ("2. Cómo usar la app", "En el mapa, párate frente a la casa y toca «Registrar aquí». La app toma tu ubicación durante unos segundos y exige "
     "buena precisión. Luego completas la visita paso a paso. Si no hay internet, todo se guarda en el teléfono y se envía solo cuando vuelva la conexión."),
    ("3. Una visita respetuosa", "Saluda, di tu nombre y el de la campaña, y explica para qué visitas. Pregunta si puedes registrar la visita y ofrece el "
     "aviso de privacidad. No fotografíes a niños ni a personas sin permiso. Si dicen que no, agradece y deja constancia: no insistas. "
     "No ofrezcas regalos, favores ni promesas personales."),
    ("4. Protección de datos", "Solo se registran datos de quien lo autoriza. No tomes capturas ni compartas listas, no escribas cédulas ni teléfonos en las notas, "
     "no registres datos de menores y no pases datos de personas por WhatsApp. La simpatía política solo se anota si la persona la dijo por iniciativa propia "
     "y con autorización aparte."),
    ("5. Normas electorales básicas", "Está prohibido comprar votos, ofrecer regalos o dádivas para conseguirlos, presionar o amenazar al elector "
     "(constreñimiento), llevar votantes a inscribirse donde no viven (trashumancia) y hacer propaganda fuera de los tiempos permitidos."),
    ("6. Seguridad en terreno", "Avisa a alguien de tu zona antes de salir. No entres a las casas. Evita animales bravos y caminos peligrosos. "
     "No portes armas ni consumas alcohol durante la jornada. Si hay riesgo, retírate: ninguna visita vale tu seguridad."),
    ("7. Preguntas difíciles y rumores", "Escucha con calma y no discutas. No inventes respuestas ni prometas lo que no sabes: anota la pregunta y llévasela al Director. "
     "Si oyes un rumor, no lo repitas; repórtalo al equipo."),
]

# (pregunta, [opciones], índice de la correcta)
PREGUNTAS = [
    ("¿De qué se trata la campaña «Pijao nos une»?", ["De escuchar a las familias y construir el programa juntos", "De repartir mercados en las veredas", "De pedir el voto casa por casa"], 0),
    ("¿Qué puedes pedir a cambio de una visita?", ["Un voto", "Nada: solo escuchar", "Un favor personal"], 1),
    ("Si no hay internet durante una visita, ¿qué pasa?", ["Se pierde el registro", "Se guarda en el teléfono y se envía después", "No se puede registrar"], 1),
    ("¿Cuándo se puede registrar la visita de una casa?", ["Cuando la persona lo permite", "Siempre, aunque diga que no", "Solo si te dan un regalo"], 0),
    ("Una persona dice que no quiere ser visitada. ¿Qué haces?", ["Insistir con otro argumento", "Agradecer, dejar constancia y no volver", "Volver otro día"], 1),
    ("¿Puedes fotografiar a un niño?", ["Sí, si sonríe", "Nunca", "Solo con permiso de un vecino"], 1),
    ("¿Dónde se anota el número de cédula de una persona?", ["En las notas de la visita", "En el campo de la ficha, con su autorización", "En un grupo de WhatsApp"], 1),
    ("¿Puedes compartir la lista de casas por WhatsApp?", ["Sí, con el equipo", "No: las listas y capturas no se comparten", "Solo si es una zona pequeña"], 1),
    ("¿Cuándo se registra la simpatía política de una persona?", ["Siempre que se pueda", "Solo si la persona lo dijo por iniciativa propia y lo autoriza", "Cuando tú lo supones"], 1),
    ("Ofrecer un mercado a cambio del voto es…", ["Una buena práctica", "Compra de votos, está prohibido", "Permitido en veredas"], 1),
    ("Presionar o amenazar a un elector se llama…", ["Constreñimiento al elector", "Pedagogía", "Propaganda"], 0),
    ("Llevar personas a inscribir su cédula donde no viven es…", ["Trashumancia, está prohibida", "Una forma de participación", "Un servicio permitido"], 0),
    ("Antes de salir a terreno debes…", ["Avisar a alguien de tu zona", "Salir sin avisar", "Pedir permiso al vecino"], 0),
    ("Si un perro bravo te cierra el paso…", ["Lo enfrentas", "Te retiras y reportas el obstáculo", "Entras por otro lado a la casa"], 1),
    ("Te hacen una pregunta que no sabes responder. Lo correcto es…", ["Inventar una respuesta", "Anotarla y llevarla al Director", "Prometer que se resuelve"], 1),
]


def puntaje(respuestas: dict[int, int]) -> int:
    """Porcentaje de aciertos (0 a 100). `respuestas` asocia el número de pregunta con la opción elegida."""
    bien = sum(1 for i, (_, _, ok) in enumerate(PREGUNTAS) if respuestas.get(i) == ok)
    return round(100 * bien / len(PREGUNTAS))


def aprobado(p: int) -> bool:
    return p >= APROBADO
