// Panel · Fase 3: tareas del equipo (P-18, 10.3: crear y asignar; el colaborador las ve y las marca en la app) e informe
// del día o de la semana (P-23, 9.11), con la versión de una página para el candidato (N-15) lista para imprimir.
import { useState } from "react";
import { diaMas, fecha } from "../../logica/utiles";
import type { NuevaTarea, TareaPanel } from "../datos/tipos";
import { Aviso, Chip, Encabezado, Estado, Pestanas, useAccion, useCarga, usePanel } from "../ui";

const TIPOS_TAREA: [string, string][] = [["visitar", "Visitar"], ["seguimiento", "Seguimiento"], ["verificar", "Verificar"], ["entregar_material", "Entregar material"],
  ["reunion", "Reunión"], ["evento", "Evento"], ["llamar", "Llamar"], ["otra", "Otra"]];
const ESTADO_TAREA: Record<string, string> = { pendiente: "Pendiente", en_curso: "En curso", bloqueada: "Bloqueada", hecha: "Hecha", cancelada: "Cancelada" };
const TEMA: Record<string, string> = {
  educacion: "Educación", deporte_juventud: "Deporte y juventud", campo_cafe: "Campo y café", vivienda_entorno: "Vivienda y entorno",
  bienestar_animal: "Bienestar animal", vias_movilidad: "Vías y movilidad", agua_ambiente: "Agua y ambiente", turismo_cultura: "Turismo y cultura",
  salud: "Salud", seguridad: "Seguridad", empleo_emprendimiento: "Empleo", poblaciones: "Poblaciones específicas", gobierno_cercano: "Gobierno cercano", otro: "Otro",
};

// ----------------------------------------------------------------------------- tareas
export function Tareas() {
  const { fuente } = usePanel();
  const tareas = useCarga(() => fuente.tareasEquipo(), [fuente]);
  const gente = useCarga(() => fuente.colaboradores(), [fuente]);
  const [filtro, setFiltro] = useState<"abiertas" | "cerradas">("abiertas");
  const nombre = (id: string | null) => (id ? gente.datos?.find((c) => c.id === id)?.nombre_completo ?? "Colaborador" : "Sin asignar");
  return (
    <>
      <Encabezado titulo="Tareas del equipo" />
      <NuevaTareaForm gente={(gente.datos ?? []).filter((c) => c.estado === "activo").map((c) => [c.id, c.nombre_completo] as [string, string])} alCrear={tareas.recargar} />
      <Pestanas opciones={[["abiertas", "Abiertas"], ["cerradas", "Hechas o canceladas"]] as const} valor={filtro} cambiar={setFiltro} />
      <Estado carga={tareas}>
        {(l) => {
          const lista = l.filter((t) => (filtro === "abiertas") === ["pendiente", "en_curso", "bloqueada"].includes(t.estado));
          if (!lista.length) return <p className="suave">No hay tareas en esta lista.</p>;
          return (
            <div className="tabla-envoltura">
              <table>
                <thead><tr><th>Tarea</th><th>Asignada a</th><th>Vence</th><th>Estado</th></tr></thead>
                <tbody>{lista.map((t) => <Fila key={t.id} t={t} nombre={nombre(t.asignado_a)} />)}</tbody>
              </table>
            </div>
          );
        }}
      </Estado>
    </>
  );
}

function Fila({ t, nombre }: { t: TareaPanel; nombre: string }) {
  const vencida = t.fecha_limite && t.fecha_limite.slice(0, 10) < diaMas(0) && ["pendiente", "en_curso", "bloqueada"].includes(t.estado);
  return (
    <tr>
      <td><strong>{t.titulo}</strong>{t.descripcion ? <><br /><span className="suave pequeno">{t.descripcion}</span></> : null}</td>
      <td>{nombre}</td>
      <td>{t.fecha_limite ? <Chip nivel={vencida ? "critico" : "neutro"}>{vencida ? `Venció el ${fecha(t.fecha_limite)}` : fecha(t.fecha_limite)}</Chip> : "—"}</td>
      <td><Chip nivel={t.estado === "hecha" ? "ok" : t.estado === "bloqueada" ? "critico" : "neutro"}>{ESTADO_TAREA[t.estado] ?? t.estado}</Chip></td>
    </tr>
  );
}

