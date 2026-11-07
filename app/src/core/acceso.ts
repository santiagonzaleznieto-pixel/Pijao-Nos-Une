// Reglas de acceso a la cuenta (bloque 1.5): contraseña (4.10), recuperación (P-07), R-45 y avisos de la cuenta.
// Sin dependencias de React Native: las prueba jest y las puede usar el panel web.
import type { PerfilDatos } from "./permisos";

export const CLAVE_MINIMA = 12;

// 4.10: las mismas contraseñas comunes que rechaza la función registrar-con-codigo (lista corta y local).
const COMUNES = new Set([
  "123456789012", "1234567890123", "contraseña123", "contrasena123", "password1234", "qwertyuiop12",
  "pijaonosune1", "pijaonosune123", "colombia1234", "quindio12345", "123456789abc", "abc123456789",
  "000000000000", "111111111111", "123123123123", "iloveyou1234", "admin1234567", "teamo1234567",
]);

/** Devuelve el problema de la contraseña nueva, o null si sirve. */
export function problemaClave(clave: string, repetida?: string): string | null {
  if (clave.length < CLAVE_MINIMA) return `La contraseña debe tener al menos ${CLAVE_MINIMA} caracteres.`;
  if (COMUNES.has(clave.toLowerCase()) || /^(.)\1+$/.test(clave)) return "Esa contraseña es muy común. Elija otra más difícil de adivinar.";
  if (repetida !== undefined && repetida !== clave) return "Las dos contraseñas no coinciden.";
  return null;
}

/** Deja solo los dígitos del código que llega por correo (6 a 10 dígitos según la configuración de Supabase). */
export function limpiarCodigo(codigo: string): string {
  return codigo.replace(/\D/g, "").slice(0, 10);
}

// Mensajes de Supabase Auth traducidos sin revelar si un correo tiene cuenta (A7).
const MENSAJES_RECUPERACION: [RegExp, string][] = [
  [/expired|invalid|not found|otp/i, "El código no es válido o ya venció. Pida uno nuevo."],
  [/rate limit|too many|security purposes|only request/i, "Ya pidió un código hace poco. Espere unos minutos e inténtelo de nuevo."],
  [/same.*password|different from the old/i, "La contraseña nueva debe ser distinta de la anterior."],
  [/weak|password should|at least/i, `La contraseña debe tener al menos ${CLAVE_MINIMA} caracteres y no ser común.`],
  [/network|fetch|failed to/i, "Sin conexión. Para recuperar el acceso necesita internet."],
];

export function mensajeRecuperacion(error: unknown): string {
  const texto = error instanceof Error ? error.message : String(error ?? "");
  return MENSAJES_RECUPERACION.find(([r]) => r.test(texto))?.[1] ?? "No se pudo completar. Inténtelo de nuevo en unos minutos.";
}

/**
 * R-45: hay que volver a aceptar los acuerdos. Solo se exige con conexión y con un perfil que ya trae el dato
 * (un perfil guardado por una versión anterior de la app no lo trae y no bloquea el trabajo de campo sin señal).
 */
export function debeAceptarAcuerdos(perfil: PerfilDatos | null | undefined, conectado: boolean): boolean {
  return Boolean(perfil && conectado && perfil.estado === "activo" && perfil.acuerdos_vigentes === false);
}

export interface AvisoCuenta {
  id: string; tipo: "dispositivo_nuevo" | "clave_cambiada" | "revision_permisos"; mensaje: string; creado_en: string;
  datos: { dispositivo_id?: string; modelo?: string };
}

/** 4.10: el aviso de «teléfono nuevo» no se le muestra al propio teléfono nuevo; sí a los habituales. */
export function avisosVisibles(avisos: AvisoCuenta[], miDispositivoId: string | null): AvisoCuenta[] {
  return avisos.filter((a) => !(a.tipo === "dispositivo_nuevo" && miDispositivoId && a.datos?.dispositivo_id === miDispositivoId));
}
