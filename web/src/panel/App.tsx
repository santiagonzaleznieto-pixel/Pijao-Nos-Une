// Armazón del panel: sesión, menú, rutas (#/…) y cierre por inactividad.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FuenteDemo } from "./datos/demo";
import { FuenteSupabase } from "./datos/supabase";
import type { Fuente, PerfilPanel, Rol, Sesion } from "./datos/tipos";
import { Entrar } from "./Entrar";
import { Auditoria } from "./paginas/Auditoria";
import { Colaboradores } from "./paginas/Colaboradores";
import { Configuracion } from "./paginas/Configuracion";
import { FichaColaborador } from "./paginas/FichaColaborador";
import { Inicio } from "./paginas/Inicio";
import { Piloto } from "./paginas/Piloto";
import { Salud } from "./paginas/Salud";
import { Titulares } from "./paginas/Titulares";
import { Vivienda } from "./paginas/Vivienda";
import { ContextoPanel, esAdmin, useCarga } from "./ui";

// Íconos de línea del sistema de diseño (los mismos de la app), para el menú.
const ICONOS: Record<string, string> = {
  inicio: "M3 11l9-7 9 7 M5 10v10h14V10",
  colaboradores: "M9 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z M2 20a7 7 0 0 1 14 0 M16 4.5a3.5 3.5 0 0 1 0 7 M18 14a6 6 0 0 1 4 6",
  titulares: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  auditoria: "M9 6h12 M9 12h12 M9 18h12 M4 6h.01 M4 12h.01 M4 18h.01",
  mapa: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z M9 4v14 M15 6v14",
  piloto: "M4 19V9 M10 19V5 M16 19v-7 M22 19H2",
  configuracion: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  salud: "M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z",
};
function IconoMenu({ ruta }: { ruta: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(ICONOS[ruta] ?? ICONOS.inicio).split(" M").map((d, i) => <path key={i} d={i ? `M${d}` : d} />)}
    </svg>
  );
}
const iniciales = (n: string) => n.replace(/[^\p{L}\s]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");

// El mapa (MapLibre) pesa: se descarga solo cuando se abre esa sección.
const Mapa = lazy(() => import("./paginas/Mapa"));

function useRuta(): [string, string | undefined] {
  const leer = () => location.hash.replace(/^#\/?/, "").split("/");
  const [partes, setPartes] = useState(leer);
  useEffect(() => {
    const f = () => { setPartes(leer()); window.scrollTo(0, 0); };
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  return [partes[0] || "inicio", partes[1] ? decodeURIComponent(partes[1]) : undefined];
}

export function App() {
  const [fuente, setFuente] = useState<Fuente>(() => new FuenteSupabase());
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    fuente.estado().then(setSesion, (e: Error) => { setAviso(e.message); setSesion({ fase: "fuera" }); });
  }, [fuente]);

  const usarDemo = async (rol: Rol) => {
    const d = new FuenteDemo(rol);
    await d.entrar();
    setSesion(await d.verificarCodigo("000000"));
    setFuente(d);
  };
  const salir = useCallback(async (motivo?: string) => {
    await fuente.salir();
    if (fuente.modo === "demo") setFuente(new FuenteSupabase());
    setAviso(motivo ?? null);
    setSesion({ fase: "fuera" });
    location.hash = "";
  }, [fuente]);

  if (!sesion) return <p className="contenedor suave">Cargando…</p>;
  if (sesion.fase !== "dentro") {
    return <Entrar fuente={fuente} sesion={sesion} cambiar={(s) => { setAviso(null); setSesion(s); }} usarDemo={usarDemo} aviso={aviso} />;
  }
  return <Marco fuente={fuente} perfil={sesion.perfil} inactividadMin={sesion.inactividadMin} salir={salir} />;
}

function Marco({ fuente, perfil, inactividadMin, salir }: {
  fuente: Fuente; perfil: PerfilPanel; inactividadMin: number; salir: (motivo?: string) => Promise<void>;
}) {
  const [pagina, param] = useRuta();
  const [toast, setToast] = useState<string | null>(null);
  const reloj = useRef<number | undefined>(undefined);
  const avisar = useCallback((t: string) => {
    setToast(t);
    window.clearTimeout(reloj.current);
    reloj.current = window.setTimeout(() => setToast(null), 4000);
  }, []);
  const contexto = useMemo(() => ({ fuente, perfil, avisar }), [fuente, perfil, avisar]);
  const resumen = useCarga(() => fuente.resumen(), [fuente, pagina]);

  // Cierre de sesión por inactividad (configurable en P-42): protege un computador que se queda abierto.
  useEffect(() => {
    let t: number | undefined;
    const reiniciar = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => void salir(`Se cerró la sesión después de ${inactividadMin} minutos sin uso.`), inactividadMin * 60000);
    };
    const eventos = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    eventos.forEach((e) => addEventListener(e, reiniciar, { passive: true }));
    reiniciar();
    return () => { window.clearTimeout(t); eventos.forEach((e) => removeEventListener(e, reiniciar)); };
  }, [inactividadMin, salir]);

  const r = resumen.datos;
  const menu: [string, string, number?][] = [
    ["inicio", "Inicio"],
    ["colaboradores", "Colaboradores", r?.pendientes],
    ["titulares", "Derechos de titulares", r?.titularesPendientes],
    ["auditoria", "Auditoría"],
    ["mapa", "Mapa del avance"],
    ["piloto", "Métricas del piloto"],
    ...(esAdmin(perfil) ? [["configuracion", "Configuración"], ["salud", "Salud del sistema"]] as [string, string][] : []),
  ];

  let vista;
  let vivienda = false;
  switch (pagina) {
    case "colaboradores": vista = <Colaboradores />; break;
    case "colaborador": vista = <FichaColaborador id={param ?? ""} />; break;
    case "titulares": vista = <Titulares />; break;
    case "auditoria": vista = <Auditoria />; break;
    case "mapa": vista = <Suspense fallback={<p className="suave">Cargando el mapa…</p>}><Mapa /></Suspense>; break;
    case "vivienda": vivienda = true; vista = <Vivienda id={param ?? ""} />; break;
    case "configuracion": vista = <Configuracion pestanaInicial={param} />; break;
    case "salud": vista = <Salud />; break;
    case "piloto": vista = <Piloto />; break;
    default: vista = <Inicio resumen={resumen} />;
  }

  return (
    <ContextoPanel.Provider value={contexto}>
      {fuente.modo === "demo" && <div className="franja-demo">Demostración con datos de ejemplo: nada se guarda en el servidor.</div>}
      <div className="marco">
        <nav className="lateral" aria-label="Secciones">
          <a className="marca" href="#/inicio" aria-label="Pijao Nos Une, inicio del panel">
            <span className="linea-marca">PIJAO</span><span className="nos">NOS</span><span className="linea-marca">UNE</span>
            <small>Panel del equipo</small>
          </a>
          {menu.map(([ruta, texto, n]) => (
            <a key={ruta} className="nav" href={`#/${ruta}`} aria-current={pagina === ruta || (ruta === "colaboradores" && pagina === "colaborador") || (ruta === "mapa" && vivienda) ? "page" : undefined}>
              <IconoMenu ruta={ruta} /><span className="txt">{texto}</span>{n ? <span className="insignia-num" aria-label={`${n} pendientes`}>{n}</span> : null}
            </a>
          ))}
          <div className="quien">
            <span className="avatar" aria-hidden="true">{iniciales(perfil.nombre)}</span>
            <div><strong>{perfil.nombre}</strong><br />{perfil.rol === "admin" ? "Administrador" : "Director"}</div>
            <button type="button" className="boton secundario chico" onClick={() => void salir()}>Cerrar sesión</button>
          </div>
        </nav>
        <main className="contenido">{vista}</main>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </ContextoPanel.Provider>
  );
}
