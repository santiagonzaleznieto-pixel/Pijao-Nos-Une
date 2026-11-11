// Antes de guardar una visita: armar las autorizaciones sin perder nada y revisar, en el teléfono, las mismas reglas con
// las que el servidor rechaza un registro completo (rpc_registrar_visita y _consentimiento_valido, migración 0013).
// Así ningún registro llega a «cuarentena» por un error que se podía corregir en el momento, frente a la familia.
// Origen: en noviembre de 2026 todas las visitas con personas se rechazaron (R-15) porque el paso 10 perdía las
// autorizaciones al avanzar (se guardaba una copia vieja del borrador encima de la nueva).
import { CANAL_A_PROPOSITO, evidenciaPara, nuevoConsentimiento, type Metodo } from "./consentimiento";
import { nuevoId } from "./ids";
import { edad, parseFecha } from "./validadores";
import type { Borrador } from "./visita";

export interface Autorizacion {
  metodo: Metodo | null; registro: boolean; datos: boolean; contacto: boolean; simpatia: boolean; historia: boolean;
  firma: unknown; noVolver: boolean;
}

/** Aplica lo autorizado en el paso 10 al borrador: consentimientos, simpatía (R-19) y «no volver» (6.3, paso 8). */
export function aplicarAutorizacion(b: Borrador, aut: Autorizacion, versionTexto: string, ahora: Date = new Date()): Borrador {
  if (!aut.metodo) return b;
  const base = { versionTexto, lat: b.dispositivo.lat ?? null, lng: b.dispositivo.lng ?? null, evidencia: evidenciaPara(aut.metodo, { firma: aut.firma, ahora }), ahora };
  const cons = [nuevoConsentimiento("registro_vivienda", aut.metodo, base)];
  for (const p of b.personas) {
    if (aut.datos) cons.push(nuevoConsentimiento("datos_personales", aut.metodo, { ...base, personaId: p.id }));
    // Varios canales posibles (WhatsApp, llamada, SMS, correo): una autorización por cada uno.
    const canales = (p.canales_preferidos as string[] | undefined) ?? (p.canal_preferido ? [String(p.canal_preferido)] : []);
    for (const c of new Set(canales)) {
      const proposito = CANAL_A_PROPOSITO[c];
      if (aut.contacto && p.interes_info && proposito) cons.push(nuevoConsentimiento(proposito, aut.metodo, { ...base, personaId: p.id }));
    }
    if (aut.simpatia && p.simpatia && p.simpatia !== "no_registrado") cons.push(nuevoConsentimiento("dato_sensible_simpatia", aut.metodo, { ...base, personaId: p.id }));
    if (aut.historia) cons.push(nuevoConsentimiento("uso_historia", aut.metodo, { ...base, personaId: p.id }));
  }
  const personas = b.personas.map((p) => (aut.simpatia ? p : { ...p, simpatia: null }));
  const visita = aut.noVolver ? { ...b.visita, resultado: "pidio_no_ser_visitado" } : b.visita;
  return { ...b, consentimientos: cons, personas, visita };
}

const edadAnios = (fecha: unknown, ahora: Date): number | null => (parseFecha(fecha) ? edad(fecha, ahora) : null);

