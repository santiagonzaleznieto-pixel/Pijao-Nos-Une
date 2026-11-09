// P-09 Mapa (5.1-5.9, 5.13, 5.16) y P-10 Ficha rápida, con el diseño de la Fase 2. Mapa de Pijao sin conexión (PMTiles de
// OpenStreetMap) con la paleta de la marca; cada punto con color Y forma (5.6); lo guardado sin enviar con anillo punteado
// (5.13); los grupos con el número y el color del estado dominante; su ubicación con el círculo de precisión. Nunca
// nombres en el mapa. Mantener presionado ofrece la ubicación manual (5.5).
import { Asset } from "expo-asset";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Camera, GeoJSONSource, Images, Layer, Map, UserLocation, type CameraRef } from "@maplibre/maplibre-react-native";
import { resumenCasa, type DatosCasa } from "@/core/ficha";
import { cargarCasa } from "@/servicios/casa";
import { useApp } from "@/servicios/contexto";
import { pedirPermiso } from "@/servicios/gps";
import { FotoCasa } from "@/ui/FotoCasa";
import { ICONO_EJE, Icono } from "@/ui/Icono";
import { Aviso, Boton, BotonIcono, Chip, Enlace, ErrorReintentar, Insignia, Semaforo, TituloMedio } from "@/ui/componentes";
import { CENTRO_PIJAO, estiloPijao } from "@/ui/estiloMapa";
import { ESCALA_IMAGEN, ICONO_ESTADO, IMAGENES_MAPA, LEYENDA, NUMERO_GRUPO, PROPIEDADES_GRUPO, colorDominante } from "@/ui/marcadoresMapa";
import { curvaSuave, useMovimientoReducido } from "@/ui/movimiento";
import { color, espacio, fuente, modoSol, radio, sombra, tl } from "@/ui/tema";

type V = Record<string, unknown> & { id: string; lat: number; lng: number; estado?: string };
const FILTROS: [string, string][] = [["todas", "Todas"], ["mias", "Solo lo mío"], ["pendientes", "Por visitar"], ["seguimiento", "Seguimientos"], ["por_enviar", "Por enviar"]];
const COLOR_GRUPO = {
  conversacion: "#2F7D22", sin_contacto: "#B7861F", seguimiento: "#C26A06", por_visitar: color.azulOceano, no_contactar: "#1E2A3A",
};

