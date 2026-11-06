// Tipos del panel: la forma de las filas que el panel lee (con las reglas por fila del servidor) y de lo que devuelven
// las funciones rpc_*. Los nombres de los campos son los de la base (supabase/migrations).

export type Rol = "admin" | "director" | "colaborador";

export interface PerfilPanel { id: string; nombre: string; rol: Rol; estado: string }

export type Sesion =
  | { fase: "fuera" }
  | { fase: "codigo" }                                          // tiene la aplicación autenticadora: falta el código
  | { fase: "inscribir"; qr: string; secreto: string }          // primera vez: escanear el QR y escribir el código
  | { fase: "sin_permiso"; mensaje: string }
  | { fase: "dentro"; perfil: PerfilPanel; inactividadMin: number };

export interface Colaborador {
  id: string;
  nombre_completo: string;
  celular: string | null;
  correo: string | null;
  rol: Rol;
  estado: string;
  tipo_vinculacion: string | null;
  es_servidor_publico: boolean;
  es_contratista_estado: boolean;
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_celular: string | null;
  curso_aprobado_en: string | null;
  curso_puntaje: number | null;
  acuerdos_aceptados_en: string | null;
  acuerdos_version: string | null;
  motivo_estado: string | null;
  ultimo_acceso: string | null;
  creado_en: string;
}

export interface Invitacion {
  id: string; codigo: string; nombre: string; celular: string | null; correo: string | null;
  rol_destino: string; creado_en: string; expira_en: string; estado: string; usada_en: string | null;
}

export interface DefPermiso {
  codigo: string; nombre: string; descripcion: string | null; riesgo: "bajo" | "medio" | "alto";
  requiere_2fa: boolean; acepta_zonas: boolean;
}

export interface PermisoOtorgado {
  id: string; usuario_id: string; codigo: string; otorgado_por: string | null; otorgado_en: string;
  vence_en: string | null; zonas: string[] | null; motivo: string | null; activo: boolean;
}

export interface Plantilla { nombre: string; codigos: string[]; limitar_a_zona: boolean }
export interface Zona { id: string; nombre: string; tipo: string }

export interface FilaAuditoria {
  id: number; seq: number | null; creado_en: string; usuario_id: string | null; actor_rol: string | null;
  accion: string; entidad: string; entidad_id: string | null; detalle: Record<string, unknown>;
  ip?: string | null; hash?: string | null; usuario?: string | null;
}
export interface FiltrosAuditoria { desde?: string; hasta?: string; usuario?: string; accion?: string; registro?: string }

export interface ValorConfig { clave: string; valor: unknown; descripcion: string | null; actualizado_en: string }
export interface OpcionCatalogo { id: number; catalogo: string; clave: string; etiqueta: string; orden: number; activo: boolean }
export interface TextoLegal {
  id: string; tipo: string; version: string; contenido: string; vigente: boolean; es_borrador: boolean; creado_en: string;
}

export interface Solicitud {
  id: string; persona_id: string | null; nombre_solicitante: string | null; contacto: string | null; tipo: string;
  detalle: string | null; canal: string | null; registrado_por: string | null; recibido_en: string;
  plazo_interno: string | null; plazo_legal: string | null; estado: string; respuesta: string | null; resuelta_en: string | null;
}

export interface Dispositivo {
  id: string; usuario_id: string; modelo: string | null; plataforma: string | null; version_app: string | null;
  ultimo_acceso: string; activo: boolean; reportado_perdido_en: string | null; cola_pendiente: number | null;
  ultima_sincronizacion: string | null; espacio_libre_mb: number | null; bateria_pct: number | null;
}

export interface PuntoMapa { id: string; lat: number; lng: number; estado: string; zona_id: string | null }

export interface Resumen {
  pendientes: number; activos: number; invitacionesVigentes: number;
  titularesPendientes: number; titularesVencidos: number; alertasAbiertas: number;
}