/** Lo que haría que el servidor rechace la visita completa. Lista vacía: se puede guardar y se enviará. */
export function problemasDeEnvio(b: Borrador, o: { fotosMax?: number; diasMaxAutorizacion?: number; ahora?: Date } = {}): string[] {
  const ahora = o.ahora ?? new Date();
  const p: string[] = [];
  if (!b.visita.resultado) p.push("Falta el resultado del contacto.");
  if (!b.vivienda_existente) {
    const lat = Number(b.vivienda.lat);
    const lng = Number(b.vivienda.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || b.vivienda.lat == null || b.vivienda.lng == null) p.push("Falta la ubicación de la vivienda.");
    else if (lat < -5 || lat > 14 || lng < -82 || lng > -66) p.push("La ubicación está fuera de Colombia: vuelva a tomarla.");
  }
  if (b.fotos.length > (o.fotosMax ?? 6)) p.push(`Hay más de ${o.fotosMax ?? 6} fotos en la visita: quite alguna.`);
  if (b.hogar) {
    const total = Number(b.hogar.total_personas ?? 0);
    const suma = Object.values((b.hogar.edades as Record<string, number> | undefined) ?? {}).reduce((s, n) => s + Number(n || 0), 0);
    if (total < 1) p.push("El hogar debe tener al menos una persona.");
    else if (suma !== total) p.push(`Los rangos de edad suman ${suma} y el hogar tiene ${total} personas: corríjalo en el paso Hogar.`);
  }
  const datos = new Set(b.consentimientos.filter((c) => c.proposito === "datos_personales").map((c) => c.persona_id));
  for (const per of b.personas) {
    const nombre = String(per.primer_nombre ?? "una persona");
    if (!datos.has(per.id)) p.push(`Falta la autorización de datos personales de ${nombre} (paso Autorización).`);
    const e = edadAnios(per.fecha_nacimiento, ahora);
    if (per.fecha_nacimiento && e === null) p.push(`La fecha de nacimiento de ${nombre} debe escribirse como día/mes/año.`);
    if (e !== null && e < 18) p.push(`${nombre} es menor de 18 años: los menores no se registran.`);
    if (e !== null && e > 110) p.push(`La fecha de nacimiento de ${nombre} no es válida.`);
    if (!per.fecha_nacimiento && !per.mayor_edad_confirmada) p.push(`Confirme que ${nombre} es mayor de 18 años.`);
    const ced = String(per.cedula ?? "").replace(/\D/g, "");
    if (ced && (ced.length < 6 || ced.length > 10)) p.push(`La cédula de ${nombre} debe tener entre 6 y 10 dígitos.`);
  }
  const maxDias = o.diasMaxAutorizacion ?? 30;
  for (const c of b.consentimientos) {
    const f = new Date(c.otorgado_en);
    if (Number.isNaN(f.getTime())) { p.push("Una autorización no tiene fecha válida."); continue; }
    if (f.getTime() > ahora.getTime() + 10 * 60_000) p.push("La fecha de una autorización está en el futuro: revise la hora del teléfono.");
    if (f.getTime() < ahora.getTime() - maxDias * 86_400_000) p.push("Una autorización tiene más de 30 días: hay que volver a pedirla.");
    if (!c.version_texto) p.push("Falta la versión del texto de autorización.");
    const ev = (c.evidencia ?? {}) as Record<string, unknown>;
    if (c.metodo === "firma_pantalla" && (ev.firma == null || (Array.isArray(ev.firma) && !ev.firma.length))) p.push("Falta la firma en pantalla.");
    if (c.metodo === "verbal" && (!ev.verbal || !ev.hora)) p.push("Falta la confirmación de la autorización verbal.");
    if (c.metodo === "papel" && !b.fotos.some((x) => x.tipo === "autorizacion")) p.push("Falta la foto de la autorización en papel.");
  }
  return [...new Set(p)];
}

/** Vuelve a abrir como borrador una visita que el servidor rechazó, para corregirla y enviarla de nuevo. Lleva un id
 *  nuevo (el rechazado queda descartado) y regresa al paso de autorización, que es donde suele estar el problema. */
export function borradorDesdeRechazo(payload: Record<string, any>, usuarioId: string, fotos: { id: string; archivo: string }[], ahora: Date = new Date()): Borrador {
  const existente = Boolean(payload.vivienda?.solo_visita);
  const archivos = new Map(fotos.map((f) => [f.id, f.archivo]));
  return {
    id: nuevoId(), usuario_id: usuarioId, creado_en: String(payload.visita?.fecha ?? ahora.toISOString()), paso: 10, vivienda_existente: existente,
    vivienda: { ...(payload.vivienda ?? {}), id: String(payload.vivienda?.id ?? nuevoId()) },
    visita: { autorizacion_verbal: false, no_autorizo_foto: false, ubicacion_manual: false, ...(payload.visita ?? {}), id: undefined, resultado: payload.visita?.resultado ?? null },
    hogar: payload.hogar ?? null,
    personas: payload.personas ?? [],
    necesidades: payload.necesidades ?? [],
    consentimientos: [],
    fotos: (payload.fotos ?? []).filter((f: { id: string }) => archivos.has(f.id)).map((f: Record<string, any>) => ({ ...f, archivo_local: archivos.get(f.id)! })),
    dispositivo: payload.dispositivo ?? {},
  };
}
