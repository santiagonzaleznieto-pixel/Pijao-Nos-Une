// Modo práctica (P-47, 10.6, 8.12): servidor simulado con datos de ejemplo. No se conecta a la base real, no afecta
// las estadísticas y usa su propia base local («practica.sqlite»).
import { evaluarRegistro } from "../core/calidad";
import type { Borrador } from "../core/visita";
import type { Remoto } from "../datos/tipos";

const BASE = { lat: 4.3335, lng: -75.7045 };
const ahora = () => new Date().toISOString();

function ejemplo(): Record<string, Record<string, unknown>[]> {
  const estados = ["por_visitar", "visitada_conversacion", "visitada_sin_contacto", "requiere_seguimiento", "por_visitar", "no_contactar"];
  const viviendas = Array.from({ length: 24 }, (_, i) => ({
    id: `practica-v-${i}`, lat: BASE.lat + (Math.floor(i / 6) - 2) * 0.0007, lng: BASE.lng + ((i % 6) - 3) * 0.0007,
    direccion: `Calle de práctica ${i + 1}`, barrio_vereda: "Barrio de práctica", estado: estados[i % estados.length],
    calidad: i % 4 === 0 ? "amarillo" : "verde", actualizado_en: ahora(),
  }));
  return {
    viviendas,
    personas_v: [{ id: "practica-p-1", vivienda_id: "practica-v-1", nombre_visible: "Persona de ejemplo", edad_anios: 45,
      cedula_ult3: "123", telefono_ult4: "4567", estado: "activa", tiene_contacto_autorizado: true, actualizado_en: ahora() }],
    tareas: [{ id: "practica-t-1", titulo: "Visitar la casa 4 (práctica)", tipo: "visitar", estado: "pendiente", prioridad: "normal", actualizado_en: ahora() }],
    anuncios: [{ id: "practica-a-1", titulo: "Bienvenida al modo práctica", texto: "Aquí puede practicar sin tocar datos reales.", prioridad: "normal", actualizado_en: ahora() }],
    textos_legales: [],
    configuracion: [],
  };
}

export class RemotoPractica implements Remoto {
  private datos = ejemplo();
  constructor(private readonly usuarioId: () => string | null) {}

  async rpc<T>(nombre: string, args: Record<string, unknown>): Promise<T> {
    if (nombre === "rpc_registrar_visita") {
      const p = args.p as Record<string, any>;
      const borrador = {
        vivienda_existente: Boolean(p.vivienda?.solo_visita), vivienda: p.vivienda, visita: p.visita, hogar: p.hogar,
        personas: p.personas ?? [], consentimientos: p.consentimientos ?? [], fotos: p.fotos ?? [], dispositivo: p.dispositivo ?? {},
      } as unknown as Borrador;
      return { ok: true, calidad: evaluarRegistro(borrador).color, practica: true } as T;
    }
    return { ok: true, practica: true, usuario: this.usuarioId() } as T;
  }

  async cambios(tabla: string, _clave: string, desde: string | null) {
    return desde ? [] : (this.datos[tabla] ?? []);
  }

  async subirFoto() { /* en práctica las fotos no salen del teléfono */ }
}
