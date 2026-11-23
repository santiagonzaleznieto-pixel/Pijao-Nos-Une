// Calendario electoral (2.2 y 14.7): los hitos legales que el Administrador mantiene en el panel (Configuración →
// Calendario legal). Llegan con la configuración y se ven sin señal. El abogado confirma cada fecha.
import { useEffect, useState } from "react";
import { proximoHito, textoDias, type HitoVista } from "@/core/calendario";
import { fechaSinHora } from "@/core/personas";
import { leerCalendario } from "@/servicios/calendario";
import { useApp } from "@/servicios/contexto";
import { Aviso, Cargando, Ficha, Insignia, ItemLista, Pantalla, Seccion, Vacio } from "@/ui/componentes";

export default function Calendario() {
  const app = useApp();
  const [hitos, setHitos] = useState<HitoVista[] | null>(null);

  useEffect(() => {
    let vivo = true;
    leerCalendario(app.almacen).then((h) => { if (vivo) setHitos(h); });
    return () => { vivo = false; };
  }, [app.almacen, app.version]);

  if (!hitos) return <Pantalla titulo="Calendario electoral"><Cargando lista texto="Cargando el calendario…" /></Pantalla>;
  if (!hitos.length) {
    return (
      <Pantalla titulo="Calendario electoral">
        <Vacio icono="calendario" titulo="El calendario todavía no está en este teléfono" texto="Llega con la próxima sincronización. Revise que tenga señal." />
      </Pantalla>
    );
  }
  const proximo = proximoHito(hitos);
  const futuros = hitos.filter((h) => !h.pasado);
  const pasados = hitos.filter((h) => h.pasado).reverse();
  return (
    <Pantalla titulo="Calendario electoral" subtitulo="Fechas de la Registraduría para las elecciones del 31 de octubre de 2027. El abogado confirma cada una.">
      {proximo ? (
        <Aviso tipo="info" icono="calendario" texto={`Lo próximo: ${proximo.hito} · ${textoDias(proximo.dias)} (${fechaSinHora(proximo.fecha)}).`} />
      ) : null}
      {futuros.length ? (
        <Seccion titulo="Lo que viene">
          {futuros.map((h, i) => <FilaHito key={`${h.hito}-${i}`} h={h} ultimo={i === futuros.length - 1} />)}
        </Seccion>
      ) : null}
      {pasados.length ? (
        <Seccion titulo="Ya pasó">
          {pasados.map((h, i) => <FilaHito key={`${h.hito}-${i}`} h={h} ultimo={i === pasados.length - 1} />)}
        </Seccion>
      ) : null}
    </Pantalla>
  );
}

function FilaHito({ h, ultimo }: { h: HitoVista; ultimo: boolean }) {
  const confirmada = h.estado === "confirmada";
  return (
    <ItemLista titulo={h.hito} ultimo={ultimo}
      detalle={`${h.fecha ? `${fechaSinHora(h.fecha)} · ${textoDias(h.dias)}` : "Sin fecha todavía"}\n${h.estadoTexto}`}
      izquierda={<Ficha icono={h.pasado ? "check" : "calendario"} tono={h.pasado ? "gris" : confirmada ? "azul" : "naranja"} />}
      derecha={!h.pasado && h.dias !== null && h.dias <= 30 ? <Insignia texto={textoDias(h.dias)} tono="naranja" /> : undefined} />
  );
}
