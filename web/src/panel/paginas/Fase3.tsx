// Panel · Fase 3 (solo para el Director y el Administrador): seguridad en terreno (jornadas y SOS), incidentes,
// necesidades de la comunidad, alertas de calidad y cumpleañeros de hoy.
import { useEffect, useMemo, useState } from "react";
import { fecha, fechaHora } from "../../logica/utiles";
import type { AlertaCalidadPanel, IncidentePanel, NecesidadPanel, ParDuplicado, PersonaDup, Verificacion, ViviendaDup } from "../datos/tipos";
import { EVENTO_SOS } from "../FranjaSos";
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
  verificacion_no_confirmada: "La persona no confirmó la visita (verificación por llamada)", colaborador_en_revision: "Colaborador en revisión: varias visitas no confirmadas",
  accesos_masivos: "Muchas consultas de datos completos en una hora",
};
const mapa = (lat: number | null, lng: number | null) => (lat != null && lng != null ? `https://maps.google.com/?q=${lat},${lng}` : null);
const haceMin = (iso: string | null) => (iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)) : null);

// ----------------------------------------------------------------------------- seguridad
export function Seguridad() {
  const { fuente } = usePanel();
  const datos = useCarga(() => fuente.seguridad(), [fuente]);
  const accion = useAccion();
  const { recargar } = datos;
  // Se actualiza sola cada 30 segundos (sin parpadear: mientras recarga sigue mostrando lo anterior).
  useEffect(() => { const t = window.setInterval(recargar, 30_000); return () => window.clearInterval(t); }, [recargar]);
  return (
    <>
      <Encabezado titulo="Seguridad en terreno"><button type="button" className="boton secundario chico" onClick={datos.recargar}>Actualizar</button></Encabezado>
      <p className="suave">Se actualiza sola cada 30 segundos. Quién está en jornada y dónde se vio por última vez (la ubicación solo se comparte durante la jornada) y las alertas SOS. Si llega un SOS, llame de inmediato a la persona y, si no contesta, a su contacto de emergencia o al 123.</p>
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
                    onClick={() => void accion.ejecutar(() => fuente.atenderSos(a.id), "Alerta marcada como atendida.").then((ok) => { if (ok) { datos.recargar(); dispatchEvent(new Event(EVENTO_SOS)); } })}>
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
  const [pestana, setPestana] = useState<"alertas" | "duplicados" | "verificacion">("alertas");
  return (
    <>
      <Encabezado titulo="Calidad de los registros" />
      <Pestanas opciones={[["alertas", "Alertas"], ["duplicados", "Repetidos"], ["verificacion", "Verificación por llamada"]] as const} valor={pestana} cambiar={setPestana} />
      {pestana === "alertas" ? <Alertas /> : pestana === "duplicados" ? <Duplicados /> : <VerificacionLlamada />}
    </>
  );
}

function Alertas() {
  const { fuente } = usePanel();
  const datos = useCarga(() => fuente.alertasCalidad(), [fuente]);
  const [filtro, setFiltro] = useState<"abiertas" | "resueltas">("abiertas");
  return (
    <>
      <p className="suave">Alertas automáticas del servidor: posibles duplicados, distancia excesiva, ubicación simulada, ritmo sospechoso y visitas que la persona no confirmó. Revise cada una y anote qué encontró.</p>
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

// ----------------------------------------------------------------------------- repetidos (6.6, O-20)
function Duplicados() {
  const { fuente } = usePanel();
  const datos = useCarga(() => fuente.duplicados(), [fuente]);
  return (
    <>
      <p className="suave">Casas y personas que parecen registradas dos veces: mismo predio del IGAC o casas muy cerca con la misma dirección, y personas con el mismo nombre y además la misma casa, la misma fecha de nacimiento o el mismo final de teléfono. Al unirlas no se pierde nada: las visitas, autorizaciones y necesidades pasan a la que queda.</p>
      <Estado carga={datos}>
        {(d) => (
          <>
            <h2>Viviendas</h2>
            {!d.viviendas.length ? <p className="suave">No hay viviendas repetidas.</p> : d.viviendas.map((par) => (
              <ParRepetido key={`${par.a.id}-${par.b.id}`} tipo="vivienda" par={par} recargar={datos.recargar}
                resumen={(v: ViviendaDup) => [v.direccion || v.nombre_finca || "Sin dirección", v.barrio_vereda, `${v.visitas} visita(s) · ${v.personas} persona(s)`,
                  v.registrado_por ? `registró ${v.registrado_por}` : null, fecha(v.creado_en)].filter(Boolean).join(" · ")} />
            ))}
            <h2>Personas</h2>
            {!d.personas.length ? <p className="suave">No hay personas repetidas.</p> : d.personas.map((par) => (
              <ParRepetido key={`${par.a.id}-${par.b.id}`} tipo="persona" par={par} recargar={datos.recargar}
                resumen={(x: PersonaDup) => [x.nombre, x.cedula_ult3 ? `cédula ···${x.cedula_ult3}` : "sin cédula", x.telefono_ult4 ? `cel. ···${x.telefono_ult4}` : null,
                  x.fecha_nacimiento ? `nació ${x.fecha_nacimiento}` : null, x.barrio_vereda, x.registrado_por ? `registró ${x.registrado_por}` : null].filter(Boolean).join(" · ")} />
            ))}
          </>
        )}
      </Estado>
    </>
  );
}

function ParRepetido<T extends { id: string }>({ tipo, par, resumen, recargar }: {
  tipo: "vivienda" | "persona"; par: ParDuplicado<T>; resumen: (x: T) => string; recargar: () => void;
}) {
  const { fuente } = usePanel();
  const accion = useAccion();
  const [queda, setQueda] = useState<"a" | "b">("a");
  const [motivo, setMotivo] = useState("");
  const conservar = queda === "a" ? par.a : par.b;
  const absorber = queda === "a" ? par.b : par.a;
  return (
    <div className="tarjeta">
      <div className="acciones" style={{ justifyContent: "space-between" }}>
        <strong>{par.motivo}{par.metros != null ? ` (${par.metros} m)` : ""}</strong>
        <Chip nivel="alerta">Por revisar</Chip>
      </div>
      {(["a", "b"] as const).map((k) => (
        <label key={k} style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "8px 0" }}>
          <input type="radio" name={`queda-${par.a.id}-${par.b.id}`} checked={queda === k} onChange={() => setQueda(k)} />
          <span><strong>{k === "a" ? "Registro 1" : "Registro 2"}:</strong> {resumen(par[k])}</span>
        </label>
      ))}
      <p className="suave pequeno">Se conserva el registro marcado; el otro se une a él y sale de las listas (queda en la auditoría).</p>
      <div className="fila-form">
        <div><label htmlFor={`mot-${par.a.id}`}>Motivo (opcional)</label><input id={`mot-${par.a.id}`} value={motivo} maxLength={200} onChange={(e) => setMotivo(e.target.value)} /></div>
        <button type="button" className="boton" disabled={accion.ocupado}
          onClick={() => void accion.ejecutar(() => fuente.fusionar(tipo, conservar.id, absorber.id, motivo.trim()), tipo === "vivienda" ? "Viviendas unidas." : "Personas unidas.").then((ok) => ok && recargar())}>
          Unir en uno solo
        </button>
        <button type="button" className="boton secundario" disabled={accion.ocupado}
          onClick={() => void accion.ejecutar(() => fuente.descartarDuplicado(tipo, par.a.id, par.b.id), "Marcados como distintos.").then((ok) => ok && recargar())}>
          No son {tipo === "vivienda" ? "la misma casa" : "la misma persona"}
        </button>
      </div>
      {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
    </div>
  );
}

// ----------------------------------------------------------------------------- verificación por llamada (R-27)
const ESTADO_VERIF: Record<string, [string, "ok" | "alerta" | "critico" | "neutro"]> = {
  pendiente: ["Por llamar", "alerta"], confirmada: ["Confirmó la visita", "ok"], no_confirmada: ["No confirmó la visita", "critico"],
  no_contesto: ["No contestó", "neutro"], numero_errado: ["Número equivocado", "neutro"], no_quiso: ["No quiso responder", "neutro"],
};

function VerificacionLlamada() {
  const { fuente, avisar } = usePanel();
  const [semana, setSemana] = useState<string | null>(null);
  const datos = useCarga(() => fuente.verificaciones(semana), [fuente, semana]);
  const accion = useAccion();
  return (
    <>
      <p className="suave">Cada lunes la app sortea el 5 % de las visitas de la semana anterior para llamar a la persona y preguntarle si de verdad la visitaron. Solo se llama a quien autorizó el contacto. Sea breve y amable: «Le llamamos de la campaña Pijao Nos Une para confirmar si esta semana lo visitó alguien del equipo».</p>
      <Estado carga={datos}>
        {(d) => (
          <>
            <div className="acciones" style={{ marginBottom: 10 }}>
              {d.semanas.length > 0 && (
                <select aria-label="Semana" value={d.semana ?? ""} onChange={(e) => setSemana(e.target.value || null)}>
                  {d.semanas.map((s) => <option key={s} value={s}>Semana del {fecha(s)}</option>)}
                </select>
              )}
              {d.pendiente_sorteo && (
                <button type="button" className="boton" disabled={accion.ocupado}
                  onClick={() => void accion.ejecutar(async () => {
                    const r = await fuente.sortearVerificaciones(null);
                    avisar(r.sorteadas ? `Se sortearon ${r.sorteadas} de ${r.total_visitas} visitas.` : "No hubo visitas para verificar esa semana.");
                    setSemana(r.semana);
                  }, "").then(() => datos.recargar())}>
                  Sortear la semana del {fecha(d.semana_anterior)}
                </button>
              )}
            </div>
            {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
            {!d.filas.length ? <p className="suave">{d.semanas.length ? "Esa semana no hubo visitas que se pudieran verificar (con conversación y autorización de contacto)." : "Todavía no hay sorteos. El primero se hace solo el próximo lunes, o use el botón de arriba."}</p>
              : d.filas.map((v) => <TarjetaVerificacion key={v.id} v={v} recargar={datos.recargar} />)}
          </>
        )}
      </Estado>
    </>
  );
}

function TarjetaVerificacion({ v, recargar }: { v: Verificacion; recargar: () => void }) {
  const { fuente } = usePanel();
  const accion = useAccion();
  const [notas, setNotas] = useState(v.notas ?? "");
  const [et, nivel] = ESTADO_VERIF[v.estado] ?? [v.estado, "neutro"];
  const marcar = (estado: string, texto: string) =>
    void accion.ejecutar(() => fuente.resultadoVerificacion(v.id, estado, notas.trim()), texto).then((ok) => ok && recargar());
  return (
    <div className="tarjeta">
      <div className="acciones" style={{ justifyContent: "space-between" }}>
        <strong>{v.persona ?? "Persona"}</strong>
        <Chip nivel={nivel}>{et}</Chip>
      </div>
      <dl className="dato" style={{ marginTop: 8 }}>
        <dt>Celular</dt><dd>{v.telefono ? <><a href={`tel:${v.telefono}`}>{v.telefono}</a>{v.whatsapp ? <> · <a href={`https://wa.me/57${v.telefono}`} target="_blank" rel="noreferrer">WhatsApp</a></> : null}</> : "Sin teléfono"}</dd>
        <dt>Visita</dt><dd>{fechaHora(v.visita_fecha)} · {v.resultado} · {v.colaborador ?? "—"}</dd>
        <dt>Dónde</dt><dd>{[v.direccion, v.barrio_vereda].filter(Boolean).join(" · ") || "—"}</dd>
        {v.verificado_en && <><dt>Verificó</dt><dd>{v.verificado_por ?? "—"} · {fechaHora(v.verificado_en)}</dd></>}
      </dl>
      <div className="fila-form" style={{ flexWrap: "wrap" }}>
        <div style={{ minWidth: 220 }}><label htmlFor={`vn-${v.id}`}>Notas de la llamada</label>
          <input id={`vn-${v.id}`} value={notas} maxLength={500} onChange={(e) => setNotas(e.target.value)} /></div>
        <button type="button" className="boton" disabled={accion.ocupado} onClick={() => marcar("confirmada", "Visita confirmada.")}>Confirmó</button>
        <button type="button" className="boton secundario" disabled={accion.ocupado} onClick={() => marcar("no_confirmada", "Quedó la alerta para revisar.")}>No confirmó</button>
        <button type="button" className="boton secundario" disabled={accion.ocupado} onClick={() => marcar("no_contesto", "Anotado: no contestó.")}>No contestó</button>
        <button type="button" className="boton secundario" disabled={accion.ocupado} onClick={() => marcar("numero_errado", "Anotado: número equivocado.")}>Número equivocado</button>
      </div>
      {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
    </div>
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
