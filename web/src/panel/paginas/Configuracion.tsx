// P-42 Configuración del sistema (solo el Administrador, con verificación en dos pasos): valores de control (19.1),
// catálogos C-01 a C-20, textos legales con versiones, calendario legal, plantillas de permisos e integraciones.
// Ningún valor de 19.1 queda fijo en la app: todos se leen de aquí (regla 0.4-6 del plan).
import { useMemo, useState } from "react";
import { CATALOGOS } from "@nucleo/catalogos";
import { ESTADO_FECHA_LEGAL, TIPO_TEXTO_LEGAL } from "../../logica/textos";
import { fecha, fechaHora, interpretarValor, valorParaEditar } from "../../logica/utiles";
import type { DefPermiso, OpcionCatalogo, Plantilla, TextoLegal, ValorConfig } from "../datos/tipos";
import { Aviso, Chip, Confirmar, Encabezado, esAdmin, Estado, Pestanas, SinPermiso, useAccion, useCarga, usePanel } from "../ui";

const PESTANAS = [
  ["valores", "Valores de control"], ["catalogos", "Catálogos"], ["textos", "Textos legales"],
  ["calendario", "Calendario legal"], ["plantillas", "Plantillas de permisos"], ["integraciones", "Integraciones"],
] as const;
type Pestana = (typeof PESTANAS)[number][0];

// Claves que tienen su propia pestaña o que escribe el sistema.
const ESPECIALES = new Set(["calendario_legal", "canal_titulares_correo", "canal_titulares_whatsapp", "responsable_tratamiento", "ultimo_respaldo"]);
const SISTEMA = new Set(["C-01", "C-02", "C-09", "C-10", "C-11", "C-18"]);

export function Configuracion({ pestanaInicial }: { pestanaInicial?: string }) {
  const { perfil } = usePanel();
  const [pestana, setPestana] = useState<Pestana>(PESTANAS.some(([p]) => p === pestanaInicial) ? (pestanaInicial as Pestana) : "valores");
  if (!esAdmin(perfil)) return <><Encabezado titulo="Configuración" /><SinPermiso /></>;
  return (
    <>
      <Encabezado titulo="Configuración del sistema" />
      <p className="suave">Cada cambio exige la verificación en dos pasos y queda en la auditoría con el valor anterior y el nuevo.</p>
      <Pestanas opciones={PESTANAS} valor={pestana} cambiar={(p) => { setPestana(p); history.replaceState(null, "", `#/configuracion/${p}`); }} />
      {pestana === "valores" && <Valores />}
      {pestana === "catalogos" && <Catalogos />}
      {pestana === "textos" && <Textos />}
      {pestana === "calendario" && <Calendario />}
      {pestana === "plantillas" && <Plantillas />}
      {pestana === "integraciones" && <Integraciones />}
    </>
  );
}

// ----------------------------------------------------------------------------- valores de control (19.1)

function Valores() {
  const { fuente } = usePanel();
  const cfg = useCarga(() => fuente.configuracion(), [fuente]);
  const [buscar, setBuscar] = useState("");
  return (
    <>
      <input type="text" aria-label="Buscar un valor" placeholder="Buscar…" value={buscar} onChange={(e) => setBuscar(e.target.value)} style={{ maxWidth: 360, marginBottom: 12 }} />
      <Estado carga={cfg}>
        {(lista) => (
          <div className="tabla-envoltura">
            <table>
              <thead><tr><th>Valor</th><th>Qué controla</th><th style={{ minWidth: 220 }}>Valor actual</th></tr></thead>
              <tbody>
                {lista.filter((v) => !ESPECIALES.has(v.clave) && (typeof v.valor !== "object" || Array.isArray(v.valor)))
                  .filter((v) => !buscar || `${v.clave} ${v.descripcion ?? ""}`.toLowerCase().includes(buscar.toLowerCase()))
                  .map((v) => <FilaValor key={v.clave} v={v} recargar={cfg.recargar} />)}
              </tbody>
            </table>
          </div>
        )}
      </Estado>
    </>
  );
}

