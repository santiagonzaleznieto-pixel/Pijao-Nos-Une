// P-11 «Registrar aquí» (5.4, 5.5): muestreo del GPS, precisión (R-10), duplicados a menos de 15 m (R-08),
// «No contactar» (R-21), distancia máxima (R-09) y ubicación manual con motivo hasta 100 m (R-12).
// Diseño de la Fase 2: ondas mientras se toma la ubicación (2.7) y barra de precisión de tres tramos.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { opciones } from "@/core/catalogos";
import { cercanos, haversineM } from "@/core/geo";
import { clasificarUbicacionManual, gpsAceptable, param } from "@/core/reglas";
import { metricasGps } from "@/core/metricas";
import { borradorVacio } from "@/core/visita";
import { guardarBorrador } from "@/servicios/campo";
import { useApp } from "@/servicios/contexto";
import { calidadSenal, muestrear, pedirPermiso, type Lectura } from "@/servicios/gps";
import { Aviso, Avatar, Boton, Enlace, Etiqueta, ItemLista, Opciones, Pantalla, Seccion, TituloMedio, Vacio } from "@/ui/componentes";
import { useMovimientoReducido } from "@/ui/movimiento";
import { color, fuente, tl } from "@/ui/tema";

type V = { id: string; lat: number; lng: number; direccion?: string; estado?: string; barrio_vereda?: string };

/** Tres ondas que salen del punto mientras el GPS lee (se detienen al terminar). */
function Ondas({ activas }: { activas: boolean }) {
  const ondas = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const reducido = useMovimientoReducido();
  useEffect(() => {
    if (!activas || reducido) { ondas.forEach((o) => o.setValue(0)); return; }
    const bucles = ondas.map((o, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 800), Animated.timing(o, { toValue: 1, duration: 2400, useNativeDriver: true }), Animated.timing(o, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])));
    bucles.forEach((b) => b.start());
    return () => bucles.forEach((b) => b.stop());
  }, [activas, reducido, ondas]);
  return (
    <View style={{ width: 168, height: 168, alignSelf: "center", alignItems: "center", justifyContent: "center" }} accessible={false}>
      {ondas.map((o, i) => (
        <Animated.View key={i} style={{ position: "absolute", width: 168, height: 168, borderRadius: 84, borderWidth: 2, borderColor: color.turquesa,
          opacity: o.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.8, 0] }), transform: [{ scale: o.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }) }] }} />
      ))}
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: color.azulOceano, borderWidth: 5, borderColor: color.fondo }} />
    </View>
  );
}

/** Barra de precisión: tres tramos (débil, regular, buena). */
function Precision({ metros }: { metros: number | null | undefined }) {
  const c = calidadSenal(metros);
  const n = c === "buena" ? 3 : c === "regular" ? 2 : metros == null ? 0 : 1;
  const tinta = n === 3 ? color.textoVerde : n === 2 ? color.textoNaranja : color.textoRojo;
  return (
    <Seccion>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: fuente.textoFuerte, fontSize: tl(16), color: color.texto }}>Precisión</Text>
        <Text style={{ fontFamily: fuente.textoFuerte, fontSize: tl(16), color: tinta }}>{metros == null ? "Esperando señal" : `±${Math.round(metros)} m · ${c}`}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 6 }} accessible accessibilityLabel={`Señal ${c}`}>
        {[1, 2, 3].map((i) => <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i <= n ? tinta : color.superficiePanel }} />)}
      </View>
    </Seccion>
  );
}

