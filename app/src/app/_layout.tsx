// Raíz de la app: proveedor de datos, guardián de acceso (4.9) y capas de seguridad (bloqueo, actualización obligatoria).
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold, Montserrat_900Black } from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { debeAceptarAcuerdos } from "@/core/acceso";
import { ProveedorApp, useApp } from "@/servicios/contexto";
import { BotonOcultar } from "@/ui/BotonOcultar";
import { Entrada } from "@/ui/Entrada";
import { Boton, Cargando, Pantalla, Texto } from "@/ui/componentes";
import { color, espacio, fuente } from "@/ui/tema";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const PUBLICAS = new Set(["entrar", "registro", "recuperar"]);

let entradaVista = false;   // la entrada se ve una vez por apertura de la app

function Guardian() {
  const app = useApp();
  const [fuentesListas] = useFonts({
    Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold, Montserrat_900Black, Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
  });
  const [mostrarEntrada, setMostrarEntrada] = useState(!entradaVista);
  const segmentos = useSegments();
  const router = useRouter();
  const ruta = segmentos[0] ?? "";

  useEffect(() => {
    if (!app.listo || !fuentesListas) return;
    SplashScreen.hideAsync().catch(() => undefined);
    if (!app.usuarioId) { if (!PUBLICAS.has(ruta)) router.replace("/entrar"); return; }
    if (ruta === "recuperar") return;   // P-07: al verificar el código ya hay sesión, pero falta poner la contraseña nueva
    if (!app.perfil) return;
    const estado = app.perfil.d.estado;
    if (!app.practica && (estado === "pendiente" || estado === "suspendido" || estado === "baja")) { if (ruta !== "cuenta") router.replace("/cuenta"); return; }
    if (!app.practica && estado === "aprobado") { if (ruta !== "ingreso") router.replace("/ingreso"); return; }
    if (!app.practica && debeAceptarAcuerdos(app.perfil.d, app.conectado)) { if (ruta !== "acuerdos") router.replace("/acuerdos"); return; }
    if (PUBLICAS.has(ruta) || ruta === "cuenta" || ruta === "ingreso" || ruta === "acuerdos") router.replace("/inicio");
  }, [app.listo, fuentesListas, app.usuarioId, app.perfil, app.practica, app.conectado, ruta, router]);

  if (!fuentesListas) return null;   // la pantalla de inicio del sistema sigue visible mientras cargan las letras
  if (!app.listo) return <Cargando />;

  if (app.bloqueado) {
    return (
      <View style={{ flex: 1, backgroundColor: color.fondo, alignItems: "center", justifyContent: "center", padding: 28, gap: 16 }}>
        <View style={{ width: 104, height: 104, borderRadius: 52, overflow: "hidden", backgroundColor: color.blanco, elevation: 6 }}>
          <Image source={require("../../assets/images/logo-circular.jpg")} style={{ width: 127, height: 127, marginLeft: -12, marginTop: -10 }} accessibilityIgnoresInvertColors />
        </View>
        <Text accessibilityRole="header" style={{ fontFamily: fuente.titulo, fontSize: 22, color: color.texto, textAlign: "center" }}>{app.oculto ? "Pantalla oculta" : "App bloqueada"}</Text>
        <Text style={{ fontFamily: fuente.texto, fontSize: 16, lineHeight: 24, color: color.textoSuave, textAlign: "center", maxWidth: 280 }}>
          {app.oculto ? "Nadie puede ver los datos. Para volver, confirme que es usted." : "Se bloqueó por seguridad tras unos minutos sin uso."}
        </Text>
        <Boton texto="Volver con huella o rostro" onPress={app.desbloquear} />
      </View>
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
        <View accessibilityRole="alert" style={{ backgroundColor: color.naranja, paddingTop: 36, paddingBottom: espacio.xs }}>
          <Text style={{ textAlign: "center", fontFamily: fuente.titulo, fontSize: 13, letterSpacing: 1.5, color: color.sobreNaranja }}>MODO PRÁCTICA · DATOS DE EJEMPLO</Text>
        </View>
      ) : null}
      <Stack screenOptions={{ headerTintColor: color.texto, headerTitleStyle: { fontFamily: fuente.titulo, fontSize: 19 }, headerShadowVisible: false,
        headerStyle: { backgroundColor: color.fondo }, contentStyle: { backgroundColor: color.fondo }, animation: "slide_from_right",
        headerRight: app.usuarioId ? () => <BotonOcultar tam={40} /> : undefined }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="entrar" options={{ headerShown: false }} />
        <Stack.Screen name="registro" options={{ title: "Crear cuenta" }} />
        <Stack.Screen name="cuenta" options={{ headerShown: false }} />
        <Stack.Screen name="ingreso" options={{ title: "Ingreso al equipo" }} />
        <Stack.Screen name="acuerdos" options={{ title: "Acuerdos", headerBackVisible: false }} />
        <Stack.Screen name="recuperar" options={{ title: "Recuperar el acceso" }} />
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
        <Stack.Screen name="guion" options={{ title: "Guion y preguntas" }} />
      </Stack>
      {mostrarEntrada ? <Entrada alTerminar={() => { entradaVista = true; setMostrarEntrada(false); }} /> : null}
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