function FilaValor({ v, recargar }: { v: ValorConfig; recargar: () => void }) {
  const { fuente } = usePanel();
  const accion = useAccion();
  const [texto, setTexto] = useState(valorParaEditar(v.valor));
  const cambiado = texto !== valorParaEditar(v.valor);
  const guardar = () => {
    const r = interpretarValor(v.valor, texto);
    if (!r.ok) { accion.setError(r.error); return; }
    void accion.ejecutar(() => fuente.guardarConfig(v.clave, r.valor), `«${v.clave}» guardado.`).then((ok) => ok && recargar());
  };
  return (
    <tr>
      <td className="mono pequeno">{v.clave}</td>
      <td>{v.descripcion ?? "—"}<div className="suave pequeno">Cambiado {fechaHora(v.actualizado_en)}</div></td>
      <td>
        <div className="acciones" style={{ flexWrap: "nowrap" }}>
          <input type="text" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label={`Valor de ${v.clave}`} style={{ minWidth: 100 }} />
          {cambiado && <button type="button" className="boton chico" disabled={accion.ocupado} onClick={guardar}>Guardar</button>}
        </div>
        {accion.error && <div className="pequeno" style={{ color: "var(--rojo)" }}>{accion.error}</div>}
      </td>
    </tr>
  );
}

// ----------------------------------------------------------------------------- catálogos C-01 a C-20

function Catalogos() {
  const { fuente } = usePanel();
  const opciones = useCarga(() => fuente.catalogos(), [fuente]);
  const [cat, setCat] = useState("C-08");
  return (
    <>
      <label htmlFor="catalogo">Catálogo</label>
      <select id="catalogo" value={cat} onChange={(e) => setCat(e.target.value)} style={{ maxWidth: 480 }}>
        {Object.entries(CATALOGOS).map(([c, d]) => <option key={c} value={c}>{c} · {d.nombre}</option>)}
      </select>
      {SISTEMA.has(cat) && <Aviso tipo="alerta">Catálogo del sistema: las reglas usan sus claves. Puede cambiar los nombres y el orden, pero no agregar ni desactivar opciones.</Aviso>}
      <Estado carga={opciones}>
        {(lista) => <ListaOpciones key={cat} cat={cat} lista={lista.filter((o) => o.catalogo === cat)} recargar={opciones.recargar} />}
      </Estado>
    </>
  );
}

function ListaOpciones({ cat, lista, recargar }: { cat: string; lista: OpcionCatalogo[]; recargar: () => void }) {
  const { fuente } = usePanel();
  const accion = useAccion();
  const [nueva, setNueva] = useState({ clave: "", etiqueta: "" });
  const siguiente = Math.max(-1, ...lista.map((o) => o.orden)) + 1;
  return (
    <div className="tarjeta">
      <div className="tabla-envoltura">
        <table>
          <thead><tr><th>Clave</th><th>Nombre que ve el equipo</th><th>Orden</th><th>Activa</th><th></th></tr></thead>
          <tbody>{lista.map((o) => <FilaOpcion key={o.clave} o={o} sistema={SISTEMA.has(cat)} recargar={recargar} />)}</tbody>
        </table>
      </div>
      {!SISTEMA.has(cat) && (
        <form className="fila-form" style={{ marginTop: 12 }} onSubmit={(e) => {
          e.preventDefault();
          void accion.ejecutar(() => fuente.guardarOpcion(cat, nueva.clave.trim(), nueva.etiqueta.trim(), siguiente, true), "Opción agregada.")
            .then((ok) => { if (ok) { setNueva({ clave: "", etiqueta: "" }); recargar(); } });
        }}>
          <div><label htmlFor="op-clave">Clave nueva (minúsculas_sin_espacios)</label><input id="op-clave" value={nueva.clave} onChange={(e) => setNueva({ ...nueva, clave: e.target.value })} /></div>
          <div><label htmlFor="op-etiqueta">Nombre</label><input id="op-etiqueta" value={nueva.etiqueta} onChange={(e) => setNueva({ ...nueva, etiqueta: e.target.value })} /></div>
          <button className="boton" disabled={accion.ocupado || !nueva.clave || !nueva.etiqueta}>Agregar</button>
        </form>
      )}
      {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
    </div>
  );
}

function FilaOpcion({ o, sistema, recargar }: { o: OpcionCatalogo; sistema: boolean; recargar: () => void }) {
  const { fuente } = usePanel();
  const accion = useAccion();
  const [etiqueta, setEtiqueta] = useState(o.etiqueta);
  const [orden, setOrden] = useState(String(o.orden));
  const [activo, setActivo] = useState(o.activo);
  const cambiado = etiqueta !== o.etiqueta || orden !== String(o.orden) || activo !== o.activo;
  return (
    <tr>
      <td className="mono pequeno">{o.clave}</td>
      <td><input value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} aria-label={`Nombre de ${o.clave}`} />
        {accion.error && <div className="pequeno" style={{ color: "var(--rojo)" }}>{accion.error}</div>}</td>
      <td style={{ width: 90 }}><input type="number" min={0} max={999} value={orden} onChange={(e) => setOrden(e.target.value)} aria-label={`Orden de ${o.clave}`} /></td>
      <td><input type="checkbox" checked={activo} disabled={sistema} onChange={(e) => setActivo(e.target.checked)} aria-label={`${o.clave} activa`} style={{ width: 22, height: 22 }} /></td>
      <td>{cambiado && <button type="button" className="boton chico" disabled={accion.ocupado}
            onClick={() => void accion.ejecutar(() => fuente.guardarOpcion(o.catalogo, o.clave, etiqueta, Number(orden) || 0, activo), "Opción guardada.").then((ok) => ok && recargar())}>Guardar</button>}</td>
    </tr>
  );
}

