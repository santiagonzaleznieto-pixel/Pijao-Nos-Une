// P-35 Derechos de los titulares (16.5): casos con plazos, respuesta, confirmación de supresión y prueba de autorización.
// Solo el Director y el Administrador. Necesita conexión (los casos no se guardan en los teléfonos).
import { useCallback, useEffect, useState } from "react";
import { etiqueta } from "@/core/catalogos";
import { cliente, useApp } from "@/servicios/contexto";
import { Aviso, Boton, Campo, Fila, Pantalla, Tarjeta, Texto } from "@/ui/componentes";

type Caso = { id: string; persona_id: string | null; tipo: string; canal: string | null; detalle: string | null; estado: string; recibido_en: string; plazo_interno: string; plazo_legal: string };

export default function Titulares() {
  const app = useApp();
  const [casos, setCasos] = useState<Caso[]>([]);
  const [respuesta, setRespuesta] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data, error } = await cliente.from("solicitudes_titulares").select("*").neq("estado", "resuelta").order("plazo_interno");
    if (error) setMensaje("No se pudieron cargar los casos. Revise la conexión.");
    else setCasos((data ?? []) as Caso[]);
  }, []);
  useEffect(() => { if (app.perfil?.puede("ver_titulares")) cargar(); }, [app.perfil, cargar]);

  async function resolver(c: Caso, estado: string) {
    const { error } = await cliente.rpc("rpc_resolver_titular", { p_id: c.id, p_estado: estado, p_respuesta: respuesta[c.id] ?? "" });
    setMensaje(error ? "No se pudo guardar. ¿Tiene conexión?" : estado === "resuelta" ? "Caso resuelto." : "Caso en proceso.");
    cargar();
  }
  async function prueba(c: Caso) {
    const { data, error } = await cliente.rpc("rpc_prueba_autorizacion", { p_persona: c.persona_id });
    setMensaje(error ? "No se pudo generar la prueba." : `Prueba lista: ${JSON.stringify((data as { autorizaciones: unknown[] }).autorizaciones.length)} autorización(es). Compártala con la persona por un canal seguro.`);
  }

  if (!app.perfil?.puede("ver_titulares")) return <Pantalla titulo="Derechos de los titulares"><Aviso tipo="alerta" texto="Solo el Director y el Administrador atienden estos casos." /></Pantalla>;
  return (
    <Pantalla titulo="Derechos de los titulares">
      <Texto suave>Plazo interno: 5 días hábiles. «No contactar» ya se aplicó al recibir el caso.</Texto>
      {mensaje ? <Aviso texto={mensaje} /> : null}
      {casos.map((c) => {
        const vencido = new Date(c.plazo_interno) < new Date();
        return (
          <Tarjeta key={c.id}>
            <Texto negrita>{etiqueta("C-18", c.tipo)} · caso {c.id.replace(/-/g, "").slice(0, 8).toUpperCase()}</Texto>
            <Texto suave>Recibido {new Date(c.recibido_en).toLocaleDateString("es-CO")} por {c.canal ?? "?"} · plazo interno {c.plazo_interno}{vencido ? " · VENCIDO" : ""} · legal {c.plazo_legal}</Texto>
            {c.detalle ? <Texto>{c.detalle}</Texto> : null}
            <Campo etiqueta="Respuesta" value={respuesta[c.id] ?? ""} onChangeText={(v) => setRespuesta({ ...respuesta, [c.id]: v })} multiline />
            <Fila>
              <Boton texto={c.tipo === "supresion" ? "Confirmar supresión" : "En proceso"} variante="secundario" onPress={() => resolver(c, "en_proceso")} />
              <Boton texto="Resuelto" onPress={() => resolver(c, "resuelta")} />
              {c.persona_id ? <Boton texto="Prueba de autorización" variante="suave" onPress={() => prueba(c)} /> : null}
            </Fila>
          </Tarjeta>
        );
      })}
      {!casos.length ? <Texto suave>No hay casos abiertos.</Texto> : null}
      <Texto suave>El borrado definitivo lo hace el Administrador con verificación en dos pasos y acta (rpc_borrar_persona).</Texto>
    </Pantalla>
  );
}
