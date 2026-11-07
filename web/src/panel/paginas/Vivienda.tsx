// P-10 ficha rápida (al hacer clic en una casa del mapa) y P-13 detalle completo de la vivienda en el panel.
// Usa la misma ficha del núcleo que la app (@nucleo/ficha). Las personas se ven enmascaradas (personas_v): nunca la
// cédula, el teléfono completo ni la simpatía.
import { useMemo } from "react";
import { fichaCompleta, resumenCasa } from "@nucleo/ficha";
import type { CasaPanel } from "../datos/tipos";
import { Aviso, Chip, Encabezado, Estado, useCarga, usePanel } from "../ui";

const NIVEL_ESTADO: Record<string, "ok" | "alerta" | "critico" | "neutro"> = {
  visitada_conversacion: "ok", visitada_sin_contacto: "alerta", requiere_seguimiento: "alerta", no_contactar: "critico",
};

function Foto({ url, alto, texto = "Sin foto" }: { url: string | null | undefined; alto: number; texto?: string }) {
  return url
    ? <img src={url} alt="Foto de la fachada" style={{ width: "100%", height: alto, objectFit: "cover", borderRadius: 8, background: "var(--borde)", display: "block" }} />
    : <div style={{ height: alto, borderRadius: 8, background: "var(--fondo)", border: "1px solid var(--borde)", display: "grid", placeItems: "center" }} className="suave pequeno">{texto}</div>;
}

/** Vista rápida que aparece sobre el mapa al hacer clic en una casa. */
export function FichaRapida({ id, cerrar }: { id: string; cerrar: () => void }) {
  const { fuente } = usePanel();
  const casa = useCarga(() => fuente.casa(id), [fuente, id]);
  return (
    <div className="tarjeta ficha-rapida" role="dialog" aria-label="Ficha rápida de la vivienda">
      <button type="button" className="cerrar-ficha" aria-label="Cerrar" onClick={cerrar}>×</button>
      <Estado carga={casa}>
        {(c) => {
          if (!c) return <p className="suave">No encontramos esta vivienda.</p>;
          const r = resumenCasa(c.datos);
          const fachada = c.fotos.find((f) => f.tipo === "fachada") ?? null;
          return (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: 12, alignItems: "start" }}>
                <Foto url={fachada?.url} alto={96} />
                <div>
                  <h3 style={{ margin: "0 0 4px", paddingRight: 24 }}>{r.titulo}</h3>
                  <Chip nivel={NIVEL_ESTADO[r.estadoClave] ?? "neutro"}>{r.estado}</Chip>
                  {r.lugar && <div className="suave pequeno" style={{ marginTop: 4 }}>{r.lugar}</div>}
                </div>
              </div>
              {r.noContactar && <Aviso tipo="error">No volver: la familia pidió no ser contactada.</Aviso>}
              <dl className="dato" style={{ gridTemplateColumns: "130px 1fr", margin: "12px 0", fontSize: "0.95rem" }}>
                <dt>Cabeza de familia</dt><dd>{r.cabeza ?? "sin registrar"}</dd>
                <dt>Personas</dt>
                <dd>{r.personas.length
                  ? r.personas.slice(0, 3).map((p) => p.nombre).join(", ") + (r.totalPersonas > 3 ? ` y ${r.totalPersonas - 3} más` : "")
                  : r.totalPersonas ? `${r.totalPersonas} (sin nombres)` : "sin registrar"}</dd>
                <dt>Última visita</dt><dd>{r.ultimaVisita ?? "ninguna todavía"}</dd>
                {r.necesidades.length > 0 && <><dt>Necesidades</dt><dd>{r.necesidades.join(", ")}</dd></>}
              </dl>
              <a className="boton bloque" href={`#/vivienda/${encodeURIComponent(id)}`}>Ver detalles de la casa</a>
            </>
          );
        }}
      </Estado>
    </div>
  );
}

/** Página con toda la información de la casa. */
export function Vivienda({ id }: { id: string }) {
  const { fuente } = usePanel();
  const casa = useCarga(() => fuente.casa(id), [fuente, id]);
  return (
    <>
      <p><a href="#/mapa">← Mapa del avance</a></p>
      <Estado carga={casa}>
        {(c) => (c ? <Detalle c={c} /> : <><Encabezado titulo="Vivienda" /><Aviso tipo="alerta">No encontramos esta vivienda.</Aviso></>)}
      </Estado>
    </>
  );
}

function Detalle({ c }: { c: CasaPanel }) {
  const r = useMemo(() => resumenCasa(c.datos), [c]);
  const secciones = useMemo(() => fichaCompleta(c.datos), [c]);
  const v = c.datos.vivienda;
  const fachada = c.fotos.find((f) => f.tipo === "fachada") ?? null;
  const otras = c.fotos.filter((f) => f !== fachada);
  return (
    <>
      <Encabezado titulo={r.titulo}>
        <Chip nivel={NIVEL_ESTADO[r.estadoClave] ?? "neutro"}>{r.estado}</Chip>
        {typeof v.lat === "number" && typeof v.lng === "number" && (
          <a className="boton secundario chico" target="_blank" rel="noopener noreferrer"
             href={`https://www.openstreetmap.org/?mlat=${v.lat}&mlon=${v.lng}#map=18/${v.lat}/${v.lng}`}>Ver en OpenStreetMap</a>
        )}
      </Encabezado>
      {r.noContactar && <Aviso tipo="error">No volver: la familia pidió no ser contactada (R-21).</Aviso>}
      <div className="casa-cabecera">
        <div><Foto url={fachada?.url} alto={260} texto={c.datos.fotos.length ? "Foto no disponible" : "Sin foto de fachada"} /></div>
        <div className="tarjeta" style={{ margin: 0 }}>
          <dl className="dato" style={{ gridTemplateColumns: "150px 1fr" }}>
            <dt>Lugar</dt><dd>{r.lugar || "—"}</dd>
            <dt>Cabeza de familia</dt><dd>{r.cabeza ?? "sin registrar"}</dd>
            <dt>Personas</dt><dd>{r.totalPersonas || "sin registrar"}</dd>
            <dt>Última visita</dt><dd>{r.ultimaVisita ?? "ninguna todavía"}</dd>
            <dt>Necesidades</dt><dd>{r.necesidades.join(", ") || "—"}</dd>
            <dt>Calidad</dt><dd>{r.calidad ?? "—"}</dd>
          </dl>
        </div>
      </div>
      {otras.length > 0 && (
        <div className="cuadricula" style={{ marginTop: 12 }}>
          {otras.map((f) => <figure key={f.id} style={{ margin: 0 }}><Foto url={f.url} alto={140} /><figcaption className="suave pequeno">{f.tipo === "problema" ? "Problema" : "Entorno"}</figcaption></figure>)}
        </div>
      )}
      <div className="secciones-casa">
        {secciones.map((s) => (
          <section key={s.titulo} className="tarjeta">
            <h2>{s.titulo}</h2>
            {s.datos.length
              ? <dl className="dato">{s.datos.map((d, i) => <FilaDato key={i} etiqueta={d.etiqueta} valor={d.valor} />)}</dl>
              : <p className="suave">No se registraron datos.</p>}
          </section>
        ))}
      </div>
      <p className="suave pequeno">Los datos personales se ven enmascarados. Para ver los datos completos se necesita el permiso O-01 en la app, y cada acceso queda en la auditoría.</p>
    </>
  );
}

function FilaDato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return <><dt>{etiqueta}</dt><dd>{valor}</dd></>;
}
