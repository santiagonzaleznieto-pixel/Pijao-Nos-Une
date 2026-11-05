// P-14 Detalle de persona: protección estándar (7.4). Los datos completos solo con O-01 y verificación en dos pasos,
// pedidos al servidor (que audita). Desde aquí se registran «No contactar» y las solicitudes de derechos (7.8, 16.5).
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Linking } from "react-native";
import { opciones } from "@/core/catalogos";
import { vistaParaPantalla, type PersonaCompleta, type PersonaV } from "@/core/enmascarado";
import { encolarAccion } from "@/servicios/campo";
import { cliente, useApp } from "@/servicios/contexto";
import { Aviso, Boton, Campo, Cargando, Fila, Opciones, Pantalla, Tarjeta, Texto } from "@/ui/componentes";

export default function Persona() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const [p, setP] = useState<PersonaV | null>(null);
  const [completa, setCompleta] = useState<PersonaCompleta | null>(null);
  const [zona, setZona] = useState<string | null>(null);
  const [solicitud, setSolicitud] = useState<string | null>(null);
  const [detalle, setDetalle] = useState("");
  const [canal, setCanal] = useState("presencial");
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error" | "alerta"; texto: string } | null>(null);

  useEffect(() => {
    (async () => {
      const x = (await app.almacen.obtener("personas", id)) as PersonaV | null;
      setP(x);
      if (x?.vivienda_id) setZona(((await app.almacen.obtener("viviendas", String(x.vivienda_id)))?.zona_id as string) ?? null);
    })();
  }, [id, app.almacen, app.version]);

  if (!p) return <Cargando texto="Persona no disponible en este teléfono." />;
  const v = vistaParaPantalla(p, completa);
  const puedeCompletos = app.perfil?.tiene("O-01", zona) ?? false;
  const noContactar = p.estado !== "activa";

  async function verCompletos() {
    const { data, error } = await cliente.rpc("rpc_persona_completa", { p_id: id });
    if (error) setMensaje({ tipo: "error", texto: app.conectado ? "No tiene permiso o falta la verificación en dos pasos." : "Necesita conexión para ver los datos completos." });
    else setCompleta(data as PersonaCompleta);
  }
  async function marcarNoContactar() {
    if (!app.usuarioId) return;
    await encolarAccion(app.almacen, app.usuarioId, "no_contactar", { persona_id: id, motivo: "Lo pidió la persona" });
    await app.almacen.guardar("personas", { ...(p as PersonaV), estado: "no_contactar" } as never, true);
    setMensaje({ tipo: "ok", texto: "Marcada como «No contactar». Se envía al servidor." });
    app.avisarCambio();
    app.sincronizar();
  }
  async function registrarSolicitud() {
    if (!app.usuarioId || !solicitud) return;
    await encolarAccion(app.almacen, app.usuarioId, "solicitud_titular", { tipo: solicitud, persona_id: id, detalle, canal });
    if (solicitud === "supresion" || solicitud === "revocatoria") await app.almacen.guardar("personas", { ...(p as PersonaV), estado: "no_contactar" } as never, true);
    setMensaje({ tipo: "ok", texto: "Solicitud registrada. El Director la atiende dentro del plazo y la persona queda en «No contactar» de inmediato." });
    setSolicitud(null);
    app.avisarCambio();
    app.sincronizar();
  }

  const telefono = completa?.telefono;
  return (
    <Pantalla titulo={v.nombre_visible || "Persona"}>
      {noContactar ? <Aviso tipo="error" texto="Esta persona pidió no ser contactada." /> : null}
      <Tarjeta>
        <Texto>Cédula: {v.cedula_txt || "—"}</Texto>
        <Texto>Edad o nacimiento: {v.nacimiento_txt || "—"}</Texto>
        <Texto>Teléfono: {v.telefono_txt || "—"}</Texto>
        <Texto>Correo: {v.correo_txt || "—"}</Texto>
        {v.simpatia_txt ? <Texto>Simpatía [SENSIBLE]: {v.simpatia_txt}</Texto> : null}
      </Tarjeta>
      {puedeCompletos && !completa ? <Boton texto="Ver datos completos (queda registrado)" variante="secundario" onPress={verCompletos} /> : null}
      {telefono && !noContactar && p.tiene_contacto_autorizado ? (
        <Fila>
          <Boton texto="Llamar" onPress={() => Linking.openURL(`tel:${telefono}`)} />
          <Boton texto="WhatsApp" variante="secundario" onPress={() => Linking.openURL(`https://wa.me/57${telefono}`)} />
        </Fila>
      ) : null}
      {!noContactar ? <Boton texto="Marcar «No contactar»" variante="peligro" onPress={marcarNoContactar} /> : null}
      <Tarjeta>
        <Texto negrita>Registrar una solicitud de la persona sobre sus datos</Texto>
        <Opciones opciones={opciones("C-18")} valor={solicitud} onCambio={(x) => setSolicitud(x as string)} />
        {solicitud ? (
          <>
            <Opciones etiqueta="¿Por dónde llegó?" opciones={[["presencial", "En persona"], ["whatsapp", "WhatsApp"], ["correo", "Correo"], ["telefono", "Teléfono"]]} valor={canal} onCambio={(x) => setCanal(x as string)} />
            <Campo etiqueta="Detalle" value={detalle} onChangeText={setDetalle} multiline />
            <Boton texto="Registrar solicitud" onPress={registrarSolicitud} />
          </>
        ) : null}
      </Tarjeta>
      {mensaje ? <Aviso tipo={mensaje.tipo} texto={mensaje.texto} /> : null}
    </Pantalla>
  );
}
