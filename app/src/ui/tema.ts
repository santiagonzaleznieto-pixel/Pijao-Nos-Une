// Tema central (Plan, regla 0.4-8): ninguna pantalla usa colores ni tamaños sueltos. Valores del sistema de diseño de la
// Fase 2 (opción C «Pulso», diseno/sistema/tokens.json). Los nombres antiguos se conservan para no tocar la lógica.
export const color = {
  // nombres que usan las pantallas desde la Fase 1
  azul: "#122B52",          // tinta y acción secundaria (azul marino)
  azulOceano: "#1D4E9E",    // marca-azul
  turquesa: "#1AA0C8",
  verde: "#6DB33F",
  naranja: "#F39A1E",       // acción principal: solo «Registrar aquí»
  rojo: "#B42318",
  amarillo: "#F5B841",
  fondo: "#FFFFFF",
  tarjeta: "#FFFFFF",
  texto: "#122B52",
  textoSuave: "#5A6B80",
  borde: "#E3E9F1",
  blanco: "#FFFFFF",
  negro: "#000000",
  grisPunto: "#8A8A8A",
  // sistema de diseño
  superficie: "#F5F8FC",
  superficiePanel: "#EEF3F9",
  bordeControl: "#8796AB",
  sobreNaranja: "#2A1A05",
  tinteAzul: "#EDF3FB",
  tinteTurquesa: "#E8F6F8",
  tinteVerde: "#EEF6E8",
  tinteNaranja: "#FDF2E4",
  tinteRojo: "#FDECEA",
  textoAzul: "#1F4E8C",
  textoTurquesa: "#0E5F69",
  textoVerde: "#2F6B1E",
  textoNaranja: "#8A4A05",
  textoRojo: "#B42318",
  conectado: "#3F9A2C",
  sinSenal: "#8A4A05",
  foco: "#0E7FA3",
  velo: "rgba(246, 249, 253, 0.92)",
  grafico1: "#1D4E9E",
  grafico2: "#D9730D",
  grafico3: "#1593B8",
  grafico4: "#4A8F2A",
} as const;

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

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24, pantalla: 18 } as const;
export const radio = { s: 9, m: 14, l: 20, seccion: 22, barra: 26, panel: 30, pastilla: 999 } as const;
export const letra = { pequena: 14, normal: 16, mediana: 18, titulo: 22, grande: 28 } as const;  // mínimo 16 en lectura (3.3)
export const toque = 48;   // zona táctil mínima (3.6)

/** Tiempos de animación del sistema (ms). */
export const duracion = { rapida: 180, normal: 350, lenta: 600, pausada: 1000 } as const;

export const sombra = {
  flotante: { shadowColor: "#122B52", shadowOpacity: 0.16, shadowRadius: 17, shadowOffset: { width: 0, height: 14 }, elevation: 10 },
  accion: { shadowColor: "#122B52", shadowOpacity: 0.22, shadowRadius: 13, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
} as const;

// Color de cada estado de vivienda (5.6).
export const colorEstado: Record<string, string> = {
  por_visitar: color.grisPunto,
  visitada_conversacion: color.textoVerde,
  visitada_sin_contacto: color.naranja,
  requiere_seguimiento: color.azulOceano,
  no_contactar: color.textoRojo,
  deshabitada: "#B0B0B0",
  direccion_inexistente: "#B0B0B0",
  fuera_de_pijao: "#B0B0B0",
};
export const colorCalidad: Record<string, string> = { verde: color.textoVerde, amarillo: color.textoNaranja, rojo: color.textoRojo };
