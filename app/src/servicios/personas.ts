// Pestaña «Personas»: pide la lista al servidor (que decide qué ve cada quien) y, sin señal o en práctica, la arma con
// lo guardado en el teléfono. Guardar dónde vota funciona sin señal: va a la cola y sale apenas haya conexión.
import type { Almacen } from "@/datos/tipos";
import type { PersonaV } from "@/core/enmascarado";
import {
  limpiarFiltros, listaLocal, type EventoHistoria, type FiltrosPersonas, type PersonaLista, type ResumenPersonas,
} from "@/core/personas";
import { encolarAccion } from "./campo";
import { cliente } from "./contexto";

export const POR_PAGINA = 40;

export interface PaginaPersonas { total: number; filas: PersonaLista[]; local: boolean; aviso?: string }

interface Entorno { almacen: Almacen; conectado: boolean; practica: boolean; usuarioId: string | null }

async function paginaLocal(app: Entorno, filtros: FiltrosPersonas, desde: number, aviso?: string): Promise<PaginaPersonas> {
  const personas = (await app.almacen.listar("personas")) as PersonaV[];
  const viviendas = (await app.almacen.listar("viviendas")) as Record<string, unknown>[];
  const todas = listaLocal(personas, viviendas, filtros, app.usuarioId);
  return { total: todas.length, filas: todas.slice(desde, desde + POR_PAGINA), local: true, aviso };
}

export async function listarPersonas(app: Entorno, filtros: FiltrosPersonas, desde = 0): Promise<PaginaPersonas> {
  if (app.practica) return paginaLocal(app, filtros, desde);
  if (!app.conectado) return paginaLocal(app, filtros, desde, "Sin señal: se ven las personas guardadas en este teléfono, con los datos en parte.");
  const { data, error } = await cliente.rpc("rpc_personas_lista", { p: { ...limpiarFiltros(filtros), desde, limite: POR_PAGINA } });
  if (error) {
    return paginaLocal(app, filtros, desde, "No se pudo traer la lista completa del servidor: se ven las personas guardadas en este teléfono.");
  }
  const d = data as { total: number; filas: PersonaLista[] };
  return { total: d.total ?? 0, filas: d.filas ?? [], local: false };
}

/** Una persona con todo lo que quien consulta puede ver (del servidor; sin señal, lo del teléfono). */
export async function obtenerPersona(app: Entorno, id: string): Promise<PersonaLista | null> {
  const r = await listarPersonas(app, { id }, 0);
  return r.filas[0] ?? null;
}

export async function resumenPersonas(app: Entorno): Promise<ResumenPersonas | null> {
  if (app.practica || !app.conectado) return null;
  const { data, error } = await cliente.rpc("rpc_personas_resumen");
  return error ? null : (data as ResumenPersonas);
}

/** null: sin señal (o en práctica); «error»: el servidor no la entregó. */
export async function historiaPersona(app: Entorno, id: string): Promise<EventoHistoria[] | null | "error"> {
  if (app.practica || !app.conectado) return null;
  const { data, error } = await cliente.rpc("rpc_persona_historia", { p_id: id });
  return error ? "error" : (data as EventoHistoria[]);
}

/** Guarda dónde vota: queda en el teléfono al instante y se envía al servidor (con o sin señal). */
export async function guardarDondeVota(app: Entorno, id: string, v: { vota: string | null; puesto: string; mesa: string }): Promise<void> {
  if (!app.usuarioId) throw new Error("Sin sesión");
  const puesto = v.vota === "no" ? null : v.puesto.trim() || null;
  const mesa = v.vota === "no" ? null : v.mesa.replace(/\D/g, "").replace(/^0+/, "") || null;
  const vota = v.vota ?? (puesto ? "si" : null);
  // Con señal se guarda de una vez (y así se ve enseguida si el servidor no lo acepta); sin señal va a la cola.
  if (app.conectado && !app.practica) {
    const { error } = await cliente.rpc("rpc_persona_votacion", { p_id: id, p_vota: vota, p_puesto: puesto, p_mesa: mesa });
    if (error) {
      const m = `${error.message ?? ""} ${(error as { code?: string }).code ?? ""}`;
      if (/PGRST202|Could not find the function/i.test(m)) throw new Error("Guardar dónde vota se activa cuando se actualice el servidor (migración 0021).");
      if (!/fetch|network|timeout/i.test(m)) throw new Error(error.message || "No se pudo guardar.");
      await encolarAccion(app.almacen, app.usuarioId, "votacion", { persona_id: id, vota, puesto, mesa });
    }
  } else {
    await encolarAccion(app.almacen, app.usuarioId, "votacion", { persona_id: id, vota, puesto, mesa });
  }
  const local = await app.almacen.obtener("personas", id);
  if (local) await app.almacen.guardar("personas", { ...local, vota_en_pijao: vota, puesto_votacion: puesto, mesa_votacion: mesa } as never, true);
}
