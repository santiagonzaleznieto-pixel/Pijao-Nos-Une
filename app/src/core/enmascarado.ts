// Protección estándar de datos personales (7.4): qué ve cada quien. El enmascarado REAL lo hace el servidor
// (vista personas_v); esto solo da formato y nunca guarda en el teléfono más de lo que el servidor permite.
export const PUNTO = "•";
const digitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");

/** Solo los últimos 3 dígitos. */
export function mascaraCedula(valor: unknown): string {
  const d = digitos(valor);
  return d ? PUNTO.repeat(Math.max(0, d.length - 3)) + d.slice(-3) : "";
}

/** Solo los últimos 4 dígitos. */
export function mascaraTelefono(valor: unknown): string {
  const d = digitos(valor);
  return d ? PUNTO.repeat(Math.max(0, d.length - 4)) + d.slice(-4) : "";
}

export function mascaraCorreo(valor: unknown): string {
  const s = String(valor ?? "").trim();
  const at = s.indexOf("@");
  if (at < 0) return "";
  const usuario = s.slice(0, at);
  const dominio = s.slice(at + 1);
  const punto = dominio.lastIndexOf(".");
  const host = punto > 0 ? dominio.slice(0, punto) : dominio;
  const tld = punto > 0 ? dominio.slice(punto + 1) : "";
  const u = (usuario ? usuario[0] : "") + PUNTO.repeat(3);
  const h = (host ? host[0] : "") + PUNTO.repeat(3);
  return `${u}@${h}` + (tld ? `.${tld}` : "");
}

export function nombreVisible(primerNombre?: string | null, primerApellido?: string | null): string {
  return [primerNombre, primerApellido].map((x) => (x ?? "").trim()).filter(Boolean).join(" ");
}

export function nombreCompleto(p: { primer_nombre?: string | null; segundo_nombre?: string | null; primer_apellido?: string | null; segundo_apellido?: string | null }): string {
  return [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido].map((x) => (x ?? "").trim()).filter(Boolean).join(" ");
}

export interface PersonaV {
  id: string; nombre_visible?: string | null; edad_anios?: number | null;
  cedula_ult3?: string | null; telefono_ult4?: string | null; correo_parcial?: string | null; [k: string]: unknown;
}
export interface PersonaCompleta { cedula?: string | null; telefono?: string | null; correo?: string | null; fecha_nacimiento?: string | null; simpatia?: string | null }

/** Combina la vista enmascarada con los datos completos si el servidor los entregó (O-01, con auditoría). */
export function vistaParaPantalla(v: PersonaV, completa?: PersonaCompleta | null) {
  const r = {
    ...v,
    cedula_txt: v.cedula_ult3 ? PUNTO.repeat(6) + v.cedula_ult3 : "",
    telefono_txt: v.telefono_ult4 ? PUNTO.repeat(6) + v.telefono_ult4 : "",
    correo_txt: v.correo_parcial ?? "",
    nacimiento_txt: v.edad_anios !== null && v.edad_anios !== undefined ? `${v.edad_anios} años` : "",
    simpatia_txt: "",
  };
  if (completa) {
    r.cedula_txt = completa.cedula || r.cedula_txt;
    r.telefono_txt = completa.telefono || r.telefono_txt;
    r.correo_txt = completa.correo || r.correo_txt;
    if (completa.fecha_nacimiento) r.nacimiento_txt = completa.fecha_nacimiento;
    if (completa.simpatia) r.simpatia_txt = completa.simpatia;
  }
  return r;
}
