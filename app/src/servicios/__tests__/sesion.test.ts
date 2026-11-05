import { limpiarDatosPersonales } from "../../core/privacidad";
import { AlmacenMemoria } from "../../datos/almacen-memoria";
import { ServicioSesion, versionMenor } from "../sesion";

jest.mock("expo-secure-store", () => ({}));

test("N-13: comparación de versiones", () => {
  expect(versionMenor("0.11.0", "0.12.0")).toBe(true);
  expect(versionMenor("0.11.0", "0.11.0")).toBe(false);
  expect(versionMenor("1.0.0", "0.12.3")).toBe(false);
  expect(versionMenor("0.11.0", null)).toBe(false);
});

test("los reportes de error no llevan datos personales", () => {
  const t = limpiarDatosPersonales('Fallo con {"primer_nombre":"Rosa","cedula":"12345678"} rosa@gmail.com 3001234567 en 4.333412,-75.704521');
  expect(t).not.toMatch(/Rosa|12345678|rosa@gmail|3001234567|4\.3334|75\.7045/);
  expect(t).toContain("[correo]");
});

function clienteFalso(respuestaLatido: Record<string, unknown>) {
  const llamadas: string[] = [];
  return {
    llamadas,
    cliente: {
      rpc: async (nombre: string) => { llamadas.push(nombre); return { data: respuestaLatido, error: null }; },
      auth: { signOut: async () => { llamadas.push("signOut"); return { error: null }; } },
    },
  };
}

test("17.2: la orden de borrado remoto borra todo lo local y cierra la sesión", async () => {
  const almacen = new AlmacenMemoria();
  await almacen.guardar("viviendas", { id: "v1" });
  await almacen.encolar({ id: "1", tipo: "registrar_visita", usuario_id: "u1", depende_de: null, payload: { cedula: "123" } });
  const f = clienteFalso({ ok: true, borrar_datos: true });
  const s = new ServicioSesion(f.cliente as never, almacen, "0.11.0", async () => "tel-1");
  await s.latido({ colaPendiente: 1, ultimaSincronizacion: null });
  expect(await almacen.listar("viviendas")).toHaveLength(0);
  expect(await almacen.obtenerItem("1")).toBeNull();
  expect(f.llamadas).toContain("signOut");
});

test("sin orden de borrado no se toca nada", async () => {
  const almacen = new AlmacenMemoria();
  await almacen.guardar("viviendas", { id: "v1" });
  const f = clienteFalso({ ok: true, borrar_datos: false, version_minima: "0.12.0" });
  const s = new ServicioSesion(f.cliente as never, almacen, "0.11.0", async () => "tel-1");
  const l = await s.latido({ colaPendiente: 0, ultimaSincronizacion: null });
  expect(await almacen.listar("viviendas")).toHaveLength(1);
  expect(s.necesitaActualizar(l.version_minima)).toBe(true);
});
