// Motor de sincronización (5.13, 8.7, 17.3 y 24.4).
// - Un registro local nunca se borra hasta que el servidor confirma que lo recibió.
// - Primero se envían los datos y después las fotos; cada foto se marca por separado (sin fotos huérfanas).
// - Espera creciente entre intentos; un error que no es de red pasa a cuarentena, visible al colaborador y en la flota.
// - Cada registro lleva su usuario (C2) y respeta el orden de sus dependencias.
// - La descarga relee con un margen para no perder cambios confirmados tarde.
// - Nunca corren dos sincronizaciones a la vez.
import { param, type Params } from "../core/reglas";
import { ErrorRemoto, SinConexion, TRANSITORIOS, type Almacen, type ItemCola, type Remoto } from "./tipos";

const LOTE = 500;

// (tabla del servidor, tabla local, clave)
export const TABLAS_DESCARGA: readonly [string, string, string][] = [
  ["catalogos", "catalogos", "id"],
  ["configuracion", "configuracion", "clave"],
  ["textos_legales", "textos_legales", "id"],
  ["zonas", "zonas", "id"],
  ["viviendas", "viviendas", "id"],
  ["hogares", "hogares", "id"],
  ["visitas", "visitas", "id"],
  ["personas_v", "personas", "id"],
  ["fotos", "fotos", "id"],
  ["necesidades", "necesidades", "id"],
  ["tareas", "tareas", "id"],
  ["anuncios", "anuncios", "id"],
];

export type Evento =
  | { tipo: "enviado"; item: ItemCola; respuesta: unknown }
  | { tipo: "cuarentena"; item: ItemCola; mensaje: string }
  | { tipo: "sesion_expirada" }
  | { tipo: "sincronizado"; resultado: ResultadoSync };

export interface ResultadoSync {
  enviados: number; cuarentena: number; fotos: number; descargados: number; sinConexion: boolean; error: string | null;
}

/** Espera creciente: 30 s, 1 min, 2 min, 4 min… hasta 1 hora. */
export function esperaMs(intentos: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, intentos - 1), 3_600_000);
}

type Envio = (item: ItemCola, rpc: Remoto["rpc"]) => Promise<unknown>;

/** Cómo se envía cada tipo de registro. */
export const ENVIOS: Record<string, Envio> = {
  registrar_visita: (i, rpc) => rpc("rpc_registrar_visita", { p: i.payload }),
  registrar_reconocimiento: (i, rpc) => rpc("rpc_registrar_reconocimiento", { p: i.payload }),
  editar_visita: (i, rpc) => rpc("rpc_editar_visita", { p_id: i.payload?.id, p: i.payload?.cambios ?? {} }),
  tarea_estado: (i, rpc) => rpc("rpc_tarea_actualizar", { p_id: i.payload?.id, p_estado: i.payload?.estado, p_nota: i.payload?.nota ?? null }),
  solicitud_titular: (i, rpc) => rpc("rpc_solicitud_titular", { p: i.payload }),
  no_contactar: (i, rpc) => rpc("rpc_marcar_no_contactar", { p_persona: i.payload?.persona_id, p_motivo: i.payload?.motivo ?? null }),
  incidente: (i, rpc) => rpc("rpc_incidente", { p: i.payload }),
  eliminar: (i, rpc) => rpc("rpc_eliminar_registro", { p_tabla: i.payload?.tabla, p_id: i.payload?.id, p_motivo: i.payload?.motivo ?? "" }),
  anuncio_leido: (i, rpc) => rpc("rpc_anuncio_leido", { p_id: i.payload?.id }),
  completar_ingreso: (i, rpc) => rpc("rpc_completar_ingreso", { p_puntaje: i.payload?.puntaje, p_acuerdos_version: i.payload?.acuerdos_version }),
  // Fase 3 · jornada y seguridad (R-31, R-32): se guardan sin señal y salen apenas haya.
  jornada_iniciar: (_i, rpc) => rpc("rpc_jornada_iniciar", {}),
  jornada_terminar: (_i, rpc) => rpc("rpc_jornada_terminar", {}),
  ubicaciones: (i, rpc) => rpc("rpc_ubicaciones", { p: i.payload?.puntos ?? [] }),
  sos: (i, rpc) => rpc("rpc_sos", { p_lat: i.payload?.lat ?? null, p_lng: i.payload?.lng ?? null, p_nota: i.payload?.nota ?? null }),
};

export class MotorSync {
  private enCurso: Promise<ResultadoSync> | null = null;
  sesionExpirada = false;

