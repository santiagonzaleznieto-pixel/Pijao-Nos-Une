// Pestaña «Personas» (decisión del dueño, 23 de noviembre de 2026): la lista de todas las personas registradas, con
// filtros y dónde vota cada una. Qué ve cada quien lo decide el servidor (rpc_personas_lista): el Director y el
// Administrador, todo; un colaborador, completas las que él registró y, de las demás, solo el nombre y la vereda.
// Aquí solo hay lógica sin pantallas (se prueba en __tests__/personas.test.ts).
import { mascaraCedula, mascaraTelefono, type PersonaV } from "./enmascarado";

/** Consulta oficial del lugar de votación (pide un captcha: se hace a mano, nunca de forma automática). */
export const URL_REGISTRADURIA = "https://wsp.registraduria.gov.co/censo/consultar/";

export interface PersonaLista {
  id: string;
  completo: boolean;
  propia: boolean;
  nombre: string;
  barrio_vereda?: string | null;
  zona_urbana_rural?: string | null;
  vivienda_id?: string | null;
  apodo?: string | null;
  tipo_documento?: string | null;
  cedula?: string | null;
  telefono?: string | null;
  telefono_es_whatsapp?: boolean | null;
  telefono2?: string | null;
  correo?: string | null;
  fecha_nacimiento?: string | null;
  edad?: number | null;
  sexo?: string | null;
  ocupacion?: string | null;
  canal_preferido?: string | null;
  mejor_horario?: string | null;
  direccion?: string | null;
  complemento?: string | null;
  nombre_finca?: string | null;
  zona?: string | null;
  predio?: string | null;
  lat?: number | null;
  lng?: number | null;
  vota_en_pijao?: string | null;
  puesto_votacion?: string | null;
  mesa_votacion?: string | null;
  anios_en_pijao?: string | null;
  voluntario?: string | null;
  interes_info?: boolean | null;
  anfitrion?: boolean | null;
  temas_interes?: string[] | null;
  estado?: string | null;
  contacto_autorizado?: boolean | null;
  registrado_por?: string | null;
  creado_en?: string | null;
  ultima_visita?: string | null;
  /** Fila armada con lo guardado en el teléfono (sin señal): datos enmascarados. */
  local?: boolean;
  cedula_ult3?: string | null;
  telefono_ult4?: string | null;
}

export interface FiltrosPersonas {
  texto?: string;
  vereda?: string;
  puesto?: string;
  mesa?: string;
  sin_puesto?: boolean;
  vota?: "si" | "no" | "no_sabe" | "sin_dato";
  predio?: string;
  estado?: string;
  mias?: boolean;
  registro_por?: string;
  id?: string;
}

export interface ResumenPersonas {
  total_visibles: number;
  completas: number;
  con_puesto: number;
  vota: { si: number; no: number; no_sabe: number; sin_dato: number };
  puestos: { puesto: string; personas: number; mesas: { mesa: string; personas: number }[] }[];
  sugeridos: string[];
  equipo: { id: string; nombre: string }[] | null;
}

export interface EventoHistoria { fecha: string; tipo: string; titulo: string; detalle: string | null; por: string | null }

export const OPCIONES_VOTA = [["si", "Sí, en Pijao"], ["no", "En otro municipio"], ["no_sabe", "No sabe"]] as const;

/** Lo que se envía al servidor: sin campos vacíos. */
export function limpiarFiltros(f: FiltrosPersonas): FiltrosPersonas {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === null || v === false) continue;
    if (typeof v === "string" && !v.trim()) continue;
    r[k] = typeof v === "string" ? v.trim() : v;
  }
  return r as FiltrosPersonas;
}

/** Cuántos filtros hay puestos (sin contar la búsqueda), para el botón «Filtros (2)». */
export function contarFiltros(f: FiltrosPersonas): number {
  const { texto: _t, id: _i, ...resto } = limpiarFiltros(f);
  return Object.keys(resto).length;
}

/** «Escuela La Mina · mesa 7», «Vota en otro municipio» o «Sin dato de dónde vota». */
export function textoDondeVota(p: Pick<PersonaLista, "vota_en_pijao" | "puesto_votacion" | "mesa_votacion">): string {
  if (p.vota_en_pijao === "no") return "Vota en otro municipio";
  const puesto = (p.puesto_votacion ?? "").trim();
  const mesa = (p.mesa_votacion ?? "").trim();
  if (puesto) return mesa ? `${puesto} · mesa ${mesa}` : puesto;
  if (p.vota_en_pijao === "si") return "Vota en Pijao · falta el puesto";
  if (p.vota_en_pijao === "no_sabe") return "No sabe dónde vota";
  return "Sin dato de dónde vota";
}

export function sabeDondeVota(p: Pick<PersonaLista, "vota_en_pijao" | "puesto_votacion">): boolean {
  return p.vota_en_pijao === "no" || Boolean((p.puesto_votacion ?? "").trim());
}

/** Código catastral guardado en la referencia de la vivienda («Predio IGAC 6354801…»). */
export function codigoPredio(referencia: string | null | undefined): string | null {
  const m = /Predio IGAC\s+([0-9A-Za-z]+)/.exec(referencia ?? "");
  return m ? m[1] : null;
}

/** Número corto del predio (terreno) dentro del código de 30 dígitos (o del anterior de 20), como en el mapa. */
export function numeroPredio(codigo: string | null | undefined): string | null {
  const c = (codigo ?? "").replace(/\D/g, "");
  if (c.length >= 21) return String(Number(c.slice(17, 21)));
  if (c.length >= 17) return String(Number(c.slice(13, 17)));
  return null;
}

