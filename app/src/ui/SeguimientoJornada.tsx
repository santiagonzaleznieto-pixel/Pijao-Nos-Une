// Durante la jornada (y solo entonces, R-31) toma la ubicación cada minuto mientras la app está abierta y la deja en la
// cola por lotes. No dibuja nada.
import { useEffect } from "react";
import { useApp } from "@/servicios/contexto";
import { anotarPunto, jornadaActiva, ubicacionActual } from "@/servicios/jornada";

export function SeguimientoJornada() {
  const app = useApp();
  useEffect(() => {
    if (!app.usuarioId) return;
    const uid = app.usuarioId;
    let vivo = true;
    const tomar = async () => {
      if (!(await jornadaActiva(app.almacen))) return;
      const p = await ubicacionActual();
      if (p && vivo) await anotarPunto(app.almacen, uid, p);
    };
    tomar();
    const t = setInterval(tomar, 60_000);
    return () => { vivo = false; clearInterval(t); };
  }, [app.almacen, app.usuarioId]);
  return null;
}
