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

import type { DatosCasa } from "@nucleo/ficha";

/** Todo lo de una vivienda (P-10 y P-13) y enlaces temporales a sus fotos visibles. */
export interface CasaPanel { datos: DatosCasa; fotos: { id: string; tipo: string; url: string | null }[] }

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

// 4.10 y 4.5: avisos de la cuenta (revisión mensual de permisos, teléfono nuevo, contraseña cambiada).
export interface AvisoPanel { id: string; tipo: string; mensaje: string; creado_en: string }

// 22.3: tablero del piloto. Solo totales, medianas y porcentajes; nunca quién envió cada métrica.
export interface MetricasPiloto {
  desde: string; hasta: string; colaboradores: number;
  registros: { total: number; mediana_seg: number | null; p90_seg: number | null; pct_bajo_90_seg: number | null;
               por_tipo: { tipo: string; total: number; mediana_seg: number | null; pct_bajo_90_seg: number | null }[] };
  calidad: { verde: number; amarillo: number; rojo: number };
  sin_senal: { registros: number; pct: number | null };
  gps: { lecturas: number; mediana_precision_m: number | null; errores: Record<string, number> };
  envios: { errores: Record<string, number>; en_revision: number; colas_atrasadas: number };
  por_dia: { dia: string; registros: number; mediana_seg: number | null; gps_errores: number; envio_errores: number }[];
}

// ----------------------------------------------------------------------------- Fase 3 (solo el equipo)
export interface JornadaActiva { id: string; usuario_id: string; nombre: string; celular: string | null; inicio: string; lat: number | null; lng: number | null; visto_en: string | null }
export interface AlertaSos { id: string; nombre: string; celular: string | null; emergencia: string | null; emergencia_celular: string | null; lat: number | null; lng: number | null; nota: string | null; creada_en: string; atendida_en: string | null }
export interface Seguridad { jornadas: JornadaActiva[]; sos: AlertaSos[] }
export interface IncidentePanel { id: string; tipo: string; descripcion: string; lat: number | null; lng: number | null; estado: "abierto" | "en_revision" | "resuelto"; resolucion: string | null; creado_en: string }
export interface NecesidadPanel { id: string; tema: string | null; texto: string | null; alcance: string | null; estado: string; prioridad: number | null; desea_respuesta: boolean; creado_en: string }
export interface AlertaCalidadPanel { id: string; tipo: string; severidad: "baja" | "media" | "alta"; detalle: Record<string, unknown>; creada_en: string; resuelta_en: string | null; resolucion: string | null }
export interface CumpleaneroPanel { id: string; nombre: string; edad: number | null; contactable: boolean }

export interface Fuente {
  readonly modo: "real" | "demo";
  // sesión (17.5: la misma cuenta del teléfono y siempre con verificación en dos pasos)
  estado(): Promise<Sesion>;
  entrar(correo: string, clave: string): Promise<Sesion>;
  verificarCodigo(codigo: string): Promise<Sesion>;
  salir(): Promise<void>;
  // resumen e inicio
  resumen(): Promise<Resumen>;
  avisos(): Promise<AvisoPanel[]>;
  avisoLeido(id: string): Promise<void>;
  // 22.3 métricas del piloto (Director y Administrador)
  metricasPiloto(desde: string | null, hasta: string | null): Promise<MetricasPiloto>;
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
  casa(id: string): Promise<CasaPanel | null>;
  // Fase 3: seguridad en terreno, incidentes, necesidades, calidad y cumpleaños
  seguridad(): Promise<Seguridad>;
  atenderSos(id: string): Promise<void>;
  incidentes(): Promise<IncidentePanel[]>;
  estadoIncidente(id: string, estado: string, resolucion: string): Promise<void>;
  necesidades(): Promise<NecesidadPanel[]>;
  estadoNecesidad(id: string, estado: string): Promise<void>;
  alertasCalidad(): Promise<AlertaCalidadPanel[]>;
  resolverAlerta(id: string, resolucion: string): Promise<void>;
  cumpleanerosHoy(): Promise<CumpleaneroPanel[]>;
}
