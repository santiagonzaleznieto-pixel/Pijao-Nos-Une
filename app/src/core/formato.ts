// Formatos de la app (3.6 y 2.8): fechas en día/mes/año, hora de 12 horas con «a. m.» y «p. m.», zona horaria de Bogotá
// (UTC-5 todo el año, sin horario de verano) y pesos con puntos de mil. No dependen del idioma del teléfono ni de Intl.

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const BOGOTA_MS = -5 * 3600_000;

/** La fecha como se ve en un reloj de Bogotá (se leen los campos UTC del resultado). */
function enBogota(v: Date | string | number | null | undefined): Date | null {
  if (v === null || v === undefined || v === "") return null;
  const d = typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00-05:00`) : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + BOGOTA_MS);
}

const dos = (n: number) => String(n).padStart(2, "0");

/** «08/11/2026» */
export function fechaNumerica(v: Date | string | number | null | undefined): string {
  const b = enBogota(v);
  return b ? `${dos(b.getUTCDate())}/${dos(b.getUTCMonth() + 1)}/${b.getUTCFullYear()}` : "";
}

/** «8 de noviembre» (con el año solo si no es el actual). */
export function fechaLarga(v: Date | string | number | null | undefined, ahora: Date = new Date()): string {
  const b = enBogota(v);
  if (!b) return "";
  const hoy = enBogota(ahora)!;
  return `${b.getUTCDate()} de ${MESES[b.getUTCMonth()]}${b.getUTCFullYear() !== hoy.getUTCFullYear() ? ` de ${b.getUTCFullYear()}` : ""}`;
}

/** «domingo 8 de noviembre» */
export function fechaConDia(v: Date | string | number | null | undefined, ahora: Date = new Date()): string {
  const b = enBogota(v);
  return b ? `${DIAS[b.getUTCDay()]} ${fechaLarga(v, ahora)}` : "";
}

/** «3:05 p. m.» */
export function hora(v: Date | string | number | null | undefined): string {
  const b = enBogota(v);
  if (!b) return "";
  const h = b.getUTCHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${dos(b.getUTCMinutes())} ${h < 12 ? "a. m." : "p. m."}`;
}

/** «hoy, 3:05 p. m.», «ayer, 9:10 a. m.» o «8 nov, 3:05 p. m.» */
export function fechaHora(v: Date | string | number | null | undefined, ahora: Date = new Date()): string {
  const b = enBogota(v);
  if (!b) return "";
  const clave = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  const hoy = enBogota(ahora)!;
  const ayer = new Date(hoy.getTime() - 86400_000);
  const dia = clave(b) === clave(hoy) ? "hoy" : clave(b) === clave(ayer) ? "ayer" : `${b.getUTCDate()} ${MESES_CORTOS[b.getUTCMonth()]}`;
  return `${dia}, ${hora(v)}`;
}

/** Día en Bogotá como «2026-11-08», para comparar plazos. */
export function diaBogota(v: Date | string | number = new Date()): string {
  const b = enBogota(v);
  return b ? `${b.getUTCFullYear()}-${dos(b.getUTCMonth() + 1)}-${dos(b.getUTCDate())}` : "";
}

/** «1.234.567» (puntos de mil, sin decimales). */
export function miles(n: number): string {
  const s = String(Math.round(Math.abs(n)));
  return `${n < 0 ? "-" : ""}${s.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

/** «$ 1.234.567» */
export function pesos(n: number): string {
  return `$ ${miles(n)}`;
}
