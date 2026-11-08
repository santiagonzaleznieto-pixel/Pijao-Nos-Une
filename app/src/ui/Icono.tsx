// Íconos de línea del sistema de diseño (cuadrícula de 24, trazo de 2 px, puntas redondeadas). Son los mismos del lienzo
// de pantallas (diseno/pantallas/pantallas.css). Decorativos por defecto: el texto o el aria-label dicen qué hacen.
import Svg, { Circle, Path, Rect } from "react-native-svg";
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
};

export type NombreIcono = keyof typeof ICONOS;

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
