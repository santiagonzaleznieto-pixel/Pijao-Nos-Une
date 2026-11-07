// Foto de fachada de una vivienda: primero la que está en este teléfono; si no, con señal, la del servidor
// (enlace temporal de 10 minutos, solo si las reglas del servidor permiten verla).
import { useEffect, useState } from "react";
import { Image, Text, View, type ImageStyle } from "react-native";
import type { FilaDato } from "@/core/ficha";
import { useApp } from "@/servicios/contexto";
import { color, radio } from "@/ui/tema";

export function FotoCasa({ vivienda, foto, estilo }: { vivienda: FilaDato; foto: FilaDato | null; estilo: ImageStyle }) {
  const app = useApp();
  const local = typeof vivienda.foto_local === "string" ? vivienda.foto_local : null;
  const ruta = typeof foto?.storage_path === "string" ? foto.storage_path : null;
  const [remota, setRemota] = useState<string | null>(null);
  const [buscada, setBuscada] = useState(false);

  useEffect(() => {
    let vivo = true;
    setRemota(null);
    setBuscada(false);
    if (!local && ruta) app.urlFoto(ruta).then((u) => { if (vivo) { setRemota(u); setBuscada(true); } });
    return () => { vivo = false; };
  }, [local, ruta, app.conectado]);   // eslint-disable-line react-hooks/exhaustive-deps

  const uri = local ?? remota;
  if (uri) return <Image source={{ uri }} style={[{ borderRadius: radio.s, backgroundColor: color.borde }, estilo]} accessibilityLabel="Foto de la fachada" />;
  return (
    <View style={[{ borderRadius: radio.s, backgroundColor: color.fondo, borderWidth: 1, borderColor: color.borde, alignItems: "center", justifyContent: "center", padding: 4 }, estilo]}>
      <Text style={{ color: color.textoSuave, fontSize: 12, textAlign: "center" }}>
        {!ruta ? "Sin foto" : !app.conectado ? "Foto disponible con señal" : buscada ? "Foto no disponible" : "Cargando foto…"}
      </Text>
    </View>
  );
}
