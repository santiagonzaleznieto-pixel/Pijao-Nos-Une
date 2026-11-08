// Barra inferior flotante (18.1): Inicio · Mapa · [Registrar aquí] · Tareas · Más, con la pastilla que se desliza.
// Franja superior con la conexión, lo que falta por enviar y «Ocultar pantalla».
import { Tabs, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/servicios/contexto";
import { BotonOcultar } from "@/ui/BotonOcultar";
import { Icono, type NombreIcono } from "@/ui/Icono";
import { color, fuente, radio, sombra } from "@/ui/tema";

function PuntoEstado({ conectado }: { conectado: boolean }) {
  const onda = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!conectado) return;
    const bucle = Animated.loop(Animated.timing(onda, { toValue: 1, duration: 2000, useNativeDriver: true }));
    bucle.start();
    return () => bucle.stop();
  }, [conectado, onda]);
  const fondo = conectado ? color.conectado : color.sinSenal;
  return (
    <View style={{ width: 8, height: 8 }}>
      {conectado ? <Animated.View style={{ position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: fondo,
        opacity: onda.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }), transform: [{ scale: onda.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }] }} /> : null}
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: fondo }} />
    </View>
  );
}

function Franja() {
  const { conectado, cola, ultimaSyncEn } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hace = ultimaSyncEn ? Math.round((Date.now() - new Date(ultimaSyncEn).getTime()) / 60000) : null;
  const estado = conectado ? (hace === null ? "Conectado" : `Actualizado hace ${hace} min`) : "Sin señal · todo se guarda";
  const pendientes = `${cola.pendientes ? ` · ${cola.pendientes} por enviar` : ""}${cola.cuarentena ? ` · ${cola.cuarentena} por revisar` : ""}`;
  return (
    <View style={{ paddingTop: insets.top + 6, paddingBottom: 8, paddingHorizontal: 18, backgroundColor: color.fondo, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${estado}${pendientes}. Ver pendientes`} onPress={() => router.push("/pendientes")}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "flex-start", paddingVertical: 7, paddingLeft: 12, paddingRight: 14,
          borderRadius: radio.pastilla, borderWidth: 1, borderColor: color.borde, backgroundColor: color.superficie }}>
        <PuntoEstado conectado={conectado} />
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: fuente.textoMedio, fontSize: 13, color: color.texto }}>{estado}{pendientes}</Text>
      </Pressable>
      <BotonOcultar />
    </View>
  );
}

const ITEMS: Record<string, { titulo: string; icono: NombreIcono }> = {
  inicio: { titulo: "Inicio", icono: "casa" },
  mapa: { titulo: "Mapa", icono: "mapa" },
  tareas: { titulo: "Tareas", icono: "tareas" },
  mas: { titulo: "Más", icono: "menu" },
};

type PropsBarra = { state: { index: number; routes: { key: string; name: string }[] }; navigation: { navigate: (nombre: string) => void } };

function BarraInferior({ state, navigation }: PropsBarra) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [ancho, setAncho] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const celda = ancho / Math.max(1, state.routes.length);
  useEffect(() => {
    if (!celda) return;
    Animated.spring(x, { toValue: state.index * celda + (celda - 56) / 2, useNativeDriver: true, speed: 14, bounciness: 7 }).start();
  }, [state.index, celda, x]);
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 14, right: 14, bottom: Math.max(16, insets.bottom + 8) }}>
      <View onLayout={(ev) => setAncho(ev.nativeEvent.layout.width)}
        style={[{ height: 70, borderRadius: radio.barra, backgroundColor: color.fondo, borderWidth: 1, borderColor: color.borde, flexDirection: "row", alignItems: "center" }, sombra.flotante]}>
        {celda ? <Animated.View pointerEvents="none" style={{ position: "absolute", top: 9, left: 0, width: 56, height: 50, borderRadius: 16, backgroundColor: color.tinteAzul, transform: [{ translateX: x }] }} /> : null}
        {state.routes.map((r, i) => {
          if (r.name === "nuevo") {
            return (
              <View key={r.key} style={{ flex: 1, alignItems: "center" }}>
                <Pressable accessibilityRole="button" accessibilityLabel="Registrar aquí" onPress={() => router.push("/registrar")}
                  style={({ pressed }) => [{ width: 54, height: 54, borderRadius: 18, backgroundColor: color.naranja, alignItems: "center", justifyContent: "center",
                    transform: [{ scale: pressed ? 0.94 : 1 }] }, sombra.accion]}>
                  <Icono nombre="mas" tam={24} color={color.sobreNaranja} grosor={2.6} />
                </Pressable>
              </View>
            );
          }
          const item = ITEMS[r.name] ?? { titulo: r.name, icono: "casa" as NombreIcono };
          const activa = state.index === i;
          const tinta = activa ? color.texto : color.textoSuave;
          return (
            <Pressable key={r.key} accessibilityRole="tab" accessibilityState={{ selected: activa }} accessibilityLabel={item.titulo}
              onPress={() => navigation.navigate(r.name)} style={{ flex: 1, minHeight: 56, alignItems: "center", justifyContent: "center", gap: 3 }}>
              <Icono nombre={item.icono} tam={22} color={tinta} grosor={activa ? 2.2 : 2} />
              <Text style={{ fontFamily: fuente.tituloMedio, fontSize: 12, color: tinta }}>{item.titulo}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function Pestanas() {
  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <Franja />
      <Tabs tabBar={(props) => <BarraInferior {...(props as unknown as PropsBarra)} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="inicio" options={{ title: "Inicio" }} />
        <Tabs.Screen name="mapa" options={{ title: "Mapa" }} />
        <Tabs.Screen name="nuevo" options={{ title: "Registrar" }} />
        <Tabs.Screen name="tareas" options={{ title: "Tareas" }} />
        <Tabs.Screen name="mas" options={{ title: "Más" }} />
      </Tabs>
    </View>
  );
}
