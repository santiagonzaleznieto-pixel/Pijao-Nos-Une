// Muestreo del GPS para «Registrar aquí» (5.3, 5.4): lecturas durante unos 9 segundos y se queda la más precisa.
// La ubicación aproximada por red no sirve para registrar. Se informa si el teléfono simula la ubicación (N-08).
import * as Location from "expo-location";

export interface Lectura { lat: number; lng: number; precision_m: number | null; altitud_m: number | null; simulada: boolean; tomada_en: string }

export async function pedirPermiso(): Promise<boolean> {
  const p = await Location.requestForegroundPermissionsAsync();
  return p.granted;
}

/** Muestrea durante `segundos` y llama `alAvanzar` con la mejor lectura hasta el momento. */
export async function muestrear(segundos: number, alAvanzar: (mejor: Lectura | null) => void): Promise<Lectura | null> {
  let mejor: Lectura | null = null;
  const sub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
    (l) => {
      const lectura: Lectura = {
        lat: Number(l.coords.latitude.toFixed(6)), lng: Number(l.coords.longitude.toFixed(6)),    // R-11: 6 decimales
        precision_m: l.coords.accuracy ?? null, altitud_m: l.coords.altitude ?? null,
        simulada: l.mocked === true, tomada_en: new Date(l.timestamp).toISOString(),
      };
      if (!mejor || (lectura.precision_m ?? 9999) < (mejor.precision_m ?? 9999)) mejor = lectura;
      alAvanzar(mejor);
    },
  );
  await new Promise((r) => setTimeout(r, segundos * 1000));
  sub.remove();
  return mejor;
}

export function calidadSenal(precision: number | null | undefined): "buena" | "regular" | "débil" {
  if (precision === null || precision === undefined) return "débil";
  if (precision < 10) return "buena";
  if (precision <= 20) return "regular";
  return "débil";
}
