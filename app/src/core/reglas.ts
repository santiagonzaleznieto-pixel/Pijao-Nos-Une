// Reglas de negocio (19.2) y valores de control (19.1). Los valores reales los fija el Administrador en la tabla
// `configuracion` (P-42) y la app los descarga al sincronizar; estos son los iniciales y el respaldo sin conexión.
// Desde la Fase 1 ningún valor queda fijo en las pantallas: todas leen `param()` (24.2).
import { ESTADO_POR_RESULTADO, RESULTADOS_CON_CONTACTO } from "./catalogos";
import { haversineM } from "./geo";

export const PARAMS_POR_DEFECTO = {
  radio_duplicados_m: 15,
  distancia_max_registro_m: 50,
  precision_min_m: 20,
  ubicacion_manual_max_m: 100,
  ajuste_pin_max_m: 30,
  ventana_edicion_h: 72,
  fotos_max_visita: 6,
  foto_lado_max_px: 1024,          // costo cero: 1 GB gratuito de Supabase (docs/Analisis-Costo-Cero.md)
  foto_peso_objetivo_kb: 100,
  invitacion_horas: 72,
  sesion_colaborador_dias: 14,
  sesion_director_dias: 7,
  sesion_admin_horas: 12,
  inactividad_suspension_dias: 30,
  max_dispositivos: 2,
  intentos_fallidos: 5,
  bloqueo_min: 15,
  bloqueo_inactividad_min: 2,
  grupo_minimo: 5,
  verificacion_porcentaje: 5,
  retencion_ubicacion_dias: 7,
  papelera_dias: 30,
  mensajes_hora_ini: 8,
  mensajes_hora_fin: 20,
  silencio_ini: 21,
  silencio_fin: 6,
  alertas_tope: [70, 85, 95, 100],
  curso_minimo: 80,
  certificado_meses: 6,
  titulares_plazo_interno_dias: 5,
  ritmo_sospechoso_seg: 90,
  velocidad_max_ms: 15,
  gps_muestreo_seg: 9,
  jornada_intervalo_seg: 30,
  centro_lat: 4.3333,
  centro_lng: -75.7,
  radio_municipio_km: 30,
  consentimiento_max_dias: 30,
  sync_reintentos_max: 8,
  sync_margen_seg: 120,
} as const;

export type Params = Partial<{ [K in keyof typeof PARAMS_POR_DEFECTO]: (typeof PARAMS_POR_DEFECTO)[K] extends readonly number[] ? number[] : number }>;
type Clave = keyof typeof PARAMS_POR_DEFECTO;

export function param<K extends Clave>(params: Params | null | undefined, clave: K): (typeof PARAMS_POR_DEFECTO)[K] {
  const v = params?.[clave];
  return (v ?? PARAMS_POR_DEFECTO[clave]) as (typeof PARAMS_POR_DEFECTO)[K];
}

export function parseIso(s: unknown): Date | null {
  if (s === null || s === undefined || s === "") return null;
  if (s instanceof Date) return isNaN(s.getTime()) ? null : s;
  const d = new Date(String(s));
  return isNaN(d.getTime()) ? null : d;
}

export function iso(d: Date = new Date()): string {
  return d.toISOString();
}

// ------------------------------------------------------------ ubicación (R-08 a R-12)

/** R-09: el teléfono debe estar a 50 m o menos del punto. */
export function puedeRegistrarAqui(distanciaM: number, params?: Params): boolean {
  return distanciaM <= param(params, "distancia_max_registro_m");
}

/** R-10: precisión de 20 m o menos. */
export function gpsAceptable(precisionM: number | null | undefined, params?: Params): boolean {
  return precisionM !== null && precisionM !== undefined && precisionM <= param(params, "precision_min_m");
}

/** R-12: «ok» hasta 100 m del teléfono; más lejos es «diferido» (pendiente de aprobación). */
export function clasificarUbicacionManual(distanciaM: number, params?: Params): "ok" | "diferido" {
  return distanciaM <= param(params, "ubicacion_manual_max_m") ? "ok" : "diferido";
}

/** R-08: otra vivienda a menos de 15 m. */
export function hayDuplicado(distanciaM: number, params?: Params): boolean {
  return distanciaM <= param(params, "radio_duplicados_m");
}

export function dentroDelMunicipio(lat: number, lng: number, params?: Params): boolean {
  return haversineM(lat, lng, param(params, "centro_lat"), param(params, "centro_lng")) <= param(params, "radio_municipio_km") * 1000;
}

// ------------------------------------------------------------ edición (R-22)

export function ventanaEdicionAbierta(creadoEn: unknown, ahora: Date = new Date(), params?: Params): boolean {
  const c = parseIso(creadoEn);
  if (!c) return false;
  return ahora.getTime() - c.getTime() <= param(params, "ventana_edicion_h") * 3600_000;
}

// ------------------------------------------------------------ visitas

export function estadoViviendaPorResultado(resultado: string | null | undefined): string {
  return ESTADO_POR_RESULTADO[resultado ?? ""] ?? "visitada_sin_contacto";
}

export function huboContacto(resultado: string | null | undefined): boolean {
  return RESULTADOS_CON_CONTACTO.has(resultado ?? "");
}

/** R-13: toda vivienda lleva foto de fachada, salvo «No autorizó la foto» o el modo Reconocimiento. */
export function requiereFotoFachada(visita: { no_autorizo_foto?: boolean | null }, esReconocimiento = false): boolean {
  if (esReconocimiento) return false;
  return !visita.no_autorizo_foto;
}

/** Plazo interno (5 días hábiles) para responder a un titular de datos (16.5). */
export function plazoTitulares(recibida: unknown, params?: Params): Date | null {
  const d0 = parseIso(recibida);
  if (!d0) return null;
  const d = new Date(d0.getTime());
  let dias = param(params, "titulares_plazo_interno_dias");
  while (dias > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dia = d.getUTCDay();
    if (dia !== 0 && dia !== 6) dias -= 1;
  }
  return d;
}

/** R-35: de 8 a. m. a 8 p. m. (hora local de Bogotá). */
export function dentroDeHorarioMensajes(horaLocal: number, params?: Params): boolean {
  return param(params, "mensajes_hora_ini") <= horaLocal && horaLocal < param(params, "mensajes_hora_fin");
}

/** Devuelve el umbral más alto alcanzado (70, 85, 95 o 100) o null (R-39). */
export function alertaTope(porcentaje: number, params?: Params): number | null {
  const alcanzados = (param(params, "alertas_tope") as readonly number[]).filter((u) => porcentaje >= u);
  return alcanzados.length ? Math.max(...alcanzados) : null;
}

/** Hora local de Bogotá (UTC−5, sin horario de verano). */
export function horaBogota(d: Date = new Date()): number {
  return (d.getUTCHours() + 24 - 5) % 24;
}
