// Indicadores (9.2, 9.3, 9.7) con la regla de «menos de 5» (R-29). Solo cuentan los registros verdes (R-28).
// Funcionan con los datos del teléfono, sin conexión (9.1).
import { huboContacto, parseIso } from "./reglas";
import { contarAdultos } from "./validadores";

const BOGOTA_MS = -5 * 3600_000;
const diaLocal = (d: Date) => new Date(d.getTime() + BOGOTA_MS).toISOString().slice(0, 10);

/** Los grupos de 1 a 4 se muestran como «menos de 5» para no identificar a nadie. */
export function umbral(n: number | null | undefined, minimo = 5): string {
  if (n === null || n === undefined) return "—";
  return n > 0 && n < minimo ? `menos de ${minimo}` : String(n);
}
const pct = (a: number, b: number) => (b ? Math.round((1000 * a) / b) / 10 : 0);

type F = Record<string, unknown>;

export function panelCampana(o: { viviendas: F[]; visitas: F[]; hogares: F[]; personas: F[]; necesidades: F[]; ahora?: Date; minimo?: number }) {
  const minimo = o.minimo ?? 5;
  const ahora = o.ahora ?? new Date();
  const viv = o.viviendas.filter((v) => !v.eliminado_en);
  const vis = o.visitas.filter((v) => !v.eliminado_en);
  const completas = vis.filter((v) => v.calidad === "verde");
  const visitadas = new Set(completas.map((v) => v.vivienda_id as string));
  const hog = o.hogares.filter((h) => !h.eliminado_en);
  const hogaresConContacto = new Set(o.personas.filter((p) => !p.eliminado_en && p.tiene_contacto_autorizado).map((p) => p.hogar_id));
  const porTema = new Map<string, number>();
  for (const n of o.necesidades) if (n.tema) porTema.set(n.tema as string, (porTema.get(n.tema as string) ?? 0) + 1);
  const zonas = new Map<string, { zona_id: string; conocidas: number; visitadas: number }>();
  for (const v of viv) {
    const z = (v.zona_id as string) ?? "sin_zona";
    const r = zonas.get(z) ?? { zona_id: z, conocidas: 0, visitadas: 0 };
    r.conocidas += 1;
    if (visitadas.has(v.id as string)) r.visitadas += 1;
    zonas.set(z, r);
  }
  const dias = new Map<string, number>();
  for (let i = 29; i >= 0; i--) dias.set(diaLocal(new Date(ahora.getTime() - i * 86400_000)), 0);
  for (const v of completas) {
    const f = parseIso(v.fecha);
    if (f && dias.has(diaLocal(f))) dias.set(diaLocal(f), (dias.get(diaLocal(f)) ?? 0) + 1);
  }
  return {
    viviendas_conocidas: viv.length,
    viviendas_visitadas: visitadas.size,
    cobertura_pct: pct(visitadas.size, viv.length),
    tasa_contacto_pct: pct(completas.filter((v) => huboContacto(v.resultado as string)).length, completas.length),
    hogares: hog.length,
    hogares_con_contacto_pct: pct(hogaresConContacto.size, hog.length),
    personas_autorizadas: o.personas.filter((p) => !p.eliminado_en && p.estado === "activa").length,
    personas_por_hogar: hog.length ? Math.round((10 * hog.reduce((s, h) => s + Number(h.total_personas ?? 0), 0)) / hog.length) / 10 : 0,
    electores_por_hogar: hog.length ? Math.round((10 * hog.reduce((s, h) => s + contarAdultos(h.edades as F), 0)) / hog.length) / 10 : 0,
    primeros_votantes: hog.reduce((s, h) => s + Number(h.futuros_primeros_votantes ?? 0), 0),
    necesidades_por_tema: [...porTema.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tema, n]) => ({ tema, n, texto: umbral(n, minimo) })),
    por_zona: [...zonas.values()].map((z) => ({ ...z, cobertura_pct: pct(z.visitadas, z.conocidas), texto: umbral(z.conocidas, minimo) }))
      .sort((a, b) => a.cobertura_pct - b.cobertura_pct),
    visitas_por_dia: [...dias.entries()],
    registros_incompletos: vis.filter((v) => v.calidad === "amarillo" || v.calidad === "rojo").length,
  };
}

export function panelPersonal(o: { usuarioId: string; visitas: F[]; tareas: F[]; borradores: number; porEnviar: number; ahora?: Date }) {
  const ahora = o.ahora ?? new Date();
  const hoy = diaLocal(ahora);
  const local = new Date(ahora.getTime() + BOGOTA_MS);
  const lunes = new Date(local.getTime() - ((local.getUTCDay() + 6) % 7) * 86400_000).toISOString().slice(0, 10);
  const mias = o.visitas.filter((v) => v.usuario_id === o.usuarioId && !v.eliminado_en);
  const dia = (v: F) => { const f = parseIso(v.fecha); return f ? diaLocal(f) : ""; };
  const abiertas = o.tareas.filter((t) => t.asignado_a === o.usuarioId && ["pendiente", "en_curso", "bloqueada"].includes(t.estado as string));
  const recientes = mias.slice(-20).map((v) => v.calidad);
  return {
    hoy: mias.filter((v) => dia(v) === hoy).length,
    semana: mias.filter((v) => dia(v) >= lunes).length,
    total: mias.length,
    tareas_pendientes: abiertas.length,
    tareas_vencidas: abiertas.filter((t) => { const l = parseIso(t.fecha_limite); return l !== null && l < ahora; }).length,
    borradores: o.borradores,
    por_enviar: o.porEnviar,
    calidad_reciente: { verde: recientes.filter((c) => c === "verde").length, amarillo: recientes.filter((c) => c === "amarillo").length, rojo: recientes.filter((c) => c === "rojo").length },
  };
}
