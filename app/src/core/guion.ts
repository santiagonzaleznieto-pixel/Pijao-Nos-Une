// 13.3 y 1.11: guion de visita y preguntas frecuentes. El Administrador publica versiones en P-42 (migración 0017) y el
// teléfono las descarga con los textos legales; sin copia local se usan estos borradores. Formato: «## » abre una
// sección (o una pregunta) y «- » es un punto de una lista.

export type TipoTextoCampo = "guion_visita" | "preguntas_frecuentes";

export interface TextoCampo { version: string; contenido: string; borrador: boolean }

export interface Bloque { tipo: "titulo" | "punto" | "parrafo"; texto: string }

export interface Pregunta { pregunta: string; respuesta: string }

export const VERSION_CAMPO_LOCAL = "v1-local";

export const GUION_LOCAL = `## Antes de tocar la puerta
- Lleve el carnet digital a la vista (Más → Carnet digital).
- Revise en el mapa si la casa pidió no ser contactada. Si es así, no toque.
- Trabaje en pareja en las veredas y avise a qué hora regresa.

## 1. Saludo y presentación
«Buenos días, mi nombre es (su nombre). Hago parte del equipo de Pijao Nos Une. Este es mi carnet: puede verificarlo con el código QR.»

## 2. Para qué venimos
«Estamos recorriendo Pijao casa por casa para conocer las necesidades de cada barrio y vereda. Con lo que nos cuenten se construyen las propuestas para el municipio. ¿Tiene unos minutos para conversar?»
- Si dice que no: agradezca, despídase con amabilidad y registre el resultado.
- Si pide que no vuelvan: respételo y márquelo en la app. No se vuelve a visitar.

## 3. La autorización de los datos
«Para anotar sus datos necesitamos su autorización. Solo los usamos para lo que usted autorice, no los compartimos con nadie y puede pedir que los borremos cuando quiera.»
- Lea el texto de autorización que muestra la app, sin resumirlo ni cambiarlo.
- Cada persona autoriza por sí misma. Nadie autoriza por otro adulto.
- Si no autoriza, se registra solo la visita, sin datos de personas.

## 4. La conversación
- Pregunte por las necesidades del hogar y del sector, y escuche sin interrumpir.
- No prometa obras, empleos, auxilios ni favores.
- Nunca ofrezca ni reciba dinero, regalos o mercados.
- No pida el voto ni pregunte por quién va a votar. La simpatía solo se anota si la persona la cuenta y la autoriza.

## 5. Despedida
«Muchas gracias por su tiempo. Le dejo este volante con la información y la página "Mis datos", donde puede consultar o borrar su información.»
- Revise en la app que el registro quedó guardado.

## Si algo sale mal
- Si alguien se molesta o se siente amenazado: despídase y retírese. Su seguridad va primero.
- Si abre un menor de edad: pregunte por un adulto. No se registran datos de menores.
- No pase datos de personas por los chats de WhatsApp del equipo.`;

export const PREGUNTAS_LOCAL = `## ¿Qué es Pijao Nos Une?
Es el equipo de campaña de Jaime González a la Alcaldía de Pijao. Recorremos el municipio para conocer las necesidades de cada barrio y vereda.

## ¿Esto es de la Alcaldía o del gobierno?
No. Es una campaña ciudadana. No tiene que ver con subsidios ni con programas del Estado.

## ¿Para qué quieren mis datos?
Solo para lo que usted autorice: saber qué necesita su sector y, si lo acepta, contactarle con información. No se venden ni se comparten.

## ¿Es obligatorio darlos?
No. Puede conversar con nosotros sin dar ningún dato. También puede autorizar unas cosas y otras no.

## ¿Me van a dar algo a cambio?
No. La campaña no entrega dinero, regalos ni favores a cambio de datos o de apoyo. Si alguien se lo ofrece en nombre de la campaña, avísenos.

## ¿Quién ve mi información?
Solo las personas autorizadas del equipo. Sus datos completos están protegidos y cada consulta queda registrada.

## ¿Puedo borrar mis datos o dejar de recibir mensajes?
Sí, cuando quiera. En la página «Mis datos» (está en el volante) o en persona con cualquier miembro del equipo. Se aplica de inmediato.

## ¿Dónde voto?
Eso lo consulta en la página de la Registraduría con su cédula. La campaña no maneja esa información.

## Para el colaborador: ¿qué hago si no hay señal?
Siga trabajando: todo se guarda cifrado en el teléfono y se envía solo cuando vuelva la señal. No desinstale la app.

## Para el colaborador: ¿qué hago si pierdo el teléfono?
Avise de inmediato al Director para que lo cierre a distancia. Los datos del teléfono se borran solos.`;

const esVerdad = (v: unknown) => v === true || v === 1 || v === "true";

/** Versión vigente de un texto de campo según la copia local de `textos_legales`; sin copia, el borrador de la app. */
export function textoCampo(filas: readonly Record<string, unknown>[], tipo: TipoTextoCampo): TextoCampo {
  const t = filas
    .filter((f) => f.tipo === tipo && esVerdad(f.vigente) && typeof f.contenido === "string" && f.contenido.trim())
    .sort((a, b) => String(b.creado_en ?? "").localeCompare(String(a.creado_en ?? "")))[0];
  if (t) return { version: String(t.version ?? ""), contenido: String(t.contenido), borrador: esVerdad(t.es_borrador) };
  return { version: VERSION_CAMPO_LOCAL, contenido: tipo === "guion_visita" ? GUION_LOCAL : PREGUNTAS_LOCAL, borrador: true };
}

/** Quita la nota final «BORRADOR: …» del texto: la pantalla lo dice con un aviso propio. */
function sinNotaBorrador(contenido: string): string[] {
  return contenido.replace(/\r\n/g, "\n").split("\n").filter((l) => !/^\s*BORRADOR:/i.test(l));
}

/** Convierte el texto en bloques para mostrarlo: títulos, puntos y párrafos. */
export function bloques(contenido: string): Bloque[] {
  const salida: Bloque[] = [];
  for (const cruda of sinNotaBorrador(contenido)) {
    const l = cruda.trim();
    if (!l) continue;
    if (l.startsWith("## ")) salida.push({ tipo: "titulo", texto: l.slice(3).trim() });
    else if (/^[-•]\s+/.test(l)) salida.push({ tipo: "punto", texto: l.replace(/^[-•]\s+/, "") });
    else salida.push({ tipo: "parrafo", texto: l });
  }
  return salida;
}

/** Preguntas frecuentes: cada «## » es una pregunta y lo que sigue, hasta la próxima, su respuesta. */
export function preguntas(contenido: string): Pregunta[] {
  const lista: Pregunta[] = [];
  for (const b of bloques(contenido)) {
    if (b.tipo === "titulo") lista.push({ pregunta: b.texto, respuesta: "" });
    else if (lista.length) {
      const ultima = lista[lista.length - 1];
      const linea = b.tipo === "punto" ? `• ${b.texto}` : b.texto;
      ultima.respuesta = ultima.respuesta ? `${ultima.respuesta}\n${linea}` : linea;
    }
  }
  return lista.filter((p) => p.respuesta);
}

/** Búsqueda sin tildes ni mayúsculas, para encontrar una pregunta en la puerta. */
export function filtrarPreguntas(lista: readonly Pregunta[], q: string): Pregunta[] {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const t = norm(q.trim());
  if (!t) return [...lista];
  return lista.filter((p) => norm(p.pregunta).includes(t) || norm(p.respuesta).includes(t));
}
