// Roles y permisos (sección 4). Tres tipos de cuenta; el colaborador es el único rol de trabajo y sus funciones
// extra son los permisos opcionales O-01 a O-22. La app solo decide QUÉ MOSTRAR: el servidor vuelve a validar todo.
import { parseIso } from "./reglas";

export type Riesgo = "bajo" | "medio" | "alto";
export interface PermisoDef { codigo: string; nombre: string; descripcion: string; riesgo: Riesgo; aceptaZonas: boolean }

const p = (codigo: string, nombre: string, descripcion: string, riesgo: Riesgo, aceptaZonas = false): PermisoDef =>
  ({ codigo, nombre, descripcion, riesgo, aceptaZonas });

export const PERMISOS: Record<string, PermisoDef> = Object.fromEntries([
  p("O-01", "Ver datos personales completos", "Cédula, fecha de nacimiento, teléfono y correo completos", "alto", true),
  p("O-02", "Ver simpatía individual [SENSIBLE]", "Ver el nivel de simpatía declarado de cada persona", "alto", true),
  p("O-03", "Ver estadísticas avanzadas", "Rendimiento por colaborador, comparativos, embudo, tendencias", "medio", true),
  p("O-04", "Ver mapas de calor", "Mapas de simpatía agregada y de necesidades", "medio", true),
  p("O-05", "Exportar listas", "Descargar listas con marca de agua, motivo y registro", "alto"),
  p("O-06", "Editar registros de otros", "Corregir registros de otro colaborador", "medio", true),
  p("O-07", "Verificar registros", "Marcar registros como verificados y resolver alertas de calidad", "medio", true),
  p("O-08", "Aprobar cuentas", "Aprobar solicitudes de nuevos colaboradores y voluntarios", "medio"),
  p("O-09", "Crear y asignar tareas", "Crear tareas y asignarlas a otros", "bajo", true),
  p("O-10", "Crear eventos y tomar asistencia", "Convocar eventos y registrar quién asistió", "bajo", true),
  p("O-11", "Publicar anuncios", "Escribir anuncios para el equipo", "bajo"),
  p("O-12", "Enviar mensajes a ciudadanos", "Mensajes a contactos con autorización vigente para ese canal", "alto"),
  p("O-13", "Importar datos", "Cargar archivos con personas o viviendas, con fuente documentada", "alto"),
  p("O-14", "Gestionar zonas", "Dibujar, editar y asignar zonas", "medio", true),
  p("O-15", "Ver finanzas", "Ver ingresos, gastos y presupuesto (solo lectura)", "medio"),
  p("O-16", "Registrar aportes y gastos", "Cargar aportes y gastos con soportes", "alto"),
  p("O-17", "Gestionar propaganda", "Inventario de vallas, pendones y volantes", "bajo"),
  p("O-18", "Operar Día de elecciones", "Testigos, actas, incidentes y conteo paralelo", "medio"),
  p("O-19", "Gestionar necesidades y propuestas", "Clasificar necesidades y vincularlas a los ejes", "bajo"),
  p("O-20", "Fusionar duplicados", "Unir viviendas o personas repetidas", "medio"),
  p("O-21", "Ver la ubicación en vivo del equipo", "Ver dónde están los compañeros durante la jornada", "medio"),
  p("O-22", "Crear encuestas internas", "Armar sondeos de campo", "bajo"),
].map((d) => [d.codigo, d]));

export const requiere2fa = (codigo: string) => PERMISOS[codigo]?.riesgo === "alto";

export const PLANTILLAS: Record<string, { permisos: string[]; limitarAZona: boolean }> = {
  "Colaborador de campo (estándar)": { permisos: [], limitarAZona: false },
  "Colaborador con estadísticas": { permisos: ["O-03", "O-04"], limitarAZona: false },
  "Líder de zona": { permisos: ["O-03", "O-04", "O-09", "O-10", "O-14"], limitarAZona: true },
  "Colaborador de comunicaciones": { permisos: ["O-11", "O-12", "O-17", "O-22"], limitarAZona: false },
  "Colaborador de finanzas": { permisos: ["O-15", "O-16"], limitarAZona: false },
  "Colaborador de Día de elecciones": { permisos: ["O-18", "O-21"], limitarAZona: false },
  "Verificador de calidad": { permisos: ["O-07", "O-20"], limitarAZona: false },
};

// M3: un permiso de riesgo alto siempre vence (por defecto en 30 días y nunca después de 90).
export const DIAS_ALTO_DEFECTO = 30;
export const DIAS_ALTO_MAXIMO = 90;
export function diasPara(codigos: string[], dias: number | null | undefined): number | null {
  if (codigos.some((c) => PERMISOS[c]?.riesgo === "alto")) return Math.min(dias || DIAS_ALTO_DEFECTO, DIAS_ALTO_MAXIMO);
  return dias ?? null;
}

