// P-05 y P-06: acuerdos (leídos hasta el final) y curso de ingreso con evaluación (10.6, R-03, R-45). Diseño de la Fase 2.
import { useState } from "react";
import { Text, View } from "react-native";
import { aprobado, LECCIONES, PREGUNTAS, puntaje, VERSION_ACUERDOS } from "@/core/curso";
import { param } from "@/core/reglas";
import { cliente, useApp } from "@/servicios/contexto";
import { Aviso, Boton, Etiqueta, Fila, Opciones, Pantalla, Seccion, TituloMedio } from "@/ui/componentes";
import { LectorAcuerdos } from "@/ui/LectorAcuerdos";
import { Aparece } from "@/ui/movimiento";
import { color, espacio, fuente, tl } from "@/ui/tema";

/** Segmentos de avance de las lecciones (uno por lección). */
function Segmentos({ actual, total }: { actual: number; total: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 4, paddingHorizontal: espacio.pantalla, paddingTop: espacio.s, paddingBottom: espacio.m, backgroundColor: color.fondo }}
      accessible accessibilityLabel={`Lección ${actual + 1} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= actual ? color.azulOceano : color.superficiePanel }} />
      ))}
    </View>
  );
}

/** Parte la lección en frases (sin expresiones con «lookbehind», para todos los motores de JavaScript). */
const frases = (t: string) => t.split(/\.\s+/).filter(Boolean).map((f, i, a) => (i < a.length - 1 || t.trim().endsWith(".") ? f.replace(/\.$/, "") + "." : f));

export default function Ingreso() {
  const { params, recargarPerfil } = useApp();
  const [paso, setPaso] = useState<"acuerdos" | "lecciones" | "evaluacion" | "resultado">("acuerdos");
  const [versionAcuerdos, setVersionAcuerdos] = useState(VERSION_ACUERDOS);
  const [leccion, setLeccion] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<number, number>>({});
  const [resultado, setResultado] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const minimo = param(params, "curso_minimo");

  async function terminar() {
    const p = puntaje(respuestas);
    setResultado(p);
    setPaso("resultado");
    if (!aprobado(p, minimo)) return;
    setEnviando(true);
    setError(null);
    try {
      const { error: e } = await cliente.rpc("rpc_completar_ingreso", { p_puntaje: p, p_acuerdos_version: versionAcuerdos });
      if (e) throw new Error(e.message);
      await recargarPerfil();
    } catch {
      setError("No se pudo enviar el resultado. Revise la conexión y toque «Enviar otra vez».");
    } finally { setEnviando(false); }
  }

  if (paso === "acuerdos") {
    return <LectorAcuerdos titulo="Acuerdos del equipo" textoBoton="Continuar al curso" onAceptar={(v) => { setVersionAcuerdos(v); setPaso("lecciones"); }} />;
  }

  if (paso === "lecciones") {
    const l = LECCIONES[leccion];
    const ultima = leccion === LECCIONES.length - 1;
    return (
      <Pantalla arriba={<Segmentos actual={leccion} total={LECCIONES.length} />}
        pie={<Fila>
          {leccion > 0 ? <Boton texto="Anterior" variante="suave" onPress={() => setLeccion(leccion - 1)} estilo={{ flex: 1 }} /> : null}
          <Boton texto={ultima ? "Ir a la evaluación" : "Siguiente lección"} onPress={() => (ultima ? setPaso("evaluacion") : setLeccion(leccion + 1))} estilo={{ flex: 1 }} />
        </Fila>}>
        <Aparece key={leccion} estilo={{ gap: espacio.m }}>
          <Etiqueta>{`Lección ${leccion + 1} de ${LECCIONES.length}`}</Etiqueta>
          <TituloMedio>{l.titulo}</TituloMedio>
          {frases(l.texto).map((frase, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color.tinteAzul, alignItems: "center", justifyContent: "center", marginTop: -1 }}>
                <Text style={{ fontFamily: fuente.tituloFuerte, fontSize: tl(13), color: color.textoAzul }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, fontFamily: fuente.texto, fontSize: tl(16), lineHeight: tl(25), color: color.texto }}>{frase}</Text>
            </View>
          ))}
        </Aparece>
      </Pantalla>
    );
  }

  if (paso === "evaluacion") {
    const completas = Object.keys(respuestas).length === PREGUNTAS.length;
    return (
      <Pantalla etiqueta="Evaluación" titulo={`Mínimo ${minimo} %`} subtitulo={`${Object.keys(respuestas).length} de ${PREGUNTAS.length} preguntas respondidas.`}
        pie={<Boton texto="Terminar evaluación" onPress={terminar} deshabilitado={!completas} />}>
        {PREGUNTAS.map((p, i) => (
          <Seccion key={p.pregunta} titulo={`Pregunta ${i + 1}`}>
            <Text style={{ fontFamily: fuente.textoFuerte, fontSize: tl(16), lineHeight: tl(24), color: color.texto }}>{p.pregunta}</Text>
            <Opciones lista opciones={p.opciones.map((o, j) => [String(j), o] as const)} valor={respuestas[i] !== undefined ? String(respuestas[i]) : null}
              onCambio={(v) => setRespuestas({ ...respuestas, [i]: Number(v) })} />
          </Seccion>
        ))}
      </Pantalla>
    );
  }

  const paso_ = resultado !== null && aprobado(resultado, minimo);
  return (
    <Pantalla>
      <View style={{ alignItems: "center", gap: 8, paddingVertical: espacio.xl }}>
        <Text style={{ fontFamily: fuente.marca, fontSize: tl(64), color: paso_ ? color.textoVerde : color.textoRojo }}>{resultado} %</Text>
        <TituloMedio>{paso_ ? "¡Aprobó el curso!" : "Todavía no alcanza"}</TituloMedio>
      </View>
      {paso_ ? <Aviso tipo="ok" icono="estrella" texto="Su certificado y su carnet quedan en «Más». Bienvenido o bienvenida al equipo." />
        : <Aviso tipo="alerta" texto={`Necesita al menos ${minimo} %. Repase las lecciones e inténtelo de nuevo.`} />}
      {error ? <><Aviso tipo="error" texto={error} /><Boton texto="Enviar otra vez" onPress={terminar} cargando={enviando} /></> : null}
      {!paso_ ? <Boton texto="Repasar e intentar de nuevo" onPress={() => { setRespuestas({}); setLeccion(0); setPaso("lecciones"); }} /> : null}
    </Pantalla>
  );
}
