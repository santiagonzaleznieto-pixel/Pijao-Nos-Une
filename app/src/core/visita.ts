// Borrador de visita (los 12 pasos de 6.3) y el paquete que viaja a rpc_registrar_visita.
// Los campos coinciden con las listas cerradas que acepta el servidor (migración 0013, hallazgo A2).
import type { Consentimiento } from "./consentimiento";
import { nuevoId } from "./ids";
import { iso } from "./reglas";
import { limpiarVacios, parseFecha } from "./validadores";

export type Fila = Record<string, unknown>;

export interface FotoBorrador {
  id: string; tipo: "fachada" | "entorno" | "problema" | "autorizacion"; archivo_local: string;
  lat?: number | null; lng?: number | null; tomada_en?: string; tam_bytes?: number; hash?: string; con_personas?: boolean;
}
export interface PersonaBorrador extends Fila { id: string; primer_nombre?: string; primer_apellido?: string; es_sosten?: boolean }
export interface Borrador {
  id: string; usuario_id: string; creado_en: string; paso: number; vivienda_existente: boolean;
  vivienda: Fila & { id: string };
  visita: Fila & { resultado: string | null; autorizacion_verbal: boolean; no_autorizo_foto: boolean; ubicacion_manual: boolean };
  hogar: (Fila & { id: string }) | null;
  personas: PersonaBorrador[];
  necesidades: (Fila & { id: string })[];
  consentimientos: Consentimiento[];
  fotos: FotoBorrador[];
  dispositivo: { lat?: number | null; lng?: number | null; precision_m?: number | null; ubicacion_simulada?: boolean };
}

export const CAMPOS_VIVIENDA = ["id", "lat", "lng", "precision_m", "altitud_m", "fuente_ubicacion", "zona_urbana_rural",
  "barrio_vereda", "direccion", "complemento", "nombre_finca", "indicaciones", "referencia", "tipo_vivienda",
  "estado_ocupacion", "tenencia", "servicios", "via_acceso", "riesgos", "actividad_economica"] as const;
export const CAMPOS_HOGAR = ["id", "total_personas", "edades", "mujeres", "hombres", "votantes_pijao_est",
  "votantes_otro_mpio_est", "votantes_no_sabe_est", "futuros_primeros_votantes", "sosten_persona_id", "sosten_relacion",
  "sosten_sexo", "sosten_ocupacion", "sosten_situacion_laboral", "familiares_fuera", "mascotas", "otros_hogares"] as const;
export const CAMPOS_PERSONA = ["id", "primer_nombre", "segundo_nombre", "primer_apellido", "segundo_apellido", "apodo",
  "tipo_documento", "fecha_nacimiento", "mayor_edad_confirmada", "sexo", "ocupacion", "telefono_es_whatsapp",
  "canal_preferido", "mejor_horario", "anios_en_pijao", "vive_en_otra_ciudad", "vota_en_pijao", "puesto_votacion",
  "mesa_votacion", "interes_info", "voluntario", "anfitrion", "temas_interes", "cumple_mes", "cumple_dia", "canales_preferidos",
  // sensibles: viajan en claro solo hasta el servidor, que los cifra (8.8); en el teléfono van en la base cifrada
  "cedula", "telefono", "telefono2", "correo", "simpatia"] as const;
export const CAMPOS_NECESIDAD = ["id", "tema", "prioridad", "texto", "alcance", "origen", "desea_respuesta"] as const;
export const CAMPOS_VISITA = ["id", "fecha", "resultado", "autorizacion_verbal", "notas", "seguimiento_requerido",
  "seguimiento_fecha", "seguimiento_motivo", "seguimiento_asignado_a", "volante_entregado", "ubicacion_manual",
  "motivo_manual", "no_autorizo_foto", "dispositivo_precision_m"] as const;
export const CAMPOS_FOTO = ["id", "tipo", "lat", "lng", "tomada_en", "tam_bytes", "hash", "con_personas"] as const;
export const CAMPOS_CONSENTIMIENTO = ["id", "persona_id", "proposito", "version_texto", "metodo", "evidencia", "otorgado_en", "lat", "lng"] as const;

