// P-20 Anuncios (versión básica): leer y confirmar la lectura. Publicar llega con el panel web (O-11).
import { useEffect, useState } from "react";
import { encolarAccion } from "@/servicios/campo";
import { useApp } from "@/servicios/contexto";
import { Boton, Pantalla, Tarjeta, Texto } from "@/ui/componentes";

type F = Record<string, any>;

export default function Anuncios() {
  const app = useApp();
  const [anuncios, setAnuncios] = useState<F[]>([]);
  const [leidos, setLeidos] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const lista = ((await app.almacen.listar("anuncios")) as F[]).filter((a) => !a.caduca_en || new Date(a.caduca_en) > new Date());
      setAnuncios(lista.sort((a, b) => Number(Boolean(b.fijado)) - Number(Boolean(a.fijado)) || String(b.creado_en ?? "").localeCompare(String(a.creado_en ?? ""))));
      setLeidos((await app.almacen.getMeta<string[]>("anuncios_leidos")) ?? []);
    })();
  }, [app.almacen, app.version]);

  async function leido(id: string) {
    if (!app.usuarioId) return;
    await encolarAccion(app.almacen, app.usuarioId, "anuncio_leido", { id });
    const n = [...leidos, id];
    setLeidos(n);
    await app.almacen.setMeta("anuncios_leidos", n);
    app.sincronizar();
  }

  return (
    <Pantalla titulo="Anuncios">
      {anuncios.map((a) => (
        <Tarjeta key={a.id}>
          <Texto negrita>{a.fijado ? "📌 " : ""}{a.titulo}{a.prioridad !== "normal" ? ` · ${a.prioridad}` : ""}</Texto>
          <Texto>{a.texto}</Texto>
          {leidos.includes(a.id) ? <Texto suave>Leído</Texto> : <Boton texto="Confirmar lectura" variante="suave" onPress={() => leido(a.id)} />}
        </Tarjeta>
      ))}
      {!anuncios.length ? <Texto suave>No hay anuncios.</Texto> : null}
    </Pantalla>
  );
}
