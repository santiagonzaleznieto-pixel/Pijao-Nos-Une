// Panel · Eventos del equipo (P-19, 10.4): programar encuentros que todo el equipo ve en la app, también sin señal.
import { useState } from "react";
import { diaMas, fechaHora } from "../../logica/utiles";
import type { NuevoEvento } from "../datos/tipos";
import { Aviso, Encabezado, Estado, useAccion, useCarga, usePanel } from "../ui";

const TIPOS: [string, string][] = [["reunion_vereda", "Reunión de vereda"], ["reunion_barrio", "Reunión de barrio"], ["tertulia_casa", "Tertulia en casa"],
  ["cabildo_foro", "Cabildo o foro"], ["jornada_escucha", "Jornada de escucha"], ["deportiva_cultural", "Actividad deportiva o cultural"], ["capacitacion", "Capacitación"]];
const NOMBRE_TIPO = Object.fromEntries(TIPOS);

export function Eventos() {
  const { fuente } = usePanel();
  const eventos = useCarga(() => fuente.eventosEquipo(), [fuente]);
  const accion = useAccion();
  const [f, setF] = useState({ titulo: "", tipo: "reunion_vereda", lugar: "", descripcion: "", dia: diaMas(1), desde: "17:00", hasta: "" });
  const poner = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  const evento = (): NuevoEvento => ({ titulo: f.titulo.trim(), tipo: f.tipo, lugar: f.lugar.trim(), descripcion: f.descripcion.trim(),
    inicio: `${f.dia}T${f.desde}:00-05:00`, fin: f.hasta ? `${f.dia}T${f.hasta}:00-05:00` : null });
  return (
    <>
      <Encabezado titulo="Eventos" />
      <p className="suave">Lo que programe aquí aparece en la app de todo el equipo (Más → Eventos), también sin señal. En los eventos no se entregan obsequios ni se prometen favores.</p>
      <details className="tarjeta" open>
        <summary style={{ cursor: "pointer" }}><strong>Programar un evento</strong></summary>
        <div className="fila-form" style={{ marginTop: 10 }}>
          <div style={{ flexBasis: "100%" }}><label htmlFor="ev-t">Nombre</label><input id="ev-t" type="text" value={f.titulo} maxLength={140} onChange={(e) => poner("titulo", e.target.value)} /></div>
          <div><label htmlFor="ev-tipo">Tipo</label><select id="ev-tipo" value={f.tipo} onChange={(e) => poner("tipo", e.target.value)}>{TIPOS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label htmlFor="ev-dia">Día</label><input id="ev-dia" type="date" value={f.dia} onChange={(e) => poner("dia", e.target.value)} /></div>
          <div><label htmlFor="ev-desde">Desde</label><input id="ev-desde" type="time" value={f.desde} onChange={(e) => poner("desde", e.target.value)} /></div>
          <div><label htmlFor="ev-hasta">Hasta (opcional)</label><input id="ev-hasta" type="time" value={f.hasta} onChange={(e) => poner("hasta", e.target.value)} /></div>
          <div style={{ flexBasis: "100%" }}><label htmlFor="ev-lugar">Lugar</label><input id="ev-lugar" type="text" value={f.lugar} maxLength={200} onChange={(e) => poner("lugar", e.target.value)} /></div>
          <div style={{ flexBasis: "100%" }}><label htmlFor="ev-desc">Detalle</label><textarea id="ev-desc" value={f.descripcion} maxLength={1000} onChange={(e) => poner("descripcion", e.target.value)} /></div>
          <button type="button" className="boton" disabled={accion.ocupado || f.titulo.trim().length < 3 || !f.dia || !f.desde || Boolean(f.hasta && f.hasta < f.desde)}
            onClick={() => void accion.ejecutar(() => fuente.guardarEvento(evento()), "Evento programado. El equipo lo verá en la app.")
              .then((ok) => { if (ok) { setF({ ...f, titulo: "", lugar: "", descripcion: "" }); eventos.recargar(); } })}>Programar</button>
        </div>
        {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
      </details>
      <h2>Próximos</h2>
      <Estado carga={eventos}>
        {(l) => !l.length ? <p className="suave">No hay eventos programados.</p> : (
          <div className="tabla-envoltura">
            <table>
              <thead><tr><th>Evento</th><th>Cuándo</th><th>Lugar</th><th /></tr></thead>
              <tbody>{l.map((e) => (
                <tr key={e.id}>
                  <td><strong>{e.titulo}</strong><br /><span className="suave pequeno">{NOMBRE_TIPO[e.tipo] ?? e.tipo}</span></td>
                  <td>{fechaHora(e.inicio)}{e.fin ? ` a ${fechaHora(e.fin).split(", ").pop()}` : ""}</td>
                  <td>{e.lugar ?? "—"}</td>
                  <td><button type="button" className="boton peligro chico" disabled={accion.ocupado}
                    onClick={() => void accion.ejecutar(() => fuente.cancelarEvento(e.id), "Evento cancelado.").then((ok) => ok && eventos.recargar())}>Cancelar</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Estado>
    </>
  );
}
