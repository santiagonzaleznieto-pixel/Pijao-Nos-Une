// Almacén local CIFRADO con SQLCipher (hallazgo C1, 8.7, 17.2). La llave nace en el teléfono y vive en el almacén
// seguro de Android (Keystore) mediante expo-secure-store. Nunca se guarda en el código ni en la base.
import { open, type DB, type Scalar } from "@op-engineering/op-sqlite";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import type { Almacen, ItemCola, Subida } from "./tipos";

const LLAVE = "pijao_llave_bd_v1";
type Fila = Record<string, unknown> & { id: string };

async function llave(): Promise<string> {
  let k = await SecureStore.getItemAsync(LLAVE);
  if (!k) {
    k = Array.from(Crypto.getRandomBytes(32), (b) => b.toString(16).padStart(2, "0")).join("");
    await SecureStore.setItemAsync(LLAVE, k, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  }
  return k;
}

const ESQUEMA = [
  "create table if not exists meta (clave text primary key, valor text)",
  `create table if not exists cola (id text primary key, tipo text not null, payload text, usuario_id text not null,
     estado text not null, intentos integer not null default 0, siguiente_intento_en text, depende_de text, error text,
     creado_en text not null)`,
  "create index if not exists ix_cola on cola (usuario_id, estado, creado_en)",
  `create table if not exists subidas (id text primary key, outbox_id text not null, archivo text not null, ruta text not null,
     usuario_id text not null, estado text not null, intentos integer not null default 0, siguiente_intento_en text, error text)`,
  `create table if not exists espejo (tabla text not null, id text not null, datos text not null, pendiente integer not null default 0,
     primary key (tabla, id))`,
];

export class AlmacenSqlite implements Almacen {
  private constructor(private readonly db: DB) {}

  /** Abre la base («pijao» para datos reales, «practica» para el modo práctica: nunca se mezclan, 8.12). */
  static async abrir(nombre: "pijao" | "practica" = "pijao"): Promise<AlmacenSqlite> {
    const db = open({ name: `${nombre}.sqlite`, encryptionKey: await llave() });
    for (const q of ESQUEMA) await db.execute(q);
    return new AlmacenSqlite(db);
  }

  private async filas(q: string, p: Scalar[] = []) { return (await this.db.execute(q, p)).rows; }

  async getMeta<T>(clave: string) {
    const [f] = await this.filas("select valor from meta where clave = ?", [clave]);
    return f ? (JSON.parse(String(f.valor)) as T) : null;
  }
  async setMeta(clave: string, valor: unknown) {
    await this.db.execute("insert or replace into meta (clave, valor) values (?, ?)", [clave, JSON.stringify(valor)]);
  }

  private aItem(f: Record<string, Scalar>): ItemCola {
    return {
      id: String(f.id), tipo: String(f.tipo), payload: f.payload ? JSON.parse(String(f.payload)) : null,
      usuario_id: String(f.usuario_id), estado: f.estado as ItemCola["estado"], intentos: Number(f.intentos),
      siguiente_intento_en: (f.siguiente_intento_en as string) ?? null, depende_de: (f.depende_de as string) ?? null,
      error: (f.error as string) ?? null, creado_en: String(f.creado_en),
    };
  }
  async encolar(i: Omit<ItemCola, "estado" | "intentos" | "siguiente_intento_en" | "error" | "creado_en">) {
    await this.db.execute(
      "insert or ignore into cola (id, tipo, payload, usuario_id, estado, depende_de, creado_en) values (?, ?, ?, ?, 'pendiente', ?, ?)",
      [i.id, i.tipo, JSON.stringify(i.payload), i.usuario_id, i.depende_de, new Date().toISOString()],
    );
  }
  async siguientes(uid: string, ahora: Date, limite: number) {
    return (await this.filas(
      `select * from cola where usuario_id = ? and estado in ('pendiente', 'reintento')
        and (siguiente_intento_en is null or siguiente_intento_en <= ?) order by creado_en limit ?`,
      [uid, ahora.toISOString(), limite],
    )).map((f) => this.aItem(f));
  }
  async obtenerItem(id: string) {
    const [f] = await this.filas("select * from cola where id = ?", [id]);
    return f ? this.aItem(f) : null;
  }
  async marcarItem(id: string, c: Partial<ItemCola>) {
    const sets: string[] = [];
    const vals: Scalar[] = [];
    for (const [k, v] of Object.entries(c)) {
      sets.push(`${k} = ?`);
      vals.push(k === "payload" ? (v === null ? null : JSON.stringify(v)) : (v as Scalar));
    }
    if (sets.length) await this.db.execute(`update cola set ${sets.join(", ")} where id = ?`, [...vals, id]);
  }
  async contarCola(uid: string) {
    const [f] = await this.filas(
      `select sum(estado in ('pendiente', 'reintento')) as p, sum(estado = 'cuarentena') as c,
              min(case when estado in ('pendiente', 'reintento') then creado_en end) as m from cola where usuario_id = ?`, [uid]);
    return { pendientes: Number(f?.p ?? 0), cuarentena: Number(f?.c ?? 0), masAntiguo: (f?.m as string) ?? null };
  }
  async listarCola(uid: string) {
    return (await this.filas("select * from cola where usuario_id = ? and estado <> 'enviado' order by creado_en", [uid])).map((f) => this.aItem(f));
  }

  async encolarSubida(s: Omit<Subida, "estado" | "intentos" | "siguiente_intento_en" | "error">) {
    await this.db.execute(
      "insert or ignore into subidas (id, outbox_id, archivo, ruta, usuario_id, estado) values (?, ?, ?, ?, ?, 'pendiente')",
      [s.id, s.outbox_id, s.archivo, s.ruta, s.usuario_id],
    );
  }
  async subidasSiguientes(uid: string, ahora: Date, limite: number) {
    return (await this.filas(
      `select * from subidas where usuario_id = ? and estado in ('pendiente', 'reintento', 'subida')
        and (siguiente_intento_en is null or siguiente_intento_en <= ?) limit ?`, [uid, ahora.toISOString(), limite],
    )).map((f) => ({ ...f, intentos: Number(f.intentos) }) as unknown as Subida);
  }
  async marcarSubida(id: string, c: Partial<Subida>) {
    const sets = Object.keys(c).map((k) => `${k} = ?`);
    if (sets.length) await this.db.execute(`update subidas set ${sets.join(", ")} where id = ?`, [...Object.values(c) as Scalar[], id]);
  }

  async subidasDe(outboxId: string) {
    return (await this.filas("select * from subidas where outbox_id = ?", [outboxId])).map((f) => ({ ...f, intentos: Number(f.intentos) }) as unknown as Subida);
  }
  async quitarDeCola(id: string) {
    await this.db.execute("delete from subidas where outbox_id = ? and estado <> 'marcada'", [id]);
    await this.db.execute("delete from cola where id = ? and estado <> 'enviado'", [id]);
  }

  async guardar(tabla: string, fila: Fila, pendiente = false) {
    await this.db.execute("insert or replace into espejo (tabla, id, datos, pendiente) values (?, ?, ?, ?)",
      [tabla, fila.id, JSON.stringify(fila), pendiente ? 1 : 0]);
  }
  async borrar(tabla: string, id: string) { await this.db.execute("delete from espejo where tabla = ? and id = ?", [tabla, id]); }
  async obtener(tabla: string, id: string) {
    const [f] = await this.filas("select datos from espejo where tabla = ? and id = ?", [tabla, id]);
    return f ? (JSON.parse(String(f.datos)) as Record<string, unknown>) : null;
  }
  async listar(tabla: string) {
    return (await this.filas("select datos from espejo where tabla = ?", [tabla])).map((f) => JSON.parse(String(f.datos)) as Record<string, unknown>);
  }
  async estaPendiente(tabla: string, id: string) {
    const [f] = await this.filas("select pendiente from espejo where tabla = ? and id = ?", [tabla, id]);
    return Number(f?.pendiente ?? 0) === 1;
  }
  async marcarSincronizado(tabla: string, id: string, cambios?: Record<string, unknown>) {
    const actual = await this.obtener(tabla, id);
    if (!actual) return;
    await this.db.execute("update espejo set datos = ?, pendiente = 0 where tabla = ? and id = ?",
      [JSON.stringify({ ...actual, ...cambios }), tabla, id]);
  }

  async borrarTodo() {
    for (const t of ["meta", "cola", "subidas", "espejo"]) await this.db.execute(`delete from ${t}`);
  }
}
