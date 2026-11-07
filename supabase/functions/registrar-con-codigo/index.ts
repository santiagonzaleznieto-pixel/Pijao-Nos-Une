import { createClient } from "npm:@supabase/supabase-js@2";

// Crea la cuenta de una persona invitada SIN enviar correo de confirmación: el código de invitación ya valida a la persona.
// Fase 1 · A7: límite de intentos por dirección, mensajes genéricos (no revela si un correo ya existe) y códigos de 12 caracteres.
// Fase 1 · A8: la base de datos también valida mayoría de edad, correo de la invitación y consumo con bloqueo.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const MENSAJE_GENERICO = "No se pudo crear la cuenta. Revise el código y sus datos, o pida una invitación nueva.";

// 4.10: contraseñas comunes que se rechazan siempre (lista corta y local, sin servicios externos).
const COMUNES = new Set([
  "123456789012", "1234567890123", "contraseña123", "contrasena123", "password1234", "qwertyuiop12",
  "pijaonosune1", "pijaonosune123", "colombia1234", "quindio12345", "123456789abc", "abc123456789",
  "000000000000", "111111111111", "123123123123", "iloveyou1234", "admin1234567", "teamo1234567",
]);

// Primero las cabeceras que pone la red de Supabase y que quien llama no puede falsificar; x-forwarded-for queda de
// último recurso porque su primer valor lo puede escribir el cliente (así no se salta el límite de intentos).
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
  const fallo = async (mensaje = MENSAJE_GENERICO, status = 400) => {
    await admin.rpc("rpc_registrar_intento", { p_ip: ip, p_exito: false });
    return json({ mensaje }, status);
  };

  const { data: permitido } = await admin.rpc("rpc_registro_permitido", { p_ip: ip });
  if (permitido === false) {
    return json({ mensaje: "Demasiados intentos. Espere 15 minutos e inténtelo de nuevo." }, 429);
  }

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return fallo("Datos no válidos");
  }
  const codigo = String(b.codigo ?? "").replace(/[\s-]/g, "").toUpperCase();
  const correo = String(b.correo ?? "").trim().toLowerCase();
  const clave = String(b.clave ?? "");
  const nombre = String(b.nombre ?? "").trim();

  // Validaciones de formato: estas sí se pueden explicar porque no revelan nada de otras cuentas.
  if (!nombre || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
    return json({ mensaje: "Revise su nombre y su correo." }, 400);
  }
  if (clave.length < 12) return json({ mensaje: "La contraseña debe tener al menos 12 caracteres." }, 400);
  if (COMUNES.has(clave.toLowerCase()) || /^(.)\1+$/.test(clave)) {
    return json({ mensaje: "Esa contraseña es muy común. Elija otra más difícil de adivinar." }, 400);
  }
  if (b.mayor_de_edad !== true) return json({ mensaje: "Solo pueden registrarse personas mayores de 18 años." }, 400);
  if (!/^[A-Z0-9]{8,16}$/.test(codigo)) return fallo();

  const { data: inv } = await admin.from("invitaciones").select("id").eq("codigo", codigo).eq("estado", "pendiente")
    .gt("expira_en", new Date().toISOString()).maybeSingle();
  if (!inv) return fallo();

  const { error } = await admin.auth.admin.createUser({
    email: correo,
    password: clave,
    email_confirm: true,
    user_metadata: {
      codigo_invitacion: codigo,
      nombre_completo: nombre,
      celular: String(b.celular ?? "").trim(),
      mayor_de_edad: true,
      tipo_vinculacion: b.tipo_vinculacion === "contratado" ? "contratado" : "voluntario",
      es_servidor_publico: b.es_servidor_publico === true,
      es_contratista_estado: b.es_contratista_estado === true,
      contacto_emergencia_nombre: String(b.contacto_emergencia_nombre ?? "").trim(),
      contacto_emergencia_celular: String(b.contacto_emergencia_celular ?? "").trim(),
    },
  });
  if (error) return fallo();   // mismo mensaje si el correo ya existe: no se revela qué cuentas hay (A7)

  await admin.rpc("rpc_registrar_intento", { p_ip: ip, p_exito: true });
  return json({ ok: true, mensaje: "Cuenta creada. El Director debe aprobarla antes de que pueda entrar." });
});
