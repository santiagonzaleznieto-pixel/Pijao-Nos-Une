// Geografía sin dependencias: distancias y polígonos de zonas (el mismo algoritmo que la base, 0013 _punto_en_poligono).

export const RADIO_TIERRA_M = 6371008.8;
const rad = (g: number) => (g * Math.PI) / 180;

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dphi = rad(lat2 - lat1);
  const dl = rad(lng2 - lng1);
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dl / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface Punto { lat: number; lng: number }

export function cercanos<T extends Punto>(puntos: Iterable<T>, lat: number, lng: number, radioM: number): { punto: T; distancia: number }[] {
  const salida: { punto: T; distancia: number }[] = [];
  for (const p of puntos) {
    const d = haversineM(lat, lng, p.lat, p.lng);
    if (d <= radioM) salida.push({ punto: p, distancia: d });
  }
  return salida.sort((a, b) => a.distancia - b.distancia);
}

export function masCercano<T extends Punto>(puntos: Iterable<T>, lat: number, lng: number, maxM?: number): { punto: T | null; distancia: number } {
  let mejor: T | null = null;
  let mejorD = Infinity;
  for (const p of puntos) {
    const d = haversineM(lat, lng, p.lat, p.lng);
    if (d < mejorD) { mejor = p; mejorD = d; }
  }
  if (mejor && (maxM === undefined || mejorD <= maxM)) return { punto: mejor, distancia: mejorD };
  return { punto: null, distancia: mejorD };
}

type Anillo = readonly (readonly number[])[];
export type Geometria = { type: "Polygon"; coordinates: Anillo[] } | { type: "MultiPolygon"; coordinates: Anillo[][] };

/** Algoritmo del rayo sobre un anillo GeoJSON [[lng, lat], ...]. */
export function puntoEnAnillo(lat: number, lng: number, anillo: Anillo): boolean {
  const n = anillo.length;
  if (n < 3) return false;
  let dentro = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

export function puntoEnPoligono(lat: number, lng: number, g: Geometria | null | undefined): boolean {
  if (!g) return false;
  if (g.type === "MultiPolygon") return g.coordinates.some((poly) => puntoEnPoligono(lat, lng, { type: "Polygon", coordinates: poly }));
  const [exterior, ...huecos] = g.coordinates;
  if (!exterior || !puntoEnAnillo(lat, lng, exterior)) return false;
  return !huecos.some((h) => puntoEnAnillo(lat, lng, h));
}

export function zonaDePunto<T extends { poligono?: Geometria | null }>(lat: number, lng: number, zonas: Iterable<T>): T | null {
  for (const z of zonas) if (puntoEnPoligono(lat, lng, z.poligono)) return z;
  return null;
}
