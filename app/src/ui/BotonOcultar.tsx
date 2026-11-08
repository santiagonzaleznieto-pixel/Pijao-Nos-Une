// 5.16: botón «Ocultar pantalla». Si alguien se acerca a mirar, un toque tapa todo; para volver se confirma con huella o rostro.
import { Pressable } from "react-native";
import { useApp } from "@/servicios/contexto";
import { Icono } from "@/ui/Icono";
import { color } from "@/ui/tema";

export function BotonOcultar({ tam = 44 }: { tam?: number }) {
  const app = useApp();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Ocultar pantalla" onPress={app.ocultarPantalla} hitSlop={6}
      style={({ pressed }) => ({
        width: tam, height: tam, borderRadius: tam / 2, borderWidth: 1, borderColor: color.borde, backgroundColor: color.fondo,
        alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.94 : 1 }],
      })}>
      <Icono nombre="ocultar" tam={20} color={color.texto} />
    </Pressable>
  );
}
