// Curso de ingreso (10.6): 7 lecciones de 3 a 5 minutos y evaluación de 15 preguntas, mínimo 80 %, repetible.
// Tono del documento (3.3): se trata de «usted». El contenido final lo revisa el abogado (bloque 1.0).
export const APROBADO = 80;
export const VERSION_ACUERDOS = "v1-borrador";

export const LECCIONES: readonly { titulo: string; texto: string }[] = [
  { titulo: "1. Pijao nos une", texto: "Es una campaña de escucha. Visitamos las casas para conocer las necesidades de las familias, escuchar y construir juntos el programa de gobierno. No pedimos nada a cambio: ni votos, ni dinero, ni favores." },
  { titulo: "2. Cómo usar la app", texto: "En el mapa, párese frente a la casa y toque «Registrar aquí». La app toma su ubicación durante unos segundos y exige buena precisión. Luego completa la visita paso a paso. Si no hay internet, todo se guarda en el teléfono y se envía solo cuando vuelva la conexión. Antes de trabajar con datos reales, practique en el modo práctica." },
  { titulo: "3. Una visita respetuosa", texto: "Salude, diga su nombre y el de la campaña, y explique para qué visita. Pregunte si puede registrar la visita y ofrezca el aviso de privacidad. No fotografíe a niños ni a personas sin permiso. Si le dicen que no, agradezca y deje constancia: no insista. No ofrezca regalos, favores ni promesas personales." },
  { titulo: "4. Protección de datos", texto: "Solo se registran datos de quien lo autoriza. No tome capturas ni comparta listas, no escriba cédulas ni teléfonos en las notas, no registre datos de menores y no pase datos de personas por WhatsApp. La simpatía política solo se anota si la persona la dijo por iniciativa propia y con autorización aparte." },
  { titulo: "5. Normas electorales básicas", texto: "Está prohibido comprar votos, ofrecer regalos o dádivas para conseguirlos, presionar o amenazar al elector (constreñimiento), llevar personas a inscribir su cédula donde no viven (trashumancia) y hacer propaganda fuera de los tiempos permitidos." },
  { titulo: "6. Seguridad en terreno", texto: "Avise a alguien de su zona antes de salir. En las veredas, trabaje en pareja. No entre a las casas. Evite animales bravos y caminos peligrosos. No porte armas ni consuma alcohol durante la jornada. Si hay riesgo, retírese: ninguna visita vale su seguridad." },
  { titulo: "7. Preguntas difíciles y rumores", texto: "Escuche con calma y no discuta. No invente respuestas ni prometa lo que no sabe: anote la pregunta y llévesela al Director. Si oye un rumor, no lo repita; repórtelo al equipo." },
];

export const PREGUNTAS: readonly { pregunta: string; opciones: readonly string[]; correcta: number }[] = [
  { pregunta: "¿De qué se trata la campaña «Pijao nos une»?", opciones: ["De escuchar a las familias y construir el programa juntos", "De repartir mercados en las veredas", "De pedir el voto casa por casa"], correcta: 0 },
  { pregunta: "¿Qué puede pedir a cambio de una visita?", opciones: ["Un voto", "Nada: solo escuchar", "Un favor personal"], correcta: 1 },
  { pregunta: "Si no hay internet durante una visita, ¿qué pasa?", opciones: ["Se pierde el registro", "Se guarda en el teléfono y se envía después", "No se puede registrar"], correcta: 1 },
  { pregunta: "¿Cuándo se puede registrar la visita de una casa?", opciones: ["Cuando la persona lo permite", "Siempre, aunque diga que no", "Solo si le dan un regalo"], correcta: 0 },
  { pregunta: "Una persona dice que no quiere ser visitada. ¿Qué hace usted?", opciones: ["Insistir con otro argumento", "Agradecer, dejar constancia y no volver", "Volver otro día"], correcta: 1 },
  { pregunta: "¿Puede fotografiar a un niño?", opciones: ["Sí, si sonríe", "Nunca", "Solo con permiso de un vecino"], correcta: 1 },
  { pregunta: "¿Dónde se anota el número de cédula de una persona?", opciones: ["En las notas de la visita", "En el campo de la ficha, con su autorización", "En un grupo de WhatsApp"], correcta: 1 },
  { pregunta: "¿Puede compartir la lista de casas por WhatsApp?", opciones: ["Sí, con el equipo", "No: las listas y capturas no se comparten", "Solo si es una zona pequeña"], correcta: 1 },
  { pregunta: "¿Cuándo se registra la simpatía política de una persona?", opciones: ["Siempre que se pueda", "Solo si la persona lo dijo por iniciativa propia y lo autoriza", "Cuando usted lo supone"], correcta: 1 },
  { pregunta: "Ofrecer un mercado a cambio del voto es…", opciones: ["Una buena práctica", "Compra de votos, está prohibido", "Permitido en veredas"], correcta: 1 },
  { pregunta: "Presionar o amenazar a un elector se llama…", opciones: ["Constreñimiento al elector", "Pedagogía", "Propaganda"], correcta: 0 },
  { pregunta: "Llevar personas a inscribir su cédula donde no viven es…", opciones: ["Trashumancia, está prohibida", "Una forma de participación", "Un servicio permitido"], correcta: 0 },
  { pregunta: "Antes de salir a terreno debe…", opciones: ["Avisar a alguien de su zona", "Salir sin avisar", "Pedir permiso al vecino"], correcta: 0 },
  { pregunta: "Si un perro bravo le cierra el paso…", opciones: ["Lo enfrenta", "Se retira y reporta el obstáculo", "Entra por otro lado a la casa"], correcta: 1 },
  { pregunta: "Le hacen una pregunta que no sabe responder. Lo correcto es…", opciones: ["Inventar una respuesta", "Anotarla y llevarla al Director", "Prometer que se resuelve"], correcta: 1 },
];

/** Porcentaje de aciertos (0 a 100). */
export function puntaje(respuestas: Record<number, number>): number {
  const bien = PREGUNTAS.filter((p, i) => respuestas[i] === p.correcta).length;
  return Math.round((100 * bien) / PREGUNTAS.length);
}

export const aprobado = (p: number, minimo = APROBADO) => p >= minimo;
