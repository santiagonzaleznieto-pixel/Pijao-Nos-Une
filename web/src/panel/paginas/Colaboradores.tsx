// P-36 Gestión de colaboradores (parte básica de la Fase 1): lista con filtros, invitar, aprobar o rechazar
// y entrar a la ficha de cada persona.
import { useMemo, useState, type FormEvent } from "react";
import { ESTADO_CUENTA, ESTADO_INVITACION, ROL } from "../../logica/textos";
import { fecha, fechaHora, haceCuanto } from "../../logica/utiles";
import type { Colaborador } from "../datos/tipos";
import { Aviso, Chip, Confirmar, Encabezado, esAdmin, Estado, Pestanas, useAccion, useCarga, usePanel } from "../ui";

const FILTROS = [
  ["pendiente", "Por aprobar"], ["activo", "Activos"], ["aprobado", "Aprobados sin ingreso"],
  ["suspendido", "Suspendidos"], ["baja", "Bajas"], ["todos", "Todos"],
] as const;
type Filtro = (typeof FILTROS)[number][0];

export const nivelEstado = (e: string) =>
  e === "activo" ? "ok" : e === "pendiente" || e === "aprobado" ? "alerta" : e === "suspendido" ? "critico" : "neutro";

export function Colaboradores() {
  const { fuente } = usePanel();
  const gente = useCarga(() => fuente.colaboradores(), [fuente]);
  const [filtro, setFiltro] = useState<Filtro>("pendiente");
  const [buscar, setBuscar] = useState("");
  const [invitando, setInvitando] = useState(false);

  return (
    <>
      <Encabezado titulo="Colaboradores">
        <button type="button" className="boton" onClick={() => setInvitando((v) => !v)}>{invitando ? "Cerrar" : "Invitar a alguien"}</button>
      </Encabezado>
      {invitando && <Invitar />}
      <Pestanas opciones={FILTROS} valor={filtro} cambiar={setFiltro} />
      <label htmlFor="buscar" className="visualmente-oculto">Buscar por nombre</label>
      <input id="buscar" type="text" placeholder="Buscar por nombre…" value={buscar} onChange={(e) => setBuscar(e.target.value)} style={{ maxWidth: 360, marginBottom: 12 }} />
      <Estado carga={gente}>
        {(lista) => <Lista lista={lista} filtro={filtro} buscar={buscar} recargar={gente.recargar} />}
      </Estado>
      <Invitaciones />
    </>
  );
}

