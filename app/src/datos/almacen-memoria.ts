// Almacén en memoria con el mismo comportamiento que el de SQLCipher. Se usa en las pruebas.
import type { Almacen, ItemCola, Subida } from "./tipos";

type Fila = Record<string, unknown> & { id: string };

export class AlmacenMemoria implements Almacen {
  meta = new Map<string, unknown>();
  cola = new Map<string, ItemCola>();
  subidas = new Map<string, Subida>();
  tablas = new Map<string, Map<string, { fila: Fila; pendiente: boolean }>>();
  private secuencia = 0;

  async getMeta<T>(k: string) { return (this.meta.get(k) as T) ?? null; }
  async setMeta(k: string, v: unknown) { this.meta.set(k, v); }

  async encolar(i: Omit<ItemCola, "estado" | "intentos" | "siguiente_intento_en" | "error" | "creado_en">) {
    this.secuencia += 1;
    const creado = new Date(Date.UTC(2026, 0, 1) + this.secuencia).toISOString();   // orden estable
    this.cola.set(i.id, { ...i, estado: "pendiente", intentos: 0, siguiente_intento_en: null, error: null, creado_en: creado });
  }
  async siguientes(uid: string, ahora: Date, limite: number) {
    return [...this.cola.values()]
      .filter((i) => i.usuario_id === uid && (i.estado === "pendiente" || i.estado === "reintento")
        && (!i.siguiente_intento_en || new Date(i.siguiente_intento_en) <= ahora))
      .sort((a, b) => a.creado_en.localeCompare(b.creado_en)).slice(0, limite);
  }
  async obtenerItem(id: string) { return this.cola.get(id) ?? null; }
  async marcarItem(id: string, c: Partial<ItemCola>) {
    const i = this.cola.get(id);
    if (i) this.cola.set(id, { ...i, ...c });
  }
  async contarCola(uid: string) {
    const mias = [...this.cola.values()].filter((i) => i.usuario_id === uid);
    const abiertas = mias.filter((i) => i.estado === "pendiente" || i.estado === "reintento");
    return {
      pendientes: abiertas.length,
      cuarentena: mias.filter((i) => i.estado === "cuarentena").length,
      masAntiguo: abiertas.map((i) => i.creado_en).sort()[0] ?? null,
    };
  }
  async listarCola(uid: string) { return [...this.cola.values()].filter((i) => i.usuario_id === uid); }

  async encolarSubida(s: Omit<Subida, "estado" | "intentos" | "siguiente_intento_en" | "error">) {
    this.subidas.set(s.id, { ...s, estado: "pendiente", intentos: 0, siguiente_intento_en: null, error: null });
  }
  async subidasSiguientes(uid: string, ahora: Date, limite: number) {
    return [...this.subidas.values()]
      .filter((s) => s.usuario_id === uid && ["pendiente", "reintento", "subida"].includes(s.estado)
        && (!s.siguiente_intento_en || new Date(s.siguiente_intento_en) <= ahora)).slice(0, limite);
  }
  async marcarSubida(id: string, c: Partial<Subida>) {
    const s = this.subidas.get(id);
    if (s) this.subidas.set(id, { ...s, ...c });
  }

  async subidasDe(outboxId: string) { return [...this.subidas.values()].filter((s) => s.outbox_id === outboxId); }
  async quitarDeCola(id: string) {
    for (const s of [...this.subidas.values()]) if (s.outbox_id === id && s.estado !== "marcada") this.subidas.delete(s.id);
    if (this.cola.get(id)?.estado !== "enviado") this.cola.delete(id);
  }

  private tabla(t: string) {
    let m = this.tablas.get(t);
    if (!m) { m = new Map(); this.tablas.set(t, m); }
    return m;
  }
  async guardar(t: string, fila: Fila, pendiente = false) { this.tabla(t).set(fila.id, { fila, pendiente }); }
  async borrar(t: string, id: string) { this.tabla(t).delete(id); }
  async obtener(t: string, id: string) { return this.tabla(t).get(id)?.fila ?? null; }
  async listar(t: string) { return [...this.tabla(t).values()].map((x) => x.fila); }
  async estaPendiente(t: string, id: string) { return this.tabla(t).get(id)?.pendiente ?? false; }
  async marcarSincronizado(t: string, id: string, cambios?: Record<string, unknown>) {
    const x = this.tabla(t).get(id);
    if (x) this.tabla(t).set(id, { fila: { ...x.fila, ...cambios }, pendiente: false });
  }
  async borrarTodo() { this.meta.clear(); this.cola.clear(); this.subidas.clear(); this.tablas.clear(); }
}
