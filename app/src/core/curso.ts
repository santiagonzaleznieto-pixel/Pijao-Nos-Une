// Curso de ingreso (10.6), versión corta por decisión del dueño (18 de noviembre de 2026): 3 lecciones breves y 5 preguntas.
// El mínimo sigue siendo 80 % (4 de 5 bien), que es lo que valida el servidor; se puede repetir.
// Tono del documento (3.3): se trata de «usted». El contenido final lo revisa el abogado (bloque 1.0).
export const APROBADO = 80;
export const VERSION_ACUERDOS = "v1-borrador";

export const LECCIONES: readonly { titulo: string; texto: string }[] = [
  { titulo: "1. Escuchar y usar la app", texto: "Visitamos las casas para escuchar a las familias y construir juntos el programa: no pedimos votos, dinero ni favores. Párese frente a la casa, toque «Registrar aquí» y siga los pasos. Sin internet todo se guarda en el teléfono y se envía solo cuando vuelva la señal." },
  { titulo: "2. Respeto y datos personales", texto: "Pregunte si puede registrar la visita; si le dicen que no, agradezca y no insista. Solo se registran datos de quien lo autoriza, nunca de menores. No comparta listas ni capturas y no pase datos de personas por WhatsApp." },
  { titulo: "3. Lo prohibido y su seguridad", texto: "Está prohibido comprar votos, ofrecer regalos a cambio, presionar al elector y llevar gente a inscribirse donde no vive. Avise antes de salir, en las veredas trabaje en pareja y no entre a las casas. Si hay riesgo, retírese y use el SOS de la app." },
];

export const PREGUNTAS: readonly { pregunta: string; opciones: readonly string[]; correcta: number }[] = [
  { pregunta: "¿Qué pedimos a cambio de una visita?", opciones: ["Un voto", "Nada: vamos a escuchar", "Un favor personal"], correcta: 1 },
  { pregunta: "Si no hay internet durante una visita, ¿qué pasa?", opciones: ["Se pierde el registro", "Se guarda en el teléfono y se envía después", "No se puede registrar"], correcta: 1 },
  { pregunta: "Una persona no quiere que registremos su visita. ¿Qué hace usted?", opciones: ["Insistir con otro argumento", "Agradecer y no insistir", "Registrarla de todos modos"], correcta: 1 },
  { pregunta: "¿Puede compartir la lista de casas por WhatsApp?", opciones: ["Sí, con el equipo", "No: las listas y capturas no se comparten", "Solo si es una zona pequeña"], correcta: 1 },
  { pregunta: "Ofrecer un mercado a cambio del voto es…", opciones: ["Una buena práctica", "Compra de votos: está prohibido", "Permitido en las veredas"], correcta: 1 },
];

/** Porcentaje de aciertos (0 a 100). */
export function puntaje(respuestas: Record<number, number>): number {
  const bien = PREGUNTAS.filter((p, i) => respuestas[i] === p.correcta).length;
  return Math.round((100 * bien) / PREGUNTAS.length);
}

export const aprobado = (p: number, minimo = APROBADO) => p >= minimo;
