// Chequeo de humo de todas las pantallas de la app: cada una se abre con los datos de ejemplo del modo práctica
// (24 casas, personas, visitas, tareas y anuncios) y no debe romperse al dibujarse. Así un error como el de la
// barra inferior de la 0.16.0 (pantalla en blanco) aparece en las pruebas de GitHub antes de construir el APK.
import { Text, View } from "react-native";
import { render } from "@testing-library/react-native";
import { act, renderRouter, screen } from "expo-router/testing-library";
import { AlmacenMemoria } from "../../datos/almacen-memoria";
import { Perfil, perfilDesdeRpc } from "../../core/permisos";
import { RemotoPractica } from "../../servicios/practica";

jest.mock("expo-secure-store", () => ({ getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn(async () => undefined) }));
jest.mock("expo-asset", () => ({ Asset: { loadAsync: jest.fn(async () => [{ localUri: "file:///pijao.pmtiles" }]) } }));
jest.mock("@maplibre/maplibre-react-native", () => {
  const { View: V } = jest.requireActual("react-native");
  const Caja = ({ children }: { children?: unknown }) => <V>{children as never}</V>;
  return { Map: Caja, Camera: Caja, GeoJSONSource: Caja, Layer: Caja };
});
jest.mock("expo-camera", () => ({ CameraView: () => null, useCameraPermissions: () => [{ granted: true }, jest.fn()] }));
jest.mock("react-native-view-shot", () => ({ captureRef: jest.fn() }));
jest.mock("react-native-qrcode-svg", () => () => null);
jest.mock("@/servicios/gps", () => ({
  pedirPermiso: jest.fn(async () => true),
  muestrear: jest.fn(async () => ({ lat: 4.3335, lng: -75.7045, precision_m: 6, altitud_m: 1600, simulada: false, tomada_en: new Date().toISOString() })),
  calidadSenal: () => "buena",
}));

