// 5.16: botón «Ocultar pantalla». Si alguien se acerca a mirar, un toque tapa todo; para volver se confirma con huella o rostro.
import { Pressable, Text } from "react-native";
import { useApp } from "@/servicios/contexto";
import { color, letra } from "@/ui/tema";

export function BotonOcultar({ claro }: { claro?: boolean }) {
  const app = useApp();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Ocultar pantalla" onPress={app.ocultarPantalla} hitSlop={10}
      style={{ paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: claro ? color.blanco : color.azul, fontSize: letra.pequena, fontWeight: "700" }}>Ocultar</Text>
    </Pressable>
  );
}
