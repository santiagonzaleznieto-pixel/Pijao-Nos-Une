import { createClient } from "npm:@supabase/supabase-js@2";

// Recuperar el acceso sin correo (0020): la persona escribe su correo, el código de un solo uso que le dio el Director o el
// Administrador y su contraseña nueva. Mismo límite de intentos por dirección que el registro, y mensajes genéricos que no
// revelan si un correo existe.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const MENSAJE_GENERICO = "El correo o el código no coinciden, o el código ya venció. Pida un código nuevo al Director.";

const COMUNES = new Set([
  "123456789012", "1234567890123", "contraseña123", "contrasena123", "password1234", "qwertyuiop12",
  "pijaonosune1", "pijaonosune123", "colombia1234", "quindio12345", "123456789abc", "abc123456789",
  "000000000000", "111111111111", "123123123123", "iloveyou1234", "admin1234567", "teamo1234567",
]);

function ipDe(req: Request): string {
  return req.headers.get("cf-connecting-ip")?.trim()
    || req.headers.get("x-real-ip")?.trim()
    || (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim()
    || "desconocida";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ mensaje: "Método no permitido" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ip = ipDe(req);
  const { data: permitido } = await admin.rpc("rpc_registro_permitido", { p_ip: ip });
  if (permitido === false) return json({ mensaje: "Demasiados intentos. Espere 15 minutos e inténtelo de nuevo." }, 429);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ mensaje: "Datos no válidos" }, 400); }
  const correo = String(b.correo ?? "").trim().toLowerCase();
  const codigo = String(b.codigo ?? "").replace(/[\s-]/g, "").toUpperCase();
  const clave = String(b.clave ?? "");

  // La contraseña se revisa ANTES de gastar el código.
  if (clave.length < 12) return json({ mensaje: "La contraseña debe tener al menos 12 caracteres." }, 400);
  if (COMUNES.has(clave.toLowerCase()) || /^(.)\1+$/.test(clave)) {
    return json({ mensaje: "Esa contraseña es muy común. Elija otra más difícil de adivinar." }, 400);
  }
  const fallo = async () => {
    await admin.rpc("rpc_registrar_intento", { p_ip: ip, p_exito: false });
    return json({ mensaje: MENSAJE_GENERICO }, 400);
  };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo) || !/^[A-Z0-9]{8,16}$/.test(codigo)) return fallo();

  const { data: usuario, error } = await admin.rpc("rpc_consumir_codigo_acceso", { p_correo: correo, p_codigo: codigo });
  if (error || !usuario) return fallo();

  const { error: e2 } = await admin.auth.admin.updateUserById(String(usuario), { password: clave });
  if (e2) return json({ mensaje: "No se pudo guardar la contraseña nueva. Pida otro código al Director." }, 400);

  await admin.rpc("rpc_registrar_intento", { p_ip: ip, p_exito: true });
  return json({ ok: true, mensaje: "Listo. Ya puede entrar con su correo y su contraseña nueva." });
});
