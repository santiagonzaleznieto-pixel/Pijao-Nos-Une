// 13.3 y 1.11: guion de visita y preguntas frecuentes, disponibles sin señal. El texto vigente lo publica el
// Administrador en P-42 y se descarga con los textos legales; si aún no hay copia, se muestra el borrador de la app.
// Diseño de la Fase 2: segmentos, títulos de bloque y preguntas que se abren al tocarlas.
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { bloques, filtrarPreguntas, preguntas, textoCampo, type TextoCampo } from "@/core/guion";
import { useApp } from "@/servicios/contexto";
import { Aviso, Buscador, Pantalla, Seccion, Segmentos, Texto, Vacio } from "@/ui/componentes";
import { Icono } from "@/ui/Icono";
import { color, espacio, fuente, tl } from "@/ui/tema";

function Contenido({ texto }: { texto: string }) {
  return (
    <View style={{ gap: espacio.s }}>
      {bloques(texto).map((b, i) => b.tipo === "titulo"
        ? <Text key={i} accessibilityRole="header" style={{ fontFamily: fuente.titulo, fontSize: tl(18), lineHeight: tl(24), color: color.texto, marginTop: i ? espacio.m : 0 }}>{b.texto}</Text>
        : b.tipo === "punto"
          ? (
            <View key={i} style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.azulOceano, marginTop: tl(10) }} />
              <Text style={{ flex: 1, fontFamily: fuente.texto, fontSize: tl(16), lineHeight: tl(25), color: color.texto }}>{b.texto}</Text>
            </View>
          )
          : <Text key={i} style={{ fontFamily: fuente.texto, fontSize: tl(16), lineHeight: tl(25), color: color.texto }}>{b.texto}</Text>)}
    </View>
  );
}

export default function Guion() {
  const app = useApp();
  const [vista, setVista] = useState("guion");
  const [guion, setGuion] = useState<TextoCampo | null>(null);
  const [faq, setFaq] = useState<TextoCampo | null>(null);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    (async () => {
      const filas = await app.almacen.listar("textos_legales");
      setGuion(textoCampo(filas, "guion_visita"));
      setFaq(textoCampo(filas, "preguntas_frecuentes"));
    })();
  }, [app.almacen, app.version]);

  const actual = vista === "guion" ? guion : faq;
  const lista = faq ? filtrarPreguntas(preguntas(faq.contenido), buscar) : [];

  return (
    <Pantalla>
      <Segmentos opciones={[["guion", "Guion de visita"], ["preguntas", "Preguntas"]]} valor={vista} onCambio={setVista} />
      {actual?.borrador ? <Aviso tipo="alerta" texto="Borrador: el abogado todavía no lo ha revisado. Úselo como guía y no improvise compromisos." /> : null}
      {vista === "guion" && guion ? <Seccion><Contenido texto={guion.contenido} /></Seccion> : null}
      {vista === "preguntas" ? (
        <>
          <Buscador valor={buscar} onCambio={setBuscar} texto="Buscar: borrar, votar, regalo…" />
          {lista.length ? (
            <Seccion>
              {lista.map((p, i) => {
                const ver = abierta === i || Boolean(buscar.trim());
                return (
                  <View key={p.pregunta} style={{ borderBottomWidth: i < lista.length - 1 ? 1 : 0, borderBottomColor: color.borde, paddingVertical: 4 }}>
                    <Pressable accessibilityRole="button" accessibilityState={{ expanded: ver }} onPress={() => setAbierta(abierta === i ? null : i)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingVertical: 8 }}>
                      <Text style={{ flex: 1, fontFamily: fuente.textoFuerte, fontSize: tl(16), lineHeight: tl(22), color: color.texto }}>{p.pregunta}</Text>
                      <Icono nombre={ver ? "arriba" : "abajo"} tam={20} color={color.textoSuave} />
                    </Pressable>
                    {ver ? <View style={{ paddingBottom: 10 }}><Texto suave>{p.respuesta}</Texto></View> : null}
                  </View>
                );
              })}
            </Seccion>
          ) : <Vacio icono="buscar" titulo="No hay preguntas con esas palabras" texto="Pruebe con otra palabra más corta." />}
        </>
      ) : null}
      {actual ? <Texto suave tam="pequena" centrado>Versión {actual.version}. Disponible sin señal.</Texto> : null}
    </Pantalla>
  );
}
