// P-35 Derechos de los titulares (16.5): casos con plazos, respuesta, confirmación de supresión y prueba de autorización.
// Solo el Director y el Administrador. Necesita conexión (los casos no se guardan en los teléfonos). Diseño de la Fase 2.
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { etiqueta } from "@/core/catalogos";
import { cliente, useApp } from "@/servicios/contexto";
import { Aviso, Boton, Campo, Cargando, ErrorReintentar, Ficha, Fila, ItemLista, Pantalla, SinPermiso, Texto, Vacio, type Tono } from "@/ui/componentes";
import type { NombreIcono } from "@/ui/Icono";
import { espacio } from "@/ui/tema";

type Caso = { id: string; persona_id: string | null; tipo: string; canal: string | null; detalle: string | null; estado: string; recibido_en: string; plazo_interno: string; plazo_legal: string };
const FECHA = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" });
const ICONO_TIPO: Record<string, [NombreIcono, Tono]> = {
  supresion: ["basura", "rojo"], revocatoria: ["equis", "rojo"], consulta: ["ojo", "azul"], acceso: ["ojo", "azul"],
  rectificacion: ["editar", "turquesa"], no_contactar: ["candado", "verde"], queja: ["alerta", "naranja"],
};

export default function Titulares() {
  const app = useApp();
  const [casos, setCasos] = useState<Caso[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    const { data, error: e } = await cliente.from("solicitudes_titulares").select("*").neq("estado", "resuelta").order("plazo_interno");
    if (e) setError("No se pudieron cargar los casos. Revise la conexión.");
    else setCasos((data ?? []) as Caso[]);
  }, []);
  useEffect(() => { if (app.perfil?.puede("ver_titulares")) cargar(); }, [app.perfil, cargar]);

  async function resolver(c: Caso, estado: string) {
    const { error: e } = await cliente.rpc("rpc_resolver_titular", { p_id: c.id, p_estado: estado, p_respuesta: respuesta[c.id] ?? "" });
    setMensaje(e ? "No se pudo guardar. ¿Tiene conexión?" : estado === "resuelta" ? "Caso resuelto." : "Caso en proceso.");
    cargar();
  }
  async function prueba(c: Caso) {
    const { data, error: e } = await cliente.rpc("rpc_prueba_autorizacion", { p_persona: c.persona_id });
    setMensaje(e ? "No se pudo generar la prueba." : `Prueba lista: ${(data as { autorizaciones: unknown[] }).autorizaciones.length} autorización(es). Compártala con la persona por un canal seguro.`);
  }

  if (!app.perfil?.puede("ver_titulares")) return <Pantalla><SinPermiso texto="Solo el Director y el Administrador atienden estos casos." /></Pantalla>;
  if (error) return <Pantalla><ErrorReintentar texto={error} onReintentar={cargar} /></Pantalla>;
  if (!casos) return <Pantalla><Cargando lista texto="Cargando los casos…" /></Pantalla>;
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  const vencidos = casos.filter((c) => c.plazo_interno < hoy).length;

  return (
    <Pantalla>
      {vencidos ? <Aviso tipo="error" icono="reloj" texto={`${vencidos} ${vencidos === 1 ? "caso tiene" : "casos tienen"} el plazo interno vencido. Respóndalo hoy.`} />
        : <Aviso tipo="info" texto="Plazo interno: 5 días hábiles. «No contactar» ya se aplicó al recibir cada caso." />}
      {mensaje ? <Aviso tipo="ok" texto={mensaje} /> : null}
      {!casos.length ? <Vacio icono="check" tono="verde" titulo="No hay casos abiertos" texto="Las solicitudes de las personas sobre sus datos aparecen aquí." /> : null}
      <View>
        {casos.map((c, i) => {
          const [icono, tono] = ICONO_TIPO[c.tipo] ?? ["documento", "azul"];
          const vencido = c.plazo_interno < hoy;
          const ver = abierto === c.id;
          return (
            <View key={c.id}>
              <ItemLista titulo={etiqueta("C-18", c.tipo)} izquierda={<Ficha icono={icono} tono={vencido ? "rojo" : tono} />} ultimo={i === casos.length - 1 && !ver}
                detalle={`Caso ${c.id.replace(/-/g, "").slice(0, 8).toUpperCase()} · plazo ${FECHA.format(new Date(c.plazo_interno))}${vencido ? " · vencido" : ""} · legal ${FECHA.format(new Date(c.plazo_legal))}`}
                onPress={() => setAbierto(ver ? null : c.id)} />
              {ver ? (
                <View style={{ gap: espacio.m, paddingVertical: espacio.m, paddingLeft: 56 }}>
                  <Texto suave>Recibido el {FECHA.format(new Date(c.recibido_en))} por {c.canal ?? "un canal sin registrar"}.</Texto>
                  {c.detalle ? <Texto>{c.detalle}</Texto> : null}
                  <Campo etiqueta="Respuesta" value={respuesta[c.id] ?? ""} onChangeText={(v) => setRespuesta({ ...respuesta, [c.id]: v })} multiline />
                  <Fila>
                    <Boton texto={c.tipo === "supresion" ? "Confirmar supresión" : "En proceso"} variante="contorno" onPress={() => resolver(c, "en_proceso")} estilo={{ flexGrow: 1 }} />
                    <Boton texto="Resuelto" icono="check" onPress={() => resolver(c, "resuelta")} estilo={{ flexGrow: 1 }} />
                  </Fila>
                  {c.persona_id ? <Boton texto="Prueba de autorización" variante="suave" icono="documento" onPress={() => prueba(c)} /> : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
      <Texto suave tam="pequena">El borrado definitivo lo hace el Administrador con verificación en dos pasos y acta.</Texto>
    </Pantalla>
  );
}