export default function Registrar() {
  const app = useApp();
  const router = useRouter();
  const q = useLocalSearchParams<{ manualLat?: string; manualLng?: string }>();
  const manual = q.manualLat ? { lat: Number(q.manualLat), lng: Number(q.manualLng) } : null;
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [midiendo, setMidiendo] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [duplicados, setDuplicados] = useState<{ punto: V; distancia: number }[]>([]);
  const [motivo, setMotivo] = useState<string | null>(null);
  const segundos = param(app.params, "gps_muestreo_seg");
  const radioDup = param(app.params, "radio_duplicados_m");

  useEffect(() => {
    (async () => {
      if (!(await pedirPermiso())) { setSinPermiso(true); setMidiendo(false); app.metrica("gps_error", null, "sin_permiso"); return; }
      const l = await muestrear(segundos, setLectura);
      setLectura(l);
      setMidiendo(false);
      // 22.3: errores de GPS y precisión para las métricas del piloto (sin coordenadas).
      for (const m of metricasGps(l, gpsAceptable(l?.precision_m, app.params))) app.metrica(m.tipo, m.valor ?? null, m.detalle ?? null);
      const punto = manual ?? l;
      if (punto) {
        const viviendas = (await app.almacen.listar("viviendas")) as V[];
        setDuplicados(cercanos(viviendas, punto.lat, punto.lng, radioDup));
      }
    })();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const punto = manual ?? lectura;
  const precisionOk = gpsAceptable(lectura?.precision_m, app.params);
  const distanciaManual = manual && lectura ? haversineM(lectura.lat, lectura.lng, manual.lat, manual.lng) : 0;
  const diferido = manual ? clasificarUbicacionManual(distanciaManual, app.params) === "diferido" : false;
  const bloqueadaNoContactar = duplicados.some((d) => d.punto.estado === "no_contactar" && d.distancia <= 5);

  async function nueva() {
    if (!punto || !app.usuarioId) return;
    const b = borradorVacio(app.usuarioId, { lat: punto.lat, lng: punto.lng, precision_m: manual ? null : lectura?.precision_m, altitud_m: lectura?.altitud_m, manual: Boolean(manual) });
    if (manual) { b.visita.motivo_manual = motivo; b.visita.ubicacion_manual = true; }
    b.dispositivo = { lat: lectura?.lat, lng: lectura?.lng, precision_m: lectura?.precision_m, ubicacion_simulada: lectura?.simulada };
    await guardarBorrador(app.almacen, b);
    router.replace({ pathname: "/visita", params: { borrador: b.id } });
  }

  if (sinPermiso) {
    return <Pantalla><Vacio icono="pin" tono="naranja" titulo="Falta el permiso de ubicación" texto="La app necesita su ubicación para registrar la visita en el punto exacto de la casa. Actívela en los ajustes del teléfono." /></Pantalla>;
  }

  return (
    <Pantalla
      pie={<>
        <Boton texto={duplicados.length ? "Es otra casa: registrar nueva" : "Registrar esta vivienda"} onPress={nueva}
          deshabilitado={midiendo || !punto || bloqueadaNoContactar || (!manual && !precisionOk) || (Boolean(manual) && !motivo)} />
        {!manual ? <Enlace centrado texto="Marcar el punto a mano en el mapa" onPress={() => router.replace("/mapa")} /> : null}
      </>}>
      <Ondas activas={midiendo} />
      <View style={{ gap: 4, alignItems: "center" }}>
        <TituloMedio>{manual ? "Ubicación manual" : midiendo ? "Tomando ubicación…" : "Ubicación tomada"}</TituloMedio>
        <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(14), color: color.textoSuave, textAlign: "center" }}>
          {midiendo ? "Quédese quieto frente a la casa unos segundos." : manual ? `Punto elegido en el mapa a ${Math.round(distanciaManual)} m de usted.` : "Revise que la precisión sea buena antes de seguir."}
        </Text>
      </View>
      <Precision metros={lectura?.precision_m} />
      {lectura?.simulada ? <Aviso tipo="error" texto="El teléfono reporta una ubicación simulada. El registro quedará en revisión." /> : null}
      {!midiendo && !manual && !precisionOk ? (
        <Aviso tipo="alerta" texto={`La señal del GPS está débil (más de ${param(app.params, "precision_min_m")} m). Muévase a un lugar abierto y vuelva a intentarlo, o mantenga presionado el punto exacto en el mapa.`} />
      ) : null}
      {manual ? (
        <>
          {diferido ? <Aviso tipo="alerta" texto="Está a más de 100 m: el registro quedará como borrador pendiente de aprobación (R-12)." /> : null}
          <Opciones etiqueta="Motivo de la ubicación manual" opciones={opciones("C-20")} valor={motivo} onCambio={(v) => setMotivo(v as string)} />
        </>
      ) : null}
      {bloqueadaNoContactar ? <Aviso tipo="error" icono="candado" texto="Esta vivienda pidió no ser contactada. No la visite (R-21)." /> : null}
      {duplicados.length && !bloqueadaNoContactar ? (
        <View>
          <Etiqueta>{`¿Es una de estas casas? · a menos de ${radioDup} m`}</Etiqueta>
          {duplicados.map((d, i) => {
            const noContactar = d.punto.estado === "no_contactar";
            return (
              <ItemLista key={d.punto.id} titulo={d.punto.direccion ?? "Sin dirección"} ultimo={i === duplicados.length - 1}
                detalle={`${Math.round(d.distancia)} m${noContactar ? " · pidió no ser contactada" : d.punto.barrio_vereda ? ` · ${d.punto.barrio_vereda}` : ""}`}
                izquierda={<Avatar icono={noContactar ? "candado" : "casa"} tono={noContactar ? "rojo" : "azul"} />}
                derecha={noContactar ? <View /> : <Text style={{ fontFamily: fuente.tituloMedio, fontSize: tl(15), color: color.azulOceano }}>Agregar visita</Text>}
                onPress={noContactar ? undefined : () => router.replace({ pathname: "/visita", params: { vivienda: d.punto.id } })} />
            );
          })}
        </View>
      ) : null}
    </Pantalla>
  );
}