/** 14.8: si dice que vota en Pijao pero lleva menos de un año viviendo aquí, se recuerda la regla (nunca se promueve inscribir). */
export function recordarResidencia(vota: string | null | undefined, anios: string | null | undefined): boolean {
  return vota === "si" && anios === "menos_1";
}

/** Mesa válida: número de 1 a 999 (o vacío). Devuelve el error o null. */
export function errorMesa(mesa: string): string | null {
  const m = mesa.replace(/\D/g, "");
  if (!mesa.trim()) return null;
  if (!m || m.length > 3 || Number(m) === 0 || m !== mesa.trim()) return "La mesa es un número de 1 a 999";
  return null;
}

/** Campos de personas_v que usa la lista sin señal. */
type PV = {
  id: string; nombre_visible?: string | null; apodo?: string | null; vivienda_id?: string | null; estado?: string | null;
  eliminado_en?: string | null; creado_por?: string | null; creado_en?: string | null; edad_anios?: number | null;
  cedula_ult3?: string | null; telefono_ult4?: string | null; vota_en_pijao?: string | null; tiene_contacto_autorizado?: boolean | null;
  puesto_votacion?: string | null; mesa_votacion?: string | null; anios_en_pijao?: string | null;
};

const norm = (t: unknown) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Sin señal: la lista se arma con lo que el teléfono ya tiene (vista enmascarada personas_v y las viviendas). Nunca
 * muestra más de lo que el servidor dejó guardar en el teléfono.
 */
export function listaLocal(personas: PersonaV[], viviendas: Record<string, unknown>[], f: FiltrosPersonas, usuarioId: string | null): PersonaLista[] {
  const casas = new Map(viviendas.map((v) => [String(v.id), v]));
  const filtros = limpiarFiltros(f);
  const texto = norm(filtros.texto);
  const filas = (personas as unknown as PV[])
    .filter((p) => !p.eliminado_en && p.estado !== "solicito_eliminacion" && p.nombre_visible)
    .map((p): PersonaLista => {
      const v = p.vivienda_id ? casas.get(String(p.vivienda_id)) : undefined;
      const x = p;
      return {
        id: String(p.id), completo: false, propia: p.creado_por === usuarioId, local: true,
        nombre: String(p.nombre_visible ?? ""), apodo: p.apodo ?? null, vivienda_id: p.vivienda_id ? String(p.vivienda_id) : null,
        barrio_vereda: (v?.barrio_vereda as string) ?? null, direccion: (v?.direccion as string) ?? null,
        predio: (v?.referencia as string) ?? null, zona_urbana_rural: (v?.zona_urbana_rural as string) ?? null,
        vota_en_pijao: p.vota_en_pijao ?? null, puesto_votacion: x.puesto_votacion ?? null, mesa_votacion: x.mesa_votacion ?? null,
        anios_en_pijao: x.anios_en_pijao ?? null,
        estado: p.estado ?? null, edad: p.edad_anios ?? null, cedula_ult3: p.cedula_ult3 ?? null, telefono_ult4: p.telefono_ult4 ?? null,
        contacto_autorizado: p.tiene_contacto_autorizado ?? null, creado_en: p.creado_en ?? null,
      };
    })
    .filter((p) => {
      if (texto && !norm(`${p.nombre} ${p.apodo ?? ""}`).includes(texto) && !(p.cedula_ult3 && texto.replace(/\D/g, "").endsWith(p.cedula_ult3) && texto.replace(/\D/g, "").length >= 6)) return false;
      if (filtros.vereda && !norm(p.barrio_vereda).includes(norm(filtros.vereda))) return false;
      if (filtros.puesto && norm(p.puesto_votacion) !== norm(filtros.puesto)) return false;
      if (filtros.mesa && (p.mesa_votacion ?? "") !== filtros.mesa) return false;
      if (filtros.sin_puesto && (p.puesto_votacion ?? "").trim()) return false;
      if (filtros.vota && (filtros.vota === "sin_dato" ? p.vota_en_pijao != null : p.vota_en_pijao !== filtros.vota)) return false;
      if (filtros.predio && !(p.predio ?? "").includes(filtros.predio)) return false;
      if (filtros.estado && p.estado !== filtros.estado) return false;
      if (filtros.mias && !p.propia) return false;
      if (filtros.id && p.id !== filtros.id) return false;
      return true;
    });
  return filas.sort((a, b) => norm(a.nombre).localeCompare(norm(b.nombre)));
}

/** Cédula para mostrar: completa si el servidor la dio; si no, solo los últimos 3 dígitos. */
export function cedulaVisible(p: PersonaLista): string | null {
  if (p.cedula) return p.cedula.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (p.cedula_ult3) return mascaraCedula(`000000${p.cedula_ult3}`).slice(-6);
  return null;
}

export function telefonoVisible(p: PersonaLista): string | null {
  if (p.telefono) return p.telefono.replace(/^(\d{3})(\d{3})(\d+)$/, "$1 $2 $3");
  if (p.telefono_ult4) return mascaraTelefono(`000000${p.telefono_ult4}`).slice(-7);
  return null;
}

/** Lugar corto para la fila: dirección o finca y vereda. */
export function lugarPersona(p: PersonaLista): string {
  return [p.direccion || p.nombre_finca, p.barrio_vereda].filter(Boolean).join(" · ") || "Sin vereda registrada";
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Fecha sin hora («1980-05-04» → «4 de mayo de 1980»), sin correrse un día por la zona horaria. */
export function fechaSinHora(v: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v ?? "");
  if (!m) return null;
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}
