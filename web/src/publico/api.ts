// Llamadas de las páginas públicas: solo a las funciones rpc_publico_* con la clave pública (anon), sin librerías
// (las páginas deben pesar poco). Con ?demo=1 en la dirección responden datos de ejemplo sin tocar el servidor,
// para revisar las páginas antes de que la migración 0014 esté aplicada.
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config";
import { mensajeDeError } from "../logica/utiles";

export const DEMO = new URLSearchParams(location.search).has("demo");

export class ErrorPublico extends Error {}

export interface Textos {
  aviso: TextoLegal | null;
  politica: TextoLegal | null;
  responsable: string | null;
  correo: string | null;
  whatsapp: string | null;
}
export interface TextoLegal { version: string; contenido: string; borrador: boolean; actualizado: string }
export interface Carnet { vigente: boolean; nombre?: string; rol?: string; vence?: string; consultado_en: string }
export interface CasoCreado { ok: boolean; numero_caso: string; plazo_legal?: string }
export interface EstadoCaso { encontrado: boolean; tipo?: string; estado?: string; recibido_en?: string; plazo_legal?: string; resuelta_en?: string }

async function rpc<T>(funcion: string, args: Record<string, unknown>): Promise<T> {
  if (DEMO) return demo(funcion, args) as T;
  let r: Response;
  try {
    r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${funcion}`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
  } catch (e) {
    throw new ErrorPublico(mensajeDeError(e));
  }
  if (!r.ok) {
    let cuerpo: unknown = null;
    try { cuerpo = await r.json(); } catch { /* sin cuerpo */ }
    throw new ErrorPublico(mensajeDeError({ ...(cuerpo as object), status: r.status }));
  }
  return (await r.json()) as T;
}

export const textosPublicos = () => rpc<Textos>("rpc_publico_textos", {});
export const verificarCarnet = (id: string) => rpc<Carnet>("rpc_publico_carnet", { p_id: id });
export const enviarSolicitud = (datos: Record<string, unknown>) => rpc<CasoCreado>("rpc_publico_solicitud", { p: datos });
export const estadoCaso = (numero: string, contacto: string) =>
  rpc<EstadoCaso>("rpc_publico_estado_caso", { p_numero: numero, p_contacto: contacto });

// ----------------------------------------------------------------------------- datos de ejemplo (?demo=1)

function demo(funcion: string, args: Record<string, unknown>): unknown {
  const hoy = new Date().toISOString().slice(0, 10);
  switch (funcion) {
    case "rpc_publico_textos":
      return {
        aviso: { version: "v1-borrador", borrador: true, actualizado: hoy, contenido:
          "Campaña Pijao Nos Une (candidato Jaime González) recoge datos de su vivienda y, si usted lo permite, de contacto, para conocer las necesidades de las familias, informar sobre la campaña y construir el programa de gobierno.\n\nUsted puede conocer, corregir, borrar sus datos o retirar su autorización en cualquier momento." },
        politica: { version: "v1-borrador", borrador: true, actualizado: hoy, contenido:
          "[Texto de la política de tratamiento de datos personales: lo redacta el abogado antes de usar la app con familias reales.]" },
        responsable: "Campaña Pijao Nos Une · candidato Jaime González · Pijao, Quindío",
        correo: "datos@ejemplo.co",
        whatsapp: "+57 300 000 0000",
      } satisfies Textos;
    case "rpc_publico_carnet":
      return String(args.p_id).endsWith("1")
        ? { vigente: true, nombre: "Ana María Ejemplo", rol: "Colaborador del equipo", vence: "2027-05-05", consultado_en: new Date().toISOString() }
        : { vigente: false, consultado_en: new Date().toISOString() };
    case "rpc_publico_solicitud":
      return { ok: true, numero_caso: "A1B2C3D4", plazo_legal: hoy };
    case "rpc_publico_estado_caso":
      return String(args.p_numero) === "A1B2C3D4"
        ? { encontrado: true, tipo: "consulta", estado: "en_proceso", recibido_en: hoy, plazo_legal: hoy }
        : { encontrado: false };
    default:
      throw new ErrorPublico("Función desconocida");
  }
}
