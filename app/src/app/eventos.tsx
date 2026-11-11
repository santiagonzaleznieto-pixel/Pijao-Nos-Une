// P-19 Eventos del equipo (10.4): los próximos encuentros que organiza la campaña. Se descargan al teléfono, así que se ven
// sin señal. Los crea el Director (o quien tenga O-10) en el panel. Recordatorio legal fijo: nada de obsequios.
import { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { etiqueta } from "@/core/catalogos";
import { diaBogota, fechaConDia, hora } from "@/core/formato";
import { useApp } from "@/servicios/contexto";
import { Aviso, Boton, Cargando, Etiqueta, Insignia, Pantalla, Seccion, Texto, TituloMedio, Vacio } from "@/ui/componentes";

type E = Record<string, any>;

export default function Eventos() {
  const app = useApp();
  const [eventos, setEventos] = useState<E[] | null>(null);

  useEffect(() => {
    (async () => {
      const hoy = diaBogota();
      const l = ((await app.almacen.listar("eventos")) as E[])
        .filter((e) => !e.eliminado_en && diaBogota(e.fin ?? e.inicio) >= hoy)
        .sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)));
      setEventos(l);
    })();
  }, [app.almacen, app.version]);

  if (!eventos) return <Pantalla titulo="Eventos"><Cargando lista /></Pantalla>;
  return (
    <Pantalla titulo="Eventos">
      {!eventos.length ? <Vacio icono="calendario" titulo="No hay eventos próximos" texto="Cuando el Director programe uno, aparece aquí. Funciona sin señal." /> : null}
      {eventos.map((e, i) => (
        <View key={e.id} style={{ gap: 8 }}>
          {i === 0 || diaBogota(e.inicio) !== diaBogota(eventos[i - 1].inicio) ? <Etiqueta>{diaBogota(e.inicio) === diaBogota() ? "Hoy" : fechaConDia(e.inicio)}</Etiqueta> : null}
          <Seccion>
            <Insignia texto={etiqueta("C-12", e.tipo) || "Evento"} tono="turquesa" icono="calendario" />
            <TituloMedio>{e.titulo}</TituloMedio>
            <Texto suave>{`${hora(e.inicio)}${e.fin ? ` a ${hora(e.fin)}` : ""}${e.lugar ? ` · ${e.lugar}` : ""}`}</Texto>
            {e.descripcion ? <Texto>{e.descripcion}</Texto> : null}
            {e.lat != null && e.lng != null ? <Boton texto="Cómo llegar" variante="contorno" icono="ruta" onPress={() => Linking.openURL(`geo:${e.lat},${e.lng}?q=${e.lat},${e.lng}`)} /> : null}
          </Seccion>
        </View>
      ))}
      <Aviso tipo="info" texto="En los eventos no se entregan obsequios, mercados ni dinero, ni se prometen favores." />
    </Pantalla>
  );
}