export default function Mapa() {
  const app = useApp();
  const router = useRouter();
  const camara = useRef<CameraRef>(null);
  const [ruta, setRuta] = useState<string | null>(null);
  const [viviendas, setViviendas] = useState<V[]>([]);
  const [pendientes, setPendientes] = useState<Set<string>>(new Set());
  const [zonas, setZonas] = useState<Record<string, unknown>[]>([]);
  const [filtro, setFiltro] = useState("todas");
  const [leyenda, setLeyenda] = useState(false);
  const [sel, setSel] = useState<V | null>(null);
  const [casa, setCasa] = useState<DatosCasa | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    Asset.loadAsync(require("../../../assets/pijao.pmtiles"))
      .then(([a]) => setRuta(a.localUri ?? a.uri))
      .catch(() => setError("No se pudo abrir el mapa de Pijao guardado en el teléfono."));
  }, [intento]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const vs = (await app.almacen.listar("viviendas")) as V[];
      const marcas = await Promise.all(vs.map(async (v) => [v.id, await app.almacen.estaPendiente("viviendas", v.id)] as const));
      if (!vivo) return;
      setViviendas(vs);
      setPendientes(new Set(marcas.filter(([, p]) => p).map(([id]) => id)));
      setZonas(await app.almacen.listar("zonas"));
    })();
    return () => { vivo = false; };
  }, [app.almacen, app.version]);

  // P-10: al tocar una casa se carga lo que se recogió de ella (desde el teléfono, funciona sin señal).
  useEffect(() => {
    let vivo = true;
    setCasa(null);
    if (sel) cargarCasa(app.almacen, sel.id).then((d) => { if (vivo) setCasa(d); });
    return () => { vivo = false; };
  }, [sel, app.almacen, app.version]);
  const resumen = useMemo(() => (casa ? resumenCasa(casa) : null), [casa]);

  const visibles = useMemo(() => viviendas.filter((v) => {
    if (filtro === "mias") return v.creado_por === app.usuarioId;
    if (filtro === "pendientes") return v.estado === "por_visitar";
    if (filtro === "seguimiento") return v.estado === "requiere_seguimiento";
    if (filtro === "por_enviar") return pendientes.has(v.id);
    return true;
  }), [viviendas, filtro, app.usuarioId, pendientes]);

  const puntos = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: visibles.filter((v) => typeof v.lat === "number").map((v) => ({
      type: "Feature" as const, id: v.id,
      properties: { id: v.id, estado: v.estado ?? "por_visitar", icono: ICONO_ESTADO[v.estado ?? "por_visitar"] ?? "m-por-visitar", pendiente: pendientes.has(v.id) },
      geometry: { type: "Point" as const, coordinates: [v.lng, v.lat] },
    })),
  }), [visibles, pendientes]);

  const poligonos = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: zonas.filter((z) => z.poligono).map((z) => ({ type: "Feature" as const, properties: { nombre: z.nombre }, geometry: z.poligono as GeoJSON.Geometry })),
  }), [zonas]);

  const seleccion = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: sel && typeof sel.lat === "number" ? [{ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: [sel.lng, sel.lat] } }] : [],
  }), [sel]);

  async function irAMiUbicacion() {
    setAviso(null);
    if (!(await pedirPermiso())) { setAviso("Active la ubicación del teléfono para verse en el mapa."); return; }
    const l = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null));
    if (!l) { setAviso("Todavía no hay señal del GPS. Párese en un lugar abierto."); return; }
    camara.current?.flyTo({ center: [l.coords.longitude, l.coords.latitude], zoom: 17, duration: 900 });
  }

  if (error) return <View style={{ flex: 1, backgroundColor: color.fondo, justifyContent: "center" }}><ErrorReintentar texto={error} onReintentar={() => setIntento(intento + 1)} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      {ruta ? (
        <Map style={{ flex: 1 }} mapStyle={estiloPijao(ruta)} logo={false} compass={false} scaleBar={false} attribution={false}
          accessibilityLabel={`Mapa de Pijao con ${visibles.length} viviendas`}
          onPress={() => setSel(null)}
          onLongPress={(e) => {
            const [lng, lat] = e.nativeEvent.lngLat ?? [];
            if (lat !== undefined) router.push({ pathname: "/registrar", params: { manualLat: String(lat), manualLng: String(lng) } });
          }}>
          <Camera ref={camara} initialViewState={{ center: CENTRO_PIJAO, zoom: 15 }} />
          <Images images={IMAGENES_MAPA} />
          <GeoJSONSource id="zonas" data={poligonos}>
            <Layer id="zonas-sombra" type="fill" style={{ fillColor: color.azulOceano, fillOpacity: 0.06 }} />
            <Layer id="zonas-borde" type="line" style={{ lineColor: color.azulOceano, lineWidth: 2.5, lineDasharray: [3, 2], lineOpacity: 0.85 }} />
          </GeoJSONSource>
          <GeoJSONSource id="seleccion" data={seleccion}>
            <Layer id="seleccion-halo" type="circle" style={{ circleColor: color.turquesa, circleOpacity: 0.22, circleRadius: 26 }} />
          </GeoJSONSource>
          <GeoJSONSource id="viviendas" data={puntos} cluster clusterRadius={42} clusterMaxZoom={16} clusterProperties={PROPIEDADES_GRUPO as never}
            onPress={(e) => {
              const f = e.nativeEvent.features?.[0];
              const id = f?.properties?.id as string | undefined;
              if (f?.properties?.cluster) {
                const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
                camara.current?.easeTo({ center: [lng, lat], zoom: 17, duration: 600 });
                return;
              }
              const v = viviendas.find((x) => x.id === id);
              if (v) setSel(v);
            }}>
            <Layer id="grupos" type="circle" filter={["has", "point_count"]} style={{
              circleColor: colorDominante(COLOR_GRUPO, color.azulOceano) as never,
              circleRadius: ["step", ["get", "point_count"], 18, 10, 22, 50, 27] as never,
              circleStrokeColor: modoSol ? color.negro : color.blanco, circleStrokeWidth: 3,
            }} />
            <Layer id="grupos-n" type="symbol" filter={["has", "point_count"]} style={{
              iconImage: NUMERO_GRUPO as never, iconSize: ESCALA_IMAGEN, iconAllowOverlap: true, iconIgnorePlacement: true,
            }} />
            <Layer id="por-enviar" type="symbol" filter={["all", ["!", ["has", "point_count"]], ["==", ["get", "pendiente"], true]]} style={{
              iconImage: "m-pendiente", iconSize: ESCALA_IMAGEN, iconAllowOverlap: true, iconIgnorePlacement: true,
            }} />
            <Layer id="puntos" type="symbol" filter={["!", ["has", "point_count"]]} style={{
              iconImage: ["get", "icono"] as never, iconSize: ESCALA_IMAGEN, iconAllowOverlap: true, iconIgnorePlacement: true,
            }} />
          </GeoJSONSource>
          <UserLocation accuracy animated />
        </Map>
      ) : <View style={{ flex: 1, backgroundColor: color.superficie }} />}

      {/* Arriba: buscador y filtros (P-09) */}
      <View pointerEvents="box-none" style={e.arriba}>
        <Pressable accessibilityRole="search" accessibilityLabel="Buscar dirección, vereda o persona" onPress={() => router.push("/buscar")}
          style={({ pressed }) => [e.buscador, pressed && { transform: [{ scale: 0.99 }] }]}>
          <Icono nombre="buscar" tam={20} color={color.textoSuave} />
          <Text style={e.buscadorTexto}>Buscar dirección o vereda</Text>
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          {FILTROS.map(([k, t]) => <Chip key={k} texto={t} activo={filtro === k} sombra onPress={() => setFiltro(k)} />)}
        </ScrollView>
        {aviso ? <Aviso tipo="alerta" texto={aviso} /> : null}
      </View>

      {/* Derecha: mi ubicación y leyenda */}
      <View pointerEvents="box-none" style={e.derecha}>
        <BotonIcono icono="ubicacion" etiqueta="Ir a mi ubicación" onPress={irAMiUbicacion} estilo={e.botonMapa} />
        <BotonIcono icono="capas" etiqueta={leyenda ? "Ocultar la leyenda" : "Ver la leyenda del mapa"} onPress={() => setLeyenda(!leyenda)} estilo={e.botonMapa} />
      </View>

      {leyenda ? (
        <View style={e.leyenda} accessible accessibilityLabel={`Leyenda: ${LEYENDA.map(([, t]) => t).join(", ")}`}>
          {LEYENDA.map(([img, t]) => (
            <View key={img} style={e.leyendaItem}>
              <Image source={IMAGENES_MAPA[img]} style={{ width: 18, height: 18 }} />
              <Text style={e.leyendaTexto}>{t}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {sel ? <FichaRapida v={sel} casa={casa} resumen={resumen} pendiente={pendientes.has(sel.id)} onCerrar={() => setSel(null)}
        onDetalle={() => { const id = sel.id; setSel(null); router.push(`/vivienda/${id}`); }}
        onVisita={() => { const id = sel.id; setSel(null); router.push({ pathname: "/visita", params: { vivienda: id } }); }} /> : null}
    </View>
  );
}

/** P-10: hoja que sube desde abajo con lo principal de la casa. */
function FichaRapida({ v, casa, resumen, pendiente, onCerrar, onDetalle, onVisita }: {
  v: V; casa: DatosCasa | null; resumen: ReturnType<typeof resumenCasa> | null; pendiente: boolean;
  onCerrar: () => void; onDetalle: () => void; onVisita: () => void;
}) {
  const sube = useRef(new Animated.Value(0)).current;
  const reducido = useMovimientoReducido();
  useEffect(() => {
    sube.setValue(0);
    Animated.timing(sube, { toValue: 1, duration: reducido ? 120 : 420, easing: curvaSuave, useNativeDriver: true }).start();
  }, [v.id, sube, reducido]);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar la ficha" onPress={onCerrar} style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color.velo, opacity: sube.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }) }]} />
      </Pressable>
      <Animated.View accessibilityViewIsModal style={[e.hoja, { opacity: sube, transform: [{ translateY: sube.interpolate({ inputRange: [0, 1], outputRange: [reducido ? 0 : 60, 0] }) }] }]}>
        <View style={e.asa} />
        <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          <FotoCasa vivienda={casa?.vivienda ?? v} foto={resumen?.fotoFachada ?? null} estilo={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 18 }} />
          <View style={{ gap: 4 }}>
            <TituloMedio>{resumen?.titulo ?? String(v.direccion ?? "Vivienda")}</TituloMedio>
            {resumen?.lugar ? <Text style={e.apoyo}>{resumen.lugar}</Text> : null}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Semaforo nivel={resumen?.calidad} />
            {resumen ? <Insignia texto={resumen.estado} tono={v.estado === "no_contactar" ? "rojo" : v.estado === "requiere_seguimiento" ? "naranja" : "azul"} /> : null}
            {pendiente ? <Insignia texto="Por enviar" tono="naranja" icono="nube" /> : null}
          </View>
          {resumen?.noContactar ? <Aviso tipo="error" icono="candado" texto="No volver: la familia pidió no ser contactada." /> : null}
          {resumen ? (
            <View style={e.tresColumnas}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={e.apoyo}>Última visita</Text>
                <Text style={e.fuerte}>{resumen.ultimaVisita?.split(" · ")[0] ?? "Ninguna"}</Text>
                {resumen.ultimaVisita?.includes(" · ") ? <Text style={e.apoyo}>{resumen.ultimaVisita.split(" · ").slice(1).join(" · ")}</Text> : null}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={e.apoyo}>Hogar</Text>
                <Text style={e.fuerte}>{resumen.totalPersonas ? `${resumen.totalPersonas} ${resumen.totalPersonas === 1 ? "persona" : "personas"}` : "Sin registrar"}</Text>
                {resumen.cabeza ? <Text style={e.apoyo} numberOfLines={2}>{resumen.cabeza}</Text> : null}
              </View>
            </View>
          ) : <Text style={e.apoyo}>Cargando la información de la casa…</Text>}
          {resumen?.necesidades.length ? (
            <View style={{ gap: 8 }}>
              <Text style={e.apoyo}>Necesidades</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {resumen.necesidades.map((n) => <Insignia key={n} texto={n} tono="turquesa" icono={ICONO_EJE[claveEje(n)] ?? "estrella"} />)}
              </View>
            </View>
          ) : null}
          <Boton texto="Ver detalles" onPress={onDetalle} />
          {v.estado !== "no_contactar" ? <Boton texto="Nueva visita" variante="contorno" onPress={onVisita} /> : null}
          <Enlace centrado texto="Cómo llegar" onPress={() => Linking.openURL(`geo:${v.lat},${v.lng}?q=${v.lat},${v.lng}`)} />
        </ScrollView>
      </Animated.View>
    </>
  );
}

// Las necesidades llegan con la etiqueta del catálogo; se busca su clave para el ícono del eje.
const ETIQUETA_A_CLAVE: Record<string, string> = {
  "Educación y conocimiento": "educacion", "Deporte y juventud": "deporte_juventud", "Campo y café": "campo_cafe", "Vivienda y entorno": "vivienda_entorno",
  "Bienestar animal": "bienestar_animal", "Vías, movilidad y conectividad": "vias_movilidad", "Agua y medio ambiente": "agua_ambiente",
  "Turismo y cultura": "turismo_cultura", "Salud y bienestar": "salud", "Seguridad y convivencia": "seguridad",
  "Empleo y emprendimiento": "empleo_emprendimiento", "Atención a poblaciones específicas": "poblaciones", "Gobierno cercano y transparente": "gobierno_cercano",
};
const claveEje = (etiqueta: string) => ETIQUETA_A_CLAVE[etiqueta] ?? "otro";

const flotante = { borderWidth: 1, borderColor: color.borde, backgroundColor: color.tarjeta, ...sombra.flotante };
const e = StyleSheet.create({
  arriba: { position: "absolute", top: 10, left: 14, right: 14, gap: 10 },
  buscador: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, paddingHorizontal: 16, borderRadius: radio.pastilla, ...flotante },
  buscadorTexto: { flex: 1, fontFamily: fuente.textoMedio, fontSize: tl(16), color: color.textoSuave },
  derecha: { position: "absolute", right: 14, top: 132, gap: 10 },
  botonMapa: { borderRadius: 16, ...flotante },
  leyenda: { position: "absolute", left: 14, right: 70, bottom: 104, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  leyendaItem: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: radio.pastilla, borderWidth: 1, borderColor: color.borde, backgroundColor: color.tarjeta },
  leyendaTexto: { fontFamily: fuente.tituloMedio, fontSize: tl(12), color: color.texto },
  hoja: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "82%", backgroundColor: color.tarjeta, borderTopLeftRadius: radio.barra, borderTopRightRadius: radio.barra,
    borderTopWidth: 1, borderColor: color.borde, paddingTop: 10, paddingHorizontal: espacio.xl, ...sombra.flotante },
  asa: { width: 44, height: 5, borderRadius: 3, backgroundColor: color.bordeControl, alignSelf: "center", marginBottom: 14 },
  tresColumnas: { flexDirection: "row", gap: 16, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.borde },
  apoyo: { fontFamily: fuente.textoMedio, fontSize: tl(14), lineHeight: tl(20), color: color.textoSuave },
  fuerte: { fontFamily: fuente.textoFuerte, fontSize: tl(16), lineHeight: tl(24), color: color.texto },
});
