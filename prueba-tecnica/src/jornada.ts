// Jornada con GPS en segundo plano (5.12): servicio en primer plano de Android con notificación visible.
// Debe importarse en index.ts ANTES de registrar la app, para que la tarea exista aunque la app esté cerrada.
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { guardarPuntos } from "./db";

export const TAREA_JORNADA = "pijao-jornada";

TaskManager.defineTask(TAREA_JORNADA, async ({ data, error }) => {
  if (error) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  await guardarPuntos(
    locations.map((l) => ({
      lat: l.coords.latitude,
      lng: l.coords.longitude,
      precision: l.coords.accuracy,
      simulada: l.mocked === true,
      t: l.timestamp,
    })),
  );
});

export async function iniciarJornada(): Promise<string> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return "Sin permiso de ubicación.";
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (!bg.granted) return "Sin permiso de ubicación «Permitir todo el tiempo». Actívelo en Ajustes para la prueba.";
  await Location.startLocationUpdatesAsync(TAREA_JORNADA, {
    accuracy: Location.Accuracy.High,
    timeInterval: 30000,         // cada unos 30 segundos (5.12)
    distanceInterval: 10,
    foregroundService: {
      notificationTitle: "Pijao nos une · Jornada activa",
      notificationBody: "Compartiendo su ubicación solo durante la jornada.",
      notificationColor: "#1C3D72",
      killServiceOnDestroy: false,
    },
  });
  return "Jornada iniciada.";
}

export async function terminarJornada() {
  if (await Location.hasStartedLocationUpdatesAsync(TAREA_JORNADA)) {
    await Location.stopLocationUpdatesAsync(TAREA_JORNADA);
  }
}

export async function jornadaActiva(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(TAREA_JORNADA);
}
