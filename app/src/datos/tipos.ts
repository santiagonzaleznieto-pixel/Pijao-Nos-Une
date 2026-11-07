// Contratos de la capa de datos. El motor de sincronización solo conoce estas interfaces: en el teléfono se usan
// SQLCipher (almacen-sqlite.ts) y Supabase (remoto-supabase.ts); en las pruebas, versiones en memoria.

export type EstadoEnvio = "pendiente" | "reintento" | "enviado" | "cuarentena";

export interface ItemCola {
  id: string;
  tipo: string;                       // registrar_visita, editar_visita, solicitud_titular, ...
  payload: Record<string, unknown> | null;
  usuario_id: string;                 // C2: nunca se envía con la sesión de otra persona
  estado: EstadoEnvio;
  intentos: number;
  siguiente_intento_en: string | null;
  depende_de: string | null;          // un envío no sale antes que aquel del que depende (24.4)
  error: string | null;
  creado_en: string;
}

export interface Subida {
  id: string;                         // id de la foto
  outbox_id: string;                  // primero debe estar enviado el registro (8.7)
  archivo: string;                    // ruta local
  ruta: string;                       // ruta en el almacenamiento (la fija el servidor: viviendas/<vid>/<fid>.jpg)
  usuario_id: string;
  estado: "pendiente" | "reintento" | "subida" | "marcada" | "cuarentena";
  intentos: number;
  siguiente_intento_en: string | null;
  error: string | null;
}

export interface Almacen {
  getMeta<T = unknown>(clave: string): Promise<T | null>;
  setMeta(clave: string, valor: unknown): Promise<void>;

  encolar(item: Omit<ItemCola, "estado" | "intentos" | "siguiente_intento_en" | "error" | "creado_en">): Promise<void>;
  siguientes(usuarioId: string, ahora: Date, limite: number): Promise<ItemCola[]>;
  obtenerItem(id: string): Promise<ItemCola | null>;
  marcarItem(id: string, cambios: Partial<Pick<ItemCola, "estado" | "intentos" | "siguiente_intento_en" | "error" | "payload">>): Promise<void>;
  contarCola(usuarioId: string): Promise<{ pendientes: number; cuarentena: number; masAntiguo: string | null }>;
  listarCola(usuarioId: string): Promise<ItemCola[]>;

  encolarSubida(s: Omit<Subida, "estado" | "intentos" | "siguiente_intento_en" | "error">): Promise<void>;
  subidasSiguientes(usuarioId: string, ahora: Date, limite: number): Promise<Subida[]>;
  marcarSubida(id: string, cambios: Partial<Pick<Subida, "estado" | "intentos" | "siguiente_intento_en" | "error">>): Promise<void>;

  /** Copia local del servidor (solo lo que el servidor deja ver; las personas, enmascaradas). */
  guardar(tabla: string, fila: Record<string, unknown> & { id: string }, pendiente?: boolean): Promise<void>;
  borrar(tabla: string, id: string): Promise<void>;
  obtener(tabla: string, id: string): Promise<Record<string, unknown> | null>;
  listar(tabla: string): Promise<Record<string, unknown>[]>;
  estaPendiente(tabla: string, id: string): Promise<boolean>;
  marcarSincronizado(tabla: string, id: string, cambios?: Record<string, unknown>): Promise<void>;

  /** 17.2: borrado remoto, teléfono perdido, baja o cierre de sesión de otra persona. */
  borrarTodo(): Promise<void>;
}

export class SinConexion extends Error {
  constructor(m = "Sin conexión") { super(m); this.name = "SinConexion"; }
}
export class ErrorRemoto extends Error {
  constructor(readonly status: number, mensaje: string) { super(mensaje); this.name = "ErrorRemoto"; }
}

export interface Remoto {
  rpc<T = unknown>(nombre: string, args: Record<string, unknown>): Promise<T>;
  /** Filas cambiadas después de (desde, desdeId), en orden (actualizado_en, clave). */
  cambios(tabla: string, clave: string, desde: string | null, desdeId: string | null, limite: number): Promise<Record<string, unknown>[]>;
  subirFoto(ruta: string, archivo: string): Promise<void>;
  /** Enlace temporal (10 minutos) para ver una foto del servidor; null si no hay conexión o no tiene permiso. */
  urlFoto?(ruta: string): Promise<string | null>;
}

export const TRANSITORIOS = new Set([408, 425, 429, 500, 502, 503, 504]);
