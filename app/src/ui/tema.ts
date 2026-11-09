// Tema central (Plan, regla 0.4-8): ninguna pantalla usa colores ni tamaños sueltos. Valores del sistema de diseño de la
// Fase 2 (opción C «Pulso», diseno/sistema/tokens.json) en sus tres modos: claro, oscuro y sol (alto contraste 7:1).
// La apariencia (modo y letra grande, P-44) se lee al arrancar, de forma sincrónica, antes de que se dibuje nada: así
// todas las pantallas y sus estilos salen ya con la paleta correcta. Al cambiarla la app se vuelve a cargar.
import * as SecureStore from "expo-secure-store";

export type Modo = "claro" | "oscuro" | "sol";
export interface Apariencia { modo: Modo; letraGrande: boolean }

const CLAVE_APARIENCIA = "pijao_apariencia";

function leerApariencia(): Apariencia {
  try {
    const a = JSON.parse(SecureStore.getItem(CLAVE_APARIENCIA) ?? "{}") as Partial<Apariencia>;
    return { modo: a.modo === "oscuro" || a.modo === "sol" ? a.modo : "claro", letraGrande: a.letraGrande === true };
  } catch {
    return { modo: "claro", letraGrande: false };   // en pruebas o si el almacén no responde
  }
}

/** Apariencia con la que arrancó la app. */
export const apariencia: Apariencia = leerApariencia();

/** Guarda la apariencia; se aplica al volver a cargar la app (ver servicios/apariencia.ts). */
export function guardarApariencia(a: Apariencia): void {
  SecureStore.setItem(CLAVE_APARIENCIA, JSON.stringify(a));
}

type Paleta = Record<
  | "azul" | "azulOceano" | "turquesa" | "verde" | "naranja" | "rojo" | "amarillo" | "fondo" | "tarjeta" | "texto" | "textoSuave"
  | "borde" | "blanco" | "negro" | "grisPunto" | "superficie" | "superficiePanel" | "bordeControl" | "sobreNaranja" | "invertida"
  | "tinteAzul" | "tinteTurquesa" | "tinteVerde" | "tinteNaranja" | "tinteRojo" | "textoAzul" | "textoTurquesa" | "textoVerde"
  | "textoNaranja" | "textoRojo" | "conectado" | "sinSenal" | "foco" | "velo" | "sombra" | "grafico1" | "grafico2" | "grafico3"
  | "grafico4" | "graficoGuia", string>;

// Nombres de la Fase 1 conservados: `azul` es la acción secundaria (botón sólido), `naranja` la acción principal,
// `invertida` el texto sobre `azul`, `tarjeta` la superficie elevada. `blanco` y `negro` son fijos (QR, logo).
const PALETAS: Record<Modo, Paleta> = {
  claro: {
    azul: "#122B52", azulOceano: "#1D4E9E", turquesa: "#1AA0C8", verde: "#6DB33F", naranja: "#F39A1E", rojo: "#B42318", amarillo: "#F5B841",
    fondo: "#FFFFFF", tarjeta: "#FFFFFF", texto: "#122B52", textoSuave: "#5A6B80", borde: "#E3E9F1", blanco: "#FFFFFF", negro: "#000000",
    grisPunto: "#8A8A8A", superficie: "#F5F8FC", superficiePanel: "#EEF3F9", bordeControl: "#8796AB", sobreNaranja: "#2A1A05", invertida: "#FFFFFF",
    tinteAzul: "#EDF3FB", tinteTurquesa: "#E8F6F8", tinteVerde: "#EEF6E8", tinteNaranja: "#FDF2E4", tinteRojo: "#FDECEA",
    textoAzul: "#1F4E8C", textoTurquesa: "#0E5F69", textoVerde: "#2F6B1E", textoNaranja: "#8A4A05", textoRojo: "#B42318",
    conectado: "#3F9A2C", sinSenal: "#8A4A05", foco: "#0E7FA3", velo: "rgba(246, 249, 253, 0.86)", sombra: "#122B52",
    grafico1: "#1D4E9E", grafico2: "#D9730D", grafico3: "#1593B8", grafico4: "#4A8F2A", graficoGuia: "#E3E9F1",
  },
  oscuro: {
    azul: "#EEF3FA", azulOceano: "#7FA8E8", turquesa: "#4CC3E3", verde: "#8FD161", naranja: "#F7AE4A", rojo: "#FF9C8F", amarillo: "#F5C46A",
    fondo: "#0E1726", tarjeta: "#1D2F4D", texto: "#EEF3FA", textoSuave: "#A9B8CC", borde: "#2C3E5C", blanco: "#FFFFFF", negro: "#000000",
    grisPunto: "#8A97A8", superficie: "#152238", superficiePanel: "#1A2A44", bordeControl: "#7B8CA6", sobreNaranja: "#2A1A05", invertida: "#0E1726",
    tinteAzul: "#1B2D4A", tinteTurquesa: "#14343C", tinteVerde: "#1E3420", tinteNaranja: "#3A2A14", tinteRojo: "#3D1C1A",
    textoAzul: "#A9C6F2", textoTurquesa: "#8ED8E6", textoVerde: "#A8DC86", textoNaranja: "#F5C489", textoRojo: "#FF9C8F",
    conectado: "#8FD161", sinSenal: "#F5C489", foco: "#4CC3E3", velo: "rgba(14, 23, 38, 0.86)", sombra: "#000000",
    grafico1: "#5F8AD6", grafico2: "#CF7A12", grafico3: "#22A3C9", grafico4: "#5A9E33", graficoGuia: "#2C3E5C",
  },
  sol: {
    azul: "#000000", azulOceano: "#0B2E6B", turquesa: "#005E77", verde: "#1E5A0F", naranja: "#8A4300", rojo: "#8B0000", amarillo: "#8A4300",
    fondo: "#FFFFFF", tarjeta: "#FFFFFF", texto: "#000000", textoSuave: "#1A1A1A", borde: "#000000", blanco: "#FFFFFF", negro: "#000000",
    grisPunto: "#4D4D4D", superficie: "#FFFFFF", superficiePanel: "#FFFFFF", bordeControl: "#000000", sobreNaranja: "#FFFFFF", invertida: "#FFFFFF",
    tinteAzul: "#FFFFFF", tinteTurquesa: "#FFFFFF", tinteVerde: "#FFFFFF", tinteNaranja: "#FFFFFF", tinteRojo: "#FFFFFF",
    textoAzul: "#000000", textoTurquesa: "#000000", textoVerde: "#000000", textoNaranja: "#000000", textoRojo: "#8B0000",
    conectado: "#1E5A0F", sinSenal: "#000000", foco: "#0055CC", velo: "rgba(255, 255, 255, 0.97)", sombra: "#000000",
    grafico1: "#1D4E9E", grafico2: "#D9730D", grafico3: "#1593B8", grafico4: "#4A8F2A", graficoGuia: "#9A9A9A",
  },
};

