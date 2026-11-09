// Marcadores del mapa (5.6): cada punto tiene color Y forma, para distinguirlo aunque no se vean bien los colores.
// Las imágenes están a 3x (assets/mapa) y se dibujan con icon-size 1/3. Los números de los grupos son imágenes porque
// el mapa sin conexión no lleva fuentes descargadas. Generadas con el sistema de diseño (ver docs/Bitacora-del-Proyecto.md).
/* eslint-disable @typescript-eslint/no-require-imports */
export const IMAGENES_MAPA: Record<string, number> = {
  "m-por-visitar": require("../../assets/mapa/m-por-visitar.png"),
  "m-conversacion": require("../../assets/mapa/m-conversacion.png"),
  "m-sin-contacto": require("../../assets/mapa/m-sin-contacto.png"),
  "m-seguimiento": require("../../assets/mapa/m-seguimiento.png"),
  "m-no-contactar": require("../../assets/mapa/m-no-contactar.png"),
  "m-deshabitada": require("../../assets/mapa/m-deshabitada.png"),
  "m-negocio": require("../../assets/mapa/m-negocio.png"),
  "m-sede": require("../../assets/mapa/m-sede.png"),
  "m-puesto": require("../../assets/mapa/m-puesto.png"),
  "m-evento": require("../../assets/mapa/m-evento.png"),
  "m-problema": require("../../assets/mapa/m-problema.png"),
  "m-propaganda": require("../../assets/mapa/m-propaganda.png"),
  "m-pendiente": require("../../assets/mapa/m-pendiente.png"),
  "n-2": require("../../assets/mapa/n-2.png"),
  "n-3": require("../../assets/mapa/n-3.png"),
  "n-4": require("../../assets/mapa/n-4.png"),
  "n-5": require("../../assets/mapa/n-5.png"),
  "n-6": require("../../assets/mapa/n-6.png"),
  "n-7": require("../../assets/mapa/n-7.png"),
  "n-8": require("../../assets/mapa/n-8.png"),
  "n-9": require("../../assets/mapa/n-9.png"),
  "n-10": require("../../assets/mapa/n-10.png"),
  "n-11": require("../../assets/mapa/n-11.png"),
  "n-12": require("../../assets/mapa/n-12.png"),
  "n-13": require("../../assets/mapa/n-13.png"),
  "n-14": require("../../assets/mapa/n-14.png"),
  "n-15": require("../../assets/mapa/n-15.png"),
  "n-16": require("../../assets/mapa/n-16.png"),
  "n-17": require("../../assets/mapa/n-17.png"),
  "n-18": require("../../assets/mapa/n-18.png"),
  "n-19": require("../../assets/mapa/n-19.png"),
  "n-20": require("../../assets/mapa/n-20.png"),
  "n-21": require("../../assets/mapa/n-21.png"),
  "n-22": require("../../assets/mapa/n-22.png"),
  "n-23": require("../../assets/mapa/n-23.png"),
  "n-24": require("../../assets/mapa/n-24.png"),
  "n-25": require("../../assets/mapa/n-25.png"),
  "n-26": require("../../assets/mapa/n-26.png"),
  "n-27": require("../../assets/mapa/n-27.png"),
  "n-28": require("../../assets/mapa/n-28.png"),
  "n-29": require("../../assets/mapa/n-29.png"),
  "n-30": require("../../assets/mapa/n-30.png"),
  "n-31": require("../../assets/mapa/n-31.png"),
  "n-32": require("../../assets/mapa/n-32.png"),
  "n-33": require("../../assets/mapa/n-33.png"),
  "n-34": require("../../assets/mapa/n-34.png"),
  "n-35": require("../../assets/mapa/n-35.png"),
  "n-36": require("../../assets/mapa/n-36.png"),
  "n-37": require("../../assets/mapa/n-37.png"),
  "n-38": require("../../assets/mapa/n-38.png"),
  "n-39": require("../../assets/mapa/n-39.png"),
  "n-40": require("../../assets/mapa/n-40.png"),
  "n-41": require("../../assets/mapa/n-41.png"),
  "n-42": require("../../assets/mapa/n-42.png"),
  "n-43": require("../../assets/mapa/n-43.png"),
  "n-44": require("../../assets/mapa/n-44.png"),
  "n-45": require("../../assets/mapa/n-45.png"),
  "n-46": require("../../assets/mapa/n-46.png"),
  "n-47": require("../../assets/mapa/n-47.png"),
  "n-48": require("../../assets/mapa/n-48.png"),
  "n-49": require("../../assets/mapa/n-49.png"),
  "n-50": require("../../assets/mapa/n-50.png"),
  "n-51": require("../../assets/mapa/n-51.png"),
  "n-52": require("../../assets/mapa/n-52.png"),
  "n-53": require("../../assets/mapa/n-53.png"),
  "n-54": require("../../assets/mapa/n-54.png"),
  "n-55": require("../../assets/mapa/n-55.png"),
  "n-56": require("../../assets/mapa/n-56.png"),
  "n-57": require("../../assets/mapa/n-57.png"),
  "n-58": require("../../assets/mapa/n-58.png"),
  "n-59": require("../../assets/mapa/n-59.png"),
  "n-60": require("../../assets/mapa/n-60.png"),
  "n-61": require("../../assets/mapa/n-61.png"),
  "n-62": require("../../assets/mapa/n-62.png"),
  "n-63": require("../../assets/mapa/n-63.png"),
  "n-64": require("../../assets/mapa/n-64.png"),
  "n-65": require("../../assets/mapa/n-65.png"),
  "n-66": require("../../assets/mapa/n-66.png"),
  "n-67": require("../../assets/mapa/n-67.png"),
  "n-68": require("../../assets/mapa/n-68.png"),
  "n-69": require("../../assets/mapa/n-69.png"),
  "n-70": require("../../assets/mapa/n-70.png"),
  "n-71": require("../../assets/mapa/n-71.png"),
  "n-72": require("../../assets/mapa/n-72.png"),
  "n-73": require("../../assets/mapa/n-73.png"),
  "n-74": require("../../assets/mapa/n-74.png"),
  "n-75": require("../../assets/mapa/n-75.png"),
  "n-76": require("../../assets/mapa/n-76.png"),
  "n-77": require("../../assets/mapa/n-77.png"),
  "n-78": require("../../assets/mapa/n-78.png"),
  "n-79": require("../../assets/mapa/n-79.png"),
  "n-80": require("../../assets/mapa/n-80.png"),
  "n-81": require("../../assets/mapa/n-81.png"),
  "n-82": require("../../assets/mapa/n-82.png"),
  "n-83": require("../../assets/mapa/n-83.png"),
  "n-84": require("../../assets/mapa/n-84.png"),
  "n-85": require("../../assets/mapa/n-85.png"),
  "n-86": require("../../assets/mapa/n-86.png"),
  "n-87": require("../../assets/mapa/n-87.png"),
  "n-88": require("../../assets/mapa/n-88.png"),
  "n-89": require("../../assets/mapa/n-89.png"),
  "n-90": require("../../assets/mapa/n-90.png"),
  "n-91": require("../../assets/mapa/n-91.png"),
  "n-92": require("../../assets/mapa/n-92.png"),
  "n-93": require("../../assets/mapa/n-93.png"),
  "n-94": require("../../assets/mapa/n-94.png"),
  "n-95": require("../../assets/mapa/n-95.png"),
  "n-96": require("../../assets/mapa/n-96.png"),
  "n-97": require("../../assets/mapa/n-97.png"),
  "n-98": require("../../assets/mapa/n-98.png"),
  "n-99": require("../../assets/mapa/n-99.png"),
  "n-99mas": require("../../assets/mapa/n-99mas.png"),
};
/* eslint-enable @typescript-eslint/no-require-imports */

