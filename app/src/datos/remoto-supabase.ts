// Conexión con Supabase (plan gratuito). Solo usa la clave pública «anon»: toda regla se valida en el servidor.
// La sesión se guarda en el almacén seguro del teléfono (Keystore), partida en trozos por el límite de tamaño (C1).
import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { File } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { ErrorRemoto, SinConexion, type Remoto } from "./tipos";

const TROZO = 1800;
const claveSegura = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, "_");

/** Adaptador de almacenamiento de sesión sobre SecureStore, con trozos de 1.800 caracteres. */
export const almacenSesion = {
  async getItem(k: string) {
    const base = claveSegura(k);
    const n = Number(await SecureStore.getItemAsync(`${base}.n`));
    if (!n) return null;
    let s = "";
    for (let i = 0; i < n; i++) s += (await SecureStore.getItemAsync(`${base}.${i}`)) ?? "";
    return s;
  },
  async setItem(k: string, v: string) {
    const base = claveSegura(k);
    await this.removeItem(k);
    const n = Math.ceil(v.length / TROZO);
    for (let i = 0; i < n; i++) await SecureStore.setItemAsync(`${base}.${i}`, v.slice(i * TROZO, (i + 1) * TROZO));
    await SecureStore.setItemAsync(`${base}.n`, String(n));
  },
  async removeItem(k: string) {
    const base = claveSegura(k);
    const n = Number(await SecureStore.getItemAsync(`${base}.n`));
    for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${base}.${i}`);
    await SecureStore.deleteItemAsync(`${base}.n`);
  },
};

export function crearCliente(url: string, anon: string): SupabaseClient {
  return createClient(url, anon, {
    auth: { storage: almacenSesion, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  });
}

/** Los errores de red se convierten en SinConexion; los del servidor, en ErrorRemoto con un mensaje sin detalles técnicos (B2). */
function traducir(e: unknown, status?: number): Error {
  const m = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
  if (!status || /network request failed|fetch failed|timeout|aborted/i.test(m)) return new SinConexion();
  return new ErrorRemoto(status, m.split("\n")[0]);
}

export class RemotoSupabase implements Remoto {
  constructor(readonly cliente: SupabaseClient) {}

  async rpc<T>(nombre: string, args: Record<string, unknown>): Promise<T> {
    let r;
    try { r = await this.cliente.rpc(nombre, args); } catch (e) { throw traducir(e); }
    if (r.error) throw traducir(r.error, r.status);
    return r.data as T;
  }

  async cambios(tabla: string, clave: string, desde: string | null, desdeId: string | null, limite: number) {
    let q = this.cliente.from(tabla).select("*").order("actualizado_en", { ascending: true }).order(clave, { ascending: true }).limit(limite);
    if (desde && desdeId) q = q.or(`actualizado_en.gt.${desde},and(actualizado_en.eq.${desde},${clave}.gt.${desdeId})`);
    else if (desde) q = q.gte("actualizado_en", desde);
    let r;
    try { r = await q; } catch (e) { throw traducir(e); }
    if (r.error) throw traducir(r.error, r.status);
    return (r.data ?? []) as Record<string, unknown>[];
  }

  async subirFoto(ruta: string, archivo: string) {
    let datos: ArrayBuffer;
    try { datos = await new File(archivo).arrayBuffer(); } catch { throw new ErrorRemoto(400, "La foto ya no existe en el teléfono"); }
    let r;
    try { r = await this.cliente.storage.from("fotos").upload(ruta, datos, { contentType: "image/jpeg", upsert: false }); }
    catch (e) { throw traducir(e); }
    if (r.error) {
      const status = Number((r.error as { statusCode?: string | number }).statusCode ?? 400);
      if (status === 409 || /already exists/i.test(r.error.message)) return;   // ya estaba arriba: idempotente
      throw traducir(r.error, status);
    }
  }
}
