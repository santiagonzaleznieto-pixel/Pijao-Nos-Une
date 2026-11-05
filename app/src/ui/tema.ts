// Tema central (Plan, regla 0.4-8): ninguna pantalla usa colores ni tamaños sueltos. La Fase 2 (diseño) reemplaza
// estos valores por el sistema de diseño definitivo sin tocar las pantallas. Paleta provisional de 3.2.
export const color = {
  azul: "#1C3D72",
  azulOceano: "#2A6FB5",
  turquesa: "#25A9B5",
  verde: "#7DB93F",
  naranja: "#F7931E",
  rojo: "#D64545",
  amarillo: "#F2C230",
  fondo: "#F5F3EF",
  tarjeta: "#FFFFFF",
  texto: "#1F2933",
  textoSuave: "#52606D",
  borde: "#D9D2C5",
  blanco: "#FFFFFF",
  negro: "#000000",
  grisPunto: "#8A8A8A",
} as const;

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24 } as const;
export const radio = { s: 8, m: 12, l: 16 } as const;
export const letra = { pequena: 14, normal: 16, mediana: 18, titulo: 22, grande: 28 } as const;  // mínimo 16 en lectura (3.3)
export const toque = 48;   // zona táctil mínima (3.6)

// Color de cada estado de vivienda (5.6). La forma de cada marcador llega con la iconografía de la Fase 2.
export const colorEstado: Record<string, string> = {
  por_visitar: color.grisPunto,
  visitada_conversacion: color.verde,
  visitada_sin_contacto: color.amarillo,
  requiere_seguimiento: color.naranja,
  no_contactar: color.negro,
  deshabitada: "#B0B0B0",
  direccion_inexistente: "#B0B0B0",
  fuera_de_pijao: "#B0B0B0",
};
export const colorCalidad: Record<string, string> = { verde: color.verde, amarillo: color.amarillo, rojo: color.rojo };