export interface Salud {
  generado_en: string;
  usuarios: { activos: number; pendientes: number; aprobados_sin_ingreso: number; suspendidos: number; usaron_app_7_dias: number };
  errores: { ultimo_dia: number; ultima_semana: number; recientes: { creado_en: string; version_app: string | null; pantalla: string | null; mensaje: string }[] };
  sincronizacion: { registros_por_enviar: number; telefonos_atrasados: number };
  recursos: { base_mb: number; base_pct: number; archivos_mb: number; archivos_pct: number; alerta: boolean; errores_ultimo_dia: number; dispositivos_con_cola: number };
  seguridad: { registros_fallidos_24h: number; formularios_publicos_24h: number; alertas_abiertas: Record<string, number>;
               exportaciones_7_dias: number; accesos_completos_24h: number };
  respaldo: { en: string; mb: number | null; archivos: number | null; equipo: string | null } | null;
  versiones: { version: string; telefonos: number }[];
  version_minima: string | null;
  titulares: { pendientes: number; vencidas_plazo_interno: number; vencidas_plazo_legal: number };
  perdidos: { id: string; usuario: string; modelo: string | null; reportado_perdido_en: string; ultimo_acceso: string; se_conecto_despues: boolean }[];
  flota: { id: string; usuario: string; modelo: string | null; version_app: string | null; ultimo_acceso: string; cola_pendiente: number | null;
           ultima_sincronizacion: string | null; espacio_libre_mb: number | null; bateria_pct: number | null }[];
  auditoria_24h: number;
}

export interface Fuente {
  readonly modo: "real" | "demo";
  // sesión (17.5: la misma cuenta del teléfono y siempre con verificación en dos pasos)
  estado(): Promise<Sesion>;
  entrar(correo: string, clave: string): Promise<Sesion>;
  verificarCodigo(codigo: string): Promise<Sesion>;
  salir(): Promise<void>;
  // resumen e inicio
  resumen(): Promise<Resumen>;
  // P-36 colaboradores
  colaboradores(): Promise<Colaborador[]>;
  invitaciones(): Promise<Invitacion[]>;
  invitar(nombre: string, celular: string | null, correo: string | null, rol: string): Promise<{ codigo: string; expira_en: string }>;
  aprobar(id: string): Promise<void>;
  rechazar(id: string, motivo: string): Promise<void>;
  suspender(id: string, motivo: string): Promise<void>;
  reactivar(id: string): Promise<void>;
  darDeBaja(id: string, motivo: string): Promise<void>;
  designarDirector(id: string): Promise<void>;
  dispositivosDe(id: string): Promise<Dispositivo[]>;
  reportarPerdido(dispositivoId: string): Promise<void>;
  // P-37 permisos
  catalogoPermisos(): Promise<DefPermiso[]>;
  permisosDe(id: string): Promise<PermisoOtorgado[]>;
  plantillas(): Promise<Plantilla[]>;
  zonas(): Promise<Zona[]>;
  fijarPermiso(usuario: string, codigo: string, activo: boolean, vence: string | null, zonas: string[] | null, motivo: string | null): Promise<void>;
  aplicarPlantilla(usuario: string, nombre: string, vence: string | null, zonas: string[] | null): Promise<void>;
  // P-41 auditoría
  auditoria(f: FiltrosAuditoria, pagina: number, tecnica: boolean): Promise<{ filas: FilaAuditoria[]; hayMas: boolean }>;
  exportarAuditoria(f: FiltrosAuditoria, motivo: string): Promise<FilaAuditoria[]>;
  verificarCadena(): Promise<{ integra: boolean; revisados: number; primer_id_roto?: number }>;
  // P-42 configuración
  configuracion(): Promise<ValorConfig[]>;
  guardarConfig(clave: string, valor: unknown): Promise<void>;
  catalogos(): Promise<OpcionCatalogo[]>;
  guardarOpcion(catalogo: string, clave: string, etiqueta: string, orden: number, activo: boolean): Promise<void>;
  textos(): Promise<TextoLegal[]>;
  publicarTexto(tipo: string, version: string, contenido: string, aprobado: boolean): Promise<void>;
  guardarPlantilla(nombre: string, codigos: string[], limitarAZona: boolean): Promise<void>;
  eliminarPlantilla(nombre: string): Promise<void>;
  // P-43 salud
  salud(): Promise<Salud>;
  latenciaMs(): Promise<number>;
  // P-35 titulares
  solicitudes(): Promise<Solicitud[]>;
  resolverSolicitud(id: string, estado: string, respuesta: string): Promise<void>;
  // mapa del avance
  puntosMapa(): Promise<PuntoMapa[]>;
}
