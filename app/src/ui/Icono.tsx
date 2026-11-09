// Íconos de línea del sistema de diseño (cuadrícula de 24, trazo de 2 px, puntas redondeadas). Son los mismos del lienzo
// de pantallas (diseno/pantallas/pantallas.css). Decorativos por defecto: el texto o el aria-label dicen qué hacen.
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { opciones } from "@/core/catalogos";
import { color as tema } from "./tema";

const P = (d: string) => ({ t: "p" as const, d });
type Pieza = { t: "p"; d: string } | { t: "c"; cx: number; cy: number; r: number } | { t: "r"; x: number; y: number; w: number; h: number; rx: number };

const ICONOS: Record<string, Pieza[]> = {
  casa: [P("M3 11l9-7 9 7"), P("M5 10v10h14V10")],
  mapa: [P("M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"), P("M9 4v14"), P("M15 6v14")],
  mas: [P("M12 5v14"), P("M5 12h14")],
  tareas: [P("M9 11l3 3 8-8"), P("M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11")],
  menu: [P("M4 6h16"), P("M4 12h16"), P("M4 18h16")],
  ocultar: [P("M3 3l18 18"), P("M10.6 10.6a2 2 0 0 0 2.8 2.8"), P("M9.9 5.1A10 10 0 0 1 12 5c5 0 9 4.5 10 7a13 13 0 0 1-3.2 4.2"), P("M6.1 6.1A13 13 0 0 0 2 12c1 2.5 5 7 10 7a9.6 9.6 0 0 0 4.2-1")],
  pin: [P("M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"), { t: "c", cx: 12, cy: 9.5, r: 2.5 }],
  derecha: [P("M9 6l6 6-6 6")],
  check: [P("M5 12l4 4 10-10")],
  exclama: [P("M12 7v6"), P("M12 17h.01")],
  equis: [P("M7 7l10 10"), P("M17 7L7 17")],
  info: [{ t: "c", cx: 12, cy: 12, r: 10 }, P("M12 16v-4"), P("M12 8h.01")],
  alerta: [P("M12 3l9.5 17h-19z"), P("M12 10v4"), P("M12 17h.01")],
  subir: [P("M12 19V5"), P("M6 11l6-6 6 6")],
  barras: [P("M4 19V9"), P("M10 19V5"), P("M16 19v-7"), P("M22 19H2")],
  libro: [P("M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z"), P("M8 7h7"), P("M8 11h7")],
  candado: [{ t: "r", x: 5, y: 11, w: 14, h: 10, rx: 2 }, P("M8 11V7a4 4 0 0 1 8 0v4")],
  sinsenal: [P("M2 8.8a15 15 0 0 1 4.2-2.6"), P("M10.7 5.1A15 15 0 0 1 22 8.8"), P("M8.5 16.4a5 5 0 0 1 7 0"), P("M12 20h.01"), P("M3 3l18 18")],
  atras: [P("M15 6l-6 6 6 6")],
  abajo: [P("M6 9l6 6 6-6")],
  arriba: [P("M6 15l6-6 6 6")],
  buscar: [{ t: "c", cx: 11, cy: 11, r: 7 }, P("M20 20l-3.5-3.5")],
  camara: [P("M4 8h3l2-3h6l2 3h3v11H4z"), { t: "c", cx: 12, cy: 13, r: 3.5 }],
  calendario: [{ t: "r", x: 3, y: 5, w: 18, h: 16, rx: 2 }, P("M3 10h18"), P("M8 3v4"), P("M16 3v4")],
  personas: [{ t: "c", cx: 9, cy: 8, r: 3.5 }, P("M2 20a7 7 0 0 1 14 0"), P("M16 4.5a3.5 3.5 0 0 1 0 7"), P("M18 14a6 6 0 0 1 4 6")],
  persona: [{ t: "c", cx: 12, cy: 8, r: 4 }, P("M4 21a8 8 0 0 1 16 0")],
  documento: [P("M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"), P("M14 3v6h6"), P("M8 13h8"), P("M8 17h5")],
  mensaje: [P("M4 5h16v11H9l-5 4z")],
  megafono: [P("M3 10v4h4l7 5V5L7 10z"), P("M18 8a5 5 0 0 1 0 8")],
  escudo: [P("M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z")],
  reloj: [{ t: "c", cx: 12, cy: 12, r: 9 }, P("M12 7v5l3 2")],
  qr: [{ t: "r", x: 3, y: 3, w: 7, h: 7, rx: 1 }, { t: "r", x: 14, y: 3, w: 7, h: 7, rx: 1 }, { t: "r", x: 3, y: 14, w: 7, h: 7, rx: 1 }, P("M14 14h3v3h-3z"), P("M20 14v.01"), P("M20 20h-3"), P("M14 20v.01")],
  ayuda: [{ t: "c", cx: 12, cy: 12, r: 10 }, P("M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4"), P("M12 17h.01")],
  play: [P("M7 4l13 8-13 8z")],
  ojo: [P("M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"), { t: "c", cx: 12, cy: 12, r: 3 }],
  llave: [{ t: "c", cx: 8, cy: 15, r: 4 }, P("M11 12l9-9"), P("M17 6l3 3")],
  estrella: [P("M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z")],
  bandera: [P("M5 21V4"), P("M5 4h12l-2 4 2 4H5")],
  mano: [P("M8 13V5a1.5 1.5 0 0 1 3 0v6"), P("M11 11V4a1.5 1.5 0 0 1 3 0v7"), P("M14 11V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.6-1.5L8 15")],
  salir: [P("M15 4h4v16h-4"), P("M10 8l-4 4 4 4"), P("M6 12h10")],
  telefono: [{ t: "r", x: 6, y: 2, w: 12, h: 20, rx: 2.5 }, P("M10 18h4")],
  llamar: [P("M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2")],
  nube: [P("M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.6 1.5A3.8 3.8 0 0 1 17.5 18z")],
  lista: [P("M9 6h12"), P("M9 12h12"), P("M9 18h12"), P("M4 6h.01"), P("M4 12h.01"), P("M4 18h.01")],
  enviar: [P("M22 2L11 13"), P("M22 2l-7 20-4-9-9-4z")],
  huella: [P("M12 11c0 3-1 6-3 8"), P("M8 4.5A8 8 0 0 1 20 11c0 2-.3 4-1 6"), P("M4 8a8 8 0 0 0-1 4c0 1.5.2 3 .7 4.3"), P("M8 11a4 4 0 0 1 8 0c0 3-.6 5.6-1.8 8")],
  basura: [P("M4 7h16"), P("M9 7V4h6v3"), P("M6 7l1 13h10l1-13")],
  capas: [P("M12 3l9 5-9 5-9-5z"), P("M3 13l9 5 9-5")],
  ubicacion: [{ t: "c", cx: 12, cy: 12, r: 4 }, P("M12 2v3"), P("M12 19v3"), P("M2 12h3"), P("M19 12h3")],
  ruta: [{ t: "c", cx: 6, cy: 19, r: 2 }, { t: "c", cx: 18, cy: 5, r: 2 }, P("M8 19h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7")],
  editar: [P("M4 20h4L19 9l-4-4L4 16z"), P("M14 6l4 4")],
  refrescar: [P("M20 11a8 8 0 1 0-2.3 5.7"), P("M20 5v6h-6")],
  sol: [{ t: "c", cx: 12, cy: 12, r: 4 }, P("M12 2v2"), P("M12 20v2"), P("M4.9 4.9l1.4 1.4"), P("M17.7 17.7l1.4 1.4"), P("M2 12h2"), P("M20 12h2"), P("M4.9 19.1l1.4-1.4"), P("M17.7 6.3l1.4-1.4")],
  luna: [P("M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z")],
  letra: [P("M4 19l5-14 5 14"), P("M6 14h6"), P("M15 19l3-8 3 8"), P("M16 16.5h4")],
  // 14 ejes del programa (C-08), con los símbolos del logo: café, montaña, río, vía, casa, libro, salud…
  ejeVias: [P("M8 21L11 3"), P("M16 21L13 3"), P("M12 7v2"), P("M12 13v2"), P("M12 19v1")],
  ejeAgua: [P("M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z")],
  ejeEmpleo: [{ t: "r", x: 3, y: 7, w: 18, h: 13, rx: 2 }, P("M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"), P("M3 13h18")],
  ejeSalud: [P("M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"), P("M12 10v5"), P("M9.5 12.5h5")],
  ejeEducacion: [P("M2 9l10-5 10 5-10 5z"), P("M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5")],
  ejeCafe: [P("M12 3c-4 0-7 4-7 9s3 9 7 9 7-4 7-9-3-9-7-9z"), P("M12 3c-2 3 2 6 0 9s2 6 0 9")],
  ejeAnimal: [{ t: "c", cx: 7, cy: 10, r: 1.8 }, { t: "c", cx: 10.5, cy: 6.5, r: 1.8 }, { t: "c", cx: 15, cy: 6.5, r: 1.8 }, { t: "c", cx: 18, cy: 10, r: 1.8 }, P("M12.5 12c-3 0-5 3.5-5 6 0 1.5 1.2 2 2.5 2 1 0 1.6-.6 2.5-.6s1.5.6 2.5.6c1.3 0 2.5-.5 2.5-2 0-2.5-2-6-5-6z")],
  ejeTurismo: [P("M3 20l6-10 4 6 3-4 5 8z"), { t: "c", cx: 17, cy: 6, r: 2 }],
  ejeSeguridad: [P("M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"), P("M9 12l2 2 4-4")],
  ejeVivienda: [P("M3 11l9-7 9 7"), P("M5 10v10h14V10"), P("M10 20v-5h4v5")],
  ejeCultura: [{ t: "c", cx: 12, cy: 12, r: 9 }, { t: "c", cx: 8.5, cy: 10, r: 1 }, { t: "c", cx: 12, cy: 7.5, r: 1 }, { t: "c", cx: 15.5, cy: 10, r: 1 }, P("M14 16a2 2 0 0 0-4 0c0 1 1 2 2 2")],
  ejeDeporte: [{ t: "c", cx: 12, cy: 12, r: 9 }, P("M12 3v18"), P("M3 12h18"), P("M5.6 5.6c3.6 3.6 9.2 3.6 12.8 0"), P("M5.6 18.4c3.6-3.6 9.2-3.6 12.8 0")],
  ejeAmbiente: [P("M5 19c0-8 6-14 15-14 0 9-6 15-14 15"), P("M5 19l8-8")],
  ejeGobierno: [P("M3 10l9-6 9 6"), P("M5 10v8"), P("M10 10v8"), P("M14 10v8"), P("M19 10v8"), P("M3 20h18")],
};

