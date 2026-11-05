// Operaciones de campo: borradores, guardar la visita en la cola cifrada y encolar acciones (8.7, 17.3).
import { evaluarRegistro } from "../core/calidad";
import { mascaraCorreo, nombreVisible } from "../core/enmascarado";
import { nuevoId } from "../core/ids";
import { estadoViviendaPorResultado, iso } from "../core/reglas";
import { edad } from "../core/validadores";
import { construirPayload, type Borrador } from "../core/visita";
import type { Almacen } from "../datos/tipos";

export async function guardarBorrador(almacen: Almacen, b: Borrador) {
  await almacen.guardar("borradores", b as unknown as Record<string, unknown> & { id: string }, true);
}
export async function listarBorradores(almacen: Almacen, usuarioId: string): Promise<Borrador[]> {
  return ((await almacen.listar("borradores")) as unknown as Borrador[]).filter((b) => b.usuario_id === usuarioId);
}
export async function borrarBorrador(almacen: Almacen, id: string) {
  await almacen.borrar("borradores", id);
}

/** Guarda la visita: entra a la cola cifrada, se encolan sus fotos y queda una copia local (solo enmascarada) para el mapa. */
export async function guardarVisita(almacen: Almacen, b: Borrador): Promise<{ color: string; motivos: string[] }> {
  const { payload, subidas } = construirPayload(b);
  const { color, motivos } = evaluarRegistro(b);
  await almacen.encolar({ id: b.id, tipo: "registrar_visita", payload, usuario_id: b.usuario_id, depende_de: null });
  for (const s of subidas) {
    await almacen.encolarSubida({ id: s.foto_id, outbox_id: b.id, archivo: s.archivo_local, ruta: s.storage_path, usuario_id: b.usuario_id });
  }
  const ahora = iso();
  const estado = estadoViviendaPorResultado(b.visita.resultado);
  const previa = b.vivienda_existente ? await almacen.obtener("viviendas", b.vivienda.id) : null;
  await almacen.guardar("viviendas", { ...(previa ?? {}), ...b.vivienda, estado, calidad: color, actualizado_en: ahora,
    foto_local: b.fotos.find((f) => f.tipo === "fachada")?.archivo_local ?? previa?.foto_local ?? null }, true);
  await almacen.guardar("visitas", { id: b.id, vivienda_id: b.vivienda.id, usuario_id: b.usuario_id, fecha: (b.visita.fecha as string) ?? b.creado_en,
    resultado: b.visita.resultado, calidad: color, notas: b.visita.notas ?? null, actualizado_en: ahora }, true);
  if (b.hogar) await almacen.guardar("hogares", { ...b.hogar, vivienda_id: b.vivienda.id }, true);
  for (const p of b.personas) {
    // En la copia local solo queda la versión enmascarada (7.4); lo sensible viaja en la cola cifrada.
    await almacen.guardar("personas", {
      id: p.id, vivienda_id: b.vivienda.id, hogar_id: b.hogar?.id ?? null, nombre_visible: nombreVisible(p.primer_nombre, p.primer_apellido),
      edad_anios: edad(p.fecha_nacimiento), cedula_ult3: String(p.cedula ?? "").replace(/\D/g, "").slice(-3) || null,
      telefono_ult4: String(p.telefono ?? "").replace(/\D/g, "").slice(-4) || null, correo_parcial: mascaraCorreo(p.correo) || null,
      estado: b.visita.resultado === "pidio_no_ser_visitado" ? "no_contactar" : "activa", creado_por: b.usuario_id, actualizado_en: ahora,
    }, true);
  }
  for (const n of b.necesidades) await almacen.guardar("necesidades", { ...n, vivienda_id: b.vivienda.id }, true);
  await borrarBorrador(almacen, b.id);
  return { color, motivos };
}

/** Encola una acción sencilla (solicitud de un titular, «No contactar», estado de una tarea, anuncio leído…). */
export async function encolarAccion(almacen: Almacen, usuarioId: string, tipo: string, payload: Record<string, unknown>, dependeDe: string | null = null) {
  await almacen.encolar({ id: nuevoId(), tipo, payload, usuario_id: usuarioId, depende_de: dependeDe });
}
