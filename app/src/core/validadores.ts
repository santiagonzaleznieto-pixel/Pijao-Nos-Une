// Validaciones de datos (secciones 6, 7 y 14.8 del documento maestro).
import { RANGOS_ADULTOS, RANGOS_MENORES, claves } from "./catalogos";

export type Resultado = { ok: true } | { ok: false; mensaje: string };
const bien: Resultado = { ok: true };
const mal = (mensaje: string): Resultado => ({ ok: false, mensaje });

export const PALABRAS_SENSIBLES = [
  "enfermo", "enfermedad", "diagnóstico", "diagnostico", "cáncer", "cancer", "vih",
  "religión", "religion", "evangélico", "evangelico", "católico", "catolico",
  "partido", "sindicato", "homosexual", "gay", "lesbiana", "embarazada",
  "discapacidad", "psiquiátrico", "psiquiatrico", "antecedentes", "cárcel", "carcel",
];

// 14.8: palabras que sugieren ofrecimientos a cambio de votos. La nota pasa a revisión del Director.
export const PALABRAS_SOSPECHOSAS = [
  "plata", "dinero", "mercado", "mercados", "regalo", "regalos", "pagar", "pagó", "pago",
  "favor", "favores", "soborno", "bulto", "comprar", "a cambio", "prometí", "prometimos",
];

const soloDigitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");

/** Celular colombiano de 10 dígitos que empieza por 3, o null. */
export function normalizarCelular(valor: unknown): string | null {
  let d = soloDigitos(valor);
  if (d.startsWith("57") && d.length === 12) d = d.slice(2);
  return d.length === 10 && d.startsWith("3") ? d : null;
}

/** Celular, fijo con indicativo (10 dígitos que empiezan por 60) o fijo local de 7. */
export function normalizarTelefono(valor: unknown): string | null {
  const cel = normalizarCelular(valor);
  if (cel) return cel;
  let d = soloDigitos(valor);
  if (d.startsWith("57") && d.length === 12) d = d.slice(2);
  return d.length === 7 || (d.length === 10 && d.startsWith("60")) ? d : null;
}

/** R-17: solo números, de 6 a 10 dígitos. */
export function validarCedula(valor: unknown): Resultado {
  const s = String(valor ?? "").trim();
  if (!s) return mal("Escriba el número de documento.");
  if (!/^\d+$/.test(s)) return mal("El documento solo lleva números.");
  if (s.length < 6 || s.length > 10) return mal("El documento debe tener entre 6 y 10 dígitos.");
  if (new Set(s).size === 1) return mal("Ese número no parece un documento real.");
  return bien;
}

export function validarCorreo(valor: unknown): Resultado {
  const s = String(valor ?? "").trim();
  if (!s) return mal("Escriba el correo.");
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(s) ? bien : mal("El correo no parece válido.");
}

