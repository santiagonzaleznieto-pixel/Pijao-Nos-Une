// Fuente real: Supabase con la clave pública. Lo que el panel puede ver y hacer lo deciden las reglas por fila
// y las funciones rpc_* del servidor (0005, 0007, 0013, 0014); aquí no hay ninguna regla de seguridad propia.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../../config";
import { mensajeDeError } from "../../logica/utiles";
import type {
  AvisoPanel, MetricasPiloto, CasaPanel, Colaborador, DefPermiso, Dispositivo, FilaAuditoria, FiltrosAuditoria, Fuente, Invitacion, OpcionCatalogo, PerfilPanel,
  PermisoOtorgado, Plantilla, PuntoMapa, Resumen, Salud, Sesion, Solicitud, TextoLegal, ValorConfig, Zona,
} from "./tipos";

export class ErrorPanel extends Error {}

const POR_PAGINA = 50;

export class FuenteSupabase implements Fuente {
  readonly modo = "real" as const;
  private sb: SupabaseClient;
  private inscripcion: { factorId: string; qr: string; secreto: string } | null = null;

  constructor() {
    this.sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // La sesión del panel vive solo en esta pestaña: al cerrarla, hay que volver a entrar (computadores compartidos).
        storage: window.sessionStorage,
        storageKey: "pijao-panel",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }

  // ------------------------------------------------------------------------------------------- utilidades

  private async rpc<T>(funcion: string, args: Record<string, unknown> = {}): Promise<T> {
    const { data, error } = await this.sb.rpc(funcion, args);
    if (error) throw new ErrorPanel(mensajeDeError(error));
    return data as T;
  }

