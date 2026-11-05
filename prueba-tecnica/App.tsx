// Prueba técnica de la Fase 1 (bloque 1.1 del plan): comprueba en un teléfono real de 2 GB que React Native + Expo
// cumple lo que pide el documento maestro, sin servicios de pago. No es la app definitiva: no toca datos reales.
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Asset } from "expo-asset";
import * as Battery from "expo-battery";
import * as Device from "expo-device";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File } from "expo-file-system";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import * as ScreenCapture from "expo-screen-capture";
import { CameraView, useCameraPermissions } from "expo-camera";
import JailMonkey from "jail-monkey";
import { Camera, GeoJSONSource, Layer, Map } from "@maplibre/maplibre-react-native";
import { borrarPuntos, resumenPuntos, verificarCifrado } from "./src/db";
import { CENTRO_PIJAO, estiloPijao } from "./src/estilo";
import { iniciarJornada, jornadaActiva, terminarJornada } from "./src/jornada";
import { INICIO_MS } from "./src/inicio";

const AZUL = "#1C3D72";
const NARANJA = "#F7931E";
const VERDE = "#7DB93F";
const ROJO = "#D64545";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
});

type Resultado = { ok: boolean | null; texto: string };
const pendiente: Resultado = { ok: null, texto: "Sin probar" };

function Boton({ texto, onPress, color = NARANJA }: { texto: string; onPress: () => void; color?: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [estilos.boton, { backgroundColor: color, opacity: pressed ? 0.8 : 1 }]}>
      <Text style={estilos.botonTexto}>{texto}</Text>
    </Pressable>
  );
}

function Seccion({ titulo, r, children }: { titulo: string; r: Resultado; children?: React.ReactNode }) {
  const color = r.ok === null ? "#888" : r.ok ? VERDE : ROJO;
  return (
    <View style={estilos.seccion}>
      <Text style={estilos.titulo}>{titulo}</Text>
      <Text style={[estilos.estado, { color }]}>{r.ok === null ? "○" : r.ok ? "✔" : "✖"} {r.texto}</Text>
      {children}
    </View>
  );
}

