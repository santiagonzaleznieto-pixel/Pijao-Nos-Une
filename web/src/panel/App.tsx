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
import { Salud } from "./paginas/Salud";
import { Titulares } from "./paginas/Titulares";
import { ContextoPanel, esAdmin, useCarga } from "./ui";

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
    ...(esAdmin(perfil) ? [["configuracion", "Configuración"], ["salud", "Salud del sistema"]] as [string, string][] : []),
  ];

  let vista;
  switch (pagina) {
    case "colaboradores": vista = <Colaboradores />; break;
    case "colaborador": vista = <FichaColaborador id={param ?? ""} />; break;
    case "titulares": vista = <Titulares />; break;
    case "auditoria": vista = <Auditoria />; break;
    case "mapa": vista = <Suspense fallback={<p className="suave">Cargando el mapa…</p>}><Mapa /></Suspense>; break;
    case "configuracion": vista = <Configuracion pestanaInicial={param} />; break;
    case "salud": vista = <Salud />; break;
    default: vista = <Inicio resumen={resumen} />;
  }

  return (
    <ContextoPanel.Provider value={contexto}>
      {fuente.modo === "demo" && <div className="franja-demo">Demostración con datos de ejemplo: nada se guarda en el servidor.</div>}
      <div className="marco">
        <nav className="lateral" aria-label="Secciones">
          <a className="marca" href="#/inicio">Pijao <span>Nos Une</span></a>
          {menu.map(([ruta, texto, n]) => (
            <a key={ruta} className="nav" href={`#/${ruta}`} aria-current={pagina === ruta || (ruta === "colaboradores" && pagina === "colaborador") ? "page" : undefined}>
              {texto}{n ? <span className="insignia-num" aria-label={`${n} pendientes`}>{n}</span> : null}
            </a>
          ))}
          <div className="quien">
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
