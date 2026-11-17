// SOS para el Director y el Administrador (R-32): vigila cada minuto con la app abierta y muestra las alertas sin atender
// como tarjeta roja en Inicio, con llamar, contacto de emergencia, ver en el mapa y «Ya la atendí».
import { useCallback, useEffect, useState } from "react";
import { Linking, Text, View } from "react-native";
import { hora } from "@/core/formato";
import { cliente, useApp } from "@/servicios/contexto";
import { sosAbiertos, vigilarSos, type SosAbierto } from "@/servicios/vigiaSos";
import { Boton, Fila } from "./componentes";
import { Icono } from "./Icono";
import { color, fuente, radio, tl } from "./tema";

/** Solo para quien atiende los SOS: vigila, notifica y devuelve las alertas abiertas. */
export function useAlertasSos(notificar: boolean): { abiertas: SosAbierto[]; recargar: () => void } {
  const app = useApp();
  const [abiertas, setAbiertas] = useState<SosAbierto[]>([]);
  const atiende = Boolean(app.perfil?.esStaff) && !app.practica;
  const revisar = useCallback(() => {
    if (!atiende || !app.conectado) return;
    (notificar ? vigilarSos(cliente, app.almacen) : sosAbiertos(cliente)).then(setAbiertas).catch(() => undefined);
  }, [atiende, app.conectado, app.almacen, notificar]);
  useEffect(() => {
    revisar();
    if (!atiende) return;
    const t = setInterval(revisar, 60_000);
    return () => clearInterval(t);
  }, [revisar, atiende, app.version]);
  return { abiertas, recargar: revisar };
}

/** Vigilante invisible: va en la barra de pestañas para que funcione en cualquier pantalla. */
export function VigiaSos() {
  useAlertasSos(true);   // la única que notifica
  return null;
}

export function TarjetasSos() {
  const { abiertas, recargar } = useAlertasSos(false);
  const [atendiendo, setAtendiendo] = useState<string | null>(null);
  if (!abiertas.length) return null;
  return (
    <View style={{ gap: 10 }}>
      {abiertas.map((s) => (
        <View key={s.id} accessibilityRole="alert" style={{ gap: 10, padding: 16, borderRadius: radio.seccion, borderWidth: 2, borderColor: color.textoRojo, backgroundColor: color.tinteRojo }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icono nombre="alerta" tam={24} color={color.textoRojo} grosor={2.4} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fuente.titulo, fontSize: tl(18), color: color.textoRojo }}>SOS · {s.nombre}</Text>
              <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(14), color: color.textoRojo }}>Pidió ayuda a las {hora(s.creada_en)}. Llámelo ya.</Text>
            </View>
          </View>
          <Fila>
            {s.celular ? <Boton texto="Llamar" variante="peligro" icono="llamar" onPress={() => Linking.openURL(`tel:${s.celular}`)} estilo={{ flex: 1 }} /> : null}
            {s.lat != null && s.lng != null ? <Boton texto="Ver dónde" variante="contorno" icono="pin" onPress={() => Linking.openURL(`geo:${s.lat},${s.lng}?q=${s.lat},${s.lng}`)} estilo={{ flex: 1 }} /> : null}
          </Fila>
          {s.emergencia_celular ? <Boton texto={`Contacto de emergencia${s.emergencia ? `: ${s.emergencia}` : ""}`} variante="contorno" onPress={() => Linking.openURL(`tel:${s.emergencia_celular}`)} /> : null}
          <Boton texto="Ya la atendí" variante="suave" icono="check" cargando={atendiendo === s.id} onPress={async () => {
            setAtendiendo(s.id);
            await cliente.rpc("rpc_atender_sos", { p_id: s.id });
            setAtendiendo(null);
            recargar();
          }} />
        </View>
      ))}
    </View>
  );
}