export default function App() {
  const [arranque, setArranque] = useState<number | null>(null);
  const [rutaMapa, setRutaMapa] = useState<string | null>(null);
  const [mapa, setMapa] = useState<Resultado>(pendiente);
  const [jornada, setJornada] = useState<Resultado>(pendiente);
  const [puntos, setPuntos] = useState<[number, number][]>([]);
  const [cifrado, setCifrado] = useState<Resultado>(pendiente);
  const [aviso, setAviso] = useState<Resultado>(pendiente);
  const [foto, setFoto] = useState<Resultado>(pendiente);
  const [seguridad, setSeguridad] = useState<Resultado>(pendiente);
  const [bateria, setBateria] = useState<string>("");
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [permisoCamara, pedirPermisoCamara] = useCameraPermissions();
  const camara = useRef<CameraView>(null);
  const tMapa = useRef<number>(0);

  // 5.16 / M6: bloqueo de capturas de pantalla mientras la app está abierta.
  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync().catch(() => undefined);
    setArranque(Date.now() - INICIO_MS);
  }, []);

  // 5.14 / N-02: copia el mapa de Pijao incluido en la app y lo abre sin internet.
  useEffect(() => {
    (async () => {
      try {
        const [a] = await Asset.loadAsync(require("./assets/pijao.pmtiles"));
        const ruta = a.localUri ?? a.uri;
        const mb = (new File(ruta).size / 1048576).toFixed(1);
        tMapa.current = Date.now();
        setRutaMapa(ruta);
        setMapa({ ok: null, texto: `Mapa de Pijao incluido (${mb} MB). Cargando…` });
      } catch (e) {
        setMapa({ ok: false, texto: `No se pudo abrir el mapa: ${String(e)}` });
      }
    })();
  }, []);

  const refrescarJornada = useCallback(async () => {
    const activa = await jornadaActiva();
    const r = await resumenPuntos();
    setPuntos(r.puntos);
    const b = await Battery.getBatteryLevelAsync();
    setBateria(b >= 0 ? `${Math.round(b * 100)} %` : "");
    setJornada({
      ok: r.n > 0 ? true : null,
      texto: `${activa ? "Jornada activa" : "Jornada detenida"} · ${r.n} puntos guardados` +
        (r.ultimo ? ` · último ${new Date(r.ultimo).toLocaleTimeString("es-CO")}` : "") +
        (r.simulados ? ` · ${r.simulados} con GPS falso` : ""),
    });
  }, []);

  useEffect(() => {
    refrescarJornada();
    const t = setInterval(refrescarJornada, 15000);
    return () => clearInterval(t);
  }, [refrescarJornada]);

  async function probarCifrado() {
    try {
      const ok = await verificarCifrado();
      setCifrado({ ok, texto: ok ? "La base está cifrada: sin la llave no se puede leer" : "¡La base NO está cifrada!" });
    } catch (e) {
      setCifrado({ ok: false, texto: String(e) });
    }
  }

  async function probarAviso() {
    const p = await Notifications.requestPermissionsAsync();
    if (!p.granted) return setAviso({ ok: false, texto: "Sin permiso de notificaciones" });
    await Notifications.scheduleNotificationAsync({
      content: { title: "Pijao nos une", body: "Tiene 1 tarea nueva (prueba)." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10 },
    });
    setAviso({ ok: true, texto: "Aviso programado: debe llegar en 10 segundos, aunque cierre la app" });
  }

  async function tomarFoto() {
    if (!permisoCamara?.granted) {
      const p = await pedirPermisoCamara();
      if (!p.granted) return setFoto({ ok: false, texto: "Sin permiso de cámara" });
    }
    setCamaraAbierta(true);
  }

  async function disparar() {
    try {
      const f = await camara.current?.takePictureAsync({ quality: 0.9 });
      if (!f) return;
      const t0 = Date.now();
      const img = await ImageManipulator.manipulate(f.uri).resize({ width: 1024 }).renderAsync();
      const res = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.6 });
      const kb = Math.round(new File(res.uri).size / 1024);
      setCamaraAbierta(false);
      setFoto({ ok: kb <= 150, texto: `Foto comprimida a 1.024 px: ${kb} KB en ${Date.now() - t0} ms (meta: unos 100 KB)` });
    } catch (e) {
      setCamaraAbierta(false);
      setFoto({ ok: false, texto: String(e) });
    }
  }

  async function probarSeguridad() {
    const bio = await LocalAuthentication.authenticateAsync({ promptMessage: "Confirme que es usted" });
    const root = JailMonkey.isJailBroken();
    const falso = JailMonkey.canMockLocation();
    setSeguridad({
      ok: bio.success && !root,
      texto: `Huella o rostro: ${bio.success ? "sí" : "no"} · Teléfono modificado: ${root ? "SÍ" : "no"} · ` +
        `GPS falso posible: ${falso ? "sí" : "no"} · Capturas bloqueadas: intente tomar una`,
    });
  }

  if (camaraAbierta) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView ref={camara} style={{ flex: 1 }} facing="back" />
        <View style={estilos.barraCamara}>
          <Boton texto="Tomar foto de fachada" onPress={disparar} />
          <Boton texto="Cancelar" color="#555" onPress={() => setCamaraAbierta(false)} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={estilos.raiz} contentContainerStyle={{ paddingBottom: 40 }}>
      <StatusBar style="light" />
      <View style={estilos.cabecera}>
        <Text style={estilos.cabeceraTitulo}>Pijao nos une · Prueba técnica</Text>
        <Text style={estilos.cabeceraSub}>
          {Device.modelName ?? "Teléfono"} · {Device.totalMemory ? `${(Device.totalMemory / 1073741824).toFixed(1)} GB de memoria` : ""}
          {arranque !== null ? ` · arranque ${(arranque / 1000).toFixed(1)} s (meta < 3 s)` : ""}
          {bateria ? ` · batería ${bateria}` : ""}
        </Text>
      </View>

      <Seccion titulo="1. Mapa de Pijao sin conexión" r={mapa}>
        <Text style={estilos.ayuda}>Active el modo avión y reinicie la app: el mapa debe verse igual.</Text>
        <View style={estilos.mapa}>
          {rutaMapa && (
            <Map
              style={{ flex: 1 }}
              mapStyle={estiloPijao(rutaMapa)}
              logo={false}
              onDidFinishLoadingMap={() =>
                setMapa({ ok: true, texto: `Mapa dibujado en ${((Date.now() - tMapa.current) / 1000).toFixed(1)} s (meta < 2 s)` })}
              onDidFailLoadingMap={() => setMapa({ ok: false, texto: "El mapa no cargó" })}
            >
              <Camera initialViewState={{ center: CENTRO_PIJAO, zoom: 14 }} />
              <GeoJSONSource
                id="recorrido"
                data={{ type: "Feature", properties: {}, geometry: { type: "MultiPoint", coordinates: puntos } }}
              >
                <Layer id="recorrido-puntos" type="circle" style={{ circleRadius: 4, circleColor: NARANJA, circleStrokeColor: "#fff", circleStrokeWidth: 1 }} />
              </GeoJSONSource>
            </Map>
          )}
        </View>
      </Seccion>

      <Seccion titulo="2. Jornada de 6 horas con GPS en segundo plano" r={jornada}>
        <Text style={estilos.ayuda}>
          Inicie, bloquee el teléfono y camine. Los puntos (naranja en el mapa) se guardan cada unos 30 s aunque la app
          esté cerrada. Anote la batería al empezar y a las 6 horas.
        </Text>
        <View style={estilos.fila}>
          <Boton texto="Iniciar jornada" onPress={async () => { Alert.alert("Jornada", await iniciarJornada()); refrescarJornada(); }} />
          <Boton texto="Terminar" color={AZUL} onPress={async () => { await terminarJornada(); refrescarJornada(); }} />
          <Boton texto="Borrar puntos" color="#555" onPress={async () => { await borrarPuntos(); refrescarJornada(); }} />
        </View>
      </Seccion>

      <Seccion titulo="3. Base local cifrada (SQLCipher)" r={cifrado}>
        <Boton texto="Comprobar cifrado" onPress={probarCifrado} />
      </Seccion>

      <Seccion titulo="4. Avisos en el teléfono" r={aviso}>
        <Boton texto="Programar un aviso" onPress={probarAviso} />
      </Seccion>

      <Seccion titulo="5. Cámara y compresión de la foto" r={foto}>
        <Boton texto="Abrir cámara" onPress={tomarFoto} />
      </Seccion>

      <Seccion titulo="6. Seguridad del teléfono" r={seguridad}>
        <Boton texto="Probar huella y revisión del teléfono" onPress={probarSeguridad} />
      </Seccion>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: "#F5F3EF" },
  cabecera: { backgroundColor: AZUL, paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16 },
  cabeceraTitulo: { color: "#fff", fontSize: 20, fontWeight: "700" },
  cabeceraSub: { color: "#DCE6F5", fontSize: 14, marginTop: 4 },
  seccion: { backgroundColor: "#fff", margin: 12, marginBottom: 0, borderRadius: 12, padding: 14 },
  titulo: { fontSize: 17, fontWeight: "700", color: AZUL },
  estado: { fontSize: 16, marginTop: 6, marginBottom: 8 },
  ayuda: { fontSize: 15, color: "#444", marginBottom: 8 },
  mapa: { height: 320, borderRadius: 10, overflow: "hidden", backgroundColor: "#EFEAE0" },
  fila: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  boton: { minHeight: 48, paddingHorizontal: 16, borderRadius: 10, justifyContent: "center", marginTop: 4 },
  botonTexto: { color: "#fff", fontSize: 16, fontWeight: "700" },
  barraCamara: { flexDirection: "row", justifyContent: "space-around", padding: 16, backgroundColor: "#000" },
});