// Respuesta encadenable del cliente de Supabase: cualquier mockConsulta devuelve una lista vacía.
const mockConsulta: Record<string, unknown> = {};
for (const m of ["select", "eq", "neq", "order", "in", "limit", "gte", "lte"]) mockConsulta[m] = () => mockConsulta;
mockConsulta.then = (ok: (r: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(ok);

jest.setTimeout(60000);
const almacen = new AlmacenMemoria();
const perfil = new Perfil(perfilDesdeRpc({
  id: "practica-u", nombre: "Persona de práctica", rol: "director", estado: "activo", zonas: [], aal: "aal1", curso_aprobado: true, acuerdos_ok: true, permisos: [],
}));
// Sesión falsa: cualquier método responde vacío. `then` y los símbolos no existen, para que nada la tome por una promesa.
const sesion = new Proxy({}, {
  get: (_o, k) => (k === "then" || typeof k === "symbol" ? undefined : jest.fn(async () => ({ textos: [], version: null, actual: "aal1", siguiente: "aal1" }))),
});
const mockApp = {
  listo: true, practica: true, usuarioId: "practica-u", perfil, params: {}, almacen, sesion, conectado: true, bloqueado: false,
  telefonoModificado: false, actualizacionObligatoria: false, cola: { pendientes: 0, cuarentena: 0, masAntiguo: null }, ultimaSync: null,
  ultimaSyncEn: null, version: 1, sincronizar: jest.fn(async () => null), recargarPerfil: jest.fn(async () => undefined),
  cambiarPractica: jest.fn(async () => undefined), desbloquear: jest.fn(async () => undefined), avisarCambio: jest.fn(),
  urlFoto: jest.fn(async () => null), avisos: [], descartarAviso: jest.fn(), noFuiYo: jest.fn(), oculto: false, ocultarPantalla: jest.fn(), metrica: jest.fn(),
};
jest.mock("@/servicios/contexto", () => ({
  useApp: () => mockApp,
  PAGINAS: { carnet: "https://ejemplo.org/carnet", misDatos: "https://ejemplo.org/mis-datos" },
  cliente: { from: () => mockConsulta, rpc: jest.fn(async () => ({ data: null, error: null })) },
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const RUTAS: Record<string, unknown> = {
  "(tabs)/_layout": require("../../app/(tabs)/_layout").default,
  "(tabs)/inicio": require("../../app/(tabs)/inicio").default,
  "(tabs)/mapa": require("../../app/(tabs)/mapa").default,
  "(tabs)/nuevo": require("../../app/(tabs)/nuevo").default,
  "(tabs)/tareas": require("../../app/(tabs)/tareas").default,
  "(tabs)/mas": require("../../app/(tabs)/mas").default,
  entrar: require("../../app/entrar").default,
  registro: require("../../app/registro").default,
  recuperar: require("../../app/recuperar").default,
  verificacion: require("../../app/verificacion").default,
  cuenta: require("../../app/cuenta").default,
  acuerdos: require("../../app/acuerdos").default,
  ingreso: require("../../app/ingreso").default,
  registrar: require("../../app/registrar").default,
  visita: require("../../app/visita").default,
  "vivienda/[id]": require("../../app/vivienda/[id]").default,
  "persona/[id]": require("../../app/persona/[id]").default,
  buscar: require("../../app/buscar").default,
  pendientes: require("../../app/pendientes").default,
  perfil: require("../../app/perfil").default,
  titulares: require("../../app/titulares").default,
  carnet: require("../../app/carnet").default,
  anuncios: require("../../app/anuncios").default,
  guion: require("../../app/guion").default,
};
/* eslint-enable @typescript-eslint/no-require-imports */

beforeAll(async () => {
  const remoto = new RemotoPractica(() => "practica-u");
  for (const [tabla, destino] of [["viviendas", "viviendas"], ["hogares", "hogares"], ["visitas", "visitas"], ["necesidades", "necesidades"],
    ["personas_v", "personas"], ["tareas", "tareas"], ["anuncios", "anuncios"]] as const) {
    for (const fila of await remoto.cambios(tabla, "", null)) await almacen.guardar(destino, fila as Record<string, unknown> & { id: string });
  }
});

const casos: [string, string][] = [
  ["/inicio", "Inicio"], ["/mapa", "Mapa"], ["/tareas", "Tareas"], ["/mas", "Más"],
  ["/entrar", "Entrar"], ["/registro", "Crear cuenta"], ["/recuperar", "Recuperar"], ["/verificacion", "Verificación"],
  ["/cuenta", "Cuenta"], ["/acuerdos", "Acuerdos"], ["/ingreso", "Ingreso"], ["/registrar", "Registrar aquí"],
  ["/visita?vivienda=practica-v-1", "Nueva visita"], ["/vivienda/practica-v-1", "Vivienda"], ["/persona/practica-p-1-0", "Persona"],
  ["/buscar", "Buscar"], ["/pendientes", "Pendientes"], ["/perfil", "Perfil"], ["/titulares", "Titulares"],
  ["/carnet", "Carnet"], ["/anuncios", "Anuncios"], ["/guion", "Guion"],
];

describe("todas las pantallas se abren con datos de ejemplo", () => {
  const errores = jest.spyOn(console, "error");
  afterEach(() => errores.mockClear());

  test.each(casos)("%s (%s)", async (url) => {
    await renderRouter(RUTAS as never, { initialUrl: url });
    // renderRouter usa relojes simulados: se vacían las promesas pendientes (cargas del almacén) sin esperar tiempo real.
    for (let i = 0; i < 20; i++) await act(async () => { await Promise.resolve(); });
    expect(screen.toJSON()).not.toBeNull();
    const graves = errores.mock.calls.map((c) => String(c[0])).filter((m) => /Error|Cannot read|is not a function|undefined is not/.test(m) && !/act\(/.test(m));
    expect(graves).toEqual([]);
  });
});

// La entrada animada se dibuja y se quita al terminar; con el respaldo, aunque no llegue el aviso del final de la animación.
test("la entrada animada termina y se quita", async () => {
  jest.useFakeTimers();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Entrada } = require("../Entrada");
  const alTerminar = jest.fn();
  await render(<View><Entrada alTerminar={alTerminar} /><Text>debajo</Text></View>);
  await act(async () => { jest.advanceTimersByTime(8000); });
  expect(alTerminar).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});
