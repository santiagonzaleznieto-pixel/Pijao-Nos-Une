// Barra inferior (18.1): Inicio · Mapa · [+ Registrar aquí] · Tareas · Más. Franja superior con conexión y pendientes.
import { Tabs, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useApp } from "@/servicios/contexto";
import { color, espacio, letra } from "@/ui/tema";

function Franja() {
  const { conectado, cola, ultimaSyncEn } = useApp();
  const router = useRouter();
  const hace = ultimaSyncEn ? Math.round((Date.now() - new Date(ultimaSyncEn).getTime()) / 60000) : null;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push("/pendientes")}
      style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: conectado ? color.azul : color.textoSuave, paddingHorizontal: espacio.l, paddingVertical: espacio.xs }}>
      <Text style={{ color: color.blanco, fontSize: letra.pequena }}>
        {conectado ? (hace === null ? "Conectado" : `Actualizado hace ${hace} min`) : "Sin señal · todo se guarda en el teléfono"}
      </Text>
      <Text style={{ color: color.blanco, fontSize: letra.pequena, fontWeight: "700" }}>
        {cola.pendientes ? `${cola.pendientes} por enviar` : ""}{cola.cuarentena ? ` · ${cola.cuarentena} por revisar` : ""}
      </Text>
    </Pressable>
  );
}

const icono = (t: string) => ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 20, color: focused ? color.azul : color.textoSuave }}>{t}</Text>
);

export default function Pestanas() {
  const router = useRouter();
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingTop: 28, backgroundColor: color.azul }}><Franja /></View>
      <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: color.azul, tabBarLabelStyle: { fontSize: 13 }, tabBarStyle: { height: 64, paddingBottom: 8 } }}>
        <Tabs.Screen name="inicio" options={{ title: "Inicio", tabBarIcon: icono("⌂") }} />
        <Tabs.Screen name="mapa" options={{ title: "Mapa", tabBarIcon: icono("◎") }} />
        <Tabs.Screen
          name="nuevo"
          options={{
            title: "Registrar",
            tabBarButton: () => (
              <Pressable accessibilityRole="button" accessibilityLabel="Registrar aquí" onPress={() => router.push("/registrar")}
                style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <View style={{ backgroundColor: color.naranja, width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginTop: -18, elevation: 4 }}>
                  <Text style={{ color: color.blanco, fontSize: 32, fontWeight: "700" }}>+</Text>
                </View>
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen name="tareas" options={{ title: "Tareas", tabBarIcon: icono("✓") }} />
        <Tabs.Screen name="mas" options={{ title: "Más", tabBarIcon: icono("☰") }} />
      </Tabs>
    </View>
  );
}