function filtrar(d: Fila | null | undefined, campos: readonly string[]): Fila {
  const r: Fila = {};
  for (const k of campos) if (d && k in d) r[k] = d[k];
  return r;
}

/** Misma ruta que fija el servidor (0013, _ruta_foto). */
export const rutaFoto = (viviendaId: string, fotoId: string) => `viviendas/${viviendaId}/${fotoId}.jpg`;

/** Crea el borrador. Si la vivienda ya existe, solo se agrega una visita sin repetir el cuestionario (6.7). */
export function borradorVacio(usuarioId: string, o: {
  existente?: { id: string; lat?: number; lng?: number; direccion?: string | null; barrio_vereda?: string | null } | null;
  lat?: number; lng?: number; precision_m?: number | null; altitud_m?: number | null; manual?: boolean;
} = {}): Borrador {
  const existente = Boolean(o.existente);
  const vivienda = o.existente
    ? { id: o.existente.id, lat: o.existente.lat, lng: o.existente.lng, direccion: o.existente.direccion, barrio_vereda: o.existente.barrio_vereda }
    : { id: nuevoId(), lat: o.lat, lng: o.lng, precision_m: o.precision_m ?? null, altitud_m: o.altitud_m ?? null,
        fuente_ubicacion: o.manual ? "manual" : "gps", servicios: [], riesgos: [] };
  return {
    id: nuevoId(), usuario_id: usuarioId, creado_en: iso(), paso: 0, vivienda_existente: existente, vivienda,
    visita: { resultado: null, autorizacion_verbal: false, notas: "", seguimiento_requerido: false, volante_entregado: false,
      ubicacion_manual: Boolean(o.manual), no_autorizo_foto: false },
    hogar: null, personas: [], necesidades: [], consentimientos: [], fotos: [], dispositivo: {},
  };
}

export interface Subida { foto_id: string; archivo_local: string; storage_path: string }

/** Arma el JSON de rpc_registrar_visita y la lista de fotos por subir. */
export function construirPayload(b: Borrador): { payload: Fila; subidas: Subida[] } {
  const vid = b.vivienda.id;
  const visita = { ...filtrar(b.visita, CAMPOS_VISITA), id: b.id, fecha: (b.visita.fecha as string) ?? b.creado_en };
  const hogar: (Fila & { id: string }) | null = b.hogar ? { ...filtrar(b.hogar, CAMPOS_HOGAR), id: b.hogar.id } : null;
  const personas = b.personas.map((p) => {
    if (hogar && p.es_sosten) hogar.sosten_persona_id = p.id;
    const f = filtrar(p, CAMPOS_PERSONA);
    // El servidor lee las fechas como mes/día: se envía siempre AAAA-MM-DD (la app la pide como día/mes/año).
    if (f.fecha_nacimiento) { const d = parseFecha(f.fecha_nacimiento); f.fecha_nacimiento = d ? d.toISOString().slice(0, 10) : null; }
    return f;
  });
  const subidas: Subida[] = [];
  const fotos = b.fotos.map((f) => {
    subidas.push({ foto_id: f.id, archivo_local: f.archivo_local, storage_path: rutaFoto(vid, f.id) });
    return filtrar(f as unknown as Fila, CAMPOS_FOTO);
  });
  const payload = {
    dispositivo: b.dispositivo,
    vivienda: b.vivienda_existente ? { id: vid, solo_visita: true } : filtrar(b.vivienda, CAMPOS_VIVIENDA),
    visita, hogar, personas,
    necesidades: b.necesidades.filter((n) => n.tema).map((n, i) => ({ ...filtrar(n, CAMPOS_NECESIDAD), prioridad: Math.min(3, Number(n.prioridad ?? i + 1)) })),
    consentimientos: b.consentimientos.map((c) => filtrar(c as unknown as Fila, CAMPOS_CONSENTIMIENTO)),
    fotos,
  };
  return { payload: limpiarVacios(payload), subidas };
}