export function validarNombre(valor: unknown, etiqueta = "El nombre"): Resultado {
  const s = String(valor ?? "").trim();
  if (s.length < 2) return mal(`${etiqueta} debe tener al menos dos letras.`);
  if (/[\d_@#$%^&*+=<>/\\|~]/.test(s)) return mal(`${etiqueta} solo lleva letras, tildes y espacios.`);
  return bien;
}

/** Acepta Date, «AAAA-MM-DD», «DD/MM/AAAA» o «DD-MM-AAAA». Devuelve la fecha a medianoche UTC. */
export function parseFecha(valor: unknown): Date | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;
  const s = String(valor).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  let a: number, mes: number, d: number;
  if (m) { a = +m[1]; mes = +m[2]; d = +m[3]; } else {
    m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
    if (!m) return null;
    d = +m[1]; mes = +m[2]; a = +m[3];
  }
  const f = new Date(Date.UTC(a, mes - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === mes - 1 && f.getUTCDate() === d ? f : null;
}

export function edad(nacimiento: unknown, hoy: Date = new Date()): number | null {
  const f = parseFecha(nacimiento);
  if (!f) return null;
  let e = hoy.getUTCFullYear() - f.getUTCFullYear();
  if (hoy.getUTCMonth() < f.getUTCMonth() || (hoy.getUTCMonth() === f.getUTCMonth() && hoy.getUTCDate() < f.getUTCDate())) e -= 1;
  return e;
}

/** R-16: mayor de 18 y no más de 110. */
export function validarFechaNacimiento(valor: unknown, hoy: Date = new Date()): Resultado {
  if (!parseFecha(valor)) return mal("Escriba la fecha como día/mes/año.");
  const e = edad(valor, hoy);
  if (e === null || e < 18) return mal("Solo se registran personas mayores de 18 años (regla R-16).");
  if (e > 110) return mal("La fecha de nacimiento no es posible.");
  return bien;
}

/** Paso 5: la suma de personas por rango debe dar el total del hogar. */
export function validarEdades(total: unknown, edades: Record<string, unknown> | null | undefined): Resultado {
  const t = Number(total);
  if (!Number.isInteger(t)) return mal("Indique cuántas personas viven en el hogar.");
  if (t < 1) return mal("El hogar debe tener al menos una persona.");
  const validas = new Set(claves("C-11"));
  let suma = 0;
  for (const [k, v] of Object.entries(edades ?? {})) {
    if (!validas.has(k)) return mal(`Rango de edad desconocido: ${k}.`);
    const n = Number(v ?? 0);
    if (!Number.isInteger(n)) return mal("Los rangos de edad llevan solo números.");
    if (n < 0) return mal("Los rangos de edad no pueden ser negativos.");
    suma += n;
  }
  return suma === t ? bien : mal(`Los rangos de edad suman ${suma} y el hogar tiene ${t} personas.`);
}

export const contarAdultos = (edades?: Record<string, unknown> | null) =>
  RANGOS_ADULTOS.reduce((s, k) => s + Number(edades?.[k] ?? 0), 0);
export const contarMenores = (edades?: Record<string, unknown> | null) =>
  RANGOS_MENORES.reduce((s, k) => s + Number(edades?.[k] ?? 0), 0);

/** Paso 11: avisos si la nota tiene un número de documento o teléfono, o palabras de datos sensibles. */
export function avisosDeNota(texto: string | null | undefined): string[] {
  if (!texto) return [];
  const avisos: string[] = [];
  if (/(?<!\d)\d{6,10}(?!\d)/.test(texto)) {
    avisos.push("Parece que escribió un número de documento o teléfono. Use el campo correspondiente, no la nota.");
  }
  const bajo = texto.toLowerCase();
  const encontradas = [...new Set(PALABRAS_SENSIBLES.filter((p) => bajo.includes(p)))].sort();
  if (encontradas.length) {
    avisos.push(`No escriba datos sensibles (salud, religión, política de terceros, etc.): ${encontradas.join(", ")}.`);
  }
  return avisos;
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** 14.8: palabras que sugieren ofrecimientos a cambio de votos. */
export function palabrasSospechosas(texto: string | null | undefined): string[] {
  if (!texto) return [];
  const bajo = texto.toLowerCase();
  return [...new Set(PALABRAS_SOSPECHOSAS.filter((p) => new RegExp(`(^|[^\\p{L}])${escapar(p)}($|[^\\p{L}])`, "u").test(bajo)))].sort();
}

/** Convierte "" en null de forma recursiva (la base no acepta "" en fechas, números ni uuid). */
export function limpiarVacios<T>(d: T): T {
  if (Array.isArray(d)) return d.map(limpiarVacios) as T;
  if (d && typeof d === "object") {
    return Object.fromEntries(Object.entries(d as Record<string, unknown>).map(([k, v]) => [k, limpiarVacios(v)])) as T;
  }
  if (typeof d === "string" && d.trim() === "") return null as T;
  return d;
}