  private async leer<T>(consulta: PromiseLike<{ data: unknown; error: unknown }>): Promise<T> {
    const { data, error } = await consulta;
    if (error) throw new ErrorPanel(mensajeDeError(error));
    return (data ?? []) as T;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async contar(tabla: string, filtro: (q: any) => PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
    const { count, error } = await filtro(this.sb.from(tabla).select("*", { count: "exact", head: true }));
    if (error) throw new ErrorPanel(mensajeDeError(error));
    return count ?? 0;
  }

  // ------------------------------------------------------------------------------------------- sesión

  async estado(): Promise<Sesion> {
    const { data: s } = await this.sb.auth.getSession();
    if (!s.session) return { fase: "fuera" };
    const { data: nivel, error } = await this.sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw new ErrorPanel(mensajeDeError(error));
    if (nivel.currentLevel !== "aal2") {
      const { data: f, error: e2 } = await this.sb.auth.mfa.listFactors();
      if (e2) throw new ErrorPanel(mensajeDeError(e2));
      if (f.totp.length > 0) return { fase: "codigo" };
      if (!this.inscripcion) {
        // Quedan factores a medio inscribir de un intento anterior: se quitan para poder empezar de nuevo.
        for (const viejo of f.all.filter((x) => x.status === "unverified")) await this.sb.auth.mfa.unenroll({ factorId: viejo.id });
        const { data: nuevo, error: e3 } = await this.sb.auth.mfa.enroll({
          factorType: "totp", friendlyName: `Panel ${new Date().toISOString().slice(0, 16)}`,
        });
        if (e3) throw new ErrorPanel(mensajeDeError(e3));
        this.inscripcion = { factorId: nuevo.id, qr: nuevo.totp.qr_code, secreto: nuevo.totp.secret };
      }
      return { fase: "inscribir", qr: this.inscripcion.qr, secreto: this.inscripcion.secreto };
    }
    const p = await this.rpc<Record<string, unknown>>("rpc_mi_perfil");
    const perfil: PerfilPanel = { id: String(p.id), nombre: String(p.nombre ?? ""), rol: p.rol as PerfilPanel["rol"], estado: String(p.estado) };
    if (!p.existe || (perfil.rol !== "admin" && perfil.rol !== "director") || perfil.estado !== "activo") {
      await this.sb.auth.signOut();
      return { fase: "sin_permiso", mensaje: "Este panel es solo para el Director y el Administrador. Los colaboradores usan la app del teléfono." };
    }
    let inactividadMin = 15;
    const { data: cfg } = await this.sb.from("configuracion").select("valor").eq("clave", "panel_inactividad_min").maybeSingle();
    if (cfg && typeof cfg.valor === "number" && cfg.valor > 0) inactividadMin = cfg.valor;
    return { fase: "dentro", perfil, inactividadMin };
  }

  async entrar(correo: string, clave: string): Promise<Sesion> {
    this.inscripcion = null;
    const { error } = await this.sb.auth.signInWithPassword({ email: correo.trim(), password: clave });
    if (error) throw new ErrorPanel(mensajeDeError(error));
    return this.estado();
  }

  async verificarCodigo(codigo: string): Promise<Sesion> {
    let factorId = this.inscripcion?.factorId;
    if (!factorId) {
      const { data: f, error } = await this.sb.auth.mfa.listFactors();
      if (error) throw new ErrorPanel(mensajeDeError(error));
      factorId = f.totp[0]?.id;
    }
    if (!factorId) throw new ErrorPanel("No hay una aplicación autenticadora inscrita. Vuelva a entrar.");
    const { error } = await this.sb.auth.mfa.challengeAndVerify({ factorId, code: codigo.replace(/\s/g, "") });
    if (error) throw new ErrorPanel(mensajeDeError(error));
    this.inscripcion = null;
    return this.estado();
  }

  async salir(): Promise<void> {
    this.inscripcion = null;
    await this.sb.auth.signOut();
  }

  // ------------------------------------------------------------------------------------------- inicio

  async resumen(): Promise<Resumen> {
    const hoy = new Date().toISOString().slice(0, 10);
    const [pendientes, activos, invitacionesVigentes, titularesPendientes, titularesVencidos, alertasAbiertas] = await Promise.all([
      this.contar("perfiles", (q) => q.eq("estado", "pendiente")),
      this.contar("perfiles", (q) => q.eq("estado", "activo")),
      this.contar("invitaciones", (q) => q.eq("estado", "pendiente").gt("expira_en", new Date().toISOString())),
      this.contar("solicitudes_titulares", (q) => q.in("estado", ["recibida", "en_proceso"])),
      this.contar("solicitudes_titulares", (q) => q.in("estado", ["recibida", "en_proceso"]).lt("plazo_interno", hoy)),
      this.contar("alertas_calidad", (q) => q.is("resuelta_en", null)),
    ]);
    return { pendientes, activos, invitacionesVigentes, titularesPendientes, titularesVencidos, alertasAbiertas };
  }
  avisos() { return this.rpc<AvisoPanel[]>("rpc_mis_avisos"); }
  async avisoLeido(id: string) { await this.rpc("rpc_aviso_leido", { p_id: id }); }
  metricasPiloto(desde: string | null, hasta: string | null) {
    return this.rpc<MetricasPiloto>("rpc_metricas_piloto", { p_desde: desde, p_hasta: hasta });
  }

  // ------------------------------------------------------------------------------------------- P-36

  colaboradores() {
    return this.leer<Colaborador[]>(this.sb.from("perfiles").select(
      "id,nombre_completo,celular,correo,rol,estado,tipo_vinculacion,es_servidor_publico,es_contratista_estado," +
      "contacto_emergencia_nombre,contacto_emergencia_celular,curso_aprobado_en,curso_puntaje,acuerdos_aceptados_en," +
      "acuerdos_version,motivo_estado,ultimo_acceso,creado_en").order("nombre_completo"));
  }
  invitaciones() {
    return this.leer<Invitacion[]>(this.sb.from("invitaciones")
      .select("id,codigo,nombre,celular,correo,rol_destino,creado_en,expira_en,estado,usada_en")
      .order("creado_en", { ascending: false }).limit(200));
  }
  async invitar(nombre: string, celular: string | null, correo: string | null, rol: string) {
    return this.rpc<{ codigo: string; expira_en: string }>("rpc_invitar", { p_nombre: nombre, p_celular: celular, p_correo: correo, p_rol: rol });
  }
  async aprobar(id: string) { await this.rpc("rpc_aprobar_usuario", { p_id: id }); }
  async rechazar(id: string, motivo: string) { await this.rpc("rpc_rechazar_usuario", { p_id: id, p_motivo: motivo }); }
  async suspender(id: string, motivo: string) { await this.rpc("rpc_suspender_usuario", { p_id: id, p_motivo: motivo }); }
  async reactivar(id: string) { await this.rpc("rpc_reactivar_usuario", { p_id: id }); }
  async darDeBaja(id: string, motivo: string) { await this.rpc("rpc_baja_usuario", { p_id: id, p_motivo: motivo }); }
  async designarDirector(id: string) { await this.rpc("rpc_designar_director", { p_id: id }); }
  dispositivosDe(id: string) {
    return this.leer<Dispositivo[]>(this.sb.from("dispositivos")
      .select("id,usuario_id,modelo,plataforma,version_app,ultimo_acceso,activo,reportado_perdido_en,cola_pendiente,ultima_sincronizacion,espacio_libre_mb,bateria_pct")
      .eq("usuario_id", id).order("ultimo_acceso", { ascending: false }));
  }
  async reportarPerdido(dispositivoId: string) { await this.rpc("rpc_reportar_perdido", { p_dispositivo: dispositivoId }); }

  // ------------------------------------------------------------------------------------------- P-37

  catalogoPermisos() { return this.leer<DefPermiso[]>(this.sb.from("permisos_catalogo").select("*").order("codigo")); }
  permisosDe(id: string) {
    return this.leer<PermisoOtorgado[]>(this.sb.from("permisos_opcionales").select("*").eq("usuario_id", id).eq("activo", true));
  }
  plantillas() { return this.leer<Plantilla[]>(this.sb.from("plantillas_permisos").select("*").order("nombre")); }
  zonas() { return this.leer<Zona[]>(this.sb.from("zonas").select("id,nombre,tipo").eq("activo", true).order("nombre")); }
  async fijarPermiso(usuario: string, codigo: string, activo: boolean, vence: string | null, zonas: string[] | null, motivo: string | null) {
    await this.rpc("rpc_set_permiso", { p_usuario: usuario, p_codigo: codigo, p_activo: activo, p_vence: vence, p_zonas: zonas, p_motivo: motivo });
  }
  async aplicarPlantilla(usuario: string, nombre: string, vence: string | null, zonas: string[] | null) {
    await this.rpc("rpc_aplicar_plantilla", { p_usuario: usuario, p_nombre: nombre, p_vence: vence, p_zonas: zonas });
  }

  // ------------------------------------------------------------------------------------------- P-41

  async auditoria(f: FiltrosAuditoria, pagina: number, tecnica: boolean) {
    let q = this.sb.from("auditoria")
      .select(`id,seq,creado_en,usuario_id,actor_rol,accion,entidad,entidad_id,detalle${tecnica ? ",ip,hash" : ""}`)
      .order("id", { ascending: false })
      .range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA);   // uno de más para saber si hay otra página
    if (f.desde) q = q.gte("creado_en", `${f.desde}T00:00:00-05:00`);
    if (f.hasta) q = q.lte("creado_en", `${f.hasta}T23:59:59.999-05:00`);
    if (f.usuario) q = q.eq("usuario_id", f.usuario);
    if (f.accion) q = q.eq("accion", f.accion);
    if (f.registro) q = q.eq("entidad_id", f.registro.trim());
    const filas = await this.leer<FilaAuditoria[]>(q);
    return { filas: filas.slice(0, POR_PAGINA), hayMas: filas.length > POR_PAGINA };
  }
  async exportarAuditoria(f: FiltrosAuditoria, motivo: string) {
    const r = await this.rpc<{ filas: FilaAuditoria[] }>("rpc_auditoria_exportar", {
      p_motivo: motivo,
      p_desde: f.desde ? `${f.desde}T00:00:00-05:00` : null,
      p_hasta: f.hasta ? `${f.hasta}T23:59:59.999-05:00` : null,
      p_usuario: f.usuario || null, p_accion: f.accion || null, p_entidad_id: f.registro?.trim() || null,
    });
    return r.filas;
  }
  verificarCadena() { return this.rpc<{ integra: boolean; revisados: number; primer_id_roto?: number }>("rpc_verificar_auditoria"); }

