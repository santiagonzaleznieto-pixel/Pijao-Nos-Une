import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Crea la cuenta de una persona invitada SIN enviar correo de confirmación: el código de invitación ya valida a la persona.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ mensaje: "Método no permitido" }, 405);
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return json({ mensaje: "Datos no válidos" }, 400);
  }
  const codigo = String(b.codigo ?? "").trim().toUpperCase();
  const correo = String(b.correo ?? "").trim().toLowerCase();
  const clave = String(b.clave ?? "");
  const nombre = String(b.nombre ?? "").trim();
  if (!codigo || !nombre || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
    return json({ mensaje: "Revisa el código, tu nombre y tu correo." }, 400);
  }
  if (clave.length < 12) return json({ mensaje: "La contraseña debe tener al menos 12 caracteres." }, 400);
  if (b.mayor_de_edad !== true) return json({ mensaje: "Solo pueden registrarse personas mayores de 18 años." }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: inv } = await admin.from("invitaciones").select("id").eq("codigo", codigo).eq("estado", "pendiente")
    .gt("expira_en", new Date().toISOString()).maybeSingle();
  if (!inv) return json({ mensaje: "El código de invitación no es válido, venció o ya se usó." }, 400);

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
    },
  });
  if (error) {
    const m = (error.message || "").toLowerCase();
    if (m.includes("already") || m.includes("registered")) return json({ mensaje: "Ese correo ya tiene una cuenta." }, 409);
    return json({ mensaje: "No se pudo crear la cuenta. Revisa el código e inténtalo de nuevo." }, 400);
  }
  return json({ ok: true });
});
