// P-18 Tareas (10.3) con el diseño de la Fase 2: ver las asignadas, marcarlas hechas con nota o reportar un bloqueo.
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { etiqueta } from "@/core/catalogos";
import { encolarAccion } from "@/servicios/campo";
import { useApp } from "@/servicios/contexto";
import { Boton, Campo, Chip, Ficha, Fila, ItemLista, Pantalla, Vacio, Cargando, type Tono } from "@/ui/componentes";
import type { NombreIcono } from "@/ui/Icono";
import { espacio } from "@/ui/tema";
import { diaBogota, fechaConDia } from "@/core/formato";

type F = Record<string, any>;
const hoyClave = () => diaBogota();

function plazo(t: F): { texto: string; tono: Tono; icono: NombreIcono } {
  if (t.estado === "hecha") return { texto: "Hecha", tono: "verde", icono: "check" };
  if (t.estado === "bloqueada") return { texto: "Bloqueada", tono: "rojo", icono: "alerta" };
  if (!t.fecha_limite) return { texto: "Sin fecha", tono: "azul", icono: "tareas" };
  const f = diaBogota(t.fecha_limite);
  if (f < hoyClave()) return { texto: `Venció el ${fechaConDia(t.fecha_limite)}`, tono: "rojo", icono: "reloj" };
  if (f === hoyClave()) return { texto: "Vence hoy", tono: "naranja", icono: "reloj" };
  return { texto: `Vence el ${fechaConDia(t.fecha_limite)}`, tono: "azul", icono: "calendario" };
}

export default function Tareas() {
  const app = useApp();
  const [tareas, setTareas] = useState<F[] | null>(null);
  const [nota, setNota] = useState<Record<string, string>>({});
  const [filtro, setFiltro] = useState<"mias" | "vencidas" | "hechas">("mias");
  const [abierta, setAbierta] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const t = ((await app.almacen.listar("tareas")) as F[]).filter((x) => x.asignado_a === app.usuarioId || app.practica);
      setTareas(t.sort((a, b) => String(a.fecha_limite ?? "9").localeCompare(String(b.fecha_limite ?? "9"))));
    })();
  }, [app.almacen, app.usuarioId, app.version, app.practica]);

  async function cambiar(t: F, estado: string) {
    if (!app.usuarioId) return;
    await encolarAccion(app.almacen, app.usuarioId, "tarea_estado", { id: t.id, estado, nota: nota[t.id] ?? null });
    await app.almacen.guardar("tareas", { ...t, estado, id: t.id }, true);
    setAbierta(null);
    app.avisarCambio();
    app.sincronizar();
  }

  if (!tareas) return <Pantalla titulo="Tareas"><Cargando lista texto="Cargando sus tareas…" /></Pantalla>;
  const abiertas = tareas.filter((t) => ["pendiente", "en_curso", "bloqueada"].includes(t.estado));
  const vencidas = abiertas.filter((t) => t.fecha_limite && diaBogota(t.fecha_limite) < hoyClave());
  const hechas = tareas.filter((t) => t.estado === "hecha");
  const lista = filtro === "mias" ? abiertas : filtro === "vencidas" ? vencidas : hechas;

  return (
    <Pantalla titulo="Tareas">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip texto={`Mías · ${abiertas.length}`} activo={filtro === "mias"} onPress={() => setFiltro("mias")} />
        <Chip texto={`Vencidas · ${vencidas.length}`} activo={filtro === "vencidas"} onPress={() => setFiltro("vencidas")} />
        <Chip texto={`Hechas · ${hechas.length}`} activo={filtro === "hechas"} onPress={() => setFiltro("hechas")} />
      </ScrollView>
      {!lista.length ? (
        <Vacio icono="tareas" titulo={filtro === "hechas" ? "Todavía no hay tareas hechas" : filtro === "vencidas" ? "Ninguna tarea vencida" : "No tiene tareas pendientes"}
          texto={filtro === "mias" ? "Cuando el Director le asigne una, aparece aquí. Funciona sin señal." : undefined} tono={filtro === "vencidas" ? "verde" : "gris"} />
      ) : null}
      <View>
        {lista.map((t, i) => {
          const p = plazo(t);
          const abiertaEsta = abierta === t.id;
          return (
            <View key={t.id}>
              <ItemLista titulo={t.titulo} detalle={`${p.texto} · ${etiqueta("C-13", t.tipo)}${t.prioridad && t.prioridad !== "normal" ? ` · prioridad ${t.prioridad}` : ""}`}
                izquierda={<Ficha icono={p.icono} tono={p.tono} />} ultimo={i === lista.length - 1 && !abiertaEsta}
                onPress={t.estado === "hecha" ? undefined : () => setAbierta(abiertaEsta ? null : t.id)} />
              {abiertaEsta ? (
                <View style={{ gap: espacio.m, paddingVertical: espacio.m, paddingLeft: 56 }}>
                  {t.descripcion ? <ItemLista titulo="Qué hay que hacer" detalle={t.descripcion} ultimo /> : null}
                  <Campo etiqueta="Nota (opcional)" value={nota[t.id] ?? ""} onChangeText={(v) => setNota({ ...nota, [t.id]: v })} multiline />
                  <Fila>
                    <Boton texto="Marcar hecha" icono="check" onPress={() => cambiar(t, "hecha")} estilo={{ flexGrow: 1 }} />
                    <Boton texto="Reportar bloqueo" variante="contorno" onPress={() => cambiar(t, "bloqueada")} estilo={{ flexGrow: 1 }} />
                  </Fila>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </Pantalla>
  );
}
