// P-13 Detalle de vivienda: toda la información que se recogió de la casa (vivienda, hogar, personas enmascaradas,
// necesidades e historial de visitas) y sus fotos. Funciona sin señal con lo que hay en el teléfono (6.6).
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { fichaCompleta, resumenCasa, type DatosCasa, type FilaDato } from "@/core/ficha";
import { cargarCasa } from "@/servicios/casa";
import { useApp } from "@/servicios/contexto";
import { Aviso, Boton, Cargando, Fila, Pantalla, Tarjeta, Texto } from "@/ui/componentes";
import { FotoCasa } from "@/ui/FotoCasa";
import { color, espacio, letra } from "@/ui/tema";

// Las fotos de la autorización en papel no se muestran aquí: tienen firma y datos personales.
const TIPOS_VISIBLES = new Set(["fachada", "entorno", "problema"]);

export default function Vivienda() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const router = useRouter();
  const [casa, setCasa] = useState<DatosCasa | null | undefined>(undefined);

  useEffect(() => {
    let vivo = true;
    cargarCasa(app.almacen, id).then((d) => { if (vivo) setCasa(d); });
    return () => { vivo = false; };
  }, [id, app.almacen, app.version]);

  const resumen = useMemo(() => (casa ? resumenCasa(casa) : null), [casa]);
  const secciones = useMemo(() => (casa ? fichaCompleta(casa) : []), [casa]);
  const otrasFotos = useMemo(() => (casa?.fotos ?? []).filter((f) => TIPOS_VISIBLES.has(String(f.tipo)) && f.id !== resumen?.fotoFachada?.id && !f.eliminado_en), [casa, resumen]);

  if (casa === undefined) return <Cargando />;
  if (!casa || !resumen) return <Pantalla titulo="Vivienda"><Aviso tipo="alerta" texto="Esta vivienda no está en el teléfono. Sincronice e intente de nuevo." /></Pantalla>;
  const v = casa.vivienda;

  return (
    <Pantalla titulo={resumen.titulo}>
      <FotoCasa vivienda={v} foto={resumen.fotoFachada} estilo={{ width: "100%", aspectRatio: 4 / 3 }} />
      {otrasFotos.length ? (
        <ScrollView horizontal contentContainerStyle={{ gap: espacio.s }}>
          {otrasFotos.map((f: FilaDato) => (
            <View key={String(f.id)} style={{ alignItems: "center" }}>
              <FotoCasa vivienda={{}} foto={f} estilo={{ width: 96, height: 96 }} />
              <Text style={{ fontSize: letra.pequena, color: color.textoSuave }}>{f.tipo === "problema" ? "Problema" : "Entorno"}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
      {resumen.noContactar ? <Aviso tipo="error" texto="No volver: la familia pidió no ser contactada (R-21)." /> : null}

      <Tarjeta>
        <Texto negrita tam="mediana">{resumen.estado}</Texto>
        {resumen.lugar ? <Texto suave>{resumen.lugar}</Texto> : null}
        <Texto>Cabeza de familia: {resumen.cabeza ?? "sin registrar"}</Texto>
        <Texto>Personas: {resumen.totalPersonas || "sin registrar"}</Texto>
        <Texto>Última visita: {resumen.ultimaVisita ?? "ninguna todavía"}</Texto>
        {resumen.calidad ? <Texto suave>Calidad del registro: {resumen.calidad}</Texto> : null}
      </Tarjeta>
      <Fila>
        {!resumen.noContactar ? <Boton texto="Agregar visita" onPress={() => router.push({ pathname: "/visita", params: { vivienda: id } })} /> : null}
        <Boton texto="Cómo llegar" variante="suave" onPress={() => Linking.openURL(`geo:${v.lat},${v.lng}?q=${v.lat},${v.lng}`)} />
      </Fila>

      {secciones.map((s) => (
        <Tarjeta key={s.titulo}>
          {s.personaId ? (
            <Pressable accessibilityRole="button" onPress={() => router.push(`/persona/${s.personaId}`)}>
              <Text style={{ fontSize: letra.mediana, fontWeight: "700", color: color.azulOceano }}>{s.titulo} ›</Text>
            </Pressable>
          ) : <Texto negrita tam="mediana">{s.titulo}</Texto>}
          {s.datos.length ? s.datos.map((d, i) => (
            <View key={`${d.etiqueta}-${i}`} style={{ paddingVertical: 4, borderBottomWidth: i < s.datos.length - 1 ? 1 : 0, borderBottomColor: color.borde }}>
              <Text style={{ fontSize: letra.pequena, color: color.textoSuave }}>{d.etiqueta}</Text>
              <Text style={{ fontSize: letra.normal, color: color.texto }}>{d.valor}</Text>
            </View>
          )) : <Texto suave>No se registraron datos.</Texto>}
        </Tarjeta>
      ))}
    </Pantalla>
  );
}
