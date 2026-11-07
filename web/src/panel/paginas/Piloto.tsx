// 22.3: métricas del piloto para el Director y el Administrador. Solo totales, medianas y porcentajes, sin datos
// personales ni nombres de colaboradores: tiempo por registro, GPS, trabajo sin señal, envíos y calidad.
import { useState } from "react";
import { etiquetaMetrica } from "../../logica/textos";
import { diaMas, fecha, nivelMeta90, type Nivel } from "../../logica/utiles";
import type { MetricasPiloto } from "../datos/tipos";
import { Chip, Encabezado, Estado, useCarga, usePanel } from "../ui";

const ETIQUETA: Record<Nivel, string> = { ok: "En la meta", alerta: "Revisar", critico: "Lejos de la meta" };
const num = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 1 });
const seg = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n < 120 ? `${num(n)} s` : `${num(n / 60)} min`);
const pct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${num(n)} %`);

function Lista({ datos, vacio }: { datos: Record<string, number>; vacio: string }) {
  const filas = Object.entries(datos).sort((a, b) => b[1] - a[1]);
  if (!filas.length) return <p className="suave">{vacio}</p>;
  return <ul>{filas.map(([k, n]) => <li key={k}>{etiquetaMetrica(k)}: <strong>{n}</strong></li>)}</ul>;
}

export function Piloto() {
  const { fuente } = usePanel();
  const [desde, setDesde] = useState(diaMas(-30));
  const [hasta, setHasta] = useState(diaMas(0));
  const [periodo, setPeriodo] = useState({ desde: diaMas(-30), hasta: diaMas(0) });
  const datos = useCarga(() => fuente.metricasPiloto(periodo.desde, periodo.hasta), [fuente, periodo]);
  return (
    <>
      <Encabezado titulo="Métricas del piloto" />
      <p className="suave">Lo que el piloto enseña para la Fase 2 (22.3). Los teléfonos envían solo números y categorías: ningún nombre,
        cédula, dirección ni ubicación. Tampoco se muestra quién envió cada dato.</p>
      <form className="tarjeta" onSubmit={(e) => { e.preventDefault(); setPeriodo({ desde, hasta }); }}>
        <div className="fila-form">
          <div><label htmlFor="p-desde">Desde</label><input id="p-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
          <div><label htmlFor="p-hasta">Hasta</label><input id="p-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
          <div><button type="submit" className="boton">Ver</button></div>
        </div>
      </form>
      <Estado carga={datos}>{(m) => <Tablero m={m} />}</Estado>
    </>
  );
}

function Tablero({ m }: { m: MetricasPiloto }) {
  const rapido = m.registros.por_tipo.find((t) => t.tipo === "solo_punto");
  const nivel = nivelMeta90(rapido?.pct_bajo_90_seg);
  const totalCalidad = m.calidad.verde + m.calidad.amarillo + m.calidad.rojo;
  return (
    <>
      <p className="suave">Del {fecha(m.desde)} al {fecha(m.hasta)} · {m.colaboradores} colaborador{m.colaboradores === 1 ? "" : "es"} enviaron datos.</p>
      <div className="cuadricula">
        <div className="tarjeta"><div className="suave">Registros</div><div className="cifra">{m.registros.total}</div>
          <div className="suave pequeno">Mitad en menos de {seg(m.registros.mediana_seg)} · 9 de cada 10 en menos de {seg(m.registros.p90_seg)}</div></div>
        <div className="tarjeta"><div className="suave">Registro sin contacto en menos de 90 s</div>
          <div className={`cifra${nivel === "ok" ? "" : ` ${nivel}`}`}>{pct(rapido?.pct_bajo_90_seg)}</div>
          <div className="suave pequeno"><Chip nivel={nivel}>{ETIQUETA[nivel]}</Chip> Meta: 80 % (6.1)</div></div>
        <div className="tarjeta"><div className="suave">Registros hechos sin señal</div><div className="cifra">{m.sin_senal.registros}</div>
          <div className="suave pequeno">{pct(m.sin_senal.pct)} del total</div></div>
        <div className="tarjeta"><div className="suave">Precisión típica del GPS</div>
          <div className="cifra">{m.gps.mediana_precision_m === null ? "—" : `±${num(m.gps.mediana_precision_m)} m`}</div>
          <div className="suave pequeno">{m.gps.lecturas} lecturas</div></div>
      </div>

      <section className="tarjeta">
        <h2>Tiempo por tipo de registro</h2>
        {m.registros.por_tipo.length ? (
          <div className="tabla-envoltura"><table>
            <thead><tr><th>Tipo</th><th>Registros</th><th>Tiempo típico</th><th>En menos de 90 s</th></tr></thead>
            <tbody>{m.registros.por_tipo.map((t) => (
              <tr key={t.tipo}><td>{etiquetaMetrica(t.tipo)}</td><td>{t.total}</td><td>{seg(t.mediana_seg)}</td><td>{pct(t.pct_bajo_90_seg)}</td></tr>
            ))}</tbody>
          </table></div>
        ) : <p className="suave">Todavía no hay registros en este periodo.</p>}
      </section>

      <div className="cuadricula">
        <section className="tarjeta">
          <h2>Calidad (6.4)</h2>
          <ul>
            <li>Verdes: <strong>{m.calidad.verde}</strong>{totalCalidad ? ` (${Math.round((100 * m.calidad.verde) / totalCalidad)} %)` : ""}</li>
            <li>Amarillas: <strong>{m.calidad.amarillo}</strong></li>
            <li>Rojas: <strong>{m.calidad.rojo}</strong></li>
          </ul>
        </section>
        <section className="tarjeta"><h2>Problemas del GPS</h2><Lista datos={m.gps.errores} vacio="Sin problemas del GPS." /></section>
        <section className="tarjeta">
          <h2>Envíos</h2>
          <Lista datos={m.envios.errores} vacio="Ningún envío falló." />
          <p className="suave pequeno">{m.envios.en_revision} registros quedaron en revisión · {m.envios.colas_atrasadas} veces un teléfono tuvo datos sin enviar por más de 24 horas.</p>
        </section>
      </div>

      <section className="tarjeta">
        <h2>Día por día</h2>
        {m.por_dia.length ? (
          <div className="tabla-envoltura"><table>
            <thead><tr><th>Día</th><th>Registros</th><th>Tiempo típico</th><th>Problemas del GPS</th><th>Envíos fallidos</th></tr></thead>
            <tbody>{m.por_dia.map((d) => (
              <tr key={d.dia}><td>{fecha(d.dia)}</td><td>{d.registros}</td><td>{seg(d.mediana_seg)}</td><td>{d.gps_errores}</td><td>{d.envio_errores}</td></tr>
            ))}</tbody>
          </table></div>
        ) : <p className="suave">Sin datos en este periodo.</p>}
      </section>
    </>
  );
}
