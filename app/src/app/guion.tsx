// 13.3 y 1.11: guion de visita y preguntas frecuentes, disponibles sin señal. El texto vigente lo publica el
// Administrador en P-42 y se descarga con los textos legales; si aún no hay copia, se muestra el borrador de la app.
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { bloques, filtrarPreguntas, preguntas, textoCampo, type TextoCampo } from "@/core/guion";
import { useApp } from "@/servicios/contexto";
import { Aviso, Campo, Fila, Boton, Pantalla, Tarjeta, Texto } from "@/ui/componentes";
import { color, espacio, letra } from "@/ui/tema";

function Contenido({ texto }: { texto: string }) {
  return (
    <View style={{ gap: espacio.xs }}>
      {bloques(texto).map((b, i) => b.tipo === "titulo"
        ? <Text key={i} accessibilityRole="header" style={{ fontSize: letra.mediana, fontWeight: "700", color: color.azul, marginTop: espacio.s }}>{b.texto}</Text>
        : <Texto key={i}>{b.tipo === "punto" ? `• ${b.texto}` : b.texto}</Texto>)}
    </View>
  );
}

export default function Guion() {
  const app = useApp();
  const [vista, setVista] = useState<"guion" | "preguntas">("guion");
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
    <Pantalla titulo="Guion y preguntas">
      <Fila>
        <Boton texto="Guion de visita" variante={vista === "guion" ? "secundario" : "suave"} onPress={() => setVista("guion")} estilo={{ flex: 1 }} />
        <Boton texto="Preguntas" variante={vista === "preguntas" ? "secundario" : "suave"} onPress={() => setVista("preguntas")} estilo={{ flex: 1 }} />
      </Fila>
      {actual?.borrador ? <Aviso tipo="alerta" texto="Borrador: el abogado todavía no lo ha revisado. Úselo como guía y no improvise compromisos." /> : null}
      {vista === "guion" && guion ? <Tarjeta><Contenido texto={guion.contenido} /></Tarjeta> : null}
      {vista === "preguntas" ? (
        <>
          <Campo etiqueta="Buscar una pregunta" value={buscar} onChangeText={setBuscar} placeholder="Por ejemplo: borrar, votar, regalo" />
          {lista.map((p, i) => (
            <Tarjeta key={p.pregunta}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: abierta === i }} onPress={() => setAbierta(abierta === i ? null : i)}>
                <Text style={{ fontSize: letra.normal, fontWeight: "700", color: color.texto }}>{p.pregunta}</Text>
              </Pressable>
              {abierta === i || buscar.trim() ? <Texto>{p.respuesta}</Texto> : null}
            </Tarjeta>
          ))}
          {!lista.length ? <Texto suave>No hay preguntas con esas palabras.</Texto> : null}
        </>
      ) : null}
      {actual ? <Texto suave>Versión {actual.version}.</Texto> : null}
    </Pantalla>
  );
}
