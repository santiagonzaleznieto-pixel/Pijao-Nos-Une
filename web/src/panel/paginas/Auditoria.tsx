// P-41 Auditoría: filtros por usuario, acción, fecha y registro. Vista operativa para el Director y vista técnica
// para el Administrador, que es el único que exporta (con motivo, y la exportación queda auditada).
import { useMemo, useState } from "react";
import { ACCION_AUDITORIA, describirAccion } from "../../logica/textos";
import { aCsv, diaMas, fechaHora } from "../../logica/utiles";
import type { FilaAuditoria, FiltrosAuditoria } from "../datos/tipos";
import { Aviso, Confirmar, descargar, Encabezado, esAdmin, Estado, useAccion, useCarga, usePanel } from "../ui";

const COLUMNAS_CSV = [
  { clave: "seq", titulo: "Secuencia" }, { clave: "creado_en", titulo: "Fecha (UTC)" }, { clave: "usuario", titulo: "Usuario" },
  { clave: "usuario_id", titulo: "Id usuario" }, { clave: "actor_rol", titulo: "Rol técnico" }, { clave: "accion", titulo: "Acción" },
  { clave: "entidad", titulo: "Entidad" }, { clave: "entidad_id", titulo: "Registro" }, { clave: "detalle", titulo: "Detalle" },
  { clave: "ip", titulo: "IP" }, { clave: "hash_anterior", titulo: "Huella anterior" }, { clave: "hash", titulo: "Huella" },
];

function resumirDetalle(d: Record<string, unknown>): string {
  return Object.entries(d ?? {})
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
}