function Lista({ lista, filtro, buscar, recargar }: { lista: Colaborador[]; filtro: Filtro; buscar: string; recargar: () => void }) {
  const { fuente } = usePanel();
  const accion = useAccion();
  const [rechazar, setRechazar] = useState<Colaborador | null>(null);
  const filas = useMemo(() => {
    const b = buscar.trim().toLowerCase();
    return lista.filter((c) => (filtro === "todos" || c.estado === filtro) && (!b || c.nombre_completo.toLowerCase().includes(b)));
  }, [lista, filtro, buscar]);

  if (!filas.length) return <p className="suave">No hay personas en esta lista.</p>;
  return (
    <>
      {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
      <div className="tabla-envoltura">
        <table>
          <thead><tr><th>Nombre</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th>Curso</th><th></th></tr></thead>
          <tbody>
            {filas.map((c) => (
              <tr key={c.id} className="clic" onClick={() => (location.hash = `#/colaborador/${c.id}`)}>
                <td>
                  <a href={`#/colaborador/${c.id}`} onClick={(e) => e.stopPropagation()}>{c.nombre_completo}</a>
                  {(c.es_servidor_publico || c.es_contratista_estado) && <> <Chip nivel="alerta">Revisar con el abogado (R-07)</Chip></>}
                </td>
                <td>{ROL[c.rol] ?? c.rol}</td>
                <td><Chip nivel={nivelEstado(c.estado)}>{ESTADO_CUENTA[c.estado] ?? c.estado}</Chip></td>
                <td>{c.estado === "pendiente" ? `Pidió entrar ${haceCuanto(c.creado_en)}` : haceCuanto(c.ultimo_acceso)}</td>
                <td>{c.curso_aprobado_en ? `${c.curso_puntaje ?? "—"} %` : "—"}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  {c.estado === "pendiente" && (
                    <div className="acciones">
                      <button type="button" className="boton chico" disabled={accion.ocupado}
                              onClick={() => void accion.ejecutar(() => fuente.aprobar(c.id), `${c.nombre_completo} quedó aprobada. Ahora debe aceptar los acuerdos y aprobar el curso.`).then((ok) => ok && recargar())}>
                        Aprobar
                      </button>
                      <button type="button" className="boton secundario chico" onClick={() => setRechazar(c)}>Rechazar</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Confirmar abierto={!!rechazar} titulo={`Rechazar la solicitud de ${rechazar?.nombre_completo ?? ""}`}
                 pideMotivo="Motivo del rechazo (queda en la auditoría)" textoBoton="Rechazar" peligro
                 alConfirmar={(m) => accion.ejecutar(() => fuente.rechazar(rechazar!.id, m), "Solicitud rechazada.").then((ok) => { if (ok) recargar(); return ok; })}
                 alCerrar={() => setRechazar(null)} />
    </>
  );
}

function Invitar() {
  const { fuente, perfil } = usePanel();
  const accion = useAccion();
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState("colaborador");
  const [hecho, setHecho] = useState<{ codigo: string; expira_en: string; nombre: string } | null>(null);

  const enviar = (ev: FormEvent) => {
    ev.preventDefault();
    void accion.ejecutar(async () => {
      const r = await fuente.invitar(nombre.trim(), celular.trim() || null, correo.trim() || null, rol);
      setHecho({ ...r, nombre: nombre.trim() });
      setNombre(""); setCelular(""); setCorreo("");
    });
  };
  const mensaje = hecho
    ? `Hola, ${hecho.nombre.split(" ")[0]}. Su código para entrar a la app Pijao Nos Une es ${hecho.codigo}. Vence el ${fechaHora(hecho.expira_en)}. Solo sirve una vez.`
    : "";

  return (
    <div className="tarjeta">
      <h2>Invitar a una persona</h2>
      {hecho ? (
        <>
          <Aviso tipo="ok">Invitación creada. Código: <strong className="mono" style={{ fontSize: "1.3rem", letterSpacing: 2 }}>{hecho.codigo}</strong></Aviso>
          <p>Envíele este mensaje en privado (no lo publique en grupos):</p>
          <textarea readOnly value={mensaje} />
          <div className="acciones" style={{ marginTop: 8 }}>
            <button type="button" className="boton secundario chico" onClick={() => void navigator.clipboard?.writeText(mensaje)}>Copiar mensaje</button>
            <button type="button" className="boton chico" onClick={() => setHecho(null)}>Invitar a otra persona</button>
          </div>
        </>
      ) : (
        <form onSubmit={enviar}>
          <p className="suave pequeno">La invitación vence a las 72 horas y sirve una sola vez. Si escribe el correo, solo esa persona podrá usarla.</p>
          <div className="fila-form">
            <div><label htmlFor="inv-nombre">Nombre completo</label><input id="inv-nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} /></div>
            <div><label htmlFor="inv-celular">Celular (opcional)</label><input id="inv-celular" type="tel" value={celular} onChange={(e) => setCelular(e.target.value)} /></div>
            <div><label htmlFor="inv-correo">Correo (opcional)</label><input id="inv-correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} /></div>
            {esAdmin(perfil) && (
              <div>
                <label htmlFor="inv-rol">Rol</label>
                <select id="inv-rol" value={rol} onChange={(e) => setRol(e.target.value)}>
                  <option value="colaborador">Colaborador</option>
                  <option value="director">Director (lo designa el Administrador después)</option>
                </select>
              </div>
            )}
            <button className="boton" disabled={accion.ocupado || nombre.trim().length < 3}>{accion.ocupado ? "Creando…" : "Crear invitación"}</button>
          </div>
          {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
        </form>
      )}
    </div>
  );
}

function Invitaciones() {
  const { fuente } = usePanel();
  const inv = useCarga(() => fuente.invitaciones(), [fuente]);
  return (
    <details className="tarjeta">
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>Invitaciones recientes</summary>
      <Estado carga={inv} vacio={(l) => l.length === 0}>
        {(lista) => (
          <div className="tabla-envoltura" style={{ marginTop: 12 }}>
            <table>
              <thead><tr><th>Nombre</th><th>Rol</th><th>Estado</th><th>Creada</th><th>Vence</th></tr></thead>
              <tbody>
                {lista.map((i) => {
                  const vencida = i.estado === "pendiente" && i.expira_en < new Date().toISOString();
                  return (
                    <tr key={i.id}>
                      <td>{i.nombre}</td>
                      <td>{ROL[i.rol_destino] ?? i.rol_destino}</td>
                      <td><Chip nivel={i.estado === "usada" ? "ok" : vencida ? "neutro" : "alerta"}>{vencida ? "Vencida" : ESTADO_INVITACION[i.estado] ?? i.estado}</Chip></td>
                      <td>{fecha(i.creado_en)}</td>
                      <td>{fechaHora(i.expira_en)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Estado>
    </details>
  );
}
