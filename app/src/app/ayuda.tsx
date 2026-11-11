// P-45 Ayuda y soporte (17.6): preguntas frecuentes de uso de la app, reportar un error sin datos personales y novedades
// de la versión. Funciona sin señal (el reporte se intenta enviar con señal).
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useApp } from "@/servicios/contexto";
import { VERSION_APP } from "@/servicios/version";
import { Aviso, Boton, Campo, FilaEnlace, Pantalla, Seccion, Texto } from "@/ui/componentes";
import { Icono } from "@/ui/Icono";
import { color, fuente, tl } from "@/ui/tema";

const PREGUNTAS: [string, string][] = [
  ["¿Qué hago si no hay señal?", "Siga trabajando: todo se guarda cifrado en el teléfono y se envía solo cuando vuelva la señal. Puede ver lo pendiente en Más → Mis visitas y pendientes. No desinstale la app."],
  ["Me salí de una visita sin terminar", "No se pierde: al volver a Inicio aparece «Tiene una visita sin terminar» con el botón «Continuar la visita». También está en Mis visitas y pendientes → Borradores."],
  ["Una visita dice «no se pudo enviar»", "Vaya a Mis visitas y pendientes → Revisar y toque «Corregir y enviar de nuevo». Se abre la visita con todos sus datos; revise lo que indica el mensaje y guárdela."],
  ["¿Cómo instalo una versión nueva?", "Descárguela del enlace que le envía el Director e instálela ENCIMA de la que tiene. Nunca desinstale primero: se borraría lo que no se ha enviado."],
  ["¿Qué hago si pierdo el teléfono?", "Avise de inmediato al Director o al Administrador. Desde el panel se ordena borrar los datos del teléfono en cuanto se conecte."],
  ["¿Cómo cambio mi contraseña?", "Más → Perfil y ajustes → Cambiar contraseña. Si la olvidó, en la pantalla de entrar toque «Olvidé mi contraseña»."],
  ["La letra se ve pequeña o no veo bien al sol", "En Más → Perfil y ajustes active «Letra grande» o el modo «Sol», de alto contraste."],
];

const NOVEDADES = [
  "Fecha de nacimiento y cumpleaños con listas, sin escribir, y la edad calculada.",
  "Varias necesidades por visita y varios canales para recibir información.",
  "«Continuar la visita» si se cierra la app a mitad de una visita.",
  "Cumpleañeros de hoy, jornada con SOS, reporte de incidentes y esta ayuda.",
];

export default function Ayuda() {
  const app = useApp();
  const router = useRouter();
  const [abierta, setAbierta] = useState<number | null>(0);
  const [reporte, setReporte] = useState("");
  const [enviado, setEnviado] = useState<string | null>(null);

  async function reportar() {
    await app.sesion.reportarError("ayuda", new Error(reporte.trim()));
    setReporte("");
    setEnviado(app.conectado ? "Gracias. El Administrador recibió el reporte." : "Sin señal: no se pudo enviar. Inténtelo cuando tenga señal.");
  }

  return (
    <Pantalla titulo="Ayuda">
      <Seccion titulo="Preguntas frecuentes">
        {PREGUNTAS.map(([p, r], i) => (
          <View key={p} style={{ borderBottomWidth: i < PREGUNTAS.length - 1 ? 1 : 0, borderBottomColor: color.borde }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: abierta === i }} onPress={() => setAbierta(abierta === i ? null : i)}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, paddingVertical: 8 }}>
              <Text style={{ flex: 1, fontFamily: fuente.textoFuerte, fontSize: tl(16), lineHeight: tl(22), color: color.texto }}>{p}</Text>
              <Icono nombre={abierta === i ? "arriba" : "abajo"} tam={20} color={color.textoSuave} />
            </Pressable>
            {abierta === i ? <View style={{ paddingBottom: 12 }}><Texto suave>{r}</Texto></View> : null}
          </View>
        ))}
      </Seccion>
      <View style={{ gap: 10 }}>
        <FilaEnlace texto="Guion de visita y preguntas de las familias" icono="libro" onPress={() => router.push("/guion")} />
        <FilaEnlace texto="Reportar un incidente" detalle="Amenazas, rumores, daños, pérdida del teléfono" icono="alerta" onPress={() => router.push("/incidente")} />
      </View>
      <Seccion titulo="Reportar un error de la app">
        <Campo etiqueta="¿Qué pasó y en qué pantalla?" value={reporte} onChangeText={setReporte} multiline
          ayuda="No escriba nombres, cédulas ni teléfonos de las personas visitadas." />
        <Boton texto="Enviar al Administrador" variante="contorno" icono="enviar" deshabilitado={reporte.trim().length < 8} onPress={reportar} />
        {enviado ? <Aviso tipo={app.conectado ? "ok" : "alerta"} texto={enviado} /> : null}
      </Seccion>
      <Seccion titulo={`Novedades de la versión ${VERSION_APP}`}>
        {NOVEDADES.map((n) => <Texto key={n}>• {n}</Texto>)}
      </Seccion>
    </Pantalla>
  );
}
