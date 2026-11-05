// Pruebas del motor de sincronización (24.4, 17.3, C2): sin teléfono y sin servidor.
import { AlmacenMemoria } from "../almacen-memoria";
import { esperaMs, MotorSync, type Evento } from "../sync";
import { ErrorRemoto, SinConexion, type Remoto } from "../tipos";

class RemotoFalso implements Remoto {
  llamadas: { nombre: string; args: Record<string, unknown> }[] = [];
  fotos: string[] = [];
  fallar: Error | null = null;
  fallarFoto: Error | null = null;
  datos: Record<string, Record<string, unknown>[]> = {};
  pedidos: { tabla: string; desde: string | null }[] = [];
  async rpc<T>(nombre: string, args: Record<string, unknown>): Promise<T> {
    if (this.fallar) throw this.fallar;
    this.llamadas.push({ nombre, args });
    return { ok: true, calidad: "verde" } as T;
  }
  async cambios(tabla: string, _clave: string, desde: string | null) {
    this.pedidos.push({ tabla, desde });
    return (this.datos[tabla] ?? []).filter((f) => !desde || String(f.actualizado_en) >= desde);
  }
  async subirFoto(ruta: string) {
    if (this.fallarFoto) throw this.fallarFoto;
    this.fotos.push(ruta);
  }
}

const AHORA = new Date("2026-11-05T15:00:00Z");
function preparar(usuario: string | null = "u1") {
  const almacen = new AlmacenMemoria();
  const remoto = new RemotoFalso();
  const eventos: Evento[] = [];
  let uid = usuario;
  let reloj = AHORA;
  const motor = new MotorSync(almacen, remoto, () => uid, (e) => eventos.push(e), () => null, () => reloj);
  return {
    almacen, remoto, eventos, motor,
    cambiarUsuario: (u: string | null) => { uid = u; },
    avanzar: (ms: number) => { reloj = new Date(reloj.getTime() + ms); },
  };
}
const visita = (id: string, usuario = "u1") => ({
  id, tipo: "registrar_visita", usuario_id: usuario, depende_de: null,
  payload: { vivienda: { id: `v-${id}` }, visita: { id: `vis-${id}` }, personas: [{ id: `p-${id}`, cedula: "12345678" }] },
});

test("envía, vacía el contenido sensible de la cola y marca lo local como sincronizado", async () => {
  const t = preparar();
  await t.almacen.guardar("viviendas", { id: "v-1" }, true);
  await t.almacen.encolar(visita("1"));
  const r = await t.motor.sincronizar();
  expect(r.enviados).toBe(1);
  expect(t.remoto.llamadas[0].nombre).toBe("rpc_registrar_visita");
  const item = await t.almacen.obtenerItem("1");
  expect(item?.estado).toBe("enviado");
  expect(item?.payload).toBeNull();                              // la cédula ya no está en el teléfono
  expect(await t.almacen.estaPendiente("viviendas", "v-1")).toBe(false);
  expect((await t.almacen.obtener("viviendas", "v-1"))?.calidad).toBe("verde");
});

test("C2: nunca envía registros de otra persona con la sesión actual", async () => {
  const t = preparar("u2");
  await t.almacen.encolar(visita("1", "u1"));
  const r = await t.motor.sincronizar();
  expect(r.enviados).toBe(0);
  expect(t.remoto.llamadas).toHaveLength(0);
  expect((await t.almacen.obtenerItem("1"))?.estado).toBe("pendiente");
});

test("sin conexión: reintento con espera creciente y nada se pierde", async () => {
  const t = preparar();
  await t.almacen.encolar(visita("1"));
  t.remoto.fallar = new SinConexion();
  const r = await t.motor.sincronizar();
  expect(r.sinConexion).toBe(true);
  let item = await t.almacen.obtenerItem("1");
  expect(item?.estado).toBe("reintento");
  expect(item?.siguiente_intento_en).toBe(new Date(AHORA.getTime() + 30_000).toISOString());
  t.remoto.fallar = null;
  await t.motor.sincronizar();                                   // todavía no toca reintentar
  expect(t.remoto.llamadas).toHaveLength(0);
  t.avanzar(31_000);
  await t.motor.sincronizar();
  item = await t.almacen.obtenerItem("1");
  expect(item?.estado).toBe("enviado");
});

test("la espera crece y tiene tope de una hora", () => {
  expect(esperaMs(1)).toBe(30_000);
  expect(esperaMs(3)).toBe(120_000);
  expect(esperaMs(20)).toBe(3_600_000);
});

test("un error de contenido pasa a cuarentena y no bloquea los demás", async () => {
  const t = preparar();
  await t.almacen.encolar(visita("1"));
  await t.almacen.encolar(visita("2"));
  let n = 0;
  t.remoto.rpc = async <T,>(nombre: string, args: Record<string, unknown>) => {
    n += 1;
    if (n === 1) throw new ErrorRemoto(400, "A1: autorización no válida");
    t.remoto.llamadas.push({ nombre, args });
    return { ok: true } as T;
  };
  const r = await t.motor.sincronizar();
  expect(r.cuarentena).toBe(1);
  expect(r.enviados).toBe(1);
  expect((await t.almacen.obtenerItem("1"))?.estado).toBe("cuarentena");
  expect((await t.almacen.obtenerItem("1"))?.payload).not.toBeNull();       // se conserva para corregirlo
  expect(t.eventos.some((e) => e.tipo === "cuarentena")).toBe(true);
  expect(await t.almacen.contarCola("u1")).toMatchObject({ pendientes: 0, cuarentena: 1 });
});

