// Ficha del colaborador (P-36) con sus permisos (P-37): datos, estado de la cuenta, teléfonos (solo el Administrador),
// permisos opcionales O-01 a O-22 con plantillas, alcance por zona, vencimiento y motivo, e historial de cambios.
import { useMemo, useState } from "react";
import { describirAccion, ESTADO_CUENTA, ROL } from "../../logica/textos";
import { errorVencimiento, fecha, fechaHora, finDelDia, haceCuanto, venceSugerido } from "../../logica/utiles";
import type { Colaborador, DefPermiso, PermisoOtorgado, Plantilla, Zona } from "../datos/tipos";
import { Aviso, Chip, Confirmar, Encabezado, esAdmin, Estado, Interruptor, useAccion, useCarga, usePanel } from "../ui";
import { nivelEstado } from "./Colaboradores";

type Dialogo = null | "suspender" | "baja" | "rechazar" | "director";

export function FichaColaborador({ id }: { id: string }) {
  const { fuente } = usePanel();
  const gente = useCarga(() => fuente.colaboradores(), [fuente, id]);
  return (
    <Estado carga={gente}>
      {(lista) => {
        const c = lista.find((x) => x.id === id);
        if (!c) return <><Encabezado titulo="Colaborador" /><Aviso tipo="alerta">No encontramos esa cuenta. <a href="#/colaboradores">Volver a la lista</a>.</Aviso></>;
        return <Ficha c={c} recargar={gente.recargar} />;
      }}
    </Estado>
  );
}