export type Rol = "admin" | "director" | "colaborador";
export type EstadoCuenta = "pendiente" | "aprobado" | "activo" | "suspendido" | "baja";
export interface PermisoActivo { zonas: string[] | null; vence_en: string | null }

export interface PerfilDatos {
  id: string; nombre: string; rol: Rol; estado: EstadoCuenta; permisos: Record<string, PermisoActivo>;
  zonas: string[]; aal: "aal1" | "aal2"; curso_aprobado: boolean; acuerdos_ok: boolean;
  /** R-45 (0016): false si hay que volver a aceptar. Sin el dato (servidor o perfil guardado antiguos) no se exige. */
  acuerdos_vigentes?: boolean;
  acuerdos_version?: string | null;
  motivo_estado?: string | null;
  suspension_automatica?: boolean;
  sesion_horas?: number;
}

/** Convierte la respuesta de rpc_mi_perfil. */
export function perfilDesdeRpc(d: Record<string, unknown> | null | undefined): PerfilDatos {
  const permisos: Record<string, PermisoActivo> = {};
  for (const x of (d?.permisos as { codigo: string; zonas: string[] | null; vence_en: string | null }[] | undefined) ?? []) {
    permisos[x.codigo] = { zonas: x.zonas ?? null, vence_en: x.vence_en ?? null };
  }
  return {
    id: String(d?.id ?? ""), nombre: String(d?.nombre ?? ""), rol: (d?.rol as Rol) ?? "colaborador",
    estado: (d?.estado as EstadoCuenta) ?? "pendiente", permisos, zonas: (d?.zonas as string[]) ?? [],
    aal: d?.aal === "aal2" ? "aal2" : "aal1", curso_aprobado: Boolean(d?.curso_aprobado), acuerdos_ok: Boolean(d?.acuerdos_ok),
    ...(typeof d?.acuerdos_vigentes === "boolean" ? { acuerdos_vigentes: d.acuerdos_vigentes } : {}),
    ...(d && "acuerdos_version" in d ? { acuerdos_version: (d.acuerdos_version as string | null) ?? null } : {}),
    ...(d?.motivo_estado ? { motivo_estado: String(d.motivo_estado) } : {}),
    ...(d?.suspension_automatica ? { suspension_automatica: true } : {}),
    ...(typeof d?.sesion_horas === "number" ? { sesion_horas: d.sesion_horas } : {}),
  };
}

export class Perfil {
  constructor(readonly d: PerfilDatos) {}
  get activo() { return this.d.estado === "activo"; }
  get esAdmin() { return this.d.rol === "admin" && this.activo; }
  get esDirector() { return this.d.rol === "director" && this.activo; }
  get esStaff() { return this.esAdmin || this.esDirector; }

  /** Igual que tiene_permiso() del servidor (0013): los de riesgo alto exigen verificación en dos pasos, también al personal. */
  tiene(codigo: string, zonaId: string | null = null, ahora: Date = new Date()): boolean {
    if (!this.activo) return false;
    if (this.esStaff) return !requiere2fa(codigo) || this.d.aal === "aal2";
    const x = this.d.permisos[codigo];
    if (!x) return false;
    const vence = parseIso(x.vence_en);
    if (vence && vence <= ahora) return false;
    if (requiere2fa(codigo) && this.d.aal !== "aal2") return false;
    if (x.zonas === null) return true;
    return zonaId !== null && x.zonas.includes(zonaId);
  }

  /** Funciones de la interfaz y quién las ve (matriz 4.8). */
  puede(accion: string): boolean {
    if (!this.activo) return false;
    const reglas: Record<string, () => boolean> = {
      ver_equipo: () => this.esStaff || this.tiene("O-08"),
      gestionar_permisos: () => this.esStaff,
      invitar: () => this.esStaff || this.tiene("O-08"),
      aprobar_cuentas: () => this.esStaff || this.tiene("O-08"),
      suspender: () => this.esStaff,
      designar_director: () => this.esAdmin,
      ver_calidad: () => this.esStaff || this.tiene("O-07"),
      crear_tareas: () => this.esStaff || this.tiene("O-09"),
      crear_anuncios: () => this.esStaff || this.tiene("O-11"),
      ver_estadisticas_avanzadas: () => this.tiene("O-03"),
      ver_mapas_calor: () => this.tiene("O-04"),
      ver_ubicacion_equipo: () => this.tiene("O-21"),
      ver_titulares: () => this.esStaff,
      ver_auditoria: () => this.esStaff,
      configurar_sistema: () => this.esAdmin,
      exportar: () => this.tiene("O-05"),
      editar_de_otros: () => this.esStaff || this.tiene("O-06"),
    };
    return reglas[accion]?.() ?? false;
  }

  /** R-22: el autor edita 72 horas; Director, Administrador y O-06 siempre. */
  puedeEditar(autorId: string | null, dentroDeVentana: boolean, zonaId: string | null = null): boolean {
    if (this.esStaff || this.tiene("O-06", zonaId)) return true;
    return autorId === this.d.id && dentroDeVentana;
  }
}
