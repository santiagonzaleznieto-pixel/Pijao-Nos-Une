// Cámara con sello (6.3, paso 2): estampa fecha, hora, coordenadas e iniciales del colaborador en una franja inferior,
// comprime a 1.024 px (unos 100 KB, costo cero) y guarda en el espacio privado de la app. Nunca fotografíe a niños.
import { CameraView, useCameraPermissions } from "expo-camera";
import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useRef, useState } from "react";
import { Image, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { nuevoId } from "@/core/ids";
import { Aviso, Boton, Casilla } from "./componentes";
import { color, espacio } from "./tema";
import { fechaNumerica, hora } from "@/core/formato";

export interface FotoTomada { id: string; archivo: string; tam_bytes: number; con_personas: boolean; tomada_en: string }

export function CamaraFoto({ sello, alTomar, alCancelar }: {
  sello: { lat?: number | null; lng?: number | null; iniciales: string };
  alTomar: (f: FotoTomada) => void; alCancelar: () => void;
}) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const camara = useRef<CameraView>(null);
  const vista = useRef<any>(null);  // eslint-disable-line @typescript-eslint/no-explicit-any -- tipos de RN 0.88 y view-shot no coinciden
  const [previa, setPrevia] = useState<string | null>(null);
  const [conPersonas, setConPersonas] = useState(false);
  const [autorizo, setAutorizo] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const ahora = new Date();
  const textoSello = `${fechaNumerica(ahora)} ${hora(ahora)} · ` +
    `${sello.lat?.toFixed(6) ?? "?"}, ${sello.lng?.toFixed(6) ?? "?"} · ${sello.iniciales}`;

  if (!permiso?.granted) {
    return <View style={{ padding: espacio.l, gap: espacio.m }}>
      <Aviso texto="La app necesita la cámara para la foto de fachada." />
      <Boton texto="Permitir la cámara" onPress={pedirPermiso} />
      <Boton texto="Cancelar" variante="suave" onPress={alCancelar} />
    </View>;
  }

  async function disparar() {
    const f = await camara.current?.takePictureAsync({ quality: 0.8 });
    if (!f) return;
    const r = await (await ImageManipulator.manipulate(f.uri).resize({ width: 1024 }).renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
    setPrevia(r.uri);
  }

  async function usar() {
    if (!vista.current) return;
    setTrabajando(true);
    try {
      const sellada = await captureRef(vista, { format: "jpg", quality: 0.6, width: 1024, result: "tmpfile" });
      const dir = new Directory(Paths.document, "fotos");
      dir.create({ intermediates: true, idempotent: true });
      const id = nuevoId();
      const destino = new File(dir, `${id}.jpg`);
      new File(sellada).copy(destino);
      alTomar({ id, archivo: destino.uri, tam_bytes: destino.size, con_personas: conPersonas, tomada_en: new Date().toISOString() });
    } finally { setTrabajando(false); }
  }

  if (previa) {
    return (
      <View style={{ flex: 1, backgroundColor: color.negro }}>
        <View ref={vista} collapsable={false} style={{ width: "100%", aspectRatio: 3 / 4 }}>
          <Image source={{ uri: previa }} style={{ flex: 1 }} resizeMode="cover" />
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", padding: 6 }}>
            <Text style={{ color: color.blanco, fontSize: 12 }}>{textoSello}</Text>
          </View>
        </View>
        <View style={{ padding: espacio.m, gap: espacio.s, backgroundColor: color.tarjeta }}>
          <Casilla texto="En la foto aparece una persona" valor={conPersonas} onCambio={setConPersonas} />
          {conPersonas ? <Casilla texto="La persona autorizó la foto (nunca niños)" valor={autorizo} onCambio={setAutorizo} /> : null}
          <Boton texto="Usar esta foto" onPress={usar} cargando={trabajando} deshabilitado={conPersonas && !autorizo} />
          <Boton texto="Tomar otra" variante="suave" onPress={() => setPrevia(null)} />
        </View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: color.negro }}>
      <CameraView ref={camara} style={{ flex: 1 }} facing="back" />
      <View style={{ padding: espacio.m, gap: espacio.s, backgroundColor: color.negro }}>
        <Boton texto="Tomar foto" onPress={disparar} />
        <Boton texto="Cancelar" variante="suave" onPress={alCancelar} />
      </View>
    </View>
  );
}