function NuevaTareaForm({ gente, alCrear }: { gente: [string, string][]; alCrear: () => void }) {
  const { fuente } = usePanel();
  const accion = useAccion();
  const vacia: NuevaTarea = { titulo: "", descripcion: "", tipo: "visitar", prioridad: "normal", fecha_limite: diaMas(2), asignado_a: null };
  const [t, setT] = useState<NuevaTarea>(vacia);
  const poner = <K extends keyof NuevaTarea>(k: K, v: NuevaTarea[K]) => setT({ ...t, [k]: v });
  return (
    <details className="tarjeta">
      <summary style={{ cursor: "pointer" }}><strong>Crear una tarea</strong></summary>
      <div className="fila-form" style={{ marginTop: 10 }}>
        <div style={{ flexBasis: "100%" }}><label htmlFor="t-titulo">Qué hay que hacer</label><input id="t-titulo" type="text" value={t.titulo} maxLength={140} onChange={(e) => poner("titulo", e.target.value)} /></div>
        <div style={{ flexBasis: "100%" }}><label htmlFor="t-desc">Detalle (sin datos de personas)</label><textarea id="t-desc" value={t.descripcion} maxLength={1000} onChange={(e) => poner("descripcion", e.target.value)} /></div>
        <div><label htmlFor="t-tipo">Tipo</label><select id="t-tipo" value={t.tipo} onChange={(e) => poner("tipo", e.target.value)}>{TIPOS_TAREA.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label htmlFor="t-para">Para</label><select id="t-para" value={t.asignado_a ?? ""} onChange={(e) => poner("asignado_a", e.target.value || null)}>
          <option value="">Sin asignar</option>{gente.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></div>
        <div><label htmlFor="t-vence">Vence</label><input id="t-vence" type="date" value={t.fecha_limite ?? ""} onChange={(e) => poner("fecha_limite", e.target.value || null)} /></div>
        <div><label htmlFor="t-prio">Prioridad</label><select id="t-prio" value={t.prioridad} onChange={(e) => poner("prioridad", e.target.value)}>
          <option value="baja">Baja</option><option value="normal">Normal</option><option value="alta">Alta</option></select></div>
        <button type="button" className="boton" disabled={accion.ocupado || t.titulo.trim().length < 3}
          onClick={() => void accion.ejecutar(() => fuente.crearTarea({ ...t, titulo: t.titulo.trim(), descripcion: t.descripcion.trim() }), "Tarea creada. Le aparece al colaborador en la app.")
            .then((ok) => { if (ok) { setT(vacia); alCrear(); } })}>Crear tarea</button>
      </div>
      {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
    </details>
  );
}

// ----------------------------------------------------------------------------- informe
export function Informe() {
  const { fuente } = usePanel();
  const [periodo, setPeriodo] = useState<"hoy" | "semana" | "mes">("hoy");
  const desde = periodo === "hoy" ? diaMas(0) : periodo === "semana" ? diaMas(-6) : diaMas(-29);
  const datos = useCarga(() => fuente.informe(desde), [fuente, desde]);
  return (
    <>
      <Encabezado titulo="Informe"><button type="button" className="boton secundario chico no-imprimir" onClick={() => window.print()}>Imprimir o guardar en PDF</button></Encabezado>
      <div className="no-imprimir"><Pestanas opciones={[["hoy", "Hoy"], ["semana", "Últimos 7 días"], ["mes", "Últimos 30 días"]] as const} valor={periodo} cambiar={setPeriodo} /></div>
      <Estado carga={datos}>
        {(r) => {
          const pct = r.visitas ? Math.round((r.verdes / r.visitas) * 100) : 0;
          const maxTema = Math.max(1, ...r.necesidades_por_tema.map((t) => t.n));
          return (
            <div className="informe">
              <p className="suave">Desde el {fecha(r.desde)} hasta hoy · {r.colaboradores_activos} personas activas en el equipo. Cifras agregadas, sin datos de personas.</p>
              <div className="cuadricula">
                <div className="tarjeta"><div className="suave">Visitas</div><div className="cifra">{r.visitas}</div><div className="suave pequeno">{pct} % completas</div></div>
                <div className="tarjeta"><div className="suave">Casas nuevas</div><div className="cifra">{r.viviendas_nuevas}</div></div>
                <div className="tarjeta"><div className="suave">Personas registradas</div><div className="cifra">{r.personas_nuevas}</div><div className="suave pequeno">con su autorización</div></div>
                <div className="tarjeta"><div className="suave">Por revisar</div><div className={`cifra${r.amarillas + r.rojas ? " alerta" : ""}`}>{r.amarillas + r.rojas}</div><div className="suave pequeno">{r.amarillas} en amarillo · {r.rojas} en rojo</div></div>
              </div>
              <div className="tarjeta">
                <h2>Lo que más pide la gente</h2>
                {!r.necesidades_por_tema.length ? <p className="suave">Todavía no hay necesidades en este periodo.</p> : r.necesidades_por_tema.map((t) => (
                  <div key={t.tema} style={{ display: "grid", gridTemplateColumns: "minmax(120px, 220px) 1fr 40px", gap: 10, alignItems: "center", margin: "6px 0" }}>
                    <span>{TEMA[t.tema] ?? t.tema}</span>
                    <span style={{ height: 10, borderRadius: 5, background: "var(--superficie-panel)", overflow: "hidden" }}><span style={{ display: "block", height: 10, width: `${(t.n / maxTema) * 100}%`, background: "var(--degradado)" }} /></span>
                    <strong style={{ textAlign: "right" }}>{t.n}</strong>
                  </div>
                ))}
              </div>
              <div className="tarjeta">
                <h2>Para atender</h2>
                <ul>
                  <li>{r.sos_sin_atender ? <strong style={{ color: "var(--rojo)" }}>{r.sos_sin_atender} alerta(s) SOS sin atender</strong> : "Ninguna alerta SOS pendiente"}</li>
                  <li>{r.incidentes_abiertos} incidente(s) abierto(s)</li>
                  <li>{r.alertas_abiertas} alerta(s) de calidad por revisar</li>
                  <li>{r.tareas_vencidas} tarea(s) vencida(s)</li>
                </ul>
              </div>
            </div>
          );
        }}
      </Estado>
    </>
  );
}