/** Escala con la que se dibujan las imágenes (están a 3x). */
export const ESCALA_IMAGEN = 1 / 3;

/** Imagen de cada estado de vivienda (C-01). */
export const ICONO_ESTADO: Record<string, string> = {
  por_visitar: "m-por-visitar",
  visitada_conversacion: "m-conversacion",
  visitada_sin_contacto: "m-sin-contacto",
  requiere_seguimiento: "m-seguimiento",
  no_contactar: "m-no-contactar",
  deshabitada: "m-deshabitada",
  direccion_inexistente: "m-deshabitada",
  fuera_de_pijao: "m-deshabitada",
};

/** Leyenda: lo que se explica en pantalla, en el orden de 5.6. */
export const LEYENDA: [string, string][] = [
  ["m-conversacion", "Conversación"], ["m-sin-contacto", "Sin contacto"], ["m-seguimiento", "Seguimiento"],
  ["m-por-visitar", "Por visitar"], ["m-no-contactar", "No contactar"], ["m-deshabitada", "Sin uso"], ["m-pendiente", "Por enviar"],
];

/** Grupos de estados para la burbuja de agrupación: gana el que más puntos tiene (5.6). */
export const GRUPOS_ESTADO: Record<string, string[]> = {
  conversacion: ["visitada_conversacion"],
  sin_contacto: ["visitada_sin_contacto"],
  seguimiento: ["requiere_seguimiento"],
  por_visitar: ["por_visitar"],
  no_contactar: ["no_contactar"],
};

/** Propiedades que suma cada grupo del mapa: cuántos puntos de cada estado tiene. */
export const PROPIEDADES_GRUPO = Object.fromEntries(Object.entries(GRUPOS_ESTADO).map(([k, estados]) => [
  `n_${k}`, ["+", ["case", ["in", ["get", "estado"], ["literal", estados]], 1, 0]],
])) as Record<string, unknown>;

/** Expresión de color de la burbuja según el estado dominante. */
export function colorDominante(colores: Record<keyof typeof GRUPOS_ESTADO, string>, otro: string): unknown {
  const claves = Object.keys(GRUPOS_ESTADO);
  const casos: unknown[] = [];
  for (const k of claves) {
    casos.push(["all", ...claves.filter((o) => o !== k).map((o) => [">=", ["get", `n_${k}`], ["get", `n_${o}`]]), [">", ["get", `n_${k}`], 0]], colores[k]);
  }
  return ["case", ...casos, otro];
}

/** Imagen del número de un grupo (2 a 99, y «99+»). */
export const NUMERO_GRUPO: unknown = ["case", [">", ["get", "point_count"], 99], "n-99mas", ["concat", "n-", ["to-string", ["get", "point_count"]]]];
