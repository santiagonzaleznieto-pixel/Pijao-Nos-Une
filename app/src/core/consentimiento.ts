// Autorización de tratamiento de datos (16.4). El texto es un MODELO: lo ajusta el abogado (23.2). La versión que
// se envía debe ser la vigente en el servidor (textos_legales); si no, el servidor rechaza el registro (A1).
import { nuevoId } from "./ids";
import { iso } from "./reglas";

export const VERSION_TEXTO_LOCAL = "v1-borrador";

export const TEXTO_CORTO =
  "Soy {nombre}, de la campaña Pijao Nos Une, del candidato Jaime González. Quisiera registrar su vivienda y, " +
  "si usted lo permite, sus datos de contacto, para conocer las necesidades de su familia, mantenerlo informado " +
  "de la campaña y construir el programa de gobierno. Usted puede decir que no, y puede pedir en cualquier " +
  "momento que corrijamos o borremos sus datos escribiendo a {correo} o por WhatsApp al {whatsapp}. " +
  "No venderemos sus datos ni los entregaremos a otras personas, y los eliminaremos al terminar la campaña. " +
  "Sus datos se guardan en servidores de un proveedor tecnológico que puede estar fuera de Colombia. " +
  "Aquí tiene nuestra política completa.";

export const TEXTO_SENSIBLE =
  "La simpatía política es un dato sensible. Entiendo que no estoy obligado a responder y que puedo retirar mi autorización cuando quiera.";

export const PROPOSITOS = [
  { clave: "registro_vivienda", etiqueta: "Registrar mi vivienda y los datos de mi hogar", sensible: false },
  { clave: "datos_personales", etiqueta: "Guardar mis datos personales (nombre, documento, contacto)", sensible: false },
  { clave: "contacto_whatsapp", etiqueta: "Recibir información de la campaña por WhatsApp", sensible: false },
  { clave: "contacto_llamada", etiqueta: "Recibir información de la campaña por llamada", sensible: false },
  { clave: "contacto_sms", etiqueta: "Recibir información de la campaña por SMS", sensible: false },
  { clave: "contacto_correo", etiqueta: "Recibir información de la campaña por correo", sensible: false },
  { clave: "dato_sensible_simpatia", etiqueta: "Registrar mi simpatía (dato sensible, es opcional)", sensible: true },
  { clave: "uso_historia", etiqueta: "Usar mi historia o mi frase en las comunicaciones de la campaña", sensible: false },
] as const;

export const CANAL_A_PROPOSITO: Record<string, string> = {
  whatsapp: "contacto_whatsapp", llamada: "contacto_llamada", sms: "contacto_sms", correo: "contacto_correo",
};

export type Metodo = "firma_pantalla" | "verbal" | "papel";
export const METODOS: Metodo[] = ["firma_pantalla", "verbal", "papel"];

export interface Consentimiento {
  id: string; proposito: string; metodo: Metodo; persona_id: string | null; version_texto: string;
  otorgado_en: string; lat: number | null; lng: number | null; evidencia: Record<string, unknown>; estado: "vigente" | "revocado";
}

export function textoPara(nombre: string, correo = "[correo de atención]", whatsapp = "[número de atención]", plantilla = TEXTO_CORTO): string {
  return plantilla.replace(/\{nombre\}/g, nombre || "[nombre]").replace(/\{correo\}/g, correo || "[correo de atención]")
    .replace(/\{whatsapp\}/g, whatsapp || "[número de atención]");
}

export interface TextoVigente { version: string; contenido: string | null }

const esVerdad = (v: unknown) => v === true || v === 1 || v === "true";

/** Texto de autorización vigente según la copia local de `textos_legales` (lo publica el Administrador en P-42).
 *  El servidor solo acepta registros con esa versión (A1); sin copia local se usa el texto que trae la app. */
export function autorizacionVigente(filas: readonly Record<string, unknown>[]): TextoVigente {
  const vigentes = filas
    .filter((t) => t.tipo === "autorizacion" && esVerdad(t.vigente) && typeof t.version === "string")
    .sort((a, b) => String(b.creado_en ?? "").localeCompare(String(a.creado_en ?? "")));
  const t = vigentes.find((x) => !esVerdad(x.es_borrador)) ?? vigentes[0];
  // Si la copia local no trae el texto, no se puede citar esa versión: lo leído y lo registrado deben coincidir.
  return t && typeof t.contenido === "string" && t.contenido.trim()
    ? { version: String(t.version), contenido: t.contenido }
    : { version: VERSION_TEXTO_LOCAL, contenido: null };
}

/** Canales de atención a titulares (16.5) desde la copia local de `configuracion`. */
export function canalesAtencion(filas: readonly Record<string, unknown>[]): { correo: string; whatsapp: string } {
  const valor = (clave: string) => {
    const v = filas.find((f) => f.clave === clave)?.valor;
    return typeof v === "string" ? v : "";
  };
  return { correo: valor("canal_titulares_correo"), whatsapp: valor("canal_titulares_whatsapp") };
}

/** Evidencia mínima por método, la misma que exige el servidor (0013, _consentimiento_valido). */
export function evidenciaPara(metodo: Metodo, datos: { firma?: unknown; ahora?: Date }): Record<string, unknown> {
  if (metodo === "firma_pantalla") return { firma: datos.firma };
  if (metodo === "verbal") return { verbal: true, hora: iso(datos.ahora) };
  return { papel: true };   // el servidor exige además una foto de tipo «autorizacion»
}

export function nuevoConsentimiento(proposito: string, metodo: Metodo, o: {
  personaId?: string | null; versionTexto: string; lat?: number | null; lng?: number | null; evidencia: Record<string, unknown>; ahora?: Date;
}): Consentimiento {
  if (!METODOS.includes(metodo)) throw new Error(`Método de autorización desconocido: ${metodo}`);
  return {
    id: nuevoId(), proposito, metodo, persona_id: o.personaId ?? null, version_texto: o.versionTexto,
    otorgado_en: iso(o.ahora), lat: o.lat ?? null, lng: o.lng ?? null, evidencia: o.evidencia, estado: "vigente",
  };
}