  // ------------------------------------------------------------------------------------------- P-42

  configuracion() {
    return this.leer<ValorConfig[]>(this.sb.from("configuracion").select("clave,valor,descripcion,actualizado_en").order("clave"));
  }
  async guardarConfig(clave: string, valor: unknown) { await this.rpc("rpc_config_guardar", { p_clave: clave, p_valor: valor }); }
  catalogos() {
    return this.leer<OpcionCatalogo[]>(this.sb.from("catalogos").select("id,catalogo,clave,etiqueta,orden,activo")
      .order("catalogo").order("orden"));
  }
  async guardarOpcion(catalogo: string, clave: string, etiqueta: string, orden: number, activo: boolean) {
    await this.rpc("rpc_catalogo_guardar", { p_catalogo: catalogo, p_clave: clave, p_etiqueta: etiqueta, p_orden: orden, p_activo: activo });
  }
  textos() {
    return this.leer<TextoLegal[]>(this.sb.from("textos_legales").select("id,tipo,version,contenido,vigente,es_borrador,creado_en")
      .order("creado_en", { ascending: false }));
  }
  async publicarTexto(tipo: string, version: string, contenido: string, aprobado: boolean) {
    await this.rpc("rpc_texto_legal_publicar", { p_tipo: tipo, p_version: version, p_contenido: contenido, p_aprobado_abogado: aprobado });
  }
  async guardarPlantilla(nombre: string, codigos: string[], limitarAZona: boolean) {
    await this.rpc("rpc_plantilla_guardar", { p_nombre: nombre, p_codigos: codigos, p_limitar_a_zona: limitarAZona });
  }
  async eliminarPlantilla(nombre: string) { await this.rpc("rpc_plantilla_eliminar", { p_nombre: nombre }); }

