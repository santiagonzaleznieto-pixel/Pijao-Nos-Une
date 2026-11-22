// P-14 Detalle de persona: protección estándar (7.4). Los datos completos solo con O-01, pedidos al servidor (que audita).
// Desde aquí se marca «No contactar» (7.8). Las solicitudes de derechos salieron de la app (decisión del dueño, 0020).
// Diseño de la Fase 2.
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Text, View } from "react-native";
import { vistaParaPantalla, type PersonaCompleta, type PersonaV } from "@/core/enmascarado";
import { encolarAccion } from "@/servicios/campo";
import { cliente, useApp } from "@/servicios/contexto";
import { Aviso, Avatar, Boton, Cargando, Dato, Fila, Pantalla, Seccion, TituloMedio, Vacio } from "@/ui/componentes";
import { color, fuente, tl } from "@/ui/tema";

export default function Persona() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const [p, setP] = useState<PersonaV | null | undefined>(undefined);
  const [completa, setCompleta] = useState<PersonaCompleta | null>(null);
  const [zona, setZona] = useState<string | null>(null);
  const [lugar, setLugar] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error" | "alerta"; texto: string } | null>(null);

  useEffect(() => {
    (async () => {
      const x = (await app.almacen.obtener("personas", id)) as PersonaV | null;
      setP(x);
      if (x?.vivienda_id) {
        const v = await app.almacen.obtener("viviendas", String(x.vivienda_id));
        setZona((v?.zona_id as string) ?? null);
        setLugar(([v?.direccion, v?.barrio_vereda].filter(Boolean) as string[]).join(" · ") || null);
      }
    })();
  }, [id, app.almacen, app.version]);

  if (p === undefined) return <Cargando texto="Cargando…" />;
  if (!p) return <Pantalla><Vacio icono="persona" titulo="Persona no disponible en este teléfono" texto="Sincronice e intente de nuevo." /></Pantalla>;
  const v = vistaParaPantalla(p, completa);
  const puedeCompletos = app.perfil?.tiene("O-01", zona) ?? false;
  const noContactar = p.estado !== "activa";

  async function verCompletos() {
    const { data, error } = await cliente.rpc("rpc_persona_completa", { p_id: id });
    if (error) setMensaje({ tipo: "error", texto: app.conectado ? "No tiene permiso para ver los datos completos." : "Necesita conexión para ver los datos completos." });
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
  const telefono = completa?.telefono;
  return (
    <Pantalla
      pie={!noContactar ? <Boton texto="No contactar" variante="peligro" icono="candado" onPress={marcarNoContactar} /> : undefined}>
      <View style={{ alignItems: "center", gap: 6 }}>
        <Avatar nombre={v.nombre_visible} tam={72} tono={noContactar ? "rojo" : "azul"} />
        <TituloMedio>{v.nombre_visible || "Persona"}</TituloMedio>
        {lugar ? <Text style={{ fontFamily: fuente.textoMedio, fontSize: tl(14), color: color.textoSuave, textAlign: "center" }}>{lugar}</Text> : null}
      </View>
      {noContactar ? <Aviso tipo="error" icono="candado" texto="Esta persona pidió no ser contactada." /> : null}
      {!completa ? <Aviso tipo="info" icono="ojo" texto="Los datos se ven en parte. Verlos completos pide un permiso y queda registrado." /> : null}
      <Seccion>
        <Dato etiqueta="Cédula" valor={v.cedula_txt} />
        <Dato etiqueta="Edad o nacimiento" valor={v.nacimiento_txt} />
        <Dato etiqueta="Teléfono" valor={v.telefono_txt} />
        <Dato etiqueta="Correo" valor={v.correo_txt} ultimo={!v.simpatia_txt} />
        {v.simpatia_txt ? <Dato etiqueta="Simpatía [SENSIBLE]" valor={v.simpatia_txt} ultimo /> : null}
      </Seccion>
      {puedeCompletos && !completa ? <Boton texto="Ver datos completos (queda registrado)" variante="contorno" icono="ojo" onPress={verCompletos} /> : null}
      {telefono && !noContactar && p.tiene_contacto_autorizado ? (
        <Fila>
          <Boton texto="Llamar" icono="llamar" onPress={() => Linking.openURL(`tel:${telefono}`)} estilo={{ flex: 1 }} />
          <Boton texto="WhatsApp" variante="contorno" icono="mensaje" onPress={() => Linking.openURL(`https://wa.me/57${telefono}`)} estilo={{ flex: 1 }} />
        </Fila>
      ) : null}
      {mensaje ? <Aviso tipo={mensaje.tipo} texto={mensaje.texto} /> : null}
    </Pantalla>
  );
}