test("sesión vencida detiene el envío sin gastar el registro", async () => {
  const t = preparar();
  await t.almacen.encolar(visita("1"));
  t.remoto.fallar = new ErrorRemoto(401, "JWT expired");
  await t.motor.sincronizar();
  expect(t.motor.sesionExpirada).toBe(true);
  expect((await t.almacen.obtenerItem("1"))?.estado).toBe("pendiente");
});

test("una edición no sale antes que su visita", async () => {
  const t = preparar();
  await t.almacen.encolar(visita("1"));
  await t.almacen.encolar({ id: "e1", tipo: "editar_visita", usuario_id: "u1", depende_de: "1", payload: { id: "vis-1", cambios: { notas: "x" } } });
  await t.almacen.marcarItem("1", { estado: "cuarentena" });
  await t.motor.sincronizar();
  expect((await t.almacen.obtenerItem("e1"))?.estado).toBe("pendiente");
  await t.almacen.marcarItem("1", { estado: "enviado" });
  await t.motor.sincronizar();
  expect((await t.almacen.obtenerItem("e1"))?.estado).toBe("enviado");
});

test("las fotos suben después del registro y el marcado se reintenta aparte", async () => {
  const t = preparar();
  await t.almacen.encolar(visita("1"));
  await t.almacen.encolarSubida({ id: "f1", outbox_id: "1", archivo: "file:///f1.jpg", ruta: "viviendas/v-1/f1.jpg", usuario_id: "u1" });
  t.remoto.fallar = new SinConexion();
  await t.motor.sincronizar();
  expect(t.remoto.fotos).toHaveLength(0);                       // el registro no salió: la foto espera
  t.remoto.fallar = null;
  t.avanzar(31_000);
  const rpcOriginal = t.remoto.rpc.bind(t.remoto);
  t.remoto.rpc = async <T,>(nombre: string, args: Record<string, unknown>) => {
    if (nombre === "rpc_foto_subida") throw new SinConexion();
    return rpcOriginal<T>(nombre, args);
  };
  await t.motor.sincronizar();
  expect(t.remoto.fotos).toEqual(["viviendas/v-1/f1.jpg"]);
  expect(t.almacen.subidas.get("f1")?.estado).toBe("subida");   // archivo arriba, falta marcarlo
  t.remoto.rpc = rpcOriginal;
  t.avanzar(31_000);
  await t.motor.sincronizar();
  expect(t.remoto.fotos).toHaveLength(1);                       // no se vuelve a subir
  expect(t.almacen.subidas.get("f1")?.estado).toBe("marcada");
});

test("descarga con margen, respeta lo pendiente y borra las lápidas", async () => {
  const t = preparar();
  t.remoto.datos.viviendas = [
    { id: "a", actualizado_en: "2026-11-05T10:00:00.000Z" },
    { id: "b", actualizado_en: "2026-11-05T10:05:00.000Z" },
  ];
  t.remoto.datos.personas_v = [
    { id: "p1", estado: "activa", actualizado_en: "2026-11-05T10:00:00.000Z" },
    { id: "p2", estado: "solicito_eliminacion", actualizado_en: "2026-11-05T10:01:00.000Z" },
  ];
  await t.almacen.guardar("personas", { id: "p2", nombre_visible: "Rosa" });
  await t.almacen.guardar("viviendas", { id: "b", local: true }, true);
  await t.motor.descargar();
  expect(await t.almacen.obtener("viviendas", "a")).not.toBeNull();
  expect((await t.almacen.obtener("viviendas", "b"))?.local).toBe(true);    // lo mío sin enviar manda
  expect(await t.almacen.obtener("personas", "p2")).toBeNull();             // A5: se borra la copia local
  expect(await t.almacen.getMeta("cursor:viviendas")).toEqual({ t: "2026-11-05T10:05:00.000Z", id: "b" });
  t.remoto.pedidos = [];
  await t.motor.descargar();
  const pedido = t.remoto.pedidos.find((p) => p.tabla === "viviendas");
  expect(pedido?.desde).toBe("2026-11-05T10:03:00.000Z");                   // relee 2 minutos atrás
});

test("los parámetros del servidor quedan guardados para usarse sin conexión", async () => {
  const t = preparar();
  t.remoto.datos.configuracion = [{ clave: "precision_min_m", valor: 25, actualizado_en: "2026-11-05T10:00:00.000Z" }];
  await t.motor.descargar();
  expect(await t.almacen.getMeta("params")).toEqual({ precision_min_m: 25 });
});

test("nunca corren dos sincronizaciones a la vez", async () => {
  const t = preparar();
  const a = t.motor.sincronizar();
  const b = t.motor.sincronizar();
  expect(a).toBe(b);
  await a;
});

test("sin sesión no hace nada", async () => {
  const t = preparar(null);
  await t.almacen.encolar(visita("1"));
  expect((await t.motor.sincronizar()).enviados).toBe(0);
});