export function Auditoria() {
  const { fuente, perfil } = usePanel();
  const admin = esAdmin(perfil);
  const gente = useCarga(() => fuente.colaboradores(), [fuente]);
  const nombres = useMemo(() => new Map((gente.datos ?? []).map((g) => [g.id, g.nombre_completo])), [gente.datos]);
  const [borrador, setBorrador] = useState<FiltrosAuditoria>({ desde: diaMas(-30) });
  const [filtros, setFiltros] = useState<FiltrosAuditoria>({ desde: diaMas(-30) });
  const [tecnica, setTecnica] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [filas, setFilas] = useState<FilaAuditoria[]>([]);
  const carga = useCarga(async () => {
    const r = await fuente.auditoria(filtros, pagina, tecnica);
    setFilas((prev) => (pagina === 0 ? r.filas : [...prev, ...r.filas]));
    return r;
  }, [fuente, filtros, pagina, tecnica]);
  const accion = useAccion();
  const [exportar, setExportar] = useState(false);
  const [cadena, setCadena] = useState<string | null>(null);

  const aplicar = () => { setPagina(0); setFiltros({ ...borrador }); };
  const cambiar = (k: keyof FiltrosAuditoria, v: string) => setBorrador((b) => ({ ...b, [k]: v || undefined }));

  return (
    <>
      <Encabezado titulo="Auditoría">
        {admin && (
          <>
            <label className="opcion" style={{ margin: 0 }}>
              <input type="checkbox" checked={tecnica} onChange={(e) => { setPagina(0); setTecnica(e.target.checked); }} /> Vista técnica
            </label>
            <button type="button" className="boton secundario chico" disabled={accion.ocupado}
                    onClick={() => void accion.ejecutar(async () => {
                      const r = await fuente.verificarCadena();
                      setCadena(r.integra ? `La cadena está íntegra: ${r.revisados} registros revisados y ninguno alterado.`
                                          : `¡ALERTA! La cadena se rompe en el registro ${r.primer_id_roto}. Alguien alteró la auditoría: avise al abogado y no borre nada.`);
                    })}>Verificar la cadena</button>
            <button type="button" className="boton chico" onClick={() => setExportar(true)}>Exportar CSV</button>
          </>
        )}
      </Encabezado>
      <p className="suave">Todo ingreso, cambio, acceso a datos completos, exportación, permiso y cambio de configuración queda aquí y no se puede borrar (8.9).
        {!admin && " Los eventos técnicos de seguridad y de sesión solo los ve el Administrador."}</p>
      {cadena && <Aviso tipo={cadena.startsWith("¡") ? "error" : "ok"}>{cadena}</Aviso>}
      {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}

      <form className="tarjeta" onSubmit={(e) => { e.preventDefault(); aplicar(); }}>
        <div className="fila-form">
          <div><label htmlFor="f-desde">Desde</label><input id="f-desde" type="date" value={borrador.desde ?? ""} onChange={(e) => cambiar("desde", e.target.value)} /></div>
          <div><label htmlFor="f-hasta">Hasta</label><input id="f-hasta" type="date" value={borrador.hasta ?? ""} onChange={(e) => cambiar("hasta", e.target.value)} /></div>
          <div>
            <label htmlFor="f-usuario">Usuario</label>
            <select id="f-usuario" value={borrador.usuario ?? ""} onChange={(e) => cambiar("usuario", e.target.value)}>
              <option value="">Todos</option>
              {(gente.datos ?? []).map((g) => <option key={g.id} value={g.id}>{g.nombre_completo}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-accion">Acción</label>
            <select id="f-accion" value={borrador.accion ?? ""} onChange={(e) => cambiar("accion", e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(ACCION_AUDITORIA).sort((a, b) => a[1].localeCompare(b[1])).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
          </div>
          <div><label htmlFor="f-registro">Registro (identificador)</label><input id="f-registro" type="text" value={borrador.registro ?? ""} onChange={(e) => cambiar("registro", e.target.value)} /></div>
          <button className="boton">Filtrar</button>
        </div>
      </form>

      <Estado carga={{ ...carga, datos: carga.datos ? filas : null }} vacio={(l) => l.length === 0}>
        {(lista) => (
          <>
            <div className="tabla-envoltura">
              <table>
                <thead>
                  <tr><th>Fecha</th><th>Quién</th><th>Qué hizo</th><th>Registro</th><th>Detalle</th>{tecnica && <><th>IP</th><th>Huella</th></>}</tr>
                </thead>
                <tbody>
                  {lista.map((a) => (
                    <tr key={a.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{fechaHora(a.creado_en)}</td>
                      <td>{a.usuario_id ? nombres.get(a.usuario_id) ?? "Cuenta eliminada" : a.actor_rol === "anon" ? "Página pública" : "Sistema"}</td>
                      <td>{describirAccion(a.accion)}{tecnica && <div className="suave pequeno mono">{a.accion}</div>}</td>
                      <td className="pequeno">{a.entidad}{a.entidad_id ? <div className="mono suave">{a.entidad_id.length > 13 ? `${a.entidad_id.slice(0, 8)}…` : a.entidad_id}</div> : null}</td>
                      <td className="pequeno" style={{ maxWidth: 360, overflowWrap: "anywhere" }}>{resumirDetalle(a.detalle)}</td>
                      {tecnica && <><td className="mono pequeno">{a.ip ?? "—"}</td><td className="mono pequeno">{a.hash ? `${a.hash.slice(0, 10)}…` : "—"}</td></>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {carga.datos?.hayMas && (
              <button type="button" className="boton secundario" style={{ marginTop: 12 }} disabled={carga.cargando} onClick={() => setPagina((p) => p + 1)}>
                {carga.cargando ? "Cargando…" : "Cargar más"}
              </button>
            )}
          </>
        )}
      </Estado>

      <Confirmar abierto={exportar} titulo="Exportar la auditoría técnica" textoBoton="Exportar"
                 texto={<p>Se exportan hasta 5.000 registros con los filtros aplicados. La exportación misma queda en la auditoría con su motivo. Guarde el archivo en un lugar seguro y no lo comparta por chat.</p>}
                 pideMotivo="Motivo de la exportación"
                 alConfirmar={(motivo) => accion.ejecutar(async () => {
                   const filasExp = await fuente.exportarAuditoria(filtros, motivo);
                   descargar(`auditoria_pijao_${diaMas(0)}.csv`, aCsv(filasExp as unknown as Record<string, unknown>[], COLUMNAS_CSV));
                 }, "Exportación lista.")}
                 alCerrar={() => setExportar(false)} />
    </>
  );
}
