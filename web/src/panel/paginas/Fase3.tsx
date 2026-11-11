// Panel · Fase 3 (solo para el Director y el Administrador): seguridad en terreno (jornadas y SOS), incidentes,
// necesidades de la comunidad, alertas de calidad y cumpleañeros de hoy.
import { useMemo, useState } from "react";
import { fecha, fechaHora } from "../../logica/utiles";
import type { AlertaCalidadPanel, IncidentePanel, NecesidadPanel } from "../datos/tipos";
import { Aviso, Chip, Encabezado, Estado, Pestanas, useAccion, useCarga, usePanel } from "../ui";

const TEMA: Record<string, string> = {
  educacion: "Educación y conocimiento", deporte_juventud: "Deporte y juventud", campo_cafe: "Campo y café", vivienda_entorno: "Vivienda y entorno",
  bienestar_animal: "Bienestar animal", vias_movilidad: "Vías, movilidad y conectividad", agua_ambiente: "Agua y medio ambiente",
  turismo_cultura: "Turismo y cultura", salud: "Salud y bienestar", seguridad: "Seguridad y convivencia", empleo_emprendimiento: "Empleo y emprendimiento",
  poblaciones: "Atención a poblaciones específicas", gobierno_cercano: "Gobierno cercano y transparente", otro: "Otro",
};
const ESTADO_NEC: [string, string][] = [["recibida", "Recibida"], ["clasificada", "Clasificada"], ["agrupada", "Agrupada"], ["evaluada", "Evaluada"],
  ["incluida_programa", "Incluida en el programa"], ["derivada", "Derivada"], ["no_viable", "No viable"], ["comunicada", "Comunicada"], ["cerrada", "Cerrada"]];
const TIPO_INCIDENTE: Record<string, string> = {
  seguridad_personal: "Seguridad personal", amenaza_hostigamiento: "Amenaza u hostigamiento", compra_votos_terceros: "Sospecha de compra de votos por terceros",
  constrenimiento: "Constreñimiento", rumor_desinformacion: "Rumor o desinformación", dano_propaganda: "Daño a propaganda",
  perdida_telefono_datos: "Pérdida de teléfono o fuga de datos", queja_colaborador: "Queja sobre un colaborador", irregularidad_mesa: "Irregularidad en una mesa", otro: "Otro",
};
const TIPO_ALERTA: Record<string, string> = {
  posible_duplicado: "Posible vivienda duplicada", distancia_excedida: "El teléfono estaba lejos de la casa", fuera_de_zona: "Fuera de los barrios y veredas dibujados",
  fuera_del_municipio: "Fuera del municipio", ritmo_sospechoso: "Visitas demasiado seguidas", salto_de_ubicacion: "Salto de ubicación imposible", gps_falso: "Ubicación simulada",
};
const mapa = (lat: number | null, lng: number | null) => (lat != null && lng != null ? `https://maps.google.com/?q=${lat},${lng}` : null);
const haceMin = (iso: string | null) => (iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)) : null);