export const color: Readonly<Paleta> = PALETAS[apariencia.modo];
export const modoOscuro = apariencia.modo === "oscuro";
export const modoSol = apariencia.modo === "sol";

/** Degradado de la marca: solo en el nombre, la barra de cobertura y la línea de la entrada. */
export const degradado = [color.azulOceano, color.turquesa, color.verde, color.naranja] as const;

/** Familias cargadas con expo-font (Android elige el peso por familia, no por fontWeight). */
export const fuente = {
  marca: "Montserrat_900Black",
  titulo: "Montserrat_800ExtraBold",
  tituloFuerte: "Montserrat_700Bold",
  tituloMedio: "Montserrat_600SemiBold",
  texto: "Inter_400Regular",
  textoMedio: "Inter_500Medium",
  textoFuerte: "Inter_600SemiBold",
} as const;

/** Letra grande (P-44): todo el texto ×1,25, además de la letra grande del sistema que el teléfono ya respeta. */
export const escalaLetra = apariencia.letraGrande ? 1.25 : 1;
/** Tamaño de letra con la escala de la apariencia. */
export const tl = (n: number) => Math.round(n * escalaLetra);

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24, pantalla: 18 } as const;
export const radio = { s: 9, m: 14, l: 20, seccion: 22, barra: 26, panel: 30, pastilla: 999 } as const;
export const letra = { pequena: tl(14), normal: tl(16), mediana: tl(18), titulo: tl(22), grande: tl(28) } as const;  // mínimo 16 en lectura (3.3)
export const toque = 48;   // zona táctil mínima (3.6)

/** Tiempos de animación del sistema (ms). */
export const duracion = { rapida: 180, normal: 350, lenta: 600, pausada: 1000 } as const;

// En modo sol no hay sombras: se separa con el borde negro.
const sinSombra = { shadowOpacity: 0, elevation: 0 };
export const sombra = {
  flotante: modoSol ? sinSombra : { shadowColor: color.sombra, shadowOpacity: modoOscuro ? 0.4 : 0.16, shadowRadius: 17, shadowOffset: { width: 0, height: 14 }, elevation: 10 },
  accion: modoSol ? sinSombra : { shadowColor: color.sombra, shadowOpacity: modoOscuro ? 0.45 : 0.22, shadowRadius: 13, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
} as const;

// Color de cada estado de vivienda (5.6). En el mapa además cambia la forma (ui/marcadoresMapa.ts).
export const colorEstado: Record<string, string> = {
  por_visitar: color.textoSuave,
  visitada_conversacion: color.textoVerde,
  visitada_sin_contacto: color.textoNaranja,
  requiere_seguimiento: color.azulOceano,
  no_contactar: color.textoRojo,
  deshabitada: color.bordeControl,
  direccion_inexistente: color.bordeControl,
  fuera_de_pijao: color.bordeControl,
};
export const colorCalidad: Record<string, string> = { verde: color.textoVerde, amarillo: color.textoNaranja, rojo: color.textoRojo };
