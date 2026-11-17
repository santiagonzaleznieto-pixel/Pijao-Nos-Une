// R-32: que un SOS llegue de verdad al Director y al Administrador, sin servicios de pago. Mientras la app de alguno de
// ellos esté abierta, cada minuto (y en cada sincronización) revisa las alertas sin atender y, si hay una nueva, muestra
// una notificación local. La notificación no lleva el nombre ni la ubicación (3.5): esos datos se ven dentro de la app.
// Límite conocido: con la app cerrada no llega nada (eso necesita notificaciones push, que se evalúan para la Fase 4);
// por eso el panel también suena y la persona en peligro siempre ve «llame al 123».
import * as Notifications from "expo-notifications";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Almacen } from "../datos/tipos";

export interface SosAbierto { id: string; nombre: string; celular: string | null; emergencia: string | null; emergencia_celular: string | null; lat: number | null; lng: number | null; creada_en: string }

const CLAVE_VISTOS = "sos_notificados";

/** Las alertas SOS sin atender (solo el Director o el Administrador pueden leerlas). */
export async function sosAbiertos(cliente: SupabaseClient): Promise<SosAbierto[]> {
  const { data, error } = await cliente.rpc("rpc_seguridad_panel");
  if (error || !data) return [];
  return ((data as { sos?: (SosAbierto & { atendida_en: string | null })[] }).sos ?? []).filter((s) => !s.atendida_en);
}

/** Notifica las alertas nuevas (una sola vez cada una). Devuelve las abiertas para mostrarlas en Inicio. */
export async function vigilarSos(cliente: SupabaseClient, almacen: Almacen): Promise<SosAbierto[]> {
  const abiertas = await sosAbiertos(cliente);
  const vistos = new Set((await almacen.getMeta<string[]>(CLAVE_VISTOS)) ?? []);
  const nuevas = abiertas.filter((s) => !vistos.has(s.id));
  if (nuevas.length) {
    try {
      const permiso = await Notifications.requestPermissionsAsync();
      if (permiso.granted) {
        await Notifications.scheduleNotificationAsync({
          content: { title: "SOS en el equipo", body: nuevas.length === 1 ? "Una persona del equipo pidió ayuda. Abra la app para ver quién y dónde." : `${nuevas.length} personas del equipo pidieron ayuda. Abra la app.`, sound: true, priority: Notifications.AndroidNotificationPriority.MAX },
          trigger: null,
        });
      }
    } catch { /* sin notificaciones igual queda la tarjeta roja en Inicio */ }
    await almacen.setMeta(CLAVE_VISTOS, [...vistos, ...nuevas.map((s) => s.id)].slice(-200));
  }
  return abiertas;
}

/** Con la app abierta las notificaciones también se muestran (por defecto Android las calla en primer plano). */
export function mostrarNotificacionesEnPrimerPlano() {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
  } catch { /* en pruebas no hay módulo nativo */ }
}
