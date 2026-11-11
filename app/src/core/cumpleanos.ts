// Cumpleañeros (7.5): quién cumple años hoy, con el día y el mes que se registraron en la visita. Fecha de Colombia.
// Nunca menores (no se registran) ni quien pidió no ser contactado. A quien no autorizó el contacto solo se le saluda en
// persona: la pantalla lo indica y no ofrece llamar ni escribir.
import { diaBogota } from "./formato";

export interface Cumpleanero { id: string; nombre: string; vivienda_id: string | null; edad: number | null; contactable: boolean }

const bisiesto = (a: number) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;

/** ¿Cumple años en esa fecha? Quien nació un 29 de febrero celebra el 28 en los años que no son bisiestos. */
export function cumpleEn(mes: number, dia: number, fecha: { anio: number; mes: number; dia: number }): boolean {
  if (mes === fecha.mes && dia === fecha.dia) return true;
  return mes === 2 && dia === 29 && fecha.mes === 2 && fecha.dia === 28 && !bisiesto(fecha.anio);
}

export function cumpleanerosDeHoy(personas: Record<string, unknown>[], ahora: Date = new Date()): Cumpleanero[] {
  const [a, m, d] = diaBogota(ahora).split("-").map(Number);
  return personas
    .filter((p) => p.estado === "activa" && !p.eliminado_en)
    .filter((p) => {
      const mes = Number(p.cumple_mes);
      const dia = Number(p.cumple_dia);
      return mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31 && cumpleEn(mes, dia, { anio: a, mes: m, dia: d });
    })
    .map((p) => ({
      id: String(p.id), nombre: String(p.nombre_visible ?? "Persona"), vivienda_id: (p.vivienda_id as string) ?? null,
      // Edad registrada (la del servidor se calcula cada día; la copia local, al registrar).
      edad: typeof p.edad_anios === "number" ? p.edad_anios : null,
      contactable: p.tiene_contacto_autorizado === true,
    }))
    .sort((x, y) => Number(y.contactable) - Number(x.contactable) || x.nombre.localeCompare(y.nombre, "es"));
}
