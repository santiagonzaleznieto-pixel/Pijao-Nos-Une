// Estilo del mapa sin conexión (2.5) con la paleta de la marca: datos de OpenStreetMap (ODbL) recortados a Pijao en un
// archivo PMTiles con el esquema de Protomaps. Tres versiones, como la app: clara, oscura y modo sol (alto contraste).
// Sin textos en el mapa: no se descargan fuentes y así nunca aparecen nombres de personas (5.2); los lugares se buscan
// con «Buscar». El relieve de ladera se insinúa con la vegetación y el uso del suelo.
import type { StyleSpecification } from "@maplibre/maplibre-react-native";
import { apariencia, type Modo } from "./tema";

const PALETAS: Record<Modo, Record<string, string>> = {
  claro: {
    fondo: "#EEF2EC", tierra: "#E8EFE4", vegetacion: "#D5E6C9", uso: "#DDE8D6", agua: "#B9DCEF", edificio: "#DCE2D8", edificioBorde: "#C6CEC3",
    via: "#FFFFFF", viaBorde: "#CBD5E0", viaPrincipal: "#FFFFFF", viaPrincipalBorde: "#AFC0D3", limite: "#8796AB",
  },
  oscuro: {
    fondo: "#121E19", tierra: "#16241C", vegetacion: "#1B2C22", uso: "#1A2A21", agua: "#1D3D55", edificio: "#22322A", edificioBorde: "#2C3E33",
    via: "#2D3C4F", viaBorde: "#1A2636", viaPrincipal: "#3C4F68", viaPrincipalBorde: "#1A2636", limite: "#7B8CA6",
  },
  sol: {
    fondo: "#FFFFFF", tierra: "#FFFFFF", vegetacion: "#EDEDED", uso: "#F2F2F2", agua: "#6AA9CF", edificio: "#E0E0E0", edificioBorde: "#6B6B6B",
    via: "#FFFFFF", viaBorde: "#4D4D4D", viaPrincipal: "#FFFFFF", viaPrincipalBorde: "#000000", limite: "#000000",
  },
};

export function estiloPijao(rutaPmtiles: string, modo: Modo = apariencia.modo): StyleSpecification {
  const c = PALETAS[modo];
  const ancho = (a: number, b: number) => ["interpolate", ["linear"], ["zoom"], 12, a, 18, b];
  const menores = ["in", ["get", "kind"], ["literal", ["minor_road", "path", "other"]]];
  const mayores = ["in", ["get", "kind"], ["literal", ["major_road", "highway", "medium_road"]]];
  return {
    version: 8,
    sources: {
      pijao: { type: "vector", url: `pmtiles://${rutaPmtiles}`, attribution: "© OpenStreetMap" },
    },
    layers: [
      { id: "fondo", type: "background", paint: { "background-color": c.fondo } },
      { id: "tierra", type: "fill", source: "pijao", "source-layer": "earth", paint: { "fill-color": c.tierra } },
      { id: "vegetacion", type: "fill", source: "pijao", "source-layer": "landcover", paint: { "fill-color": c.vegetacion, "fill-opacity": 0.85 } },
      { id: "uso", type: "fill", source: "pijao", "source-layer": "landuse", paint: { "fill-color": c.uso, "fill-opacity": 0.7 } },
      { id: "agua", type: "fill", source: "pijao", "source-layer": "water", paint: { "fill-color": c.agua } },
      {
        id: "edificios", type: "fill", source: "pijao", "source-layer": "buildings", minzoom: 14,
        paint: { "fill-color": c.edificio, "fill-outline-color": c.edificioBorde },
      },
      { id: "vias-menores-borde", type: "line", source: "pijao", "source-layer": "roads", filter: menores,
        layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": c.viaBorde, "line-width": ancho(1.2, 7) } },
      { id: "vias-menores", type: "line", source: "pijao", "source-layer": "roads", filter: menores,
        layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": c.via, "line-width": ancho(0.6, 5) } },
      { id: "vias-principales-borde", type: "line", source: "pijao", "source-layer": "roads", filter: mayores,
        layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": c.viaPrincipalBorde, "line-width": ancho(2.4, 12) } },
      { id: "vias-principales", type: "line", source: "pijao", "source-layer": "roads", filter: mayores,
        layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": c.viaPrincipal, "line-width": ancho(1.4, 9) } },
      { id: "limites", type: "line", source: "pijao", "source-layer": "boundaries",
        paint: { "line-color": c.limite, "line-dasharray": [2, 2], "line-width": 1.2 } },
    ],
  } as StyleSpecification;
}

// Pijao (Quindío): centro aproximado del casco urbano.
export const CENTRO_PIJAO: [number, number] = [-75.7045, 4.3335];
