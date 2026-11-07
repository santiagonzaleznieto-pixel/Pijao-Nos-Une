// 22.3: métricas del piloto sin datos personales. Solo un tipo, un número y una categoría de una lista cerrada:
// nunca nombres, cédulas, teléfonos, direcciones ni coordenadas. El servidor (rpc_metricas, 0017) repite el filtro.

export const TIPOS_METRICA = [
  "registro_segundos", "registro_calidad", "registro_sin_senal", "gps_precision",
  "gps_error", "envio_error", "envio_cuarentena", "cola_atrasada",
] as const;
export type TipoMetrica = (typeof TIPOS_METRICA)[number];

export interface Metrica { tipo: TipoMetrica; valor: number | null; detalle: string | null; ocurrido_en: string; version_app: string }

/** Lo máximo que se guarda en el teléfono mientras no hay señal: se descartan las más viejas. */
export const MAX_METRICAS_LOCALES = 500;
/** Un registro que tardó más que esto se retomó después (borrador): no mide el tiempo en la puerta. */
export const MAX_SEGUNDOS_REGISTRO = 2 * 60 * 60;

const DETALLE = /^[a-z_]{1,30}$/;

export function metricaValida(m: Partial<Metrica>): m is Metrica {
  if (!m.tipo || !(TIPOS_METRICA as readonly string[]).includes(m.tipo)) return false;
  if (m.detalle !== null && m.detalle !== undefined && !DETALLE.test(m.detalle)) return false;
  if (m.valor !== null && m.valor !== undefined && (!Number.isFinite(m.valor) || m.valor < 0 || m.valor > 100000)) return false;
  return typeof m.ocurrido_en === "string" && !Number.isNaN(Date.parse(m.ocurrido_en));
}

export function nuevaMetrica(tipo: TipoMetrica, versionApp: string, valor: number | null = null, detalle: string | null = null,
                             ahora: Date = new Date()): Metrica | null {
  const m: Metrica = { tipo, valor: valor === null ? null : Math.round(valor * 10) / 10, detalle, ocurrido_en: ahora.toISOString(),
                       version_app: versionApp.slice(0, 20) };
  return metricaValida(m) ? m : null;
}

/** Agrega a la cola local sin pasar del máximo (se pierden las más viejas, nunca los registros de campo). */
export function agregar(cola: readonly Metrica[], m: Metrica | null, max = MAX_METRICAS_LOCALES): Metrica[] {
  if (!m) return [...cola];
  const nueva = [...cola, m];
  return nueva.length > max ? nueva.slice(nueva.length - max) : nueva;
}

/** Categoría del registro para medir el tiempo (la meta de 90 segundos es para el registro sin contacto). */
export function tipoRegistro(resultado: string | null | undefined, soloPunto: boolean, existente: boolean): string {
  if (existente) return "seguimiento";
  if (soloPunto) return "solo_punto";
  return resultado ? "con_contacto" : "otro";
}

/** Segundos que tomó el registro, o null si se retomó un borrador viejo. */
export function segundosRegistro(creadoEn: string, ahora: Date = new Date()): number | null {
  const s = (ahora.getTime() - Date.parse(creadoEn)) / 1000;
  return Number.isFinite(s) && s >= 0 && s <= MAX_SEGUNDOS_REGISTRO ? Math.round(s) : null;
}

/** Métricas del GPS al terminar el muestreo de «Registrar aquí» (5.3). */
export function metricasGps(lectura: { precision_m: number | null; simulada: boolean } | null, aceptable: boolean): { tipo: TipoMetrica; valor?: number; detalle?: string }[] {
  if (!lectura) return [{ tipo: "gps_error", detalle: "sin_lectura" }];
  const salida: { tipo: TipoMetrica; valor?: number; detalle?: string }[] = [];
  if (lectura.precision_m !== null) salida.push({ tipo: "gps_precision", valor: lectura.precision_m });
  if (!aceptable) salida.push({ tipo: "gps_error", detalle: "baja_precision" });
  if (lectura.simulada) salida.push({ tipo: "gps_error", detalle: "simulada" });
  return salida;
}

/** ¿Hay algo en la cola desde hace más de 24 horas? (17.3) */
export function colaAtrasada(masAntiguo: string | null, ahora: Date = new Date()): boolean {
  return Boolean(masAntiguo) && ahora.getTime() - Date.parse(masAntiguo as string) > 24 * 3600_000;
}
