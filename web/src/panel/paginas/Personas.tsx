// Personas (0021): todas las personas registradas, con búsqueda, filtros, dónde vota y la historia de cada una. El
// servidor decide qué se ve (el Director y el Administrador, todo) y deja cada consulta en la auditoría. La consulta del
// puesto en la Registraduría pide «No soy un robot»: se abre en otra pestaña y aquí se guarda lo encontrado.
import { Fragment, useState } from "react";
import {
  URL_REGISTRADURIA, cedulaVisible, codigoPredio, contarFiltros, errorMesa, fechaSinHora, numeroPredio, telefonoVisible, textoDondeVota,
  type FiltrosPersonas, type PersonaLista,
} from "@nucleo/personas";
import { fechaHora } from "../../logica/utiles";
import { Aviso, Chip, Encabezado, Estado, useAccion, useCarga, usePanel } from "../ui";

const POR_PAGINA = 50;

export function Personas() {
  const { fuente } = usePanel();
  const [borrador, setBorrador] = useState<FiltrosPersonas>({});
  const [filtros, setFiltros] = useState<FiltrosPersonas>({});
  const [desde, setDesde] = useState(0);
  const [abierta, setAbierta] = useState<string | null>(null);
  const lista = useCarga(() => fuente.personas(filtros, desde), [fuente, filtros, desde]);
  const resumen = useCarga(() => fuente.resumenPersonas(), [fuente]);
  const aplicar = (f: FiltrosPersonas) => { setFiltros(f); setDesde(0); setAbierta(null); };
  const r = resumen.datos;

  return (
    <>
      <Encabezado titulo="Personas" />
      <p className="suave">Todas las personas registradas por el equipo, con lo que autorizaron dar. Cada consulta queda en la auditoría. Use estos datos solo para la campaña y nunca los comparta fuera del equipo (Ley 1581).</p>
      {r && (
        <div className="cuadricula" style={{ marginBottom: 12 }}>
          <div className="tarjeta"><div className="suave">Personas</div><div className="cifra">{r.total_visibles.toLocaleString("es-CO")}</div></div>
          <div className="tarjeta"><div className="suave">Saben dónde votan</div><div className="cifra">{r.con_puesto.toLocaleString("es-CO")}</div>
            <div className="suave pequeno">{r.completas ? Math.round((100 * r.con_puesto) / r.completas) : 0} % con puesto registrado</div></div>
          <div className="tarjeta"><div className="suave">Votan en Pijao</div><div className="cifra">{r.vota.si.toLocaleString("es-CO")}</div>
            <div className="suave pequeno">{r.vota.no} en otro municipio · {r.vota.sin_dato} sin dato</div></div>
        </div>
      )}

      <datalist id="puestos-sugeridos">{(r?.sugeridos ?? []).map((s) => <option key={s} value={s} />)}</datalist>
      <form className="tarjeta" onSubmit={(e) => { e.preventDefault(); aplicar(borrador); }}>
        <div className="rejilla-filtros">
          <div><label htmlFor="pf-texto">Nombre o cédula</label>
            <input id="pf-texto" type="search" value={borrador.texto ?? ""} onChange={(e) => setBorrador({ ...borrador, texto: e.target.value })} /></div>
          <div><label htmlFor="pf-vereda">Vereda o barrio</label>
            <input id="pf-vereda" value={borrador.vereda ?? ""} onChange={(e) => setBorrador({ ...borrador, vereda: e.target.value })} /></div>
          <div><label htmlFor="pf-puesto">Puesto de votación</label>
            <select id="pf-puesto" value={borrador.puesto ?? ""} onChange={(e) => setBorrador({ ...borrador, puesto: e.target.value || undefined })}>
              <option value="">Cualquiera</option>
              {(r?.sugeridos ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select></div>
          <div><label htmlFor="pf-mesa">Mesa</label>
            <input id="pf-mesa" inputMode="numeric" maxLength={3} value={borrador.mesa ?? ""} onChange={(e) => setBorrador({ ...borrador, mesa: e.target.value.replace(/\D/g, "") })} /></div>
          <div><label htmlFor="pf-vota">¿Dónde vota?</label>
            <select id="pf-vota" value={borrador.vota ?? ""} onChange={(e) => setBorrador({ ...borrador, vota: (e.target.value || undefined) as FiltrosPersonas["vota"] })}>
              <option value="">Cualquiera</option><option value="si">En Pijao</option><option value="no">En otro municipio</option>
              <option value="no_sabe">No sabe</option><option value="sin_dato">Sin dato</option>
            </select></div>
          {r?.equipo?.length ? (
            <div><label htmlFor="pf-registro">Registró</label>
              <select id="pf-registro" value={borrador.registro_por ?? ""} onChange={(e) => setBorrador({ ...borrador, registro_por: e.target.value || undefined })}>
                <option value="">Cualquiera</option>
                {r.equipo.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select></div>
          ) : null}
          <div><label htmlFor="pf-predio">Predio (IGAC)</label>
            <input id="pf-predio" inputMode="numeric" value={borrador.predio ?? ""} onChange={(e) => setBorrador({ ...borrador, predio: e.target.value.replace(/\D/g, "") })} /></div>
        </div>
        <div className="acciones" style={{ marginTop: 10 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={Boolean(borrador.sin_puesto)} onChange={(e) => setBorrador({ ...borrador, sin_puesto: e.target.checked || undefined })} />
            Solo las que no tienen puesto
          </label>
          <button className="boton">Buscar</button>
          {contarFiltros(filtros) || filtros.texto ? <button type="button" className="boton secundario" onClick={() => { setBorrador({}); aplicar({}); }}>Quitar filtros</button> : null}
        </div>
      </form>

      <Estado carga={lista}>
        {(d) => (
          <>
            <p className="suave">{d.total.toLocaleString("es-CO")} {d.total === 1 ? "persona" : "personas"}{d.total > POR_PAGINA ? ` · mostrando ${desde + 1} a ${Math.min(desde + POR_PAGINA, d.total)}` : ""}</p>
            {!d.filas.length ? <p className="suave">Nadie coincide con la búsqueda.</p> : (
              <div className="tabla-envoltura">
                <table>
                  <thead><tr><th>Persona</th><th>Cédula</th><th>Celular</th><th>Vereda o dirección</th><th>Predio</th><th>Dónde vota</th><th>Registró</th></tr></thead>
                  <tbody>
                    {d.filas.map((p) => (
                      <Fragment key={p.id}>
                        <tr onClick={() => setAbierta(abierta === p.id ? null : p.id)} style={{ cursor: "pointer" }} aria-expanded={abierta === p.id}>
                          <td><strong>{p.nombre}</strong>{p.estado === "no_contactar" ? <> <Chip nivel="critico">No contactar</Chip></> : null}</td>
                          <td>{cedulaVisible(p) ?? "—"}</td>
                          <td>{telefonoVisible(p) ?? "—"}</td>
                          <td>{[p.barrio_vereda, p.direccion || p.nombre_finca].filter(Boolean).join(" · ") || "—"}</td>
                          <td>{numeroPredio(codigoPredio(p.predio)) ?? "—"}</td>
                          <td>{p.completo ? textoDondeVota(p) : "—"}</td>
                          <td>{p.registrado_por ?? "—"}</td>
                        </tr>
                        {abierta === p.id && <tr><td colSpan={7}><Detalle p={p} recargar={() => { lista.recargar(); resumen.recargar(); }} /></td></tr>}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {d.total > POR_PAGINA && (
              <div className="acciones" style={{ marginTop: 10 }}>
                <button type="button" className="boton secundario" disabled={desde === 0} onClick={() => setDesde(Math.max(0, desde - POR_PAGINA))}>Anteriores</button>
                <button type="button" className="boton secundario" disabled={desde + POR_PAGINA >= d.total} onClick={() => setDesde(desde + POR_PAGINA)}>Siguientes</button>
              </div>
            )}
          </>
        )}
      </Estado>

      {r && r.puestos.length > 0 && (
        <div className="tarjeta" style={{ marginTop: 16 }}>
          <h2>Por puesto y mesa</h2>
          <div className="tabla-envoltura">
            <table>
              <thead><tr><th>Puesto</th><th>Personas</th><th>Mesas</th></tr></thead>
              <tbody>{r.puestos.map((p) => (
                <tr key={p.puesto}>
                  <td><button type="button" className="enlace" onClick={() => { const f = { puesto: p.puesto }; setBorrador(f); aplicar(f); }}>{p.puesto}</button></td>
                  <td>{p.personas}</td>
                  <td>{p.mesas.map((m) => `${m.mesa} (${m.personas})`).join(" · ") || "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function Detalle({ p, recargar }: { p: PersonaLista; recargar: () => void }) {
  const { fuente } = usePanel();
  const historia = useCarga(() => fuente.historiaPersona(p.id), [fuente, p.id]);
  const accion = useAccion();
  const [vota, setVota] = useState(p.vota_en_pijao ?? "");
  const [puesto, setPuesto] = useState(p.puesto_votacion ?? "");
  const [mesa, setMesa] = useState(p.mesa_votacion ?? "");
  const errMesa = errorMesa(mesa);
  if (!p.completo) return <p className="suave">De esta persona solo se ve el nombre y la vereda.</p>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, padding: "8px 0" }}>
      <dl className="dato">
        <dt>Nombre completo</dt><dd>{p.nombre}{p.apodo ? ` («${p.apodo}»)` : ""}</dd>
        <dt>Cédula</dt><dd>{cedulaVisible(p) ?? "Sin registrar"}</dd>
        <dt>Nacimiento</dt><dd>{p.fecha_nacimiento ? `${fechaSinHora(p.fecha_nacimiento)}${p.edad != null ? ` · ${p.edad} años` : ""}` : "Sin registrar"}</dd>
        <dt>Celular</dt><dd>{p.telefono ? `${telefonoVisible(p)}${p.telefono_es_whatsapp ? " · WhatsApp" : ""}` : "Sin registrar"}</dd>
        {p.telefono2 && <><dt>Otro teléfono</dt><dd>{p.telefono2}</dd></>}
        <dt>Correo</dt><dd>{p.correo ?? "Sin registrar"}</dd>
        <dt>Autorizó contacto</dt><dd>{p.contacto_autorizado ? "Sí" : "No"}</dd>
        <dt>Dirección</dt><dd>{[p.direccion, p.complemento].filter(Boolean).join(" ") || p.nombre_finca || "Sin registrar"}</dd>
        <dt>Vereda o barrio</dt><dd>{p.barrio_vereda ?? "Sin registrar"}</dd>
        <dt>Predio (IGAC)</dt><dd>{codigoPredio(p.predio) ?? "Sin predio asociado"}</dd>
        <dt>Última visita</dt><dd>{p.ultima_visita ? fechaHora(p.ultima_visita) : "Sin visitas"}</dd>
        <dt>Registró</dt><dd>{p.registrado_por ?? "—"}{p.creado_en ? ` · ${fechaHora(p.creado_en)}` : ""}</dd>
      </dl>
      <div>
        <h3 style={{ marginTop: 0 }}>Dónde vota</h3>
        <p>{textoDondeVota(p)}</p>
        <p className="suave pequeno">
          {p.cedula ? <>Cédula para la consulta: <strong style={{ userSelect: "all" }}>{p.cedula}</strong>. </> : null}
          <a href={URL_REGISTRADURIA} target="_blank" rel="noreferrer">Abrir la consulta de la Registraduría</a> (pide marcar «No soy un robot»).
        </p>
        <div className="fila-form" style={{ flexWrap: "wrap" }}>
          <div><label htmlFor={`v-${p.id}`}>¿Vota en Pijao?</label>
            <select id={`v-${p.id}`} value={vota} onChange={(e) => setVota(e.target.value)}>
              <option value="">Sin dato</option><option value="si">Sí</option><option value="no">En otro municipio</option><option value="no_sabe">No sabe</option>
            </select></div>
          {vota !== "no" && <>
            <div><label htmlFor={`p-${p.id}`}>Puesto</label><input id={`p-${p.id}`} list="puestos-sugeridos" value={puesto} maxLength={120} onChange={(e) => setPuesto(e.target.value)} /></div>
            <div style={{ maxWidth: 100 }}><label htmlFor={`m-${p.id}`}>Mesa</label><input id={`m-${p.id}`} inputMode="numeric" maxLength={3} value={mesa} onChange={(e) => setMesa(e.target.value.replace(/\D/g, ""))} /></div>
          </>}
          <button type="button" className="boton" disabled={accion.ocupado || Boolean(errMesa)}
            onClick={() => void accion.ejecutar(() => fuente.guardarVotacion(p.id, vota || null, vota === "no" ? null : puesto.trim() || null, vota === "no" ? null : mesa || null), "Dónde vota quedó guardado.").then((ok) => ok && recargar())}>
            Guardar
          </button>
        </div>
        {errMesa && <Aviso tipo="error">{errMesa}</Aviso>}
        {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
        <h3>Historia</h3>
        <Estado carga={historia}>
          {(h) => !h.length ? <p className="suave">Todavía no hay nada en su historia.</p> : (
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {h.slice(0, 40).map((x, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  <strong>{x.titulo}</strong> <span className="suave pequeno">· {fechaHora(x.fecha)}{x.por ? ` · ${x.por}` : ""}</span>
                  {x.detalle ? <div className="suave pequeno">{x.detalle}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </Estado>
      </div>
    </div>
  );
}
