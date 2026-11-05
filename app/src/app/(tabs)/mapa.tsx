// P-09 Mapa (5.1-5.8, 5.16) y P-10 Ficha rápida. Mapa de Pijao sin conexión (PMTiles de OpenStreetMap), puntos agrupados,
// nunca nombres en el mapa. Mantener presionado ofrece la ubicación manual (5.5).
import { Asset } from "expo-asset";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Camera, GeoJSONSource, Layer, Map } from "@maplibre/maplibre-react-native";
import { etiqueta } from "@/core/catalogos";
import { useApp } from "@/servicios/contexto";
import { Boton, Fila, Opciones } from "@/ui/componentes";
import { CENTRO_PIJAO, estiloPijao } from "@/ui/estiloMapa";
import { color, colorEstado, espacio, letra, radio } from "@/ui/tema";

type V = Record<string, unknown> & { id: string; lat: number; lng: number; estado?: string };

const FILTROS: [string, string][] = [["todas", "Todas"], ["mias", "Solo lo mío"], ["pendientes", "Por visitar"], ["seguimiento", "Seguimientos"]];

export default function Mapa() {
  const app = useApp();
  const router = useRouter();
  const [ruta, setRuta] = useState<string | null>(null);
  const [viviendas, setViviendas] = useState<V[]>([]);
  const [zonas, setZonas] = useState<Record<string, unknown>[]>([]);
  const [filtro, setFiltro] = useState("todas");
  const [sel, setSel] = useState<V | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Asset.loadAsync(require("../../../assets/pijao.pmtiles"))
      .then(([a]) => setRuta(a.localUri ?? a.uri))
      .catch(() => setError("No se pudo abrir el mapa de Pijao."));
  }, []);

  useEffect(() => {
    (async () => {
      setViviendas((await app.almacen.listar("viviendas")) as V[]);
      setZonas(await app.almacen.listar("zonas"));
    })();
  }, [app.almacen, app.version]);

  const visibles = useMemo(() => viviendas.filter((v) => {
    if (filtro === "mias") return v.creado_por === app.usuarioId;
    if (filtro === "pendientes") return v.estado === "por_visitar";
    if (filtro === "seguimiento") return v.estado === "requiere_seguimiento";
    return true;
  }), [viviendas, filtro, app.usuarioId]);

  const puntos = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: visibles.filter((v) => typeof v.lat === "number").map((v) => ({
      type: "Feature" as const, id: v.id,
      properties: { id: v.id, color: colorEstado[v.estado ?? "por_visitar"] ?? color.grisPunto },
      geometry: { type: "Point" as const, coordinates: [v.lng, v.lat] },
    })),
  }), [visibles]);

  const poligonos = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: zonas.filter((z) => z.poligono).map((z) => ({ type: "Feature" as const, properties: { nombre: z.nombre }, geometry: z.poligono as GeoJSON.Geometry })),
  }), [zonas]);

  if (error) return <View style={{ flex: 1, justifyContent: "center", padding: espacio.l }}><Text>{error}</Text></View>;

  return (
    <View style={{ flex: 1 }}>
      {ruta ? (
        <Map style={{ flex: 1 }} mapStyle={estiloPijao(ruta)} logo={false} compass scaleBar
          onLongPress={(e) => {
            const [lng, lat] = (e.nativeEvent as unknown as { lngLat: [number, number] }).lngLat ?? [];
            if (lat !== undefined) router.push({ pathname: "/registrar", params: { manualLat: String(lat), manualLng: String(lng) } });
          }}>
          <Camera initialViewState={{ center: CENTRO_PIJAO, zoom: 15 }} />
          <GeoJSONSource id="zonas" data={poligonos}>
            <Layer id="zonas-borde" type="line" style={{ lineColor: color.azulOceano, lineWidth: 2 }} />
          </GeoJSONSource>
          <GeoJSONSource id="viviendas" data={puntos} cluster clusterRadius={40}
            onPress={(e) => {
              const f = (e.nativeEvent as unknown as { features?: { properties?: { id?: string } }[] }).features?.[0];
              const v = viviendas.find((x) => x.id === f?.properties?.id);
              if (v) setSel(v);
            }}>
            <Layer id="grupos" type="circle" filter={["has", "point_count"]} style={{ circleColor: color.azulOceano, circleRadius: 18, circleStrokeColor: color.blanco, circleStrokeWidth: 2 }} />
            <Layer id="grupos-n" type="symbol" filter={["has", "point_count"]} style={{ textField: ["get", "point_count_abbreviated"], textColor: color.blanco, textSize: 14 }} />
            <Layer id="puntos" type="circle" filter={["!", ["has", "point_count"]]}
              style={{ circleColor: ["get", "color"], circleRadius: 8, circleStrokeColor: color.blanco, circleStrokeWidth: 2 }} />
          </GeoJSONSource>
        </Map>
      ) : <View style={{ flex: 1, backgroundColor: color.fondo }} />}

      <View style={{ position: "absolute", top: espacio.s, left: espacio.s, right: espacio.s }}>
        <Opciones opciones={FILTROS} valor={filtro} onCambio={(v) => setFiltro(v as string)} />
      </View>

      {sel ? (
        <View accessibilityViewIsModal style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: color.tarjeta, borderTopLeftRadius: radio.l, borderTopRightRadius: radio.l, padding: espacio.l, gap: espacio.s, elevation: 8 }}>
          <Text style={{ fontSize: letra.mediana, fontWeight: "700", color: color.azul }}>{String(sel.direccion ?? "Vivienda sin dirección")}</Text>
          <Text style={{ fontSize: letra.normal, color: color.texto }}>{etiqueta("C-01", sel.estado ?? "")}{sel.barrio_vereda ? ` · ${String(sel.barrio_vereda)}` : ""}</Text>
          {sel.estado === "no_contactar" ? <Text style={{ color: color.rojo, fontWeight: "700" }}>No volver: la familia pidió no ser contactada.</Text> : null}
          <Fila>
            <Boton texto="Ver detalle" variante="secundario" onPress={() => { setSel(null); router.push(`/vivienda/${sel.id}`); }} />
            {sel.estado !== "no_contactar" ? <Boton texto="Agregar visita" onPress={() => { setSel(null); router.push({ pathname: "/visita", params: { vivienda: sel.id } }); }} /> : null}
            <Boton texto="Cómo llegar" variante="suave" onPress={() => Linking.openURL(`geo:${sel.lat},${sel.lng}?q=${sel.lat},${sel.lng}`)} />
          </Fila>
          <Pressable accessibilityRole="button" onPress={() => setSel(null)}><Text style={{ textAlign: "center", color: color.textoSuave, padding: espacio.s }}>Cerrar</Text></Pressable>
        </View>
      ) : null}
    </View>
  );
}
