// Raíz de la app: proveedor de datos, guardián de acceso (4.9) y capas de seguridad (bloqueo, actualización obligatoria).
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ProveedorApp, useApp } from "@/servicios/contexto";
import { Boton, Cargando, Pantalla, Texto } from "@/ui/componentes";
import { color, espacio, letra } from "@/ui/tema";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const PUBLICAS = new Set(["entrar", "registro"]);

function Guardian() {
  const app = useApp();
  const segmentos = useSegments();
  const router = useRouter();
  const ruta = segmentos[0] ?? "";

  useEffect(() => {
    if (!app.listo) return;
    SplashScreen.hideAsync().catch(() => undefined);
    if (!app.usuarioId) { if (!PUBLICAS.has(ruta)) router.replace("/entrar"); return; }
    if (!app.perfil) return;
    const estado = app.perfil.d.estado;
    if (!app.practica && (estado === "pendiente" || estado === "suspendido" || estado === "baja")) { if (ruta !== "cuenta") router.replace("/cuenta"); return; }
    if (!app.practica && estado === "aprobado") { if (ruta !== "ingreso") router.replace("/ingreso"); return; }
    if (PUBLICAS.has(ruta) || ruta === "cuenta" || ruta === "ingreso") router.replace("/inicio");
  }, [app.listo, app.usuarioId, app.perfil, app.practica, ruta, router]);

  if (!app.listo) return <Cargando />;

  if (app.bloqueado) {
    return (
      <Pantalla titulo="Pijao nos une">
        <Texto>La app se bloqueó por seguridad tras unos minutos sin uso.</Texto>
        <Boton texto="Desbloquear con huella o rostro" onPress={app.desbloquear} />
      </Pantalla>
    );
  }
  if (app.actualizacionObligatoria) {
    return (
      <Pantalla titulo="Actualización obligatoria">
        <Texto>Hay una versión nueva con cambios de seguridad. Descárguela desde el enlace que le envió el Director e instálela encima de esta.</Texto>
        <Texto negrita>No desinstale la app: perdería los registros que todavía no se han enviado.</Texto>
      </Pantalla>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {app.practica ? (
        <View accessibilityRole="alert" style={{ backgroundColor: color.amarillo, paddingTop: 36, paddingBottom: espacio.xs }}>
          <Text style={{ textAlign: "center", fontWeight: "700", fontSize: letra.normal, color: color.texto }}>MODO PRÁCTICA · datos de ejemplo</Text>
        </View>
      ) : null}
      <Stack screenOptions={{ headerTintColor: color.azul, headerTitleStyle: { fontWeight: "700" }, contentStyle: { backgroundColor: color.fondo } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="entrar" options={{ headerShown: false }} />
        <Stack.Screen name="registro" options={{ title: "Crear cuenta" }} />
        <Stack.Screen name="cuenta" options={{ headerShown: false }} />
        <Stack.Screen name="ingreso" options={{ title: "Ingreso al equipo" }} />
        <Stack.Screen name="verificacion" options={{ title: "Verificación en dos pasos" }} />
        <Stack.Screen name="registrar" options={{ title: "Registrar aquí" }} />
        <Stack.Screen name="visita" options={{ title: "Nueva visita" }} />
        <Stack.Screen name="vivienda/[id]" options={{ title: "Vivienda" }} />
        <Stack.Screen name="persona/[id]" options={{ title: "Persona" }} />
        <Stack.Screen name="buscar" options={{ title: "Buscar" }} />
        <Stack.Screen name="pendientes" options={{ title: "Mis visitas y pendientes" }} />
        <Stack.Screen name="perfil" options={{ title: "Mi perfil" }} />
        <Stack.Screen name="titulares" options={{ title: "Derechos de los titulares" }} />
        <Stack.Screen name="carnet" options={{ title: "Carnet digital" }} />
        <Stack.Screen name="anuncios" options={{ title: "Anuncios" }} />
      </Stack>
    </View>
  );
}

export default function Raiz() {
  return (
    <SafeAreaProvider>
      <ProveedorApp>
        <Guardian />
      </ProveedorApp>
    </SafeAreaProvider>
  );
}
