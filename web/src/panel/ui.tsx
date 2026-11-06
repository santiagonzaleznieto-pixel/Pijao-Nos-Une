// Componentes comunes del panel y estados de cada pantalla (cargando, vacío, error y sin permiso, regla 1.13).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Fuente, PerfilPanel } from "./datos/tipos";

// ----------------------------------------------------------------------------- contexto

export interface Contexto { fuente: Fuente; perfil: PerfilPanel; avisar: (texto: string) => void }
export const ContextoPanel = createContext<Contexto | null>(null);
export function usePanel(): Contexto {
  const c = useContext(ContextoPanel);
  if (!c) throw new Error("Falta ContextoPanel");
  return c;
}
export const esAdmin = (p: PerfilPanel) => p.rol === "admin";

// ----------------------------------------------------------------------------- carga de datos

export interface Carga<T> { datos: T | null; error: string | null; cargando: boolean; recargar: () => void }

/** Carga datos asíncronos con estado de error y recarga. `deps` vuelve a cargar cuando cambian. */
export function useCarga<T>(f: () => Promise<T>, deps: unknown[] = []): Carga<T> {
  const [estado, setEstado] = useState<{ datos: T | null; error: string | null; cargando: boolean }>({ datos: null, error: null, cargando: true });
  const [vuelta, setVuelta] = useState(0);
  useEffect(() => {
    let vivo = true;
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    f().then(
      (datos) => vivo && setEstado({ datos, error: null, cargando: false }),
      (e: Error) => vivo && setEstado({ datos: null, error: e.message, cargando: false }),
    );
    return () => { vivo = false; };
  }, [vuelta, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...estado, recargar: useCallback(() => setVuelta((v) => v + 1), []) };
}

/** Ejecuta una acción con estado «ocupado» y error; avisa al terminar. */
export function useAccion() {
  const { avisar } = usePanel();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ejecutar = useCallback(async (f: () => Promise<unknown>, exito?: string): Promise<boolean> => {
    setOcupado(true);
    setError(null);
    try {
      await f();
      if (exito) avisar(exito);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setOcupado(false);
    }
  }, [avisar]);
  return { ocupado, error, setError, ejecutar };
}

// ----------------------------------------------------------------------------- piezas

export function Estado<T>({ carga, vacio, children }: { carga: Carga<T>; vacio?: (d: T) => boolean; children: (d: T) => ReactNode }) {
  if (carga.cargando && !carga.datos) return <p className="suave" role="status">Cargando…</p>;
  if (carga.error) return (
    <div className="aviso error" role="alert">
      <p>{carga.error}</p>
      <button className="boton secundario chico" type="button" onClick={carga.recargar}>Intentar de nuevo</button>
    </div>
  );
  if (!carga.datos) return null;
  if (vacio?.(carga.datos)) return <p className="suave">No hay nada que mostrar todavía.</p>;
  return <>{children(carga.datos)}</>;
}

export function Aviso({ tipo, children }: { tipo: "ok" | "error" | "alerta"; children: ReactNode }) {
  return <div className={`aviso ${tipo}`} role={tipo === "error" ? "alert" : "status"}>{children}</div>;
}

export function SinPermiso({ texto = "Esta sección es solo para el Administrador." }: { texto?: string }) {
  return <Aviso tipo="alerta">{texto}</Aviso>;
}

export function Chip({ nivel, children }: { nivel: "ok" | "alerta" | "critico" | "neutro"; children: ReactNode }) {
  return <span className={`chip ${nivel}`}>{children}</span>;
}

export function Encabezado({ titulo, children }: { titulo: string; children?: ReactNode }) {
  useEffect(() => { document.title = `${titulo} · Panel Pijao Nos Une`; }, [titulo]);
  return <header><h1>{titulo}</h1>{children && <div className="acciones">{children}</div>}</header>;
}

export function Pestanas<T extends string>({ opciones, valor, cambiar }: { opciones: readonly (readonly [T, string])[]; valor: T; cambiar: (v: T) => void }) {
  return (
    <div className="pestanas" role="tablist">
      {opciones.map(([v, t]) => (
        <button key={v} type="button" role="tab" aria-selected={v === valor} onClick={() => cambiar(v)}>{t}</button>
      ))}
    </div>
  );
}

export function Interruptor({ marcado, cambiar, etiqueta, deshabilitado }: { marcado: boolean; cambiar: (v: boolean) => void; etiqueta: string; deshabilitado?: boolean }) {
  return (
    <span className="interruptor">
      <input type="checkbox" role="switch" checked={marcado} disabled={deshabilitado} aria-label={etiqueta} onChange={(e) => cambiar(e.target.checked)} />
      <span aria-hidden="true" />
    </span>
  );
}

/** Diálogo para confirmar una acción; si `pideMotivo`, la acción no se envía sin motivo. */
export function Confirmar({ abierto, titulo, texto, pideMotivo, textoBoton = "Confirmar", peligro, alConfirmar, alCerrar }: {
  abierto: boolean; titulo: string; texto?: ReactNode; pideMotivo?: string; textoBoton?: string; peligro?: boolean;
  alConfirmar: (motivo: string) => Promise<boolean>; alCerrar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) { setMotivo(""); d.showModal(); }
    if (!abierto && d.open) d.close();
  }, [abierto]);
  const enviar = async () => {
    setOcupado(true);
    const ok = await alConfirmar(motivo.trim());
    setOcupado(false);
    if (ok) alCerrar();
  };
  return (
    <dialog ref={ref} onClose={alCerrar} aria-labelledby="titulo-dialogo">
      <h2 id="titulo-dialogo" style={{ marginTop: 0 }}>{titulo}</h2>
      {texto && <div>{texto}</div>}
      {pideMotivo && (
        <>
          <label htmlFor="motivo-dialogo">{pideMotivo}</label>
          <textarea id="motivo-dialogo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} />
        </>
      )}
      <div className="acciones" style={{ marginTop: 16, justifyContent: "flex-end" }}>
        <button type="button" className="boton secundario" onClick={alCerrar}>Cancelar</button>
        <button type="button" className={`boton${peligro ? " peligro" : ""}`} disabled={ocupado || (!!pideMotivo && motivo.trim().length < 3)} onClick={enviar}>
          {ocupado ? "Un momento…" : textoBoton}
        </button>
      </div>
    </dialog>
  );
}

/** Descarga un archivo generado en el navegador (no pasa por ningún servidor). */
export function descargar(nombre: string, contenido: string, tipo = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
