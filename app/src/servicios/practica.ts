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
  // Las casas ya visitadas traen hogar, personas, visitas y necesidades para practicar con la ficha (P-10 y P-13).
  const nombres = [["Luz Mery", "Ríos", "mujer", 46], ["Carlos Andrés", "Ríos", "hombre", 49], ["Valentina", "Ríos", "mujer", 19],
                   ["Gloria Inés", "Salazar", "mujer", 63], ["Hernán", "Vélez", "hombre", 35], ["Diana", "Cardona", "mujer", 28]] as const;
  const temas = ["vias_movilidad", "agua_ambiente", "empleo_emprendimiento", "salud", "educacion"];
  const hogares: Record<string, unknown>[] = [];
  const personas: Record<string, unknown>[] = [];
  const visitas: Record<string, unknown>[] = [];
  const necesidades: Record<string, unknown>[] = [];
  viviendas.forEach((v, i) => {
    if (!["visitada_conversacion", "requiere_seguimiento", "no_contactar"].includes(v.estado)) return;
    const hogar = `practica-h-${i}`;
    const gente = [0, 1, 2].map((k) => {
      const [nombre, apellido, sexo, edad] = nombres[(i + k) % nombres.length];
      return { id: `practica-p-${i}-${k}`, vivienda_id: v.id, hogar_id: hogar, nombre_visible: `${nombre} ${apellido}`, edad_anios: edad, sexo,
        ocupacion: k === 0 ? "caficultor" : k === 2 ? "estudiante" : "comerciante", cedula_ult3: String(100 + i * 7 + k).slice(-3),
        telefono_ult4: String(4000 + i * 13 + k), vota_en_pijao: "si", interes_info: k === 0, estado: v.estado === "no_contactar" ? "no_contactar" : "activa",
        tiene_contacto_autorizado: k === 0 && v.estado !== "no_contactar", actualizado_en: ahora() };
    });
    personas.push(...gente);
    hogares.push({ id: hogar, vivienda_id: v.id, total_personas: 4, mujeres: 2, hombres: 2, edades: { "18-24": 1, "45-54": 2, "6-12": 1 },
      sosten_persona_id: gente[0].id, sosten_relacion: "madre", jefatura_femenina: gente[0].sexo === "mujer", votantes_pijao_est: 3, actualizado_en: ahora() });
    visitas.push({ id: `practica-x-${i}`, vivienda_id: v.id, hogar_id: hogar, fecha: new Date(Date.now() - i * 86400000).toISOString(),
      resultado: v.estado === "requiere_seguimiento" ? "pidio_volver" : "conversacion_completa", calidad: v.calidad,
      notas: "Visita de práctica", seguimiento_requerido: v.estado === "requiere_seguimiento", actualizado_en: ahora() });
    necesidades.push({ id: `practica-n-${i}`, vivienda_id: v.id, hogar_id: hogar, tema: temas[i % temas.length], prioridad: 1 + (i % 3),
      texto: "Necesidad de ejemplo contada por la familia", actualizado_en: ahora() });
  });
  return {
    viviendas,
    hogares,
    visitas,
    necesidades,
    personas_v: personas,
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

  async urlFoto() { return null; }   // en práctica no hay fotos en el servidor
}
