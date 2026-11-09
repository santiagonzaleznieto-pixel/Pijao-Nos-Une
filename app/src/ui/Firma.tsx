// Firma en pantalla con el dedo (6.3, paso 10). La evidencia son los trazos (no una imagen): el servidor exige que no
// esté vacía (A1). Sin librerías de pago: react-native-svg (MIT).
import { useRef, useState } from "react";
import { PanResponder, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Boton } from "./componentes";
import { color, radio } from "./tema";

type Trazo = [number, number][];

export function Firma({ alCambiar }: { alCambiar: (trazos: Trazo[] | null) => void }) {
  const [trazos, setTrazos] = useState<Trazo[]>([]);
  const actual = useRef<Trazo>([]);
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => { actual.current = [[Math.round(e.nativeEvent.locationX), Math.round(e.nativeEvent.locationY)]]; },
    onPanResponderMove: (e) => {
      actual.current.push([Math.round(e.nativeEvent.locationX), Math.round(e.nativeEvent.locationY)]);
      setTrazos((t) => [...t.slice(0, -0 || undefined)]);   // repinta el trazo en curso
    },
    onPanResponderRelease: () => {
      const t = actual.current;
      actual.current = [];
      if (t.length > 2) setTrazos((prev) => { const n = [...prev, t]; alCambiar(n); return n; });
    },
  })).current;
  const camino = (t: Trazo) => t.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  return (
    <View>
      <View {...responder.panHandlers} accessibilityLabel="Espacio para firmar con el dedo"
        style={{ height: 180, backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, borderRadius: radio.m }}>
        <Svg width="100%" height="100%">
          {[...trazos, actual.current].map((t, i) => <Path key={i} d={camino(t)} stroke={color.negro} strokeWidth={3} fill="none" />)}
        </Svg>
      </View>
      <Boton texto="Borrar firma" variante="suave" onPress={() => { setTrazos([]); alCambiar(null); }} />
    </View>
  );
}