// ----------------------------------------------------------------------------- seguridad
export function Seguridad() {
  const { fuente } = usePanel();
  const datos = useCarga(() => fuente.seguridad(), [fuente]);
  const accion = useAccion();
  return (
    <>
      <Encabezado titulo="Seguridad en terreno"><button type="button" className="boton secundario chico" onClick={datos.recargar}>Actualizar</button></Encabezado>
      <p className="suave">Quién está en jornada y dónde se vio por última vez (la ubicación solo se comparte durante la jornada) y las alertas SOS. Si llega un SOS, llame de inmediato a la persona y, si no contesta, a su contacto de emergencia o al 123.</p>
      <Estado carga={datos}>
        {(s) => (
          <>
            <h2>Alertas SOS</h2>
            {!s.sos.length ? <p className="suave">No hay alertas en los últimos 7 días.</p> : s.sos.map((a) => (
              <div key={a.id} className="tarjeta" style={!a.atendida_en ? { borderColor: "var(--rojo)", borderWidth: 2 } : undefined}>
                <div className="acciones" style={{ justifyContent: "space-between" }}>
                  <strong>{a.nombre}</strong>
                  <Chip nivel={a.atendida_en ? "ok" : "critico"}>{a.atendida_en ? `Atendida ${fechaHora(a.atendida_en)}` : `Sin atender · hace ${haceMin(a.creada_en)} min`}</Chip>
                </div>
                <dl className="dato" style={{ marginTop: 10 }}>
                  <dt>Cuándo</dt><dd>{fechaHora(a.creada_en)}</dd>
                  <dt>Dónde</dt><dd>{mapa(a.lat, a.lng) ? <a href={mapa(a.lat, a.lng)!} target="_blank" rel="noreferrer">Ver en el mapa</a> : "Sin ubicación"}</dd>
                  <dt>Celular</dt><dd>{a.celular ? <a href={`tel:${a.celular}`}>{a.celular}</a> : "—"}</dd>
                  <dt>Contacto de emergencia</dt><dd>{a.emergencia ?? "—"} {a.emergencia_celular ? <a href={`tel:${a.emergencia_celular}`}>{a.emergencia_celular}</a> : null}</dd>
                  {a.nota && <><dt>Nota</dt><dd>{a.nota}</dd></>}
                </dl>
                {!a.atendida_en && (
                  <button type="button" className="boton" style={{ marginTop: 10 }} disabled={accion.ocupado}
                    onClick={() => void accion.ejecutar(() => fuente.atenderSos(a.id), "Alerta marcada como atendida.").then((ok) => ok && datos.recargar())}>
                    Ya la atendí
                  </button>
                )}
              </div>
            ))}
            <h2>En jornada ahora</h2>
            {!s.jornadas.length ? <p className="suave">Nadie tiene la jornada abierta.</p> : (
              <div className="tabla-envoltura">
                <table>
                  <thead><tr><th>Colaborador</th><th>Desde</th><th>Última ubicación</th><th>Celular</th></tr></thead>
                  <tbody>
                    {s.jornadas.map((j) => {
                      const m = haceMin(j.visto_en);
                      return (
                        <tr key={j.id}>
                          <td>{j.nombre}</td>
                          <td>{fechaHora(j.inicio)}</td>
                          <td>{mapa(j.lat, j.lng) ? <><a href={mapa(j.lat, j.lng)!} target="_blank" rel="noreferrer">Ver</a> <Chip nivel={m !== null && m > 30 ? "alerta" : "ok"}>{m !== null ? `hace ${m} min` : "—"}</Chip></> : <span className="suave">Sin ubicación todavía</span>}</td>
                          <td>{j.celular ? <a href={`tel:${j.celular}`}>{j.celular}</a> : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Estado>
      {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
    </>
  );
}

// ----------------------------------------------------------------------------- incidentes
export function Incidentes() {
  const { fuente } = usePanel();
  const datos = useCarga(() => fuente.incidentes(), [fuente]);
  const [filtro, setFiltro] = useState<"abiertos" | "resueltos">("abiertos");
  return (
    <>
      <Encabezado titulo="Incidentes" />
      <p className="suave">Confidenciales. Protocolo: documentar, proteger a la persona, pedir asesoría al abogado y denunciar cuando proceda.</p>
      <Pestanas opciones={[["abiertos", "Abiertos"], ["resueltos", "Resueltos"]] as const} valor={filtro} cambiar={setFiltro} />
      <Estado carga={datos}>
        {(l) => {
          const lista = l.filter((i) => (filtro === "abiertos") === (i.estado !== "resuelto"));
          return lista.length ? <>{lista.map((i) => <TarjetaIncidente key={i.id} i={i} recargar={datos.recargar} />)}</> : <p className="suave">No hay incidentes en esta lista.</p>;
        }}
      </Estado>
    </>
  );
}

function TarjetaIncidente({ i, recargar }: { i: IncidentePanel; recargar: () => void }) {
  const { fuente } = usePanel();
  const accion = useAccion();
  const [resolucion, setResolucion] = useState(i.resolucion ?? "");
  const cambiar = (estado: string, msg: string) => void accion.ejecutar(() => fuente.estadoIncidente(i.id, estado, resolucion.trim()), msg).then((ok) => ok && recargar());
  return (
    <details className="tarjeta" open={i.estado === "abierto"}>
      <summary style={{ cursor: "pointer", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <strong>{TIPO_INCIDENTE[i.tipo] ?? i.tipo}</strong>
        <Chip nivel={i.estado === "resuelto" ? "ok" : i.estado === "en_revision" ? "alerta" : "critico"}>{i.estado === "resuelto" ? "Resuelto" : i.estado === "en_revision" ? "En revisión" : "Abierto"}</Chip>
        <span className="suave pequeno">{fechaHora(i.creado_en)}</span>
      </summary>
      <p style={{ whiteSpace: "pre-wrap", marginTop: 10 }}>{i.descripcion}</p>
      {mapa(i.lat, i.lng) && <p><a href={mapa(i.lat, i.lng)!} target="_blank" rel="noreferrer">Ver el lugar en el mapa</a></p>}
      <label htmlFor={`res-${i.id}`}>Qué se hizo</label>
      <textarea id={`res-${i.id}`} value={resolucion} onChange={(e) => setResolucion(e.target.value)} maxLength={2000} />
      <div className="acciones" style={{ marginTop: 8 }}>
        {i.estado === "abierto" && <button type="button" className="boton secundario" disabled={accion.ocupado} onClick={() => cambiar("en_revision", "Incidente en revisión.")}>En revisión</button>}
        {i.estado !== "resuelto" && <button type="button" className="boton" disabled={accion.ocupado || resolucion.trim().length < 5} onClick={() => cambiar("resuelto", "Incidente resuelto.")}>Resolver</button>}
      </div>
      {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
    </details>
  );
}

// ----------------------------------------------------------------------------- necesidades
export function Necesidades() {
  const { fuente } = usePanel();
  const datos = useCarga(() => fuente.necesidades(), [fuente]);
  const [tema, setTema] = useState("todos");
  return (
    <>
      <Encabezado titulo="Necesidades de la comunidad" />
      <p className="suave">Lo que las familias contaron en las visitas, por eje del programa. Recorrido: recibida → clasificada → evaluada → incluida en el programa o derivada → comunicada. Meta: clasificar en 7 días y responder en 30.</p>
      <Estado carga={datos}>
        {(l) => <ListaNecesidades lista={l} tema={tema} setTema={setTema} recargar={datos.recargar} />}
      </Estado>
    </>
  );
}

function ListaNecesidades({ lista, tema, setTema, recargar }: { lista: NecesidadPanel[]; tema: string; setTema: (t: string) => void; recargar: () => void }) {
  const { fuente } = usePanel();
  const accion = useAccion();
  const porTema = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of lista) m.set(n.tema ?? "otro", (m.get(n.tema ?? "otro") ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [lista]);
  const visibles = lista.filter((n) => tema === "todos" || (n.tema ?? "otro") === tema);
  const maximo = Math.max(1, ...porTema.map(([, n]) => n));
  return (
    <>
      <div className="tarjeta">
        <h2>Por eje del programa</h2>
        {porTema.map(([t, n]) => (
          <button key={t} type="button" onClick={() => setTema(tema === t ? "todos" : t)}
            style={{ display: "grid", gridTemplateColumns: "minmax(140px, 260px) 1fr 40px", gap: 10, alignItems: "center", width: "100%", background: tema === t ? "var(--tinte-azul)" : "none", border: 0, padding: "6px 8px", borderRadius: 10, cursor: "pointer", color: "inherit", font: "inherit", textAlign: "left" }}>
            <span>{TEMA[t] ?? t}</span>
            <span style={{ height: 10, borderRadius: 5, background: "var(--superficie-panel)", overflow: "hidden" }}><span style={{ display: "block", height: 10, width: `${(n / maximo) * 100}%`, background: "var(--degradado)" }} /></span>
            <strong style={{ textAlign: "right" }}>{n}</strong>
          </button>
        ))}
        {!porTema.length && <p className="suave">Todavía no hay necesidades registradas.</p>}
      </div>
      {tema !== "todos" && <p><button type="button" className="boton secundario chico" onClick={() => setTema("todos")}>Ver todos los ejes</button></p>}
      {visibles.length ? (
        <div className="tabla-envoltura">
          <table>
            <thead><tr><th>Eje</th><th>Lo que contaron</th><th>Alcance</th><th>Fecha</th><th>Estado</th></tr></thead>
            <tbody>
              {visibles.map((n) => (
                <tr key={n.id}>
                  <td>{TEMA[n.tema ?? "otro"] ?? n.tema}</td>
                  <td>{n.texto ?? <span className="suave">Sin detalle</span>}{n.desea_respuesta ? <><br /><Chip nivel="alerta">Quiere respuesta</Chip></> : null}</td>
                  <td>{n.alcance === "colectiva" ? "Comunidad" : "Hogar"}</td>
                  <td>{fecha(n.creado_en)}</td>
                  <td>
                    <select aria-label="Estado de la necesidad" value={n.estado} disabled={accion.ocupado}
                      onChange={(e) => void accion.ejecutar(() => fuente.estadoNecesidad(n.id, e.target.value), "Estado actualizado.").then((ok) => ok && recargar())}>
                      {ESTADO_NEC.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
    </>
  );
}

// ----------------------------------------------------------------------------- calidad
export function Calidad() {
  const { fuente } = usePanel();
  const datos = useCarga(() => fuente.alertasCalidad(), [fuente]);
  const [filtro, setFiltro] = useState<"abiertas" | "resueltas">("abiertas");
  return (
    <>
      <Encabezado titulo="Calidad de los registros" />
      <p className="suave">Alertas automáticas del servidor: posibles duplicados, distancia excesiva, ubicación simulada, ritmo sospechoso. Revise cada una y anote qué encontró.</p>
      <Pestanas opciones={[["abiertas", "Por revisar"], ["resueltas", "Revisadas"]] as const} valor={filtro} cambiar={setFiltro} />
      <Estado carga={datos}>
        {(l) => {
          const lista = l.filter((a) => (filtro === "abiertas") === !a.resuelta_en);
          return lista.length ? <>{lista.map((a) => <TarjetaAlerta key={a.id} a={a} recargar={datos.recargar} />)}</> : <p className="suave">No hay alertas en esta lista.</p>;
        }}
      </Estado>
    </>
  );
}

function TarjetaAlerta({ a, recargar }: { a: AlertaCalidadPanel; recargar: () => void }) {
  const { fuente } = usePanel();
  const accion = useAccion();
  const [nota, setNota] = useState("");
  const metros = typeof a.detalle?.metros === "number" ? ` (${Math.round(a.detalle.metros as number)} m)` : "";
  return (
    <div className="tarjeta">
      <div className="acciones" style={{ justifyContent: "space-between" }}>
        <strong>{(TIPO_ALERTA[a.tipo] ?? a.tipo) + metros}</strong>
        <Chip nivel={a.resuelta_en ? "ok" : a.severidad === "alta" ? "critico" : a.severidad === "media" ? "alerta" : "neutro"}>{a.resuelta_en ? "Revisada" : `Severidad ${a.severidad}`}</Chip>
      </div>
      <p className="suave pequeno">{fechaHora(a.creada_en)}</p>
      {a.resuelta_en ? <p><strong>Qué se encontró:</strong> {a.resolucion}</p> : (
        <div className="fila-form">
          <div><label htmlFor={`al-${a.id}`}>Qué encontró</label><input id={`al-${a.id}`} type="text" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={500} /></div>
          <button type="button" className="boton" disabled={accion.ocupado || nota.trim().length < 3}
            onClick={() => void accion.ejecutar(() => fuente.resolverAlerta(a.id, nota.trim()), "Alerta revisada.").then((ok) => ok && recargar())}>Marcar revisada</button>
        </div>
      )}
      {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
    </div>
  );
}

// ----------------------------------------------------------------------------- cumpleañeros
export function Cumpleaneros() {
  const { fuente } = usePanel();
  const datos = useCarga(() => fuente.cumpleanerosHoy(), [fuente]);
  return (
    <>
      <Encabezado titulo="Cumpleañeros de hoy" />
      <p className="suave">Personas registradas que cumplen años hoy. Solo se llama o escribe a quien autorizó el contacto; a los demás, un saludo en persona. Nunca regalos ni favores.</p>
      <Estado carga={datos}>
        {(l) => !l.length ? <p className="suave">Hoy nadie cumple años.</p> : (
          <div className="tabla-envoltura">
            <table>
              <thead><tr><th>Persona</th><th>Edad</th><th>Contacto</th></tr></thead>
              <tbody>{l.map((c) => <tr key={c.id}><td>{c.nombre}</td><td>{c.edad ?? "—"}</td><td><Chip nivel={c.contactable ? "ok" : "neutro"}>{c.contactable ? "Autorizó el contacto" : "Solo en persona"}</Chip></td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Estado>
    </>
  );
}
