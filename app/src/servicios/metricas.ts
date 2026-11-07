// 22.3: cola local de métricas del piloto. Se guardan en la base cifrada del teléfono y se envían en lotes al sincronizar.
import { agregar, nuevaMetrica, type Metrica, type TipoMetrica } from "../core/metricas";
import type { Almacen } from "../datos/tipos";

const CLAVE = "metricas_piloto";
const LOTE = 200;

export async function anotarMetrica(almacen: Almacen, versionApp: string, tipo: TipoMetrica, valor: number | null = null,
                                    detalle: string | null = null): Promise<void> {
  const cola = (await almacen.getMeta<Metrica[]>(CLAVE)) ?? [];
  await almacen.setMeta(CLAVE, agregar(cola, nuevaMetrica(tipo, versionApp, valor, detalle)));
}

/** Envía lo pendiente. Solo borra del teléfono lo que el servidor recibió; si falla, queda para la próxima. */
export async function enviarMetricas(almacen: Almacen, enviar: (lote: Metrica[]) => Promise<void>): Promise<number> {
  let enviadas = 0;
  for (let vuelta = 0; vuelta < 5; vuelta++) {
    const cola = (await almacen.getMeta<Metrica[]>(CLAVE)) ?? [];
    if (!cola.length) break;
    const lote = cola.slice(0, LOTE);
    await enviar(lote);
    const actual = (await almacen.getMeta<Metrica[]>(CLAVE)) ?? [];
    // Mientras se enviaba pudieron llegar métricas nuevas: se quitan solo las enviadas.
    const enviadasIds = new Set(lote.map((m) => `${m.tipo}|${m.ocurrido_en}|${m.valor}|${m.detalle}`));
    await almacen.setMeta(CLAVE, actual.filter((m) => !enviadasIds.has(`${m.tipo}|${m.ocurrido_en}|${m.valor}|${m.detalle}`)));
    enviadas += lote.length;
  }
  return enviadas;
}
