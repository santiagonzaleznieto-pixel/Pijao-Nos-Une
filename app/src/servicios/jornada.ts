// Jornada y seguridad en terreno (5.12, P-46, R-31, R-32). Todo funciona sin señal: iniciar, terminar, las ubicaciones y
// el SOS entran a la cola cifrada y se envían apenas haya señal; con señal, el SOS se envía al instante.
// - La ubicación se comparte SOLO durante la jornada, cada minuto mientras la app está abierta, y se manda por lotes.
//   (La ubicación con la app cerrada necesita un servicio en primer plano de Android: queda para después del piloto.)
// - «¿Todo bien?» cada 2 horas y un aviso a la hora prevista de terminar, con notificaciones locales (sin servidor).
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { hora } from "../core/formato";
import { nuevoId } from "../core/ids";
import type { Almacen } from "../datos/tipos";
import { encolarAccion } from "./campo";

export interface JornadaLocal { id: string; inicio: string; finPrevista: string | null; notificaciones: string[] }
export interface Punto { lat: number; lng: number; precision_m: number | null; tomada_en: string }

const CLAVE = "jornada_activa";
const CLAVE_PUNTOS = "jornada_puntos";
const LOTE = 5;

export async function jornadaActiva(almacen: Almacen): Promise<JornadaLocal | null> {
  return almacen.getMeta<JornadaLocal>(CLAVE);
}

async function programarAvisos(finPrevista: Date | null): Promise<string[]> {
  try {
    const permiso = await Notifications.requestPermissionsAsync();
    if (!permiso.granted) return [];
    const ids = [await Notifications.scheduleNotificationAsync({
      content: { title: "¿Todo bien?", body: "Pijao Nos Une: si necesita ayuda, abra la app y mantenga presionado SOS." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 * 3600, repeats: true },
    })];
    if (finPrevista && finPrevista.getTime() > Date.now() + 60_000) {
      ids.push(await Notifications.scheduleNotificationAsync({
        content: { title: "Hora de terminar la jornada", body: "Si ya terminó, cierre la jornada en la app. Si sigue, avise a su Director." },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: finPrevista },
      }));
    }
    return ids;
  } catch {
    return [];   // sin notificaciones la jornada igual funciona
  }
}

export async function iniciarJornada(almacen: Almacen, usuarioId: string, horas: number | null): Promise<JornadaLocal> {
  const fin = horas ? new Date(Date.now() + horas * 3600_000) : null;
  const j: JornadaLocal = { id: nuevoId(), inicio: new Date().toISOString(), finPrevista: fin?.toISOString() ?? null, notificaciones: await programarAvisos(fin) };
  await almacen.setMeta(CLAVE, j);
  await almacen.setMeta(CLAVE_PUNTOS, []);
  await encolarAccion(almacen, usuarioId, "jornada_iniciar", { inicio: j.inicio, fin_prevista: j.finPrevista });
  return j;
}

export async function terminarJornada(almacen: Almacen, usuarioId: string): Promise<void> {
  const j = await jornadaActiva(almacen);
  await enviarPuntos(almacen, usuarioId, true);
  for (const id of j?.notificaciones ?? []) await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
  await almacen.setMeta(CLAVE, null);
  await encolarAccion(almacen, usuarioId, "jornada_terminar", { fin: new Date().toISOString() });
}

/** Guarda un punto de la jornada y, cada pocos puntos, los pone en la cola para enviarlos. */
export async function anotarPunto(almacen: Almacen, usuarioId: string, p: Punto): Promise<void> {
  const puntos = ((await almacen.getMeta<Punto[]>(CLAVE_PUNTOS)) ?? []).concat(p);
  await almacen.setMeta(CLAVE_PUNTOS, puntos);
  if (puntos.length >= LOTE) await enviarPuntos(almacen, usuarioId, false);
}

async function enviarPuntos(almacen: Almacen, usuarioId: string, todos: boolean): Promise<void> {
  const puntos = (await almacen.getMeta<Punto[]>(CLAVE_PUNTOS)) ?? [];
  if (!puntos.length || (!todos && puntos.length < LOTE)) return;
  await encolarAccion(almacen, usuarioId, "ubicaciones", { puntos });
  await almacen.setMeta(CLAVE_PUNTOS, []);
}

export async function ubicacionActual(): Promise<Punto | null> {
  try {
    const permiso = await Location.getForegroundPermissionsAsync();
    if (!permiso.granted && !(await Location.requestForegroundPermissionsAsync()).granted) return null;
    const l = (await Location.getLastKnownPositionAsync({ maxAge: 120_000 })) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { lat: Number(l.coords.latitude.toFixed(6)), lng: Number(l.coords.longitude.toFixed(6)), precision_m: l.coords.accuracy ?? null, tomada_en: new Date(l.timestamp).toISOString() };
  } catch {
    return null;
  }
}

/** Texto del SOS para un mensaje de texto (cuando no hay datos): ubicación y hora, sin datos de personas visitadas. */
export function textoSos(nombre: string, p: Punto | null): string {
  const donde = p ? `Estoy en https://maps.google.com/?q=${p.lat},${p.lng} (±${Math.round(p.precision_m ?? 0)} m).` : "No pude tomar mi ubicación.";
  return `SOS Pijao Nos Une: ${nombre} necesita ayuda. ${donde} Hora: ${hora(new Date())}.`;
}