  constructor(
    private readonly almacen: Almacen,
    private readonly remoto: Remoto,
    private readonly usuarioId: () => string | null,
    private readonly alEvento: (e: Evento) => void = () => undefined,
    private readonly params: () => Params | null = () => null,
    private readonly reloj: () => Date = () => new Date(),
  ) {}

  /** Candado: si ya hay una sincronización en curso, devuelve esa misma. */
  sincronizar(): Promise<ResultadoSync> {
    if (!this.enCurso) {
      this.enCurso = this.ejecutar().finally(() => { this.enCurso = null; });
    }
    return this.enCurso;
  }

  private async ejecutar(): Promise<ResultadoSync> {
    const r: ResultadoSync = { enviados: 0, cuarentena: 0, fotos: 0, descargados: 0, sinConexion: false, error: null };
    const uid = this.usuarioId();
    if (!uid) return r;
    try {
      const envio = await this.enviar(uid);
      r.enviados = envio.enviados;
      r.cuarentena = envio.cuarentena;
      if (!envio.detenido) {
        r.fotos = await this.subirFotos(uid);
        r.descargados = await this.descargar();
      } else {
        r.sinConexion = !this.sesionExpirada;
      }
    } catch (e) {
      if (e instanceof SinConexion) r.sinConexion = true;
      else r.error = e instanceof Error ? e.message : String(e);
    }
    this.alEvento({ tipo: "sincronizado", resultado: r });
    return r;
  }

  // ------------------------------------------------------------ envío
  private async enviar(uid: string): Promise<{ enviados: number; cuarentena: number; detenido: boolean }> {
    let enviados = 0;
    let cuarentena = 0;
    const ahora = this.reloj();
    for (const item of await this.almacen.siguientes(uid, ahora, 100)) {
      if (item.usuario_id !== uid) continue;                                   // C2
      if (item.depende_de) {
        const dep = await this.almacen.obtenerItem(item.depende_de);
        if (dep && dep.estado !== "enviado") continue;                       // espera a su registro base
        // Su registro base se está corrigiendo como borrador: espera a que vuelva a la cola.
        if (!dep && (await this.almacen.obtener("borradores", item.depende_de))) continue;
      }
      const envio = ENVIOS[item.tipo];
      try {
        if (!envio) throw new ErrorRemoto(400, `Tipo de envío desconocido: ${item.tipo}`);
        const respuesta = await envio(item, (n, a) => this.remoto.rpc(n, a));
        await this.almacen.marcarItem(item.id, { estado: "enviado", error: null, payload: null });   // el contenido ya no queda en el teléfono
        await this.trasEnvio(item, respuesta);
        enviados += 1;
        this.alEvento({ tipo: "enviado", item, respuesta });
      } catch (e) {
        if (e instanceof SinConexion) {
          await this.programarReintento(item, e.message);
          return { enviados, cuarentena, detenido: true };
        }
        if (e instanceof ErrorRemoto && e.status === 401) {
          this.sesionExpirada = true;
          this.alEvento({ tipo: "sesion_expirada" });
          return { enviados, cuarentena, detenido: true };
        }
        if (e instanceof ErrorRemoto && TRANSITORIOS.has(e.status)) {
          await this.programarReintento(item, e.message);
          return { enviados, cuarentena, detenido: true };
        }
        // Error de contenido: no se pierde; queda en cuarentena para revisarlo (17.3).
        const mensaje = e instanceof Error ? e.message : String(e);
        await this.almacen.marcarItem(item.id, { estado: "cuarentena", intentos: item.intentos + 1, error: mensaje });
        cuarentena += 1;
        this.alEvento({ tipo: "cuarentena", item, mensaje });
      }
    }
    return { enviados, cuarentena, detenido: false };
  }

  private async programarReintento(item: ItemCola, mensaje: string) {
    const intentos = item.intentos + 1;
    await this.almacen.marcarItem(item.id, {
      estado: "reintento", intentos, error: mensaje,
      siguiente_intento_en: new Date(this.reloj().getTime() + esperaMs(intentos)).toISOString(),
    });
  }

