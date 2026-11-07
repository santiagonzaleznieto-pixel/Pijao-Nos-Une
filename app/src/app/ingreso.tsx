// P-05 y P-06: acuerdos (leídos hasta el final) y curso de ingreso con evaluación (10.6, R-03, R-45).
import { useState } from "react";
import { Text, View } from "react-native";
import { aprobado, LECCIONES, PREGUNTAS, puntaje, VERSION_ACUERDOS } from "@/core/curso";
import { param } from "@/core/reglas";
import { cliente, useApp } from "@/servicios/contexto";
import { Aviso, Boton, Opciones, Pantalla, Tarjeta, Texto } from "@/ui/componentes";
import { LectorAcuerdos } from "@/ui/LectorAcuerdos";
import { color, letra } from "@/ui/tema";

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
    try {
      const { error: e } = await cliente.rpc("rpc_completar_ingreso", { p_puntaje: p, p_acuerdos_version: versionAcuerdos });
      if (e) throw new Error(e.message);
      await recargarPerfil();
    } catch {
      setError("No se pudo enviar el resultado. Revise la conexión y toque «Enviar otra vez».");
    } finally { setEnviando(false); }
  }

  if (paso === "acuerdos") {
    return (
      <LectorAcuerdos titulo="1. Acuerdos" textoBoton="Continuar al curso"
        onAceptar={(v) => { setVersionAcuerdos(v); setPaso("lecciones"); }} />
    );
  }

  if (paso === "lecciones") {
    const l = LECCIONES[leccion];
    const ultima = leccion === LECCIONES.length - 1;
    return (
      <Pantalla titulo={`2. Curso · lección ${leccion + 1} de ${LECCIONES.length}`}>
        <Tarjeta><Text style={{ fontSize: letra.mediana, fontWeight: "700", color: color.azul }}>{l.titulo}</Text><Texto>{l.texto}</Texto></Tarjeta>
        <Boton texto={ultima ? "Ir a la evaluación" : "Siguiente lección"} onPress={() => (ultima ? setPaso("evaluacion") : setLeccion(leccion + 1))} />
        {leccion > 0 ? <Boton texto="Lección anterior" variante="suave" onPress={() => setLeccion(leccion - 1)} /> : null}
      </Pantalla>
    );
  }

  if (paso === "evaluacion") {
    const completas = Object.keys(respuestas).length === PREGUNTAS.length;
    return (
      <Pantalla titulo={`3. Evaluación · mínimo ${minimo} %`}>
        {PREGUNTAS.map((p, i) => (
          <Tarjeta key={p.pregunta}>
            <Texto negrita>{i + 1}. {p.pregunta}</Texto>
            <Opciones opciones={p.opciones.map((o, j) => [String(j), o] as const)} valor={respuestas[i] !== undefined ? String(respuestas[i]) : null}
              onCambio={(v) => setRespuestas({ ...respuestas, [i]: Number(v) })} />
          </Tarjeta>
        ))}
        <Boton texto="Terminar evaluación" onPress={terminar} deshabilitado={!completas} />
      </Pantalla>
    );
  }

  const paso_ = resultado !== null && aprobado(resultado, minimo);
  return (
    <Pantalla titulo="Resultado">
      <View><Text style={{ fontSize: 48, fontWeight: "700", color: paso_ ? color.verde : color.rojo }}>{resultado} %</Text></View>
      {paso_ ? <Aviso tipo="ok" texto="¡Aprobó! Su certificado y su carnet quedan en «Más». Bienvenido o bienvenida al equipo." />
        : <Aviso tipo="alerta" texto={`Necesita al menos ${minimo} %. Repase las lecciones e inténtelo de nuevo.`} />}
      {error ? <><Aviso tipo="error" texto={error} /><Boton texto="Enviar otra vez" onPress={terminar} cargando={enviando} /></> : null}
      {!paso_ ? <Boton texto="Repasar e intentar de nuevo" onPress={() => { setRespuestas({}); setLeccion(0); setPaso("lecciones"); }} /> : null}
    </Pantalla>
  );
}
