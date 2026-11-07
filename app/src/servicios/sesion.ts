// Sesión y seguridad de la cuenta (4.9, 4.10, 17.2, N-12, N-13).
// - Entrada con correo y contraseña (sin SMS: costo cero). Verificación en dos pasos con aplicación autenticadora (TOTP).
// - Registro con código de invitación por la función de servidor (las reglas las valida el servidor: A7, A8).
// - Señal periódica del teléfono: salud de la flota, límite de dispositivos, versión mínima y borrado remoto.
import type { SupabaseClient } from "@supabase/supabase-js";
import { limpiarCodigo, mensajeRecuperacion, problemaClave, type AvisoCuenta } from "../core/acceso";
import { limpiarDatosPersonales } from "../core/privacidad";
import { perfilDesdeRpc, type PerfilDatos } from "../core/permisos";
import type { Almacen } from "../datos/tipos";
import { ErrorRemoto, SinConexion } from "../datos/tipos";

export interface DatosRegistro {
  codigo: string; nombre: string; correo: string; clave: string; celular?: string; mayor_de_edad: boolean;
  es_servidor_publico: boolean; es_contratista_estado: boolean; tipo_vinculacion: "voluntario" | "contratado";
  contacto_emergencia_nombre?: string; contacto_emergencia_celular?: string;
}

export interface Latido {
  ok: boolean; motivo?: string; mensaje?: string; activo?: boolean; borrar_datos?: boolean; version_minima?: string | null;
  dispositivo_id?: string;
}

export interface TextoAcuerdo { tipo: string; version: string; contenido: string; borrador: boolean }

