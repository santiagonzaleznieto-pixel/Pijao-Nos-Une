// Funciones puras del sitio (sin pantalla): fechas, validaciones, errores, CSV y reglas que el panel repite para avisar
// antes de enviar. El servidor SIEMPRE vuelve a validar (0013 y 0014); esto solo ahorra viajes y explica mejor.
import { DIAS_ALTO_DEFECTO } from "@nucleo/permisos";

// --------------------------------------------------------------------------------------------- fechas (hora de Colombia)

const ZONA = "America/Bogota";
const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Convierte un texto ISO en fecha. Las fechas sin hora (AAAA-MM-DD) se toman como ese día en Colombia, no en UTC. */
export function aFecha(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const m = SOLO_FECHA.exec(valor);
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)) : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fecha(valor: string | null | undefined, defecto = "—"): string {
  const d = aFecha(valor);
  return d ? d.toLocaleDateString("es-CO", { timeZone: ZONA, day: "numeric", month: "long", year: "numeric" }) : defecto;
}

export function fechaHora(valor: string | null | undefined, defecto = "—"): string {
  const d = aFecha(valor);
  return d
    ? d.toLocaleString("es-CO", { timeZone: ZONA, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : defecto;
}

/** «hace 5 minutos», «hace 3 días»… para la salud del sistema y la flota. */
export function haceCuanto(valor: string | null | undefined, ahora: Date = new Date()): string {
  const d = aFecha(valor);
  if (!d) return "nunca";
  const s = Math.round((ahora.getTime() - d.getTime()) / 1000);
  if (s < 0) return "ahora";
  if (s < 90) return "hace un momento";
  const min = Math.round(s / 60);
  if (min < 60) return `hace ${min} minutos`;
  const h = Math.round(min / 60);
  if (h < 36) return h === 1 ? "hace 1 hora" : `hace ${h} horas`;
  const dias = Math.round(h / 24);
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}

/** Fecha AAAA-MM-DD de hoy más n días, en Colombia. */
export function diaMas(n: number, hoy: Date = new Date()): string {
  const d = new Date(hoy.getTime() + n * 86400000);
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return partes; // en-CA da AAAA-MM-DD
}

/** Fin del día (23:59:59 de Colombia, UTC-5 sin horario de verano) en ISO, para los vencimientos de permisos. */
export function finDelDia(diaIso: string): string {
  return `${diaIso}T23:59:59-05:00`;
}

// --------------------------------------------------------------------------------------------- validaciones

export function contactoValido(texto: string): boolean {
  const t = texto.trim();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t)) return true;
  return t.replace(/\D/g, "").length >= 7 && /^[+\d\s()-]+$/.test(t);
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** P-52: el QR del carnet lleva ?id=<identificador>. Devuelve el identificador si tiene la forma correcta. */
export function idDeCarnet(busqueda: string): string | null {
  const id = new URLSearchParams(busqueda).get("id")?.trim() ?? "";
  return UUID.test(id) ? id.toLowerCase() : null;
}

export const NUMERO_CASO = /^[0-9A-F]{8}$/;
export const normalizarCaso = (t: string) => t.trim().toUpperCase().replace(/[^0-9A-F]/g, "");

export type Interpretado = { ok: true; valor: unknown } | { ok: false; error: string };

/** P-42: convierte lo que escribió el Administrador al tipo que tenía el valor (número, texto, lista o sí/no). */
export function interpretarValor(anterior: unknown, texto: string): Interpretado {
  const t = texto.trim();
  if (typeof anterior === "number") {
    const n = Number(t.replace(",", "."));
    return t !== "" && Number.isFinite(n) ? { ok: true, valor: n } : { ok: false, error: "Escriba un número" };
  }
  if (typeof anterior === "boolean") {
    if (["si", "sí", "true"].includes(t.toLowerCase())) return { ok: true, valor: true };
    if (["no", "false"].includes(t.toLowerCase())) return { ok: true, valor: false };
    return { ok: false, error: "Escriba sí o no" };
  }
  if (Array.isArray(anterior)) {
    const partes = t === "" ? [] : t.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
    const nums = partes.map((p) => Number(p));
    if (anterior.every((x) => typeof x === "number")) {
      return nums.every(Number.isFinite) ? { ok: true, valor: nums } : { ok: false, error: "Escriba números separados por coma" };
    }
    return { ok: true, valor: partes };
  }
  return { ok: true, valor: texto };
}

/** Lo que se muestra en la casilla para editar un valor. */
export function valorParaEditar(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "sí" : "no";
  if (v === null || v === undefined) return "";
  return String(v);
}

// --------------------------------------------------------------------------------------------- permisos (M3)

export interface DefPermiso { codigo: string; riesgo: "bajo" | "medio" | "alto"; acepta_zonas?: boolean }

/** Vencimiento sugerido al encender un permiso: los de riesgo alto siempre vencen (30 días por defecto). */
export function venceSugerido(def: DefPermiso, hoy: Date = new Date()): string | null {
  return def.riesgo === "alto" ? diaMas(DIAS_ALTO_DEFECTO, hoy) : null;
}

/** Repite en el panel la regla M3 del servidor para avisar antes de enviar. */
export function errorVencimiento(def: DefPermiso, vence: string | null, maxDias: number, hoy: Date = new Date()): string | null {
  if (!vence) return def.riesgo === "alto" ? `Este permiso es de riesgo alto: necesita fecha de vencimiento (máximo ${maxDias} días).` : null;
  if (!SOLO_FECHA.test(vence)) return "La fecha no es válida.";
  if (vence < diaMas(0, hoy)) return "La fecha de vencimiento ya pasó.";
  if (def.riesgo === "alto" && vence > diaMas(maxDias, hoy)) return `Un permiso de riesgo alto vence en máximo ${maxDias} días.`;
  return null;
}

// --------------------------------------------------------------------------------------------- errores

/** Mensaje para la persona a partir de la respuesta del servidor. Los mensajes de las reglas (P0001) ya están en español
 *  claro; los técnicos se cambian por uno general para no mostrar detalles internos. */
export function mensajeDeError(e: unknown): string {
  const o = (e ?? {}) as { code?: string; message?: string; status?: number };
  const m = typeof o.message === "string" ? o.message : "";
  if (o.code === "P0001" && m) return m;
  if (o.code === "42501") return m && !/permission denied/i.test(m) ? m : "No tiene permiso para hacer esto.";
  if (/Failed to fetch|NetworkError|Load failed|network/i.test(m)) return "No hay conexión con el servidor. Revise su internet e intente de nuevo.";
  if (o.code === "PGRST202" || o.status === 404) return "El servicio todavía no está disponible. Intente más tarde.";
  if (/Invalid login credentials/i.test(m)) return "El correo o la contraseña no coinciden.";
  if (/Invalid TOTP|invalid.*code|expired/i.test(m)) return "El código no es válido o ya venció. Escriba el código nuevo de la aplicación.";
  if (/rate limit|too many/i.test(m)) return "Demasiados intentos seguidos. Espere unos minutos.";
  return "Algo salió mal. Intente de nuevo; si sigue pasando, avise al Administrador.";
}

// --------------------------------------------------------------------------------------------- CSV (P-41)

/** Archivo CSV con separador «;» (Excel en español) y protección contra fórmulas en celdas (inyección CSV). */
export function aCsv(filas: readonly Record<string, unknown>[], columnas: readonly { clave: string; titulo: string }[]): string {
  const celda = (v: unknown): string => {
    let t = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
    return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const lineas = [columnas.map((c) => celda(c.titulo)).join(";")];
  for (const f of filas) lineas.push(columnas.map((c) => celda(f[c.clave])).join(";"));
  return "﻿" + lineas.join("\r\n");   // la marca BOM hace que Excel lea bien las tildes
}

// --------------------------------------------------------------------------------------------- salud del sistema (P-43)

export type Nivel = "ok" | "alerta" | "critico";

export function nivelUso(pct: number | null | undefined, alertaPct = 80): Nivel {
  if (pct === null || pct === undefined) return "ok";
  if (pct >= 95) return "critico";
  return pct >= alertaPct ? "alerta" : "ok";
}

/** El respaldo se hace cada noche: más de 36 horas es alerta y más de 72 es crítico. */
export function nivelRespaldo(en: string | null | undefined, ahora: Date = new Date()): Nivel {
  const d = aFecha(en ?? null);
  if (!d) return "critico";
  const h = (ahora.getTime() - d.getTime()) / 3600000;
  if (h > 72) return "critico";
  return h > 36 ? "alerta" : "ok";
}

/** Compara versiones x.y.z: negativo si a < b. */
export function compararVersion(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

/** Cuenta para grupos pequeños (R-29): nunca se muestra un número menor que el mínimo. */
export function contarSeguro(n: number, minimo = 5): string {
  return n > 0 && n < minimo ? `menos de ${minimo}` : String(n);
}
