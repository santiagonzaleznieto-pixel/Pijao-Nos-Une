// P-46 Jornada y SOS (5.12, R-31, R-32). Iniciar y terminar la jornada (la ubicación se comparte solo mientras dura) y el
// botón SOS: mantener presionado 3 segundos para que no se active por accidente. Con señal la alerta llega al instante al
// Director y al Administrador; sin señal queda en la cola y se ofrece llamar al 123 o mandar un mensaje de texto.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Linking, Pressable, Text, View } from "react-native";
import { fechaHora, hora } from "@/core/formato";
import { encolarAccion } from "@/servicios/campo";
import { cliente, useApp } from "@/servicios/contexto";
import { iniciarJornada, jornadaActiva, terminarJornada, textoSos, ubicacionActual, type JornadaLocal } from "@/servicios/jornada";
import { Aviso, Boton, Dato, Fila, Opciones, Pantalla, Seccion, TituloMedio } from "@/ui/componentes";
import { useMovimientoReducido } from "@/ui/movimiento";
import { color, fuente, radio, tl } from "@/ui/tema";

const HORAS: [string, string][] = [["2", "2 horas"], ["4", "4 horas"], ["6", "6 horas"], ["8", "8 horas"], ["0", "Sin hora fija"]];

function BotonSos({ alActivar }: { alActivar: () => void }) {
  const v = useRef(new Animated.Value(0)).current;
  const reducido = useMovimientoReducido();
  const animacion = useRef<Animated.CompositeAnimation | null>(null);
  const empezar = () => {
    animacion.current = Animated.timing(v, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: false });
    animacion.current.start(({ finished }) => { if (finished) { v.setValue(0); alActivar(); } });
  };
  const soltar = () => { animacion.current?.stop(); Animated.timing(v, { toValue: 0, duration: reducido ? 0 : 200, useNativeDriver: false }).start(); };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="SOS. Mantenga presionado tres segundos para pedir ayuda" accessibilityHint="Envía su ubicación al Director y al Administrador"
      onPressIn={empezar} onPressOut={soltar}
      style={{ height: 120, borderRadius: radio.seccion, backgroundColor: color.textoRojo, overflow: "hidden", justifyContent: "center", alignItems: "center" }}>
      <Animated.View style={{ position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.28)", width: v.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
      <Text style={{ fontFamily: fuente.marca, fontSize: tl(34), letterSpacing: 4, color: color.blanco }}>SOS</Text>
      <Text style={{ fontFamily: fuente.tituloMedio, fontSize: tl(14), color: color.blanco }}>Mantenga presionado 3 segundos</Text>
    </Pressable>
  );
}

export default function Jornada() {
  const app = useApp();
  const [j, setJ] = useState<JornadaLocal | null | undefined>(undefined);
  const [horas, setHoras] = useState("6");
  const [sos, setSos] = useState<{ enviado: boolean; texto: string } | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => { jornadaActiva(app.almacen).then(setJ); }, [app.almacen, app.version]);

  async function iniciar() {
    if (!app.usuarioId) return;
    setTrabajando(true);
    setJ(await iniciarJornada(app.almacen, app.usuarioId, Number(horas) || null));
    app.avisarCambio();
    app.sincronizar();
    setTrabajando(false);
  }
  async function terminar() {
    if (!app.usuarioId) return;
    setTrabajando(true);
    await terminarJornada(app.almacen, app.usuarioId);
    setJ(null);
    app.avisarCambio();
    app.sincronizar();
    setTrabajando(false);
  }
  async function pedirAyuda() {
    if (!app.usuarioId) return;
    const p = await ubicacionActual();
    const texto = textoSos(app.perfil?.d.nombre ?? "Un colaborador", p);
    let enviado = false;
    if (app.conectado && !app.practica) {
      const { error } = await cliente.rpc("rpc_sos", { p_lat: p?.lat ?? null, p_lng: p?.lng ?? null, p_nota: "SOS desde la app" });
      enviado = !error;
    }
    if (!enviado && !app.practica) await encolarAccion(app.almacen, app.usuarioId, "sos", { lat: p?.lat ?? null, lng: p?.lng ?? null, nota: "SOS sin señal" });
    setSos({ enviado, texto });
    app.avisarCambio();
  }

  return (
    <Pantalla titulo="Jornada y seguridad">
      <BotonSos alActivar={pedirAyuda} />
      {sos ? (
        <Seccion titulo={sos.enviado ? "Alerta enviada" : "Sin señal: la alerta saldrá apenas haya"}>
          <Aviso tipo={sos.enviado ? "ok" : "alerta"} texto={sos.enviado ? "El Director y el Administrador recibieron su alerta con su ubicación." : "Mientras tanto, llame o mande un mensaje de texto (no necesita datos)."} />
          <Fila>
            <Boton texto="Llamar al 123" variante="peligro" icono="llamar" onPress={() => Linking.openURL("tel:123")} estilo={{ flex: 1 }} />
            <Boton texto="Mensaje de texto" variante="contorno" icono="mensaje" onPress={() => Linking.openURL(`sms:?body=${encodeURIComponent(sos.texto)}`)} estilo={{ flex: 1 }} />
          </Fila>
        </Seccion>
      ) : null}

      {j === undefined ? null : j ? (
        <Seccion titulo="Jornada en curso">
          <TituloMedio>{`Desde las ${hora(j.inicio)}`}</TituloMedio>
          <Dato etiqueta="Inició" valor={fechaHora(j.inicio)} />
          <Dato etiqueta="Fin previsto" valor={j.finPrevista ? fechaHora(j.finPrevista) : "Sin hora fija"} ultimo />
          <Text style={{ fontFamily: fuente.texto, fontSize: tl(14), lineHeight: tl(20), color: color.textoSuave }}>
            Mientras la jornada está abierta, el Director ve su última ubicación (solo las iniciales para el resto del equipo). Cada 2 horas la app le preguntará «¿Todo bien?».
          </Text>
          <Boton texto="Terminar la jornada" icono="check" onPress={terminar} cargando={trabajando} />
        </Seccion>
      ) : (
        <Seccion titulo="Iniciar la jornada">
          <Text style={{ fontFamily: fuente.texto, fontSize: tl(15), lineHeight: tl(22), color: color.textoSuave }}>
            Fuera de la jornada nadie ve su ubicación. En las veredas, trabaje en pareja y avise a qué hora vuelve.
          </Text>
          <Opciones etiqueta="¿Cuánto durará?" opciones={HORAS} valor={horas} onCambio={(v) => setHoras(v as string)} />
          <Boton texto="Iniciar jornada" icono="play" onPress={iniciar} cargando={trabajando} />
        </Seccion>
      )}
      {app.practica ? <Aviso tipo="info" texto="Modo práctica: la jornada y el SOS no se envían a nadie." /> : null}
    </Pantalla>
  );
}
