// Base local CIFRADA con SQLCipher (hallazgo C1). La llave nace en el teléfono y vive en el almacén seguro
// de Android (Keystore) mediante expo-secure-store: nunca se guarda en la base ni en el código.
import { open, type DB } from "@op-engineering/op-sqlite";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const NOMBRE_LLAVE = "pijao_llave_bd";
const NOMBRE_BD = "prueba_pijao.sqlite";
let bd: DB | null = null;

async function llave(): Promise<string> {
  let k = await SecureStore.getItemAsync(NOMBRE_LLAVE);
  if (!k) {
    const bytes = Crypto.getRandomBytes(32);
    k = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    await SecureStore.setItemAsync(NOMBRE_LLAVE, k, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  }
  return k;
}

export async function abrirBD(): Promise<DB> {
  if (bd) return bd;
  bd = open({ name: NOMBRE_BD, encryptionKey: await llave() });
  await bd.execute(
    "create table if not exists puntos (id integer primary key, lat real, lng real, precision_m real, simulada integer, tomada_en text)",
  );
  return bd;
}

export async function guardarPuntos(puntos: { lat: number; lng: number; precision: number | null; simulada: boolean; t: number }[]) {
  const d = await abrirBD();
  for (const p of puntos) {
    await d.execute("insert into puntos (lat, lng, precision_m, simulada, tomada_en) values (?, ?, ?, ?, ?)", [
      p.lat, p.lng, p.precision ?? null, p.simulada ? 1 : 0, new Date(p.t).toISOString(),
    ]);
  }
}

export async function resumenPuntos(): Promise<{ n: number; ultimo: string | null; simulados: number; puntos: [number, number][] }> {
  const d = await abrirBD();
  const r = await d.execute("select count(*) as n, max(tomada_en) as ultimo, sum(simulada) as simulados from puntos");
  const fila = (r.rows?.[0] ?? {}) as Record<string, unknown>;
  const pts = await d.execute("select lng, lat from puntos order by id desc limit 2000");
  return {
    n: Number(fila.n ?? 0),
    ultimo: (fila.ultimo as string) ?? null,
    simulados: Number(fila.simulados ?? 0),
    puntos: (pts.rows ?? []).map((x) => [Number(x.lng), Number(x.lat)] as [number, number]),
  };
}

export async function borrarPuntos() {
  const d = await abrirBD();
  await d.execute("delete from puntos");
}

// Comprueba que la base está cifrada: abrirla SIN llave debe fallar al leer.
export async function verificarCifrado(): Promise<boolean> {
  await abrirBD();
  try {
    const sinLlave = open({ name: NOMBRE_BD });
    await sinLlave.execute("select count(*) from puntos");
    sinLlave.close();
    return false;          // se pudo leer sin llave: NO está cifrada
  } catch {
    return true;           // no se pudo leer sin la llave: está cifrada
  }
}