  // ------------------------------------------------------------------------------------------- P-43

  salud() { return this.rpc<Salud>("rpc_salud_sistema"); }
  async latenciaMs() {
    const t0 = performance.now();
    await this.rpc("ping");
    return Math.round(performance.now() - t0);
  }

  // ------------------------------------------------------------------------------------------- P-35

  solicitudes() {
    return this.leer<Solicitud[]>(this.sb.from("solicitudes_titulares").select("*").order("recibido_en", { ascending: false }).limit(500));
  }
  async resolverSolicitud(id: string, estado: string, respuesta: string) {
    await this.rpc("rpc_resolver_titular", { p_id: id, p_estado: estado, p_respuesta: respuesta });
  }

  // ------------------------------------------------------------------------------------------- mapa

  async casa(id: string): Promise<CasaPanel | null> {
    const de = (tabla: string) => this.leer<Record<string, unknown>[]>(this.sb.from(tabla).select("*").eq("vivienda_id", id).is("eliminado_en", null));
    const [viv, hogares, personas, visitas, necesidades, fotos] = await Promise.all([
      this.leer<Record<string, unknown>[]>(this.sb.from("viviendas").select("*").eq("id", id).limit(1)),
      de("hogares"), de("personas_v"), de("visitas"), de("necesidades"), de("fotos"),
    ]);
    if (!viv.length) return null;
    // Solo fachada, entorno y problema: la foto de la autorización en papel tiene firma y datos personales.
    const visibles = fotos.filter((f) => ["fachada", "entorno", "problema"].includes(String(f.tipo)) && f.subida !== false);
    let urls: Record<string, string | null> = {};
    if (visibles.length) {
      const { data } = await this.sb.storage.from("fotos").createSignedUrls(visibles.map((f) => String(f.storage_path)), 600);
      urls = Object.fromEntries((data ?? []).map((u) => [u.path ?? "", u.error ? null : u.signedUrl]));
    }
    return {
      datos: { vivienda: viv[0], hogares, personas, visitas, necesidades, fotos },
      fotos: visibles.map((f) => ({ id: String(f.id), tipo: String(f.tipo), url: urls[String(f.storage_path)] ?? null })),
    };
  }

  async puntosMapa() {
    // Supabase entrega máximo 1.000 filas por consulta: se pide por tramos (Pijao tiene unas pocas miles de viviendas).
    const todos: PuntoMapa[] = [];
    for (let desde = 0; desde < 20000; desde += 1000) {
      const tramo = await this.leer<PuntoMapa[]>(this.sb.from("viviendas").select("id,lat,lng,estado,zona_id")
        .order("id").range(desde, desde + 999));
      todos.push(...tramo);
      if (tramo.length < 1000) break;
    }
    return todos;
  }
}
