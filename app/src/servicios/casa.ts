// Carga desde la copia del teléfono todo lo que se recogió de una vivienda, para la ficha rápida del mapa (P-10)
// y el detalle completo (P-13). Funciona sin señal.
import type { DatosCasa, FilaDato } from "@/core/ficha";
import type { Almacen } from "@/datos/tipos";

export async function cargarCasa(almacen: Almacen, id: string): Promise<DatosCasa | null> {
  const vivienda = await almacen.obtener("viviendas", id);
  if (!vivienda) return null;
  const de = async (tabla: string) => ((await almacen.listar(tabla)) as FilaDato[]).filter((f) => f.vivienda_id === id);
  const [hogares, personas, visitas, necesidades, fotos] = await Promise.all([
    de("hogares"), de("personas"), de("visitas"), de("necesidades"), de("fotos"),
  ]);
  return { vivienda: vivienda as FilaDato, hogares, personas, visitas, necesidades, fotos };
}