  /** Tras el envío, la copia local queda como sincronizada y con la calidad que decidió el servidor. */
  private async trasEnvio(item: ItemCola, respuesta: unknown) {
    if (item.tipo !== "registrar_visita" && item.tipo !== "registrar_reconocimiento") return;
    const p = (item.payload ?? {}) as Record<string, any>;
    const calidad = (respuesta as { calidad?: string } | null)?.calidad;
    if (p.vivienda?.id) await this.almacen.marcarSincronizado("viviendas", p.vivienda.id, calidad ? { calidad } : undefined);
    if (p.visita?.id) await this.almacen.marcarSincronizado("visitas", p.visita.id, calidad ? { calidad } : undefined);
    if (p.hogar?.id) await this.almacen.marcarSincronizado("hogares", p.hogar.id);
    // En el teléfono solo queda la versión enmascarada; los datos sensibles iban en el contenido de la cola, ya vaciado.
    for (const x of p.personas ?? []) await this.almacen.marcarSincronizado("personas", x.id);
    for (const x of p.necesidades ?? []) await this.almacen.marcarSincronizado("necesidades", x.id);
  }

  // ------------------------------------------------------------ fotos
  private async subirFotos(uid: string): Promise<number> {
    let n = 0;
    const max = param(this.params(), "sync_reintentos_max");
    for (const s of await this.almacen.subidasSiguientes(uid, this.reloj(), 50)) {
      if (s.usuario_id !== uid) continue;
      const base = await this.almacen.obtenerItem(s.outbox_id);
      if (base && base.estado !== "enviado") continue;                    // primero el registro, después la foto
      let estado = s.estado;
      try {
        if (estado !== "subida") {
          await this.remoto.subirFoto(s.ruta, s.archivo);
          estado = "subida";                                             // el archivo ya está arriba: no se vuelve a subir
          await this.almacen.marcarSubida(s.id, { estado, error: null });
        }
        await this.remoto.rpc("rpc_foto_subida", { p_id: s.id });       // se reintenta aparte si falla
        await this.almacen.marcarSubida(s.id, { estado: "marcada" });
        n += 1;
      } catch (e) {
        if (e instanceof SinConexion || (e instanceof ErrorRemoto && TRANSITORIOS.has(e.status))) {
          const intentos = s.intentos + 1;
          await this.almacen.marcarSubida(s.id, {
            estado: estado === "subida" ? "subida" : "reintento", intentos, error: (e as Error).message,
            siguiente_intento_en: new Date(this.reloj().getTime() + esperaMs(intentos)).toISOString(),
          });
          break;
        }
        const intentos = s.intentos + 1;
        await this.almacen.marcarSubida(s.id, { estado: intentos >= max ? "cuarentena" : "reintento", intentos, error: (e as Error).message,
          siguiente_intento_en: new Date(this.reloj().getTime() + esperaMs(intentos)).toISOString() });
      }
    }
    return n;
  }

  // ------------------------------------------------------------ descarga
  async descargar(): Promise<number> {
    let total = 0;
    for (const [remota, local, clave] of TABLAS_DESCARGA) total += await this.descargarTabla(remota, local, clave);
    await this.guardarParametros();
    return total;
  }

  private async descargarTabla(remota: string, local: string, clave: string): Promise<number> {
    const margenMs = param(this.params(), "sync_margen_seg") * 1000;
    const cursor = await this.almacen.getMeta<{ t: string; id: string }>(`cursor:${remota}`);
    // Se relee con margen (24.4): una transacción que se confirmó tarde no queda detrás del cursor.
    let desde = cursor ? new Date(new Date(cursor.t).getTime() - margenMs).toISOString() : null;
    let desdeId: string | null = cursor ? "" : null;
    let total = 0;
    let ultimo = cursor;
    for (;;) {
      const filas = await this.remoto.cambios(remota, clave, desde, desdeId, LOTE);
      if (!filas.length) break;
      for (const f of filas) {
        const id = String(f[clave]);
        if (await this.almacen.estaPendiente(local, id)) continue;          // lo que tengo sin enviar manda
        // A5 y lápidas: lo eliminado o lo que pidió la eliminación se borra del teléfono.
        if (f.eliminado_en || f.estado === "solicito_eliminacion") { await this.almacen.borrar(local, id); continue; }
        await this.almacen.guardar(local, { ...f, id });
      }
      const u = filas[filas.length - 1];
      desde = String(u.actualizado_en);
      desdeId = String(u[clave]);
      if (!ultimo || desde > ultimo.t || (desde === ultimo.t && desdeId > ultimo.id)) ultimo = { t: desde, id: desdeId };
      total += filas.length;
      if (filas.length < LOTE) break;
    }
    if (ultimo) await this.almacen.setMeta(`cursor:${remota}`, ultimo);
    return total;
  }

  private async guardarParametros() {
    const params: Record<string, unknown> = {};
    for (const c of await this.almacen.listar("configuracion")) params[String(c.clave ?? c.id)] = c.valor;
    if (Object.keys(params).length) await this.almacen.setMeta("params", params);
  }
}
