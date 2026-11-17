// R-32: con el panel abierto, un SOS no puede pasar desapercibido. Cada 30 segundos se revisan las alertas sin atender;
// si hay alguna, aparece una franja roja arriba de cualquier página y, cuando llega una nueva, suena un aviso (WebAudio,
// sin archivos ni servicios externos) y el título de la pestaña parpadea para verla aunque esté en otra pestaña.
import { useEffect, useRef, useState } from "react";
import type { AlertaSos, Fuente } from "./datos/tipos";

const CADA_MS = 30_000;
export const EVENTO_SOS = "pijao-sos-cambio";

function sonar() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    // Tres pitidos de dos tonos, como una alarma corta.
    [0, 0.5, 1].forEach((t) => {
      [880, 660].forEach((hz, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        o.frequency.value = hz;
        const ini = ctx.currentTime + t + i * 0.2;
        g.gain.setValueAtTime(0.0001, ini);
        g.gain.exponentialRampToValueAtTime(0.18, ini + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ini + 0.18);
        o.connect(g).connect(ctx.destination);
        o.start(ini);
        o.stop(ini + 0.2);
      });
    });
    window.setTimeout(() => void ctx.close(), 2000);
  } catch { /* sin audio queda la franja y el título */ }
}

export function useSosAbiertos(fuente: Fuente): AlertaSos[] {
  const [abiertas, setAbiertas] = useState<AlertaSos[]>([]);
  const vistos = useRef<Set<string> | null>(null);
  useEffect(() => {
    let vivo = true;
    const revisar = () => {
      fuente.seguridad().then((s) => {
        if (!vivo) return;
        const ab = s.sos.filter((a) => !a.atendida_en);
        // La primera revisión no suena por lo que ya estaba (pero sí lo muestra); después, cada alerta nueva suena una vez.
        if (vistos.current && ab.some((a) => !vistos.current!.has(a.id))) sonar();
        vistos.current = new Set([...(vistos.current ?? []), ...ab.map((a) => a.id)]);
        setAbiertas(ab);
      }, () => undefined);
    };
    revisar();
    const t = window.setInterval(revisar, CADA_MS);
    const alVolver = () => { if (document.visibilityState === "visible") revisar(); };
    document.addEventListener("visibilitychange", alVolver);
    addEventListener(EVENTO_SOS, revisar);   // «Ya la atendí» en Seguridad: la franja se va al instante
    return () => { vivo = false; window.clearInterval(t); document.removeEventListener("visibilitychange", alVolver); removeEventListener(EVENTO_SOS, revisar); };
  }, [fuente]);

  // Título que parpadea mientras haya alertas abiertas.
  useEffect(() => {
    if (!abiertas.length) return;
    const original = document.title;
    let alterno = false;
    const t = window.setInterval(() => {
      alterno = !alterno;
      document.title = alterno ? `🔴 SOS (${abiertas.length}) · Pijao Nos Une` : original;
    }, 1000);
    return () => { window.clearInterval(t); document.title = original; };
  }, [abiertas.length]);

  return abiertas;
}

export function FranjaSos({ fuente }: { fuente: Fuente }) {
  const abiertas = useSosAbiertos(fuente);
  if (!abiertas.length) return null;
  const nombres = abiertas.map((a) => a.nombre).join(", ");
  return (
    <div className="franja-sos" role="alert">
      <span className="franja-sos-punto" aria-hidden="true" />
      <span><strong>SOS sin atender:</strong> {nombres}. Llame ya a la persona; si no contesta, a su contacto de emergencia o al 123.</span>
      <a className="boton chico" href="#/seguridad">Ver y atender</a>
    </div>
  );
}
