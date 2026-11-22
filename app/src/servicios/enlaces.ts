// Enlaces y mensajes para sumar gente al equipo por WhatsApp (sin servicios de pago: solo abre WhatsApp con el texto listo).
import { Linking, Share } from "react-native";
import { fechaHora } from "../core/formato";

/** Siempre la última versión de la app (el flujo «App Expo» la publica con este nombre fijo). */
export const URL_APK = "https://github.com/santiagonzaleznieto-pixel/Pijao-Nos-Une/releases/download/app-ultima/pijao-nos-une.apk";

export function mensajeInvitacion(nombre: string, codigo: string, expiraEn: string): string {
  const primero = nombre.trim().split(/\s+/)[0] ?? "";
  return [
    `Hola${primero ? ` ${primero}` : ""}, le invitamos al equipo de Pijao Nos Une.`,
    "",
    `1. Descargue la app (teléfonos Android): ${URL_APK}`,
    "2. Ábrala y toque «Tengo un código de invitación».",
    `3. Escriba este código: ${codigo}`,
    "",
    `El código sirve una sola vez y vence el ${fechaHora(expiraEn)}. Si el teléfono pregunta, permita instalar la app.`,
  ].join("\n");
}

export function mensajeCodigoAcceso(nombre: string, codigo: string): string {
  const primero = nombre.trim().split(/\s+/)[0] ?? "";
  return [
    `Hola${primero ? ` ${primero}` : ""}, este es su código para recuperar el acceso a la app Pijao Nos Une: ${codigo}`,
    "",
    "En la app toque «Olvidé mi contraseña», escriba su correo, este código y su contraseña nueva. Vence en 24 horas y sirve una sola vez.",
  ].join("\n");
}

/** Celular colombiano de 10 dígitos → formato internacional para WhatsApp (57…). */
export function celularWhatsapp(celular: string | null | undefined): string | null {
  const d = String(celular ?? "").replace(/\D/g, "");
  if (/^3\d{9}$/.test(d)) return `57${d}`;
  if (/^573\d{9}$/.test(d)) return d;
  return null;
}

/** Abre WhatsApp con el mensaje (al número si se conoce). Si no hay WhatsApp, abre «Compartir» del teléfono. */
export async function enviarPorWhatsapp(texto: string, celular?: string | null): Promise<void> {
  const numero = celularWhatsapp(celular);
  const url = `https://wa.me/${numero ?? ""}?text=${encodeURIComponent(texto)}`;
  try {
    await Linking.openURL(url);
  } catch {
    await Share.share({ message: texto });
  }
}