/** Compara versiones «1.2.3». Devuelve true si a < b. */
export function versionMenor(a: string, b: string | null | undefined): boolean {
  if (!b) return false;
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0, y = pb[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

const MENSAJES_ENTRADA: [RegExp, string][] = [
  [/invalid login credentials/i, "El correo o la contraseña no coinciden."],
  [/email not confirmed/i, "La cuenta todavía no está habilitada. Hable con el Director."],
  [/too many requests|rate limit/i, "Demasiados intentos. Espere 15 minutos e inténtelo de nuevo."],
];

export class ServicioSesion {
  constructor(
    private readonly cliente: SupabaseClient,
    private readonly almacen: Almacen,
    private readonly versionApp: string,
    private readonly identificadorDispositivo: () => Promise<string>,
  ) {}

  async usuarioActual(): Promise<string | null> {
    const { data } = await this.cliente.auth.getSession();
    return data.session?.user.id ?? null;
  }

  async entrar(correo: string, clave: string): Promise<void> {
    const { error } = await this.cliente.auth.signInWithPassword({ email: correo.trim().toLowerCase(), password: clave });
    if (error) {
      const m = MENSAJES_ENTRADA.find(([r]) => r.test(error.message));
      throw new Error(m ? m[1] : "No se pudo entrar. Revise su conexión e inténtelo de nuevo.");
    }
  }

  /** Cierra la sesión. Lo pendiente de envío queda cifrado y marcado con su usuario (C2); nunca sale con otra cuenta. */
  async salir(): Promise<void> {
    await this.cliente.auth.signOut();
  }

  // ------------------------------------------------------------ P-07 recuperar el acceso con un código por correo
  /** Pide el código. Responde igual exista o no la cuenta (A7): Supabase no revela qué correos están registrados. */
  async pedirCodigoRecuperacion(correo: string): Promise<void> {
    const { error } = await this.cliente.auth.resetPasswordForEmail(correo.trim().toLowerCase());
    if (error) throw new Error(mensajeRecuperacion(error));
  }

  /** Verifica el código, pone la contraseña nueva y cierra la sesión en los demás teléfonos. */
  async recuperarConCodigo(correo: string, codigo: string, claveNueva: string): Promise<void> {
    const problema = problemaClave(claveNueva);
    if (problema) throw new Error(problema);
    const { error } = await this.cliente.auth.verifyOtp({ email: correo.trim().toLowerCase(), token: limpiarCodigo(codigo), type: "recovery" });
    if (error) throw new Error(mensajeRecuperacion(error));
    await this.cambiarClave(claveNueva);
  }

  /** Cambia la contraseña con la sesión abierta y cierra las sesiones de los demás teléfonos (P-07 y 4.10). */
  async cambiarClave(claveNueva: string): Promise<void> {
    const problema = problemaClave(claveNueva);
    if (problema) throw new Error(problema);
    const { error } = await this.cliente.auth.updateUser({ password: claveNueva });
    if (error) throw new Error(mensajeRecuperacion(error));
    await this.cliente.auth.signOut({ scope: "others" }).catch(() => undefined);
  }

  // ------------------------------------------------------------ R-45 acuerdos y avisos de la cuenta (4.10)
  async acuerdosVigentes(): Promise<{ version: string | null; textos: TextoAcuerdo[] }> {
    const { data, error } = await this.cliente.rpc("rpc_acuerdos_vigentes");
    if (error) throw error.message?.match(/network|fetch/i) ? new SinConexion() : new ErrorRemoto(400, "No se pudieron leer los acuerdos.");
    const d = (data ?? {}) as { version?: string | null; textos?: TextoAcuerdo[] };
    return { version: d.version ?? null, textos: d.textos ?? [] };
  }

  async aceptarAcuerdos(version: string): Promise<void> {
    const { error } = await this.cliente.rpc("rpc_aceptar_acuerdos", { p_version: version });
    if (error) throw new Error(/cambiaron/i.test(error.message) ? error.message : "No se pudo guardar la aceptación. Revise la conexión.");
  }

  async avisos(): Promise<AvisoCuenta[]> {
    const { data, error } = await this.cliente.rpc("rpc_mis_avisos");
    if (error) return [];
    return (data as AvisoCuenta[] | null) ?? [];
  }

  async avisoLeido(id: string): Promise<void> {
    await this.cliente.rpc("rpc_aviso_leido", { p_id: id });
  }

  /** «No fui yo»: cierra a distancia el teléfono del aviso; sus datos se borran en su próxima conexión (17.2). */
  async cerrarDispositivo(dispositivoId: string): Promise<void> {
    const { error } = await this.cliente.rpc("rpc_reportar_perdido", { p_dispositivo: dispositivoId });
    if (error) throw new Error("No se pudo cerrar ese teléfono. Revise la conexión o avise al Administrador.");
  }

  async registrarConCodigo(d: DatosRegistro): Promise<string> {
    const { data, error } = await this.cliente.functions.invoke("registrar-con-codigo", {
      body: { ...d, codigo: d.codigo.replace(/[\s-]/g, "").toUpperCase(), correo: d.correo.trim().toLowerCase() },
    });
    if (error) {
      let mensaje = "No se pudo crear la cuenta. Revise el código y sus datos, o pida una invitación nueva.";
      try { mensaje = (await (error as { context?: Response }).context?.json())?.mensaje ?? mensaje; } catch { /* mensaje genérico */ }
      throw new Error(mensaje);
    }
    return (data as { mensaje?: string })?.mensaje ?? "Cuenta creada.";
  }

  async perfil(): Promise<PerfilDatos> {
    const { data, error } = await this.cliente.rpc("rpc_mi_perfil");
    if (error) throw new ErrorRemoto(Number(error.code) || 400, "No se pudo leer su perfil.");
    return perfilDesdeRpc(data as Record<string, unknown>);
  }

  // ------------------------------------------------------------ verificación en dos pasos (4.10, A4)
  async nivelVerificacion(): Promise<{ actual: string; siguiente: string }> {
    const { data } = await this.cliente.auth.mfa.getAuthenticatorAssuranceLevel();
    return { actual: data?.currentLevel ?? "aal1", siguiente: data?.nextLevel ?? "aal1" };
  }

  /** Inscribe la aplicación autenticadora. Devuelve el código QR (SVG) y la clave para escribirla a mano. */
  async inscribirAutenticador(): Promise<{ factorId: string; qr: string; secreto: string }> {
    const { data, error } = await this.cliente.auth.mfa.enroll({ factorType: "totp", friendlyName: "Pijao nos une" });
    if (error || !data) throw new Error("No se pudo activar la verificación en dos pasos.");
    return { factorId: data.id, qr: data.totp.qr_code, secreto: data.totp.secret };
  }

  async verificarCodigo(codigo: string, factorId?: string): Promise<void> {
    let id = factorId;
    if (!id) {
      const { data } = await this.cliente.auth.mfa.listFactors();
      id = data?.totp?.find((f) => f.status === "verified")?.id ?? data?.totp?.[0]?.id;
    }
    if (!id) throw new Error("Primero active la aplicación autenticadora.");
    const { error } = await this.cliente.auth.mfa.challengeAndVerify({ factorId: id, code: codigo.replace(/\D/g, "") });
    if (error) throw new Error("El código no es válido o ya venció. Escriba el código que muestra ahora la aplicación.");
  }

  // ------------------------------------------------------------ teléfono (4.10, 17.2, N-12, N-13)
  async latido(estado: { colaPendiente: number; ultimaSincronizacion: string | null; espacioLibreMb?: number; bateriaPct?: number; modelo?: string }): Promise<Latido> {
    const { data, error } = await this.cliente.rpc("rpc_latido", {
      p: {
        identificador: await this.identificadorDispositivo(), version_app: this.versionApp, plataforma: "android",
        modelo: estado.modelo, cola_pendiente: estado.colaPendiente, ultima_sincronizacion: estado.ultimaSincronizacion,
        espacio_libre_mb: estado.espacioLibreMb, bateria_pct: estado.bateriaPct,
      },
    });
    if (error) throw error.message?.match(/network|fetch/i) ? new SinConexion() : new ErrorRemoto(400, "No se pudo registrar el teléfono.");
    const l = data as Latido;
    if (l.borrar_datos) {
      // 17.2: teléfono perdido, cuenta suspendida o dada de baja: se borra todo lo local y se cierra la sesión.
      await this.almacen.borrarTodo();
      await this.cliente.auth.signOut({ scope: "local" });
    }
    return l;
  }

  necesitaActualizar(versionMinima: string | null | undefined): boolean {
    return versionMenor(this.versionApp, versionMinima);
  }

  /** Reporte de errores propio (sin servicios de pago), siempre sin datos personales. */
  async reportarError(pantalla: string, error: unknown): Promise<void> {
    const e = error instanceof Error ? error : new Error(String(error));
    try {
      await this.cliente.rpc("rpc_reportar_error", {
        p: { version_app: this.versionApp, pantalla, mensaje: limpiarDatosPersonales(e.message), traza: limpiarDatosPersonales(e.stack) },
      });
    } catch { /* sin conexión: el error no debe causar otro error */ }
  }
}
