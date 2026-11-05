// P-18 Tareas (versión básica, 10.3): ver las asignadas, marcarlas hechas con nota o reportar un bloqueo.
import { useEffect, useState } from "react";
import { etiqueta } from "@/core/catalogos";
import { encolarAccion } from "@/servicios/campo";
import { useApp } from "@/servicios/contexto";
import { Boton, Campo, Fila, Pantalla, Tarjeta, Texto } from "@/ui/componentes";

type F = Record<string, any>;

export default function Tareas() {
  const app = useApp();
  const [tareas, setTareas] = useState<F[]>([]);
  const [nota, setNota] = useState<Record<string, string>>({});

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
    app.avisarCambio();
    app.sincronizar();
  }

  const abiertas = tareas.filter((t) => ["pendiente", "en_curso", "bloqueada"].includes(t.estado));
  return (
    <Pantalla titulo="Mis tareas">
      {!abiertas.length ? <Texto suave>No tiene tareas pendientes.</Texto> : null}
      {abiertas.map((t) => {
        const vencida = t.fecha_limite && new Date(t.fecha_limite) < new Date();
        return (
          <Tarjeta key={t.id}>
            <Texto negrita>{t.titulo}</Texto>
            <Texto suave>{etiqueta("C-13", t.tipo)} · prioridad {t.prioridad}{t.fecha_limite ? ` · vence ${new Date(t.fecha_limite).toLocaleDateString("es-CO")}` : ""}{vencida ? " · VENCIDA" : ""}</Texto>
            {t.descripcion ? <Texto>{t.descripcion}</Texto> : null}
            <Campo etiqueta="Nota" value={nota[t.id] ?? ""} onChangeText={(v) => setNota({ ...nota, [t.id]: v })} />
            <Fila>
              <Boton texto="Hecha" onPress={() => cambiar(t, "hecha")} />
              <Boton texto="Reportar bloqueo" variante="suave" onPress={() => cambiar(t, "bloqueada")} />
            </Fila>
          </Tarjeta>
        );
      })}
    </Pantalla>
  );
}
