// Calendario electoral guardado en el teléfono (llega con la tabla de configuración sincronizada).
import { hitosDelCalendario, type HitoVista } from "@/core/calendario";
import { diaBogota } from "@/core/formato";

export async function leerCalendario(almacen: { listar: (t: string) => Promise<Record<string, unknown>[]> }): Promise<HitoVista[]> {
  const filas = await almacen.listar("configuracion");
  const fila = filas.find((c) => (c.clave ?? c.id) === "calendario_legal");
  return hitosDelCalendario(fila?.valor, diaBogota());
}
