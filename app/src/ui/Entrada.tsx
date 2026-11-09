// Entrada de la app (2.7): el anillo de cuatro colores se dibuja, el logo llega desde la izquierda, PIJAO · NOS · UNE sube
// por líneas, se traza la línea fina y aparece el mensaje corto. Unos 4 segundos, una vez por apertura. Con «reducir
// movimiento» dura menos de un segundo y sin desplazamientos. Solo transform, opacity y el trazo de los arcos.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import { curvaAfilada, curvaSuave, useMovimientoReducido } from "./movimiento";
import { color, degradado, fuente } from "./tema";

const PathAnimado = Animated.createAnimatedComponent(Path);
const LARGO_ARCO = 141;   // 84° de un círculo de radio 96
const ARCOS = [
  { d: "M115.02 14.13 A96 96 0 0 1 205.87 104.98", c: degradado[0] },
  { d: "M205.87 115.02 A96 96 0 0 1 115.02 205.87", c: degradado[1] },
  { d: "M104.98 205.87 A96 96 0 0 1 14.13 115.02", c: degradado[2] },
  { d: "M14.13 104.98 A96 96 0 0 1 104.98 14.13", c: degradado[3] },
];
const rebote = Easing.bezier(0.34, 1.56, 0.64, 1);

function Marca({ texto, alto }: { texto: string; alto: number }) {
  return (
    <Svg width={230} height={alto} accessible={false}>
      <Defs>
        <LinearGradient id={`g-${texto}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={degradado[0]} />
          <Stop offset="0.45" stopColor={degradado[1]} />
          <Stop offset="0.72" stopColor={degradado[2]} />
          <Stop offset="1" stopColor={degradado[3]} />
        </LinearGradient>
      </Defs>
      <SvgText x="115" y={alto - 8} textAnchor="middle" fontFamily={fuente.marca} fontSize="46" letterSpacing="1" fill={`url(#g-${texto})`}>{texto}</SvgText>
    </Svg>
  );
}

export function Entrada({ alTerminar }: { alTerminar: () => void }) {
  const reducido = useMovimientoReducido();
  const arcos = useRef(ARCOS.map(() => new Animated.Value(0))).current;
  const logo = useRef(new Animated.Value(0)).current;
  const lineas = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const trazo = useRef(new Animated.Value(0)).current;
  const mensaje = useRef(new Animated.Value(0)).current;
  const salida = useRef(new Animated.Value(0)).current;

  const terminada = useRef(false);
  const [saliendo, setSaliendo] = useState(false);
  const terminar = () => { if (!terminada.current) { terminada.current = true; alTerminar(); } };

  useEffect(() => {
    const t = (v: Animated.Value, ms: number, delay: number, easing = curvaSuave, nativo = true) =>
      Animated.timing(v, { toValue: 1, duration: reducido ? 150 : ms, delay: reducido ? 0 : delay, easing, useNativeDriver: nativo });
    Animated.parallel([
      ...arcos.map((a, i) => t(a, 600, 50 + i * 150, curvaSuave, false)),
      t(logo, 1000, 450, rebote),
      ...lineas.map((l, i) => t(l, 800, 1100 + i * 120)),
      t(trazo, 900, 2250),
      t(mensaje, 600, 2150),
    ]).start();
    const espera = reducido ? 700 : 3600;
    const sale = reducido ? 150 : 550;
    const fin = setTimeout(() => {
      setSaliendo(true);   // mientras se desvanece ya deja tocar lo que hay debajo
      Animated.timing(salida, { toValue: 1, duration: sale, easing: curvaAfilada, useNativeDriver: true }).start(() => terminar());
    }, espera);
    // Respaldo: aunque el teléfono no avise el final de la animación, la capa se quita y nunca bloquea la app.
    const tope = setTimeout(terminar, espera + sale + 500);
    return () => { clearTimeout(fin); clearTimeout(tope); };
  }, [reducido]);  // eslint-disable-line react-hooks/exhaustive-deps

  const desplazar = (v: Animated.Value, desde: number) => (reducido ? 0 : v.interpolate({ inputRange: [0, 1], outputRange: [desde, 0] }));
  return (
    <Animated.View accessible accessibilityLabel="Pijao Nos Une. Juntos, casa por casa." pointerEvents={saliendo ? "none" : "auto"} style={[StyleSheet.absoluteFill, e.raiz,
      { opacity: salida.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ translateX: salida.interpolate({ inputRange: [0, 1], outputRange: [0, reducido ? 0 : 60] }) }] }]}>
      <View style={{ width: 220, height: 220 }}>
        <Svg width={220} height={220} viewBox="0 0 220 220" style={StyleSheet.absoluteFill}>
          {ARCOS.map((a, i) => (
            <PathAnimado key={a.d} d={a.d} stroke={a.c} strokeWidth={5} strokeLinecap="round" fill="none" strokeDasharray={[LARGO_ARCO, LARGO_ARCO]}
              strokeDashoffset={arcos[i].interpolate({ inputRange: [0, 1], outputRange: [LARGO_ARCO, 0] })} />
          ))}
        </Svg>
        <Animated.View style={[e.logo, {
          opacity: logo.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
          transform: [
            { translateX: desplazar(logo, -170) },
            { rotate: reducido ? "0deg" : logo.interpolate({ inputRange: [0, 1], outputRange: ["-16deg", "0deg"] }) },
            { scale: reducido ? 1 : logo.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
          ],
        }]}>
          <Image source={require("../../assets/images/logo-circular.jpg")} style={{ width: 183, height: 183, marginLeft: -17, marginTop: -14 }} accessibilityIgnoresInvertColors />
        </Animated.View>
      </View>

      <View style={{ marginTop: 26, alignItems: "center" }}>
        <View style={e.ranura}><Animated.View style={{ transform: [{ translateY: desplazar(lineas[0], 56) }] }}><Marca texto="PIJAO" alto={54} /></Animated.View></View>
        <View style={[e.ranura, { height: 28 }]}><Animated.Text style={[e.nos, { transform: [{ translateY: desplazar(lineas[1], 28) }] }]}>NOS</Animated.Text></View>
        <View style={e.ranura}><Animated.View style={{ transform: [{ translateY: desplazar(lineas[2], 56) }] }}><Marca texto="UNE" alto={54} /></Animated.View></View>
      </View>

      <Animated.View style={[e.trazo, { transform: [{ scaleX: trazo }] }]}>
        {degradado.map((c) => <View key={c} style={{ flex: 1, backgroundColor: c }} />)}
      </Animated.View>
      <Animated.View style={{ opacity: mensaje, transform: [{ translateY: desplazar(mensaje, 14) }] }}>
        <Text style={e.mensaje}>Juntos, casa por casa.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const e = StyleSheet.create({
  raiz: { backgroundColor: color.fondo, alignItems: "center", justifyContent: "center", zIndex: 50 },
  logo: { position: "absolute", left: 35, top: 35, width: 150, height: 150, borderRadius: 75, overflow: "hidden", backgroundColor: "#FFFFFF",
    shadowColor: "#163F86", shadowOpacity: 0.16, shadowRadius: 17, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  ranura: { height: 54, overflow: "hidden", alignItems: "center" },
  nos: { fontFamily: fuente.tituloMedio, fontSize: 20, letterSpacing: 6.4, color: color.texto, paddingLeft: 6.4 },
  trazo: { flexDirection: "row", width: 120, height: 3, borderRadius: 2, overflow: "hidden", marginTop: 22 },
  mensaje: { marginTop: 16, fontFamily: fuente.tituloMedio, fontSize: 16, letterSpacing: 0.6, color: color.textoSuave },
});
