// P-13 Detalle de vivienda: toda la información que se recogió de la casa (vivienda, hogar, personas enmascaradas,
// necesidades e historial de visitas) y sus fotos. Funciona sin señal con lo que hay en el teléfono (6.6).
// Diseño de la Fase 2: foto arriba, semáforo, lista del hogar y línea de tiempo de las visitas.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { fichaCompleta, resumenCasa, type DatosCasa, type FilaDato } from "@/core/ficha";
import { cargarCasa } from "@/servicios/casa";
import { useApp } from "@/servicios/contexto";
import { Aviso, Avatar, Boton, Cargando, Dato, Enlace, Etiqueta, Ficha, Insignia, ItemLista, Pantalla, Seccion, Semaforo, TituloMedio, Vacio } from "@/ui/componentes";
import { FotoCasa } from "@/ui/FotoCasa";
import { iconoEje } from "@/ui/Icono";
import { color, espacio, fuente, tl } from "@/ui/tema";

// Las fotos de la autorización en papel no se muestran aquí: tienen firma y datos personales.
const TIPOS_VISIBLES = new Set(["fachada", "entorno", "problema"]);

/** Línea de tiempo de las visitas, de la más reciente a la más antigua. */
function LineaTiempo({ datos }: { datos: { etiqueta: string; valor: string }[] }) {
  return (
    <View style={{ paddingLeft: 26 }}>
      <View style={{ position: "absolute", left: 7, top: 8, bottom: 8, width: 2, backgroundColor: color.borde }} />
      {datos.map((d, i) => (
        <View key={`${d.etiqueta}-${i}`} style={{ paddingBottom: i < datos.length - 1 ? 16 : 0 }} accessible accessibilityLabel={`${d.etiqueta}. ${d.valor}`}>
          <View style={{ position: "absolute", left: -24, top: 4, width: 14, height: 14, borderRadius: 7, backgroundColor: color.fondo, borderWidth: 3, borderColor: i === 0 ? color.azulOceano : color.bordeControl }} />
          <Text style={{ fontFamily: fuente.textoFuerte, fontSize: tl(16), lineHeight: tl(22), color: color.texto }}>{d.etiqueta}</Text>
          <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(14), lineHeight: tl(20), color: color.textoSuave }}>{d.valor}</Text>
        </View>
      ))}
    </View>
  );
}

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

  if (casa === undefined) return <Pantalla><Cargando lista texto="Cargando la vivienda…" /></Pantalla>;
  if (!casa || !resumen) return <Pantalla><Vacio icono="casa" titulo="Esta vivienda no está en el teléfono" texto="Sincronice e intente de nuevo." accion="Volver" onAccion={() => router.back()} /></Pantalla>;
  const v = casa.vivienda;
  const personas = secciones.filter((s) => s.personaId);
  const historial = secciones.find((s) => s.titulo === "Historial de visitas");
  const necesidades = secciones.find((s) => s.titulo === "Necesidades");
  const resto = secciones.filter((s) => !s.personaId && s !== historial && s !== necesidades);

  return (
    <Pantalla
      pie={!resumen.noContactar ? <Boton texto="Nueva visita" icono="mas" onPress={() => router.push({ pathname: "/visita", params: { vivienda: id } })} /> : undefined}>
      <FotoCasa vivienda={v} foto={resumen.fotoFachada} estilo={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 22 }} />
      {otrasFotos.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: espacio.s }}>
          {otrasFotos.map((f: FilaDato) => (
            <View key={String(f.id)} style={{ alignItems: "center", gap: 4 }}>
              <FotoCasa vivienda={{}} foto={f} estilo={{ width: 96, height: 96, borderRadius: 14 }} />
              <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(13), color: color.textoSuave }}>{f.tipo === "problema" ? "Problema" : "Entorno"}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
      <View style={{ gap: 6 }}>
        <TituloMedio>{resumen.titulo}</TituloMedio>
        {resumen.lugar ? <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(14), color: color.textoSuave }}>{resumen.lugar}</Text> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          <Semaforo nivel={resumen.calidad} />
          <Insignia texto={resumen.estado} tono={resumen.noContactar ? "rojo" : resumen.estadoClave === "requiere_seguimiento" ? "naranja" : "azul"} />
        </View>
      </View>
      {resumen.noContactar ? <Aviso tipo="error" icono="candado" texto="No volver: la familia pidió no ser contactada (R-21)." /> : null}
      <Enlace texto="Cómo llegar" onPress={() => Linking.openURL(`geo:${v.lat},${v.lng}?q=${v.lat},${v.lng}`)} />

      {personas.length ? (
        <View>
          <Etiqueta>{`Hogar · ${resumen.totalPersonas || personas.length} ${(resumen.totalPersonas || personas.length) === 1 ? "persona" : "personas"}`}</Etiqueta>
          {personas.map((s, i) => {
            const edad = s.datos.find((d) => d.etiqueta === "Edad")?.valor;
            const cedula = s.datos.find((d) => d.etiqueta === "Cédula")?.valor;
            const nombre = s.titulo.replace(" · cabeza de familia", "");
            return (
              <ItemLista key={s.personaId} titulo={nombre} ultimo={i === personas.length - 1}
                detalle={[edad, s.titulo.includes("cabeza de familia") ? "cabeza de familia" : "", cedula ? `cédula ${cedula}` : ""].filter(Boolean).join(" · ")}
                izquierda={<Avatar nombre={nombre} />} onPress={() => router.push(`/persona/${s.personaId}`)} />
            );
          })}
        </View>
      ) : null}

      {necesidades ? (
        <View>
          <Etiqueta>Necesidades</Etiqueta>
          {necesidades.datos.map((d, i) => (
            <ItemLista key={`${d.etiqueta}-${i}`} titulo={d.etiqueta} detalle={d.valor} izquierda={<Ficha icono={iconoEje(d.etiqueta)} tono="turquesa" />} ultimo={i === necesidades.datos.length - 1} />
          ))}
        </View>
      ) : null}

      {historial ? (
        <View style={{ gap: 12 }}>
          <Etiqueta>Visitas</Etiqueta>
          <LineaTiempo datos={historial.datos} />
        </View>
      ) : null}

      {resto.map((s) => (
        <Seccion key={s.titulo} titulo={s.titulo}>
          {s.datos.length ? s.datos.map((d, i) => <Dato key={`${d.etiqueta}-${i}`} etiqueta={d.etiqueta} valor={d.valor} ultimo={i === s.datos.length - 1} />)
            : <Text style={{ fontFamily: fuente.texto, fontSize: tl(15), color: color.textoSuave }}>No se registraron datos.</Text>}
        </Seccion>
      ))}
    </Pantalla>
  );
}
