// P-13 Detalle de vivienda: foto, dirección, estado, hogares y personas (enmascaradas), historial de visitas (6.6).
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Linking } from "react-native";
import { etiqueta } from "@/core/catalogos";
import { useApp } from "@/servicios/contexto";
import { Aviso, Boton, Cargando, Fila, Pantalla, Tarjeta, Texto } from "@/ui/componentes";

type F = Record<string, any>;

export default function Vivienda() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const router = useRouter();
  const [v, setV] = useState<F | null>(null);
  const [visitas, setVisitas] = useState<F[]>([]);
  const [personas, setPersonas] = useState<F[]>([]);
  const [hogares, setHogares] = useState<F[]>([]);

  useEffect(() => {
    (async () => {
      const a = app.almacen;
      setV(await a.obtener("viviendas", id));
      setVisitas(((await a.listar("visitas")) as F[]).filter((x) => x.vivienda_id === id).sort((x, y) => String(y.fecha).localeCompare(String(x.fecha))));
      setPersonas(((await a.listar("personas")) as F[]).filter((x) => x.vivienda_id === id));
      setHogares(((await a.listar("hogares")) as F[]).filter((x) => x.vivienda_id === id));
    })();
  }, [id, app.almacen, app.version]);

  if (!v) return <Cargando />;
  const noContactar = v.estado === "no_contactar";
  return (
    <Pantalla titulo={v.direccion ?? "Vivienda"}>
      {v.foto_local ? <Image source={{ uri: v.foto_local }} style={{ width: "100%", aspectRatio: 3 / 4 }} accessibilityLabel="Foto de fachada" /> : null}
      {noContactar ? <Aviso tipo="error" texto="No volver: la familia pidió no ser contactada (R-21)." /> : null}
      <Tarjeta>
        <Texto>{etiqueta("C-01", v.estado)} · {v.barrio_vereda ?? "sin barrio o vereda"}</Texto>
        <Texto suave>{etiqueta("C-03", v.tipo_vivienda, "")} {v.nombre_finca ? `· finca ${v.nombre_finca}` : ""}</Texto>
        {v.indicaciones ? <Texto suave>Cómo llegar: {v.indicaciones}</Texto> : null}
        {v.calidad ? <Texto suave>Calidad del registro: {v.calidad}</Texto> : null}
      </Tarjeta>
      <Fila>
        {!noContactar ? <Boton texto="Agregar visita" onPress={() => router.push({ pathname: "/visita", params: { vivienda: id } })} /> : null}
        <Boton texto="Cómo llegar" variante="suave" onPress={() => Linking.openURL(`geo:${v.lat},${v.lng}?q=${v.lat},${v.lng}`)} />
      </Fila>
      {hogares.map((h) => (
        <Tarjeta key={h.id}><Texto negrita>Hogar</Texto><Texto>{h.total_personas} persona(s){h.jefatura_femenina ? " · jefatura femenina" : ""}</Texto></Tarjeta>
      ))}
      <Tarjeta>
        <Texto negrita>Personas ({personas.length})</Texto>
        {personas.map((p) => <Boton key={p.id} variante="suave" texto={`${p.nombre_visible ?? "Persona"}${p.edad_anios ? ` · ${p.edad_anios} años` : ""}`} onPress={() => router.push(`/persona/${p.id}`)} />)}
      </Tarjeta>
      <Tarjeta>
        <Texto negrita>Historial de visitas</Texto>
        {visitas.map((x) => <Texto key={x.id}>{new Date(x.fecha).toLocaleDateString("es-CO")} · {etiqueta("C-02", x.resultado)} · {x.calidad ?? ""}</Texto>)}
        {!visitas.length ? <Texto suave>Sin visitas registradas en este teléfono.</Texto> : null}
      </Tarjeta>
    </Pantalla>
  );
}
