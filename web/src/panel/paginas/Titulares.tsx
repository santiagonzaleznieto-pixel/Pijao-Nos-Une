// P-35 en el panel: casos de los titulares (app, formulario «Mis datos», correo, WhatsApp…) con número de caso,
// plazos y respuesta. El Director confirma aquí la supresión completa (16.5).
import { useMemo, useState } from "react";
import { CANAL_SOLICITUD, ESTADO_SOLICITUD, tituloSolicitud } from "../../logica/textos";
import { diaMas, fecha, fechaHora } from "../../logica/utiles";
import type { Solicitud } from "../datos/tipos";
import { Aviso, Chip, Encabezado, Estado, Pestanas, useAccion, useCarga, usePanel } from "../ui";

const abierta = (s: Solicitud) => s.estado === "recibida" || s.estado === "en_proceso";
const numeroCaso = (id: string) => id.replace(/-/g, "").slice(0, 8).toUpperCase();

function nivelPlazo(s: Solicitud): ["ok" | "alerta" | "critico" | "neutro", string] {
  if (!abierta(s)) return ["neutro", ESTADO_SOLICITUD[s.estado] ?? s.estado];
  const hoy = diaMas(0);
  if (s.plazo_legal && s.plazo_legal < hoy) return ["critico", "Plazo legal vencido"];
  if (s.plazo_interno && s.plazo_interno < hoy) return ["critico", "Plazo interno vencido"];
  if (s.plazo_interno && s.plazo_interno <= diaMas(2)) return ["alerta", `Vence el ${fecha(s.plazo_interno)}`];
  return ["ok", `Vence el ${fecha(s.plazo_interno)}`];
}

export function Titulares() {
  const { fuente } = usePanel();
  const casos = useCarga(() => fuente.solicitudes(), [fuente]);
  const [filtro, setFiltro] = useState<"abiertas" | "cerradas">("abiertas");
  return (
    <>
      <Encabezado titulo="Derechos de los titulares" />
      <p className="suave">Cada caso tiene número. «No contactar» se aplica apenas se registra; responda dentro del plazo interno de 5 días hábiles. Los plazos de la ley (10 y 15 días hábiles) los confirma el abogado.</p>
      <Pestanas opciones={[["abiertas", "Abiertas"], ["cerradas", "Cerradas"]] as const} valor={filtro} cambiar={setFiltro} />
      <Estado carga={casos}>
        {(lista) => <Lista lista={lista.filter((s) => (filtro === "abiertas") === abierta(s))} recargar={casos.recargar} />}
      </Estado>
    </>
  );
}

function Lista({ lista, recargar }: { lista: Solicitud[]; recargar: () => void }) {
  const ordenada = useMemo(() => [...lista].sort((a, b) => (a.plazo_interno ?? "9").localeCompare(b.plazo_interno ?? "9")), [lista]);
  if (!ordenada.length) return <p className="suave">No hay casos en esta lista.</p>;
  return <>{ordenada.map((s) => <Caso key={s.id} s={s} recargar={recargar} />)}</>;
}

function Caso({ s, recargar }: { s: Solicitud; recargar: () => void }) {
  const { fuente } = usePanel();
  const accion = useAccion();
  const [respuesta, setRespuesta] = useState(s.respuesta ?? "");
  const [nivel, texto] = nivelPlazo(s);
  const responder = (estado: string, exito: string) =>
    void accion.ejecutar(() => fuente.resolverSolicitud(s.id, estado, respuesta.trim()), exito).then((ok) => ok && recargar());

  return (
    <details className="tarjeta" open={abierta(s) && nivel === "critico"}>
      <summary style={{ cursor: "pointer", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <strong className="mono">#{numeroCaso(s.id)}</strong>
        <span>{tituloSolicitud(s.tipo)}</span>
        <Chip nivel={nivel}>{texto}</Chip>
        <span className="suave pequeno">{CANAL_SOLICITUD[s.canal ?? ""] ?? s.canal} · {fecha(s.recibido_en)}</span>
      </summary>
      <dl className="dato" style={{ marginTop: 12 }}>
        <dt>Quién lo pide</dt><dd>{s.nombre_solicitante ?? "—"}</dd>
        <dt>Contacto para responder</dt><dd>{s.contacto ?? "—"}</dd>
        <dt>Detalle</dt><dd style={{ whiteSpace: "pre-wrap" }}>{s.detalle ?? "—"}</dd>
        <dt>Plazo interno · legal</dt><dd>{fecha(s.plazo_interno)} · {fecha(s.plazo_legal)}</dd>
        <dt>Persona en la base</dt><dd>{s.persona_id ? "Vinculada (se registró desde su ficha en la app)" : "Sin vincular"}</dd>
        {s.resuelta_en && <><dt>Respondido</dt><dd>{fechaHora(s.resuelta_en)}</dd></>}
      </dl>
      {!s.persona_id && abierta(s) && (s.tipo === "supresion" || s.tipo === "revocatoria") && (
        <Aviso tipo="alerta">
          Este caso llegó sin vínculo con una persona. Antes de cerrarlo: confirme la identidad por el contacto, busque a la persona en la app
          (Buscar) y registre allí «{s.tipo === "supresion" ? "Borrar mis datos" : "No contactar"}» desde su ficha. Luego responda aquí.
        </Aviso>
      )}
      {s.persona_id && abierta(s) && s.tipo === "supresion" && (
        <Aviso tipo="alerta">Al marcar «En proceso» o «Resuelta», se aplica la supresión completa: la persona se oculta y se revocan todas sus autorizaciones.</Aviso>
      )}
      {abierta(s) ? (
        <>
          <label htmlFor={`resp-${s.id}`}>Respuesta o acta (queda guardada con el caso)</label>
          <textarea id={`resp-${s.id}`} value={respuesta} onChange={(e) => setRespuesta(e.target.value)} maxLength={4000}
                    placeholder="Qué se hizo, cuándo y por qué medio se le respondió a la persona." />
          <div className="acciones" style={{ marginTop: 8 }}>
            {s.estado === "recibida" && <button type="button" className="boton secundario" disabled={accion.ocupado} onClick={() => responder("en_proceso", "Caso en proceso.")}>Marcar en proceso</button>}
            <button type="button" className="boton" disabled={accion.ocupado || respuesta.trim().length < 5} onClick={() => responder("resuelta", "Caso resuelto.")}>Resolver</button>
            <button type="button" className="boton secundario" disabled={accion.ocupado || respuesta.trim().length < 5} onClick={() => responder("rechazada", "Caso cerrado sin trámite.")}>Cerrar sin trámite</button>
          </div>
        </>
      ) : s.respuesta && <p style={{ whiteSpace: "pre-wrap" }}><strong>Respuesta:</strong> {s.respuesta}</p>}
      {accion.error && <Aviso tipo="error">{accion.error}</Aviso>}
    </details>
  );
}
