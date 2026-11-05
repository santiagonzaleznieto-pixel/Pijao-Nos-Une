// Semáforo de calidad del registro (6.4) y señales anti-fraude (6.5). El servidor recalcula y decide (0013).
import { RESULTADOS_CON_CONTACTO } from "./catalogos";
import { haversineM } from "./geo";
import { gpsAceptable, param, parseIso, requiereFotoFachada, type Params } from "./reglas";
import type { Borrador } from "./visita";

export type Color = "verde" | "amarillo" | "rojo";
const ORDEN: Record<Color, number> = { verde: 0, amarillo: 1, rojo: 2 };
const peor = (a: Color, b: Color): Color => (ORDEN[a] >= ORDEN[b] ? a : b);

export function tieneConsentimiento(b: Borrador, personaId: string, proposito: string): boolean {
  return b.consentimientos.some((c) => c.proposito === proposito && c.estado === "vigente" && c.persona_id === personaId);
}

/** Devuelve el color y los motivos. Un registro en rojo no cuenta en las estadísticas oficiales (R-28). */
export function evaluarRegistro(b: Borrador, params?: Params): { color: Color; motivos: string[] } {
  let color: Color = "verde";
  const motivos: string[] = [];
  const viv = b.vivienda;
  const vis = b.visita;
  if (!b.vivienda_existente) {
    if ((viv.fuente_ubicacion ?? "gps") === "gps" && !gpsAceptable(viv.precision_m as number | null, params)) {
      color = peor(color, "rojo");
      motivos.push(`La precisión del GPS es débil (más de ${param(params, "precision_min_m")} m).`);
    }
    if (requiereFotoFachada(vis) && !b.fotos.some((f) => f.tipo === "fachada")) {
      color = peor(color, "rojo");
      motivos.push("Falta la foto de fachada.");
    }
  }
  if (viv.fuente_ubicacion === "manual" && !vis.motivo_manual) {
    color = peor(color, "amarillo");
    motivos.push("Falta el motivo de la ubicación manual.");
  }
  const resultado = vis.resultado ?? "";
  if (RESULTADOS_CON_CONTACTO.has(resultado) && !vis.autorizacion_verbal) {
    color = peor(color, "rojo");
    motivos.push("Falta la autorización verbal para registrar la visita.");
  }
  for (const p of b.personas) {
    if (!tieneConsentimiento(b, p.id, "datos_personales")) {
      color = peor(color, "rojo");
      motivos.push(`Falta la autorización de datos de ${p.primer_nombre || "una persona"}.`);
    }
  }
  if (b.hogar && RESULTADOS_CON_CONTACTO.has(resultado) && !(b.hogar.sosten_relacion || b.personas.some((p) => p.es_sosten))) {
    color = peor(color, "amarillo");
    motivos.push("Falta el principal sostén del hogar.");
  }
  if (b.dispositivo.ubicacion_simulada) {
    color = peor(color, "rojo");
    motivos.push("El teléfono reporta una ubicación simulada.");
  }
  return { color, motivos };
}

/** Más de un registro cada 90 segundos por el mismo colaborador (R-26). */
export function ritmoSospechoso(fechasPrevias: unknown[], fechaNueva: unknown, params?: Params): boolean {
  const nueva = parseIso(fechaNueva);
  if (!nueva) return false;
  const limite = param(params, "ritmo_sospechoso_seg") * 1000;
  return fechasPrevias.some((f) => {
    const d = parseIso(f);
    return d !== null && Math.abs(nueva.getTime() - d.getTime()) < limite;
  });
}

/** Dos registros a una velocidad imposible a pie (por defecto más de 15 m/s). */
export function saltoImposible(prev: { fecha: unknown; lat: number; lng: number } | null, nueva: { fecha: unknown; lat: number; lng: number }, params?: Params): boolean {
  if (!prev) return false;
  const t1 = parseIso(prev.fecha);
  const t2 = parseIso(nueva.fecha);
  if (!t1 || !t2) return false;
  const dt = Math.abs(t2.getTime() - t1.getTime()) / 1000;
  const d = haversineM(prev.lat, prev.lng, nueva.lat, nueva.lng);
  if (dt <= 0) return d > param(params, "radio_duplicados_m");
  return d / dt > param(params, "velocidad_max_ms") && d > 100;
}
