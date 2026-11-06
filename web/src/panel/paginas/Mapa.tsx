// Mapa con el avance del trabajo (bloque 1.13): las viviendas por estado sobre el mapa de Pijao (OpenStreetMap ·
// Protomaps, el mismo recorte de la app, servido desde el propio sitio: sin claves ni cobros). Solo puntos y estados;
// nunca nombres ni datos de las personas.
import * as maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import urlTrabajador from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { Protocol } from "pmtiles";
import { useEffect, useMemo, useRef, useState } from "react";
import { CATALOGOS } from "@nucleo/catalogos";
import type { PuntoMapa } from "../datos/tipos";
import { Aviso, Encabezado, Estado, useCarga, usePanel } from "../ui";

maplibregl.setWorkerUrl(urlTrabajador);
let protocoloListo = false;

// Colores de cada estado (5.6), los mismos de app/src/ui/tema.ts.
const COLOR: Record<string, string> = {
  por_visitar: "#8A8A8A", visitada_conversacion: "#7DB93F", visitada_sin_contacto: "#F2C230",
  requiere_seguimiento: "#F7931E", no_contactar: "#000000", deshabitada: "#B0B0B0",
  direccion_inexistente: "#B0B0B0", fuera_de_pijao: "#B0B0B0",
};
const CENTRO: [number, number] = [-75.7045, 4.3335];
const ETIQUETA = Object.fromEntries(CATALOGOS["C-01"].opciones) as Record<string, string>;

function estilo(conMapaBase: boolean): StyleSpecification {
  const base: StyleSpecification = { version: 8, sources: {}, layers: [{ id: "fondo", type: "background", paint: { "background-color": "#F5F3EF" } }] };
  if (!conMapaBase) return base;
  const url = new URL("./mapa/pijao.pmtiles", location.href).href;
  base.sources.pijao = { type: "vector", url: `pmtiles://${url}`, attribution: "© OpenStreetMap" };
  const capa = (id: string, capaFuente: string, tipo: "fill" | "line", paint: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
    ({ id, type: tipo, source: "pijao", "source-layer": capaFuente, paint, ...extra }) as StyleSpecification["layers"][number];
  base.layers.push(
    capa("tierra", "earth", "fill", { "fill-color": "#EFEAE0" }),
    capa("vegetacion", "landcover", "fill", { "fill-color": "#CFE3B4", "fill-opacity": 0.6 }),
    capa("agua", "water", "fill", { "fill-color": "#A9CBE8" }),
    capa("edificios", "buildings", "fill", { "fill-color": "#D9D2C5" }, { minzoom: 14 }),
    capa("vias", "roads", "line", { "line-color": "#FFFFFF", "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.5, 17, 5] }),
    capa("limites", "boundaries", "line", { "line-color": "#8A7FA8", "line-dasharray": [2, 2], "line-width": 1 }),
  );
  return base;
}

export default function Mapa() {
  const { fuente } = usePanel();
  const datos = useCarga(async () => {
    // El archivo del mapa base lo genera GitHub Actions al publicar; en desarrollo puede no estar.
    const hayBase = await fetch("./mapa/pijao.pmtiles", { method: "HEAD" }).then((r) => r.ok && Number(r.headers.get("content-length") ?? 1) > 1000, () => false);
    return { puntos: await fuente.puntosMapa(), hayBase };
  }, [fuente]);
  return (
    <>
      <Encabezado titulo="Mapa del avance" />
      <Estado carga={datos}>{(d) => <VistaMapa puntos={d.puntos} hayBase={d.hayBase} />}</Estado>
    </>
  );
}

function VistaMapa({ puntos, hayBase }: { puntos: PuntoMapa[]; hayBase: boolean }) {
  const caja = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const conteo = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of puntos) c[p.estado] = (c[p.estado] ?? 0) + 1;
    return c;
  }, [puntos]);
  const visitadas = (conteo.visitada_conversacion ?? 0) + (conteo.visitada_sin_contacto ?? 0) + (conteo.requiere_seguimiento ?? 0);

  useEffect(() => {
    if (!caja.current) return;
    if (hayBase && !protocoloListo) {
      maplibregl.addProtocol("pmtiles", new Protocol().tile);
      protocoloListo = true;
    }
    let mapa: maplibregl.Map;
    try {
      mapa = new maplibregl.Map({ container: caja.current, style: estilo(hayBase), center: CENTRO, zoom: 14, maxZoom: 18, attributionControl: { compact: true } });
    } catch {
      setError("Este navegador no puede dibujar el mapa (necesita WebGL). Pruebe con Chrome, Edge o Firefox actualizados.");
      return;
    }
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }));
    mapa.on("load", () => {
      mapa.addSource("viviendas", {
        type: "geojson",
        data: { type: "FeatureCollection", features: puntos.map((p) => ({ type: "Feature", properties: { estado: p.estado }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })) },
      });
      mapa.addLayer({
        id: "viviendas", type: "circle", source: "viviendas",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 2.5, 17, 7],
          "circle-color": ["match", ["get", "estado"], ...Object.entries(COLOR).flat(), "#8A8A8A"] as unknown as string,
          "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 1,
        },
      });
      if (puntos.length) {
        const b = new maplibregl.LngLatBounds();
        puntos.forEach((p) => b.extend([p.lng, p.lat]));
        mapa.fitBounds(b, { padding: 40, maxZoom: 16, duration: 0 });
      }
    });
    return () => mapa.remove();
  }, [puntos, hayBase]);

  return (
    <>
      <div className="cuadricula" style={{ marginBottom: 12 }}>
        <div className="tarjeta"><div className="suave">Viviendas conocidas</div><div className="cifra">{puntos.length}</div></div>
        <div className="tarjeta"><div className="suave">Visitadas</div><div className="cifra">{visitadas}</div>
          <div className="suave pequeno">{puntos.length ? Math.round((100 * visitadas) / puntos.length) : 0} % de cobertura</div></div>
        <div className="tarjeta"><div className="suave">Por visitar</div><div className="cifra">{conteo.por_visitar ?? 0}</div></div>
      </div>
      {!hayBase && <Aviso tipo="alerta">El mapa base de Pijao se agrega al publicar el sitio. Por ahora solo se ven los puntos.</Aviso>}
      {error ? <Aviso tipo="error">{error}</Aviso> : <div ref={caja} className="mapa" role="region" aria-label="Mapa de viviendas por estado" />}
      <div className="leyenda" aria-label="Leyenda">
        {Object.entries(COLOR).filter(([k]) => conteo[k]).map(([k, c]) => (
          <span key={k}><i style={{ background: c }} />{ETIQUETA[k] ?? k}: {conteo[k]}</span>
        ))}
      </div>
    </>
  );
}