function Ficha({ c, recargar }: { c: Colaborador; recargar: () => void }) {
  const { fuente, perfil } = usePanel();
  const accion = useAccion();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const hecho = (ok: boolean) => { if (ok) recargar(); return ok; };
  const admin = esAdmin(perfil);
  const esYo = c.id === perfil.id;

  return (
    <>
      <p><a href="#/colaboradores">← Colaboradores</a></p>
      <Encabezado titulo={c.nombre_completo}>
        <Chip nivel={nivelEstado(c.estado)}>{ESTADO_CUENTA[c.estado] ?? c.estado}</Chip>
        <Chip nivel="neutro">{ROL[c.rol] ?? c.rol}</Chip>
      </Encabezado>
      {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
      {(c.es_servidor_publico || c.es_contratista_estado) && (
        <Aviso tipo="alerta">R-07: declaró ser {c.es_servidor_publico ? "servidor público" : "contratista del Estado"}. Antes de aprobar, el abogado debe revisar si puede participar en la campaña.</Aviso>
      )}
      {c.motivo_estado && <Aviso tipo="alerta">{c.motivo_estado}</Aviso>}

      {!esYo && c.rol !== "admin" && (
        <div className="acciones" style={{ margin: "12px 0" }}>
          {c.estado === "pendiente" && (
            <>
              <button type="button" className="boton" disabled={accion.ocupado}
                      onClick={() => void accion.ejecutar(() => fuente.aprobar(c.id), "Cuenta aprobada.").then(hecho)}>Aprobar</button>
              <button type="button" className="boton secundario" onClick={() => setDialogo("rechazar")}>Rechazar</button>
            </>
          )}
          {(c.estado === "activo" || c.estado === "aprobado") && (c.rol === "colaborador" || admin) && (
            <button type="button" className="boton secundario" onClick={() => setDialogo("suspender")}>Suspender</button>
          )}
          {c.estado === "suspendido" && (
            <button type="button" className="boton" disabled={accion.ocupado}
                    onClick={() => void accion.ejecutar(() => fuente.reactivar(c.id), "Cuenta reactivada.").then(hecho)}>Reactivar</button>
          )}
          {admin && c.rol === "colaborador" && (c.estado === "activo" || c.estado === "aprobado") && (
            <button type="button" className="boton secundario" onClick={() => setDialogo("director")}>Designar como Director</button>
          )}
          {admin && c.estado !== "baja" && <button type="button" className="boton peligro" onClick={() => setDialogo("baja")}>Dar de baja</button>}
        </div>
      )}

      <div className="tarjeta">
        <h2>Datos</h2>
        <dl className="dato">
          <dt>Celular</dt><dd>{c.celular ?? "—"}</dd>
          <dt>Correo</dt><dd>{c.correo ?? "—"}</dd>
          <dt>Vinculación</dt><dd>{c.tipo_vinculacion ?? "—"}</dd>
          <dt>Contacto de emergencia</dt><dd>{c.contacto_emergencia_nombre ? `${c.contacto_emergencia_nombre} · ${c.contacto_emergencia_celular ?? ""}` : "—"}</dd>
          <dt>Acuerdos</dt><dd>{c.acuerdos_aceptados_en ? `Aceptados el ${fecha(c.acuerdos_aceptados_en)} (versión ${c.acuerdos_version ?? "—"})` : "Pendientes"}</dd>
          <dt>Curso de ingreso</dt><dd>{c.curso_aprobado_en ? `Aprobado el ${fecha(c.curso_aprobado_en)} con ${c.curso_puntaje ?? "—"} %` : "Pendiente"}</dd>
          <dt>Pidió entrar</dt><dd>{fecha(c.creado_en)}</dd>
          <dt>Último acceso</dt><dd>{haceCuanto(c.ultimo_acceso)}</dd>
        </dl>
      </div>

      {c.rol === "colaborador" && c.estado !== "baja"
        ? <Permisos usuario={c} />
        : <div className="tarjeta"><h2>Permisos</h2><p className="suave">{c.rol === "colaborador" ? "La cuenta está dada de baja." : "El Director y el Administrador tienen todas las funciones de su rol; no usan permisos opcionales."}</p></div>}

      {admin && <Telefonos usuario={c.id} />}
      <Historial usuario={c.id} />

      <Confirmar abierto={dialogo === "rechazar"} titulo="Rechazar la solicitud" pideMotivo="Motivo del rechazo" textoBoton="Rechazar" peligro
                 alConfirmar={(m) => accion.ejecutar(() => fuente.rechazar(c.id, m), "Solicitud rechazada.").then(hecho)} alCerrar={() => setDialogo(null)} />
      <Confirmar abierto={dialogo === "suspender"} titulo={`Suspender a ${c.nombre_completo}`}
                 texto={<p>La persona no podrá usar la app y sus permisos opcionales se apagan. Puede reactivarla después.</p>}
                 pideMotivo="Motivo de la suspensión" textoBoton="Suspender" peligro
                 alConfirmar={(m) => accion.ejecutar(() => fuente.suspender(c.id, m), "Cuenta suspendida.").then(hecho)} alCerrar={() => setDialogo(null)} />
      <Confirmar abierto={dialogo === "baja"} titulo={`Dar de baja a ${c.nombre_completo}`}
                 texto={<p>La cuenta queda cerrada, se apagan sus permisos y se quitan sus zonas. Sus teléfonos borran los datos en la próxima conexión.</p>}
                 pideMotivo="Motivo de la baja" textoBoton="Dar de baja" peligro
                 alConfirmar={(m) => accion.ejecutar(() => fuente.darDeBaja(c.id, m), "Cuenta dada de baja.").then(hecho)} alCerrar={() => setDialogo(null)} />
      <Confirmar abierto={dialogo === "director"} titulo={`Designar a ${c.nombre_completo} como Director`}
                 texto={<p>Solo hay un Director (R-02). Si ya hay uno, vuelve a ser colaborador. La nueva persona no usa permisos opcionales.</p>}
                 textoBoton="Designar"
                 alConfirmar={() => accion.ejecutar(() => fuente.designarDirector(c.id), "Director designado.").then(hecho)} alCerrar={() => setDialogo(null)} />
    </>
  );
}

// ----------------------------------------------------------------------------- P-37 permisos

function Permisos({ usuario }: { usuario: Colaborador }) {
  const { fuente } = usePanel();
  const datos = useCarga(async () => {
    const [defs, actuales, plantillas, zonas, config] = await Promise.all([
      fuente.catalogoPermisos(), fuente.permisosDe(usuario.id), fuente.plantillas(), fuente.zonas(), fuente.configuracion(),
    ]);
    const max = Number(config.find((v) => v.clave === "permiso_alto_max_dias")?.valor ?? 90);
    return { defs, actuales, plantillas, zonas, max };
  }, [fuente, usuario.id]);

  return (
    <div className="tarjeta">
      <h2>Permisos opcionales (P-37)</h2>
      <p className="suave pequeno">Cada permiso guarda quién lo dio, cuándo, por qué y hasta cuándo (R-04). Los de riesgo alto vencen siempre y exigen la verificación en dos pasos (R-05, M3).</p>
      <Estado carga={datos}>
        {(d) => (
          <>
            <AplicarPlantilla usuario={usuario.id} plantillas={d.plantillas} zonas={d.zonas} defs={d.defs} max={d.max} recargar={datos.recargar} />
            {(["alto", "medio", "bajo"] as const).map((riesgo) => (
              <section key={riesgo}>
                <h3 style={{ marginTop: 16 }}>Riesgo {riesgo}</h3>
                {d.defs.filter((p) => p.riesgo === riesgo).map((p) => (
                  <FilaPermiso key={p.codigo} usuario={usuario.id} def={p} actual={d.actuales.find((a) => a.codigo === p.codigo)}
                               zonas={d.zonas} max={d.max} recargar={datos.recargar} />
                ))}
              </section>
            ))}
          </>
        )}
      </Estado>
    </div>
  );
}

function FilaPermiso({ usuario, def, actual, zonas, max, recargar }: {
  usuario: string; def: DefPermiso; actual?: PermisoOtorgado; zonas: Zona[]; max: number; recargar: () => void;
}) {
  const { fuente } = usePanel();
  const accion = useAccion();
  const [abierto, setAbierto] = useState(false);
  const [vence, setVence] = useState(actual?.vence_en?.slice(0, 10) ?? venceSugerido(def) ?? "");
  const [zonasSel, setZonasSel] = useState<string[]>(actual?.zonas ?? []);
  const [motivo, setMotivo] = useState(actual?.motivo ?? "");
  const errorFecha = errorVencimiento(def, vence || null, max);

  const guardar = (activo: boolean) => accion.ejecutar(
    () => fuente.fijarPermiso(usuario, def.codigo, activo, activo && vence ? finDelDia(vence) : null,
                              activo && def.acepta_zonas && zonasSel.length ? zonasSel : null, activo ? motivo.trim() || null : null),
    activo ? `${def.codigo} encendido.` : `${def.codigo} apagado.`,
  ).then((ok) => { if (ok) { setAbierto(false); recargar(); } });

  return (
    <div className="permiso">
      <Interruptor marcado={!!actual} etiqueta={`${def.codigo} ${def.nombre}`} deshabilitado={accion.ocupado}
                   cambiar={(v) => (v ? setAbierto(true) : void guardar(false))} />
      <div>
        <strong>{def.codigo} · {def.nombre}</strong>{def.riesgo === "alto" && <> <Chip nivel="critico">Riesgo alto</Chip></>}
        <div className="suave pequeno">{def.descripcion}</div>
        {actual && !abierto && (
          <div className="pequeno">
            {actual.vence_en ? `Vence el ${fecha(actual.vence_en)}` : "Sin vencimiento"}
            {actual.zonas?.length ? ` · Solo en: ${actual.zonas.map((z) => zonas.find((x) => x.id === z)?.nombre ?? z).join(", ")}` : " · Toda Pijao"}
            {actual.motivo ? ` · Motivo: ${actual.motivo}` : ""}{" "}
            <button type="button" className="boton secundario chico" onClick={() => setAbierto(true)}>Cambiar</button>
          </div>
        )}
      </div>
      {abierto && (
        <div className="detalle-permiso">
          <label>Vence el{def.riesgo === "alto" ? " (obligatorio)" : " (opcional)"}
            <input type="date" value={vence} onChange={(e) => setVence(e.target.value)} />
          </label>
          {def.acepta_zonas && (
            <label>Solo en estas zonas (vacío = toda Pijao)
              <select multiple value={zonasSel} onChange={(e) => setZonasSel([...e.target.selectedOptions].map((o) => o.value))} style={{ minHeight: 90 }}>
                {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
              </select>
            </label>
          )}
          <label>Motivo
            <input type="text" value={motivo} maxLength={200} onChange={(e) => setMotivo(e.target.value)} placeholder="¿Para qué lo necesita?" />
          </label>
          <div className="acciones">
            <button type="button" className="boton chico" disabled={accion.ocupado || !!errorFecha || !motivo.trim()} onClick={() => void guardar(true)}>
              {actual ? "Guardar cambios" : "Encender"}
            </button>
            <button type="button" className="boton secundario chico" onClick={() => setAbierto(false)}>Cancelar</button>
          </div>
          {(errorFecha || !motivo.trim()) && <p className="suave pequeno" style={{ flexBasis: "100%", margin: 0 }}>{errorFecha ?? "Escriba el motivo (R-04)."}</p>}
          {accion.error && <div style={{ flexBasis: "100%" }}><Aviso tipo="error">{accion.error}</Aviso></div>}
        </div>
      )}
    </div>
  );
}

function AplicarPlantilla({ usuario, plantillas, zonas, defs, max, recargar }: {
  usuario: string; plantillas: Plantilla[]; zonas: Zona[]; defs: DefPermiso[]; max: number; recargar: () => void;
}) {
  const { fuente } = usePanel();
  const accion = useAccion();
  const [nombre, setNombre] = useState("");
  const [vence, setVence] = useState("");
  const [zonasSel, setZonasSel] = useState<string[]>([]);
  const pl = plantillas.find((p) => p.nombre === nombre);
  const hayAlto = useMemo(() => !!pl?.codigos.some((c) => defs.find((d) => d.codigo === c)?.riesgo === "alto"), [pl, defs]);
  const errorFecha = hayAlto ? errorVencimiento({ codigo: "", riesgo: "alto" }, vence || null, max) : null;

  return (
    <details>
      <summary style={{ cursor: "pointer", fontWeight: 700, margin: "8px 0" }}>Aplicar una plantilla (atajo para encender varios permisos)</summary>
      <div className="fila-form">
        <div>
          <label htmlFor="plantilla">Plantilla</label>
          <select id="plantilla" value={nombre} onChange={(e) => setNombre(e.target.value)}>
            <option value="">Elija…</option>
            {plantillas.map((p) => <option key={p.nombre} value={p.nombre}>{p.nombre} ({p.codigos.join(", ") || "sin extras"})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="plantilla-vence">Vence el {hayAlto ? "(obligatorio: incluye riesgo alto)" : "(opcional)"}</label>
          <input id="plantilla-vence" type="date" value={vence} onChange={(e) => setVence(e.target.value)} />
        </div>
        {pl?.limitar_a_zona && (
          <div>
            <label htmlFor="plantilla-zonas">Zonas</label>
            <select id="plantilla-zonas" multiple value={zonasSel} onChange={(e) => setZonasSel([...e.target.selectedOptions].map((o) => o.value))}>
              {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
            </select>
          </div>
        )}
        <button type="button" className="boton" disabled={!pl || accion.ocupado || !!errorFecha}
                onClick={() => void accion.ejecutar(() => fuente.aplicarPlantilla(usuario, nombre, vence ? finDelDia(vence) : null, zonasSel.length ? zonasSel : null),
                  "Plantilla aplicada.").then((ok) => ok && recargar())}>Aplicar</button>
      </div>
      {errorFecha && pl && <p className="suave pequeno">{errorFecha}</p>}
      {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
    </details>
  );
}

// ----------------------------------------------------------------------------- teléfonos (solo Administrador)

function Telefonos({ usuario }: { usuario: string }) {
  const { fuente } = usePanel();
  const tel = useCarga(() => fuente.dispositivosDe(usuario), [fuente, usuario]);
  const accion = useAccion();
  const [perdido, setPerdido] = useState<string | null>(null);
  return (
    <div className="tarjeta">
      <h2>Teléfonos</h2>
      <Estado carga={tel} vacio={(l) => l.length === 0}>
        {(lista) => (
          <div className="tabla-envoltura">
            <table>
              <thead><tr><th>Modelo</th><th>Versión</th><th>Última conexión</th><th>Por enviar</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {lista.map((d) => (
                  <tr key={d.id}>
                    <td>{d.modelo ?? "—"}</td>
                    <td>{d.version_app ?? "—"}</td>
                    <td>{haceCuanto(d.ultimo_acceso)}</td>
                    <td>{d.cola_pendiente ?? 0}</td>
                    <td>{d.reportado_perdido_en ? <Chip nivel="critico">Perdido el {fecha(d.reportado_perdido_en)}</Chip> : d.activo ? <Chip nivel="ok">Activo</Chip> : <Chip nivel="neutro">Cerrado</Chip>}</td>
                    <td>{d.activo && <button type="button" className="boton peligro chico" onClick={() => setPerdido(d.id)}>Perdido: borrar datos</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Estado>
      {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
      <Confirmar abierto={!!perdido} titulo="Reportar teléfono perdido" peligro textoBoton="Bloquear y borrar"
                 texto={<p>El teléfono queda bloqueado y borra todos los datos de la campaña en cuanto se conecte (17.2). Esta acción no se deshace.</p>}
                 alConfirmar={() => accion.ejecutar(() => fuente.reportarPerdido(perdido!), "Teléfono bloqueado.").then((ok) => { if (ok) tel.recargar(); return ok; })}
                 alCerrar={() => setPerdido(null)} />
    </div>
  );
}

// ----------------------------------------------------------------------------- historial

function Historial({ usuario }: { usuario: string }) {
  const { fuente } = usePanel();
  const hist = useCarga(() => fuente.auditoria({ registro: usuario }, 0, false), [fuente, usuario]);
  return (
    <div className="tarjeta">
      <h2>Historial de la cuenta y de sus permisos</h2>
      <Estado carga={hist} vacio={(r) => r.filas.length === 0}>
        {(r) => (
          <ul>
            {r.filas.map((a) => (
              <li key={a.id}>
                <strong>{fechaHora(a.creado_en)}</strong> · {describirAccion(a.accion)}
                {a.accion === "permiso" && ` ${String(a.detalle.codigo ?? "")} ${a.detalle.activo ? "encendido" : "apagado"}`}
                {typeof a.detalle.motivo === "string" && a.detalle.motivo ? ` · ${a.detalle.motivo}` : ""}
              </li>
            ))}
          </ul>
        )}
      </Estado>
    </div>
  );
}