export type NombreIcono = keyof typeof ICONOS;

/** Ícono de cada eje del programa (C-08). */
export const ICONO_EJE: Record<string, NombreIcono> = {
  educacion: "ejeEducacion", deporte_juventud: "ejeDeporte", campo_cafe: "ejeCafe", vivienda_entorno: "ejeVivienda",
  bienestar_animal: "ejeAnimal", vias_movilidad: "ejeVias", agua_ambiente: "ejeAgua", turismo_cultura: "ejeTurismo",
  salud: "ejeSalud", seguridad: "ejeSeguridad", empleo_emprendimiento: "ejeEmpleo", poblaciones: "personas",
  gobierno_cercano: "ejeGobierno", otro: "estrella",
};

/** Ícono del eje a partir de su clave o de su nombre en el catálogo (las fichas muestran el nombre). */
export function iconoEje(claveOTexto: string): NombreIcono {
  if (ICONO_EJE[claveOTexto]) return ICONO_EJE[claveOTexto];
  const k = opciones("C-08").find(([, t]) => claveOTexto.startsWith(t))?.[0];
  return ICONO_EJE[k ?? "otro"] ?? "estrella";
}

export function Icono({ nombre, tam = 22, color = tema.texto, grosor = 2 }: { nombre: NombreIcono; tam?: number; color?: string; grosor?: number }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round"
      accessible={false} importantForAccessibility="no-hide-descendants">
      {ICONOS[nombre].map((p, i) => p.t === "p" ? <Path key={i} d={p.d} />
        : p.t === "c" ? <Circle key={i} cx={p.cx} cy={p.cy} r={p.r} />
        : <Rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={p.rx} />)}
    </Svg>
  );
}
