// Calendario electoral (2.2 y 14.7): los hitos que el Administrador mantiene en Configuración → Calendario legal (valor
// `calendario_legal`). Llegan al teléfono con la configuración y se ven sin señal. El abogado confirma cada fecha.

export interface Hito { fecha: string | null; hito: string; estado?: string | null }
export interface HitoVista extends Hito { dias: number | null; pasado: boolean; estadoTexto: string }

const ESTADO: Record<string, string> = { confirmada: "Confirmada", prensa: "Según la prensa (falta confirmar)", pendiente: "Fecha por confirmar" };

/** Días entre dos fechas «AAAA-MM-DD» (sin zona horaria). */
export function diasEntre(desde: string, hasta: string): number {
  const a = Date.UTC(+desde.slice(0, 4), +desde.slice(5, 7) - 1, +desde.slice(8, 10));
  const b = Date.UTC(+hasta.slice(0, 4), +hasta.slice(5, 7) - 1, +hasta.slice(8, 10));
  return Math.round((b - a) / 86400000);
}

/** Lee el valor de la configuración (puede venir como texto JSON o como lista) y lo deja ordenado por fecha. */
export function hitosDelCalendario(valor: unknown, hoy: string): HitoVista[] {
  let lista: unknown = valor;
  if (typeof valor === "string") { try { lista = JSON.parse(valor); } catch { lista = []; } }
  if (!Array.isArray(lista)) return [];
  return (lista as Hito[])
    .filter((h) => h && typeof h.hito === "string" && h.hito.trim())
    .map((h) => {
      const fecha = typeof h.fecha === "string" && /^\d{4}-\d{2}-\d{2}/.test(h.fecha) ? h.fecha.slice(0, 10) : null;
      const dias = fecha ? diasEntre(hoy, fecha) : null;
      return { ...h, fecha, dias, pasado: dias !== null && dias < 0, estadoTexto: ESTADO[h.estado ?? ""] ?? ESTADO.pendiente };
    })
    .sort((a, b) => (a.fecha ?? "9999").localeCompare(b.fecha ?? "9999"));
}

/** El próximo hito con fecha (hoy o después). */
export function proximoHito(hitos: HitoVista[]): HitoVista | null {
  return hitos.find((h) => h.dias !== null && h.dias >= 0) ?? null;
}

/** «Hoy», «Mañana», «En 12 días», «Hace 3 días». */
export function textoDias(dias: number | null): string {
  if (dias === null) return "Sin fecha";
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  if (dias === -1) return "Ayer";
  return dias > 0 ? `En ${dias.toLocaleString("es-CO")} días` : `Hace ${(-dias).toLocaleString("es-CO")} días`;
}
