// Estilo del mapa sin conexión: datos de OpenStreetMap (ODbL) recortados a Pijao en un archivo PMTiles
// con el esquema de Protomaps. Sin textos para no depender de fuentes descargadas (la prueba mide si el mapa
// se dibuja sin señal; las etiquetas llegan con el estilo definitivo de la Fase 2).
import type { StyleSpecification } from "@maplibre/maplibre-react-native";

export function estiloPijao(rutaPmtiles: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      pijao: { type: "vector", url: `pmtiles://${rutaPmtiles}`, attribution: "© OpenStreetMap" },
    },
    layers: [
      { id: "fondo", type: "background", paint: { "background-color": "#F5F3EF" } },
      { id: "tierra", type: "fill", source: "pijao", "source-layer": "earth", paint: { "fill-color": "#EFEAE0" } },
      {
        id: "vegetacion", type: "fill", source: "pijao", "source-layer": "landcover",
        paint: { "fill-color": "#CFE3B4", "fill-opacity": 0.6 },
      },
      {
        id: "uso", type: "fill", source: "pijao", "source-layer": "landuse",
        paint: { "fill-color": "#DCE8C8", "fill-opacity": 0.5 },
      },
      { id: "agua", type: "fill", source: "pijao", "source-layer": "water", paint: { "fill-color": "#A9CBE8" } },
      {
        id: "edificios", type: "fill", source: "pijao", "source-layer": "buildings", minzoom: 14,
        paint: { "fill-color": "#D9D2C5", "fill-outline-color": "#B9AF9F" },
      },
      {
        id: "vias-menores", type: "line", source: "pijao", "source-layer": "roads",
        filter: ["in", ["get", "kind"], ["literal", ["minor_road", "path", "other"]]],
        paint: { "line-color": "#FFFFFF", "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.5, 17, 4] },
      },
      {
        id: "vias-principales", type: "line", source: "pijao", "source-layer": "roads",
        filter: ["in", ["get", "kind"], ["literal", ["major_road", "highway"]]],
        paint: { "line-color": "#F7C873", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 17, 7] },
      },
      {
        id: "limites", type: "line", source: "pijao", "source-layer": "boundaries",
        paint: { "line-color": "#8A7FA8", "line-dasharray": [2, 2], "line-width": 1 },
      },
    ],
  };
}

// Pijao (Quindío): centro aproximado del casco urbano.
export const CENTRO_PIJAO: [number, number] = [-75.7045, 4.3335];
