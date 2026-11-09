// P-44 «Cómo se ve la app»: modo claro, oscuro o sol y letra grande. La paleta se fija al arrancar (ui/tema.ts), así que
// al cambiarla se guarda y la app se vuelve a cargar. No se pierde nada: lo que no se ha enviado sigue en el teléfono.
import * as Updates from "expo-updates";
import { apariencia, guardarApariencia, type Apariencia } from "@/ui/tema";

export { apariencia };

/** Guarda la apariencia y recarga la app. Devuelve false si no se pudo recargar sola (hay que cerrarla y abrirla). */
export async function cambiarApariencia(a: Apariencia): Promise<boolean> {
  guardarApariencia(a);
  try {
    await Updates.reloadAsync();
    return true;
  } catch {
    return false;
  }
}
