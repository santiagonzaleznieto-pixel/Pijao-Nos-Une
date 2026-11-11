// Una tabla nueva que el servidor todavía no tiene (migración pendiente) no debe frenar la descarga de las demás.
import { AlmacenMemoria } from "../../datos/almacen-memoria";
import { MotorSync } from "../../datos/sync";
import { ErrorRemoto, type Remoto } from "../../datos/tipos";

jest.mock("expo-secure-store", () => ({}));

test("si «eventos» no existe en el servidor, igual se descargan las viviendas y los anuncios", async () => {
  const almacen = new AlmacenMemoria();
  const remoto: Remoto = {
    rpc: async () => ({}) as never,
    subirFoto: async () => undefined,
    cambios: async (tabla, _c, desde) => {
      if (tabla === "eventos") throw new ErrorRemoto(404, "Could not find the table 'public.eventos' in the schema cache");
      if (desde) return [];
      if (tabla === "viviendas") return [{ id: "v1", lat: 4.33, lng: -75.7, estado: "por_visitar", actualizado_en: "2026-11-10T10:00:00Z" }];
      if (tabla === "anuncios") return [{ id: "a1", titulo: "Hola", actualizado_en: "2026-11-10T10:00:00Z" }];
      return [];
    },
  };
  const motor = new MotorSync(almacen, remoto, () => "u1");
  const r = await motor.sincronizar();
  expect(r.error).toBeNull();
  expect((await almacen.listar("viviendas")).length).toBe(1);
  expect((await almacen.listar("anuncios")).length).toBe(1);
});

test("otros errores de descarga sí se informan", async () => {
  const almacen = new AlmacenMemoria();
  const remoto: Remoto = {
    rpc: async () => ({}) as never,
    subirFoto: async () => undefined,
    cambios: async () => { throw new ErrorRemoto(500, "Error interno"); },
  };
  const r = await new MotorSync(almacen, remoto, () => "u1").sincronizar();
  expect(r.error).toMatch(/Error interno/);
});