// ----------------------------------------------------------------------------- textos legales con versiones

function Textos() {
  const { fuente } = usePanel();
  const textos = useCarga(() => fuente.textos(), [fuente]);
  const [tipo, setTipo] = useState("aviso_privacidad");
  return (
    <>
      <label htmlFor="tipo-texto">Texto</label>
      <select id="tipo-texto" value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ maxWidth: 480 }}>
        {Object.entries(TIPO_TEXTO_LEGAL).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
      </select>
      <Estado carga={textos}>{(lista) => <Versiones key={tipo} tipo={tipo} lista={lista.filter((t) => t.tipo === tipo)} recargar={textos.recargar} />}</Estado>
    </>
  );
}

function Versiones({ tipo, lista, recargar }: { tipo: string; lista: TextoLegal[]; recargar: () => void }) {
  const { fuente } = usePanel();
  const accion = useAccion();
  const vigente = lista.find((t) => t.vigente);
  const [version, setVersion] = useState("");
  const [contenido, setContenido] = useState(vigente?.contenido ?? "");
  const [aprobado, setAprobado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  return (
    <>
      <div className="tarjeta">
        <h2>Versión vigente</h2>
        {vigente ? (
          <>
            <p>Versión <strong>{vigente.version}</strong> · publicada el {fecha(vigente.creado_en)} ·{" "}
              {vigente.es_borrador ? <Chip nivel="alerta">Borrador: falta el abogado</Chip> : <Chip nivel="ok">Aprobada por el abogado</Chip>}</p>
            <div className="texto-legal tarjeta" style={{ maxHeight: 260, overflow: "auto" }}>{vigente.contenido}</div>
          </>
        ) : <p className="suave">Todavía no hay una versión de este texto.</p>}
      </div>
      <div className="tarjeta">
        <h2>Publicar una versión nueva</h2>
        <p className="suave pequeno">La versión anterior queda guardada: las autorizaciones ya tomadas siguen citando su texto (16.4).</p>
        {tipo === "autorizacion" && (
          <Aviso tipo="alerta">Al publicar un texto de autorización aprobado, el servidor solo acepta registros hechos con esa versión. Pida a todo el equipo sincronizar la app antes de su próxima visita.</Aviso>
        )}
        <label htmlFor="t-version">Número de versión</label>
        <input id="t-version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="por ejemplo v2" style={{ maxWidth: 220 }} />
        <label htmlFor="t-contenido">Texto completo</label>
        <textarea id="t-contenido" value={contenido} onChange={(e) => setContenido(e.target.value)} style={{ minHeight: 220 }} />
        <label className="opcion"><input type="checkbox" checked={aprobado} onChange={(e) => setAprobado(e.target.checked)} /> El abogado aprobó este texto</label>
        <button type="button" className="boton" disabled={!version.trim() || contenido.trim().length < 20} onClick={() => setConfirmar(true)}>Publicar versión</button>
        {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
      </div>
      {lista.length > 1 && (
        <details className="tarjeta">
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>Versiones anteriores ({lista.length - 1})</summary>
          <ul>{lista.filter((t) => !t.vigente).map((t) => <li key={t.id}>{t.version} · {fecha(t.creado_en)} {t.es_borrador ? "(borrador)" : "(aprobada)"}</li>)}</ul>
        </details>
      )}
      <Confirmar abierto={confirmar} titulo={`Publicar la versión ${version}`} textoBoton="Publicar"
                 texto={<p>{TIPO_TEXTO_LEGAL[tipo]} · {aprobado ? "aprobada por el abogado" : "como borrador"}. La versión anterior deja de estar vigente.</p>}
                 alConfirmar={() => accion.ejecutar(() => fuente.publicarTexto(tipo, version.trim(), contenido, aprobado), "Versión publicada.")
                   .then((ok) => { if (ok) { setVersion(""); recargar(); } return ok; })}
                 alCerrar={() => setConfirmar(false)} />
    </>
  );
}

// ----------------------------------------------------------------------------- calendario legal (2.2 y 14.7)

interface FechaLegal { fecha: string | null; hito: string; estado: string }

function Calendario() {
  const { fuente } = usePanel();
  const cfg = useCarga(() => fuente.configuracion(), [fuente]);
  return (
    <Estado carga={cfg}>
      {(lista) => <EditorCalendario inicial={(lista.find((v) => v.clave === "calendario_legal")?.valor as FechaLegal[]) ?? []} recargar={cfg.recargar} />}
    </Estado>
  );
}

function EditorCalendario({ inicial, recargar }: { inicial: FechaLegal[]; recargar: () => void }) {
  const { fuente } = usePanel();
  const accion = useAccion();
  const [filas, setFilas] = useState<FechaLegal[]>(inicial);
  const ordenadas = useMemo(() => filas.map((f, i) => ({ f, i })), [filas]);
  const cambiar = (i: number, cambio: Partial<FechaLegal>) => setFilas((l) => l.map((f, j) => (j === i ? { ...f, ...cambio } : f)));
  const guardar = () => {
    const limpio = [...filas].filter((f) => f.hito.trim())
      .map((f) => ({ fecha: f.fecha || null, hito: f.hito.trim(), estado: f.estado }))
      .sort((a, b) => (a.fecha ?? "9999").localeCompare(b.fecha ?? "9999"));
    void accion.ejecutar(() => fuente.guardarConfig("calendario_legal", limpio), "Calendario guardado.").then((ok) => ok && recargar());
  };
  return (
    <div className="tarjeta">
      <p className="suave">Fechas de la Registraduría (Resolución 12338 de 2026). Corríjalas cuando el abogado confirme el texto oficial. Las fechas sin confirmar se dejan vacías.</p>
      <div className="tabla-envoltura">
        <table>
          <thead><tr><th style={{ width: 170 }}>Fecha</th><th>Hito</th><th style={{ width: 230 }}>Estado</th><th></th></tr></thead>
          <tbody>
            {ordenadas.map(({ f, i }) => (
              <tr key={i}>
                <td><input type="date" value={f.fecha ?? ""} onChange={(e) => cambiar(i, { fecha: e.target.value || null })} aria-label="Fecha" /></td>
                <td><input value={f.hito} onChange={(e) => cambiar(i, { hito: e.target.value })} maxLength={200} aria-label="Hito" /></td>
                <td>
                  <select value={f.estado} onChange={(e) => cambiar(i, { estado: e.target.value })} aria-label="Estado">
                    {Object.entries(ESTADO_FECHA_LEGAL).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                  </select>
                </td>
                <td><button type="button" className="boton secundario chico" onClick={() => setFilas((l) => l.filter((_, j) => j !== i))}>Quitar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="acciones" style={{ marginTop: 12 }}>
        <button type="button" className="boton secundario" onClick={() => setFilas((l) => [...l, { fecha: null, hito: "", estado: "pendiente" }])}>Agregar fecha</button>
        <button type="button" className="boton" disabled={accion.ocupado} onClick={guardar}>Guardar calendario</button>
      </div>
      {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
    </div>
  );
}

// ----------------------------------------------------------------------------- plantillas de permisos (4.6)

function Plantillas() {
  const { fuente } = usePanel();
  const datos = useCarga(async () => ({ plantillas: await fuente.plantillas(), defs: await fuente.catalogoPermisos() }), [fuente]);
  return (
    <Estado carga={datos}>
      {(d) => (
        <>
          <p className="suave">Una plantilla es un atajo para encender varios permisos a la vez; no es un rol (4.6).</p>
          {d.plantillas.map((p) => <EditorPlantilla key={p.nombre} p={p} defs={d.defs} recargar={datos.recargar} />)}
          <EditorPlantilla p={{ nombre: "", codigos: [], limitar_a_zona: false }} defs={d.defs} recargar={datos.recargar} nueva />
        </>
      )}
    </Estado>
  );
}

function EditorPlantilla({ p, defs, recargar, nueva }: { p: Plantilla; defs: DefPermiso[]; recargar: () => void; nueva?: boolean }) {
  const { fuente } = usePanel();
  const accion = useAccion();
  const [nombre, setNombre] = useState(p.nombre);
  const [codigos, setCodigos] = useState<string[]>(p.codigos);
  const [zona, setZona] = useState(p.limitar_a_zona);
  const [borrar, setBorrar] = useState(false);
  const alterna = (c: string) => setCodigos((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));
  return (
    <details className="tarjeta" open={nueva ? false : undefined}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>{nueva ? "+ Nueva plantilla" : `${p.nombre} (${p.codigos.join(", ") || "sin extras"})`}</summary>
      {nueva && (<><label htmlFor="pl-nombre">Nombre</label><input id="pl-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} /></>)}
      <div className="cuadricula" style={{ marginTop: 12 }}>
        {defs.map((d) => (
          <label key={d.codigo} className="opcion" style={{ margin: 0 }}>
            <input type="checkbox" checked={codigos.includes(d.codigo)} onChange={() => alterna(d.codigo)} />
            <span>{d.codigo} · {d.nombre}{d.riesgo === "alto" && <span className="suave"> (riesgo alto)</span>}</span>
          </label>
        ))}
      </div>
      <label className="opcion"><input type="checkbox" checked={zona} onChange={(e) => setZona(e.target.checked)} /> Limitar a las zonas que se elijan al aplicarla</label>
      <div className="acciones">
        <button type="button" className="boton" disabled={accion.ocupado || nombre.trim().length < 3}
                onClick={() => void accion.ejecutar(() => fuente.guardarPlantilla(nombre.trim(), codigos, zona), "Plantilla guardada.").then((ok) => ok && recargar())}>Guardar</button>
        {!nueva && <button type="button" className="boton secundario" onClick={() => setBorrar(true)}>Eliminar</button>}
      </div>
      {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
      <Confirmar abierto={borrar} titulo={`Eliminar la plantilla «${p.nombre}»`} peligro textoBoton="Eliminar"
                 texto={<p>Los permisos que ya se dieron con ella no cambian.</p>}
                 alConfirmar={() => accion.ejecutar(() => fuente.eliminarPlantilla(p.nombre), "Plantilla eliminada.").then((ok) => { if (ok) recargar(); return ok; })}
                 alCerrar={() => setBorrar(false)} />
    </details>
  );
}

// ----------------------------------------------------------------------------- integraciones (todas gratuitas)

function Integraciones() {
  const { fuente } = usePanel();
  const cfg = useCarga(() => fuente.configuracion(), [fuente]);
  return (
    <>
      <div className="tarjeta">
        <h2>Canales de atención a los titulares (16.5)</h2>
        <p className="suave">Aparecen en las páginas públicas «Mis datos», «Política de datos» y en la verificación del carnet.</p>
        <Estado carga={cfg}>
          {(lista) => (
            <div className="tabla-envoltura">
              <table><tbody>
                {["canal_titulares_correo", "canal_titulares_whatsapp", "responsable_tratamiento"].map((k) => {
                  const v = lista.find((x) => x.clave === k);
                  return v ? <FilaValor key={k} v={v} recargar={cfg.recargar} /> : null;
                })}
              </tbody></table>
            </div>
          )}
        </Estado>
      </div>
      <div className="tarjeta">
        <h2>Servicios que usa el sistema</h2>
        <p className="suave">Regla de costo cero: solo servicios gratuitos y de código abierto (docs/Analisis-Costo-Cero.md).</p>
        <ul>
          <li><strong>Base de datos, cuentas y archivos:</strong> Supabase, plan gratuito. El uso frente a los límites se ve en «Salud del sistema».</li>
          <li><strong>Mapas:</strong> OpenStreetMap recortado a Pijao (Protomaps), dentro de la app y sin conexión. Sin claves ni cobros.</li>
          <li><strong>Verificación en dos pasos:</strong> aplicación autenticadora (TOTP). Sin SMS.</li>
          <li><strong>Mensajes a ciudadanos (SMS, WhatsApp, correo masivo):</strong> no conectados, porque todos cobran. Los contactos se hacen a mano desde el teléfono del colaborador, con autorización.</li>
          <li><strong>Páginas públicas y este panel:</strong> GitHub Pages, gratis.</li>
          <li><strong>Respaldos:</strong> script propio en el computador del Administrador (tools/respaldo.ps1), cifrado.</li>
        </ul>
      </div>
    </>
  );
}
