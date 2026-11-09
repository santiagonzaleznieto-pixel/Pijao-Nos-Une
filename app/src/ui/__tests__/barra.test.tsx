// Regresión de la app 0.16.0: al tocar Mapa, Tareas o Más en la barra inferior propia la app quedaba en blanco, porque
// la barra llamaba a `navigation.navigate` y expo-router 58 no se lo entrega. Aquí se monta la barra de verdad con
// el enrutador de prueba de expo-router y se toca cada pestaña.
import { Text } from "react-native";
import { act, fireEvent, renderRouter, screen } from "expo-router/testing-library";

jest.mock("expo-secure-store", () => ({}));
jest.mock("@/servicios/contexto", () => ({
  useApp: () => ({ conectado: true, cola: { pendientes: 0, cuarentena: 0 }, ultimaSyncEn: null, ocultarPantalla: jest.fn() }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Pestanas = require("../../app/(tabs)/_layout").default;
const pagina = (nombre: string) => () => <Text>{`pantalla ${nombre}`}</Text>;

describe("barra inferior flotante", () => {
  test("cada pestaña abre su pantalla sin romper la app", async () => {
    await renderRouter({
      "(tabs)/_layout": Pestanas,
      "(tabs)/inicio": pagina("inicio"),
      "(tabs)/mapa": pagina("mapa"),
      "(tabs)/nuevo": pagina("nuevo"),
      "(tabs)/tareas": pagina("tareas"),
      "(tabs)/mas": pagina("mas"),
      registrar: pagina("registrar"),
      pendientes: pagina("pendientes"),
    }, { initialUrl: "/inicio" });

    expect(screen.getByText("pantalla inicio")).toBeTruthy();
    for (const [etiqueta, ruta] of [["Mapa", "mapa"], ["Tareas", "tareas"], ["Más", "mas"], ["Inicio", "inicio"]] as const) {
      await act(async () => { fireEvent.press(screen.getByLabelText(etiqueta)); });
      expect(screen).toHavePathname(`/${ruta}`);
      expect(screen.getByText(`pantalla ${ruta}`)).toBeTruthy();
    }
  });

  test("el botón naranja del centro abre «Registrar aquí»", async () => {
    await renderRouter({
      "(tabs)/_layout": Pestanas,
      "(tabs)/inicio": pagina("inicio"),
      "(tabs)/mapa": pagina("mapa"),
      "(tabs)/nuevo": pagina("nuevo"),
      "(tabs)/tareas": pagina("tareas"),
      "(tabs)/mas": pagina("mas"),
      registrar: pagina("registrar"),
    }, { initialUrl: "/inicio" });
    await act(async () => { fireEvent.press(screen.getByLabelText("Registrar aquí")); });
    expect(screen).toHavePathname("/registrar");
  });
});
