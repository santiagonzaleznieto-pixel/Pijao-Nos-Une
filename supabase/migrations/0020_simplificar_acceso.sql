-- 0020 · Simplificación pedida por el dueño (18 de noviembre de 2026):
--   1) Sin verificación en dos pasos: «me parece muy desgastante y estoy seguro que nadie la hará».
--   2) Sin carnet digital: se apaga la consulta pública del carnet.
--   3) Recuperar el acceso sin correo: el Director o el Administrador le dan a la persona un código de un solo uso
--      (24 horas) y ella pone su contraseña nueva desde la app (función registrar… hermana: restablecer-con-codigo).
-- Los derechos de los titulares salen de la app y del panel, pero sus tablas se conservan: la página pública «Mis datos»
-- sigue recibiendo solicitudes (Ley 1581) hasta que exista la página de la campaña.

-- 1) Todas las comprobaciones de «aal2» (funciones, políticas y permisos de riesgo alto) pasan a cumplirse siempre.
--    Se cambia en un solo punto para no tocar las decenas de funciones que lo llaman.
create or replace function public._aal2() returns boolean
language sql stable set search_path = public, pg_temp as $$
  select true   -- 0020: sin verificación en dos pasos (decisión del dueño)
$$;
grant execute on function public._aal2() to authenticated;

-- 2) Carnet: la página pública de verificación se retira.
do $$
begin
  if to_regprocedure('public.rpc_publico_carnet(text)') is not null then
    revoke execute on function public.rpc_publico_carnet(text) from anon, authenticated;
  end if;
end $$;

-- 3) Códigos para recuperar el acceso. Se guarda solo el resumen (sha256) del código, nunca el código.
create table if not exists public.codigos_acceso (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  codigo_hash text not null,
  creado_por uuid not null,
  creado_en timestamptz not null default now(),
  expira_en timestamptz not null,
  usado_en timestamptz
);
create index if not exists ix_codigos_acceso_usuario on public.codigos_acceso (usuario_id) where usado_en is null;
alter table public.codigos_acceso enable row level security;   -- sin políticas: solo por las funciones de abajo
revoke all on public.codigos_acceso from anon, authenticated;

-- El Director o el Administrador (o quien tenga O-08) genera el código. Un código nuevo anula los anteriores.
create or replace function public.rpc_codigo_acceso(p_usuario uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(10);
  v_codigo text := '';
  v_exp timestamptz := now() + interval '24 hours';
  v public.perfiles;
  i int;
begin
  perform public._exigir_staff_o('O-08');
  select * into v from public.perfiles where id = p_usuario;
  if not found or v.estado = 'baja' then raise exception 'Esa cuenta no puede recuperar el acceso'; end if;
  if v.rol in ('admin', 'director') and not public.es_admin() then
    raise exception 'Solo el Administrador puede dar un código a un Director' using errcode = '42501';
  end if;
  for i in 0 .. 9 loop
    v_codigo := v_codigo || substr(v_alfabeto, (get_byte(v_bytes, i) % length(v_alfabeto)) + 1, 1);
  end loop;
  update public.codigos_acceso set usado_en = now() where usuario_id = p_usuario and usado_en is null;
  insert into public.codigos_acceso (usuario_id, codigo_hash, creado_por, expira_en)
  values (p_usuario, encode(extensions.digest(v_codigo, 'sha256'), 'hex'), auth.uid(), v_exp);
  perform public.fn_auditar('codigo_acceso', 'perfil', p_usuario::text);
  return jsonb_build_object('ok', true, 'codigo', v_codigo, 'expira_en', v_exp);
end $$;
revoke all on function public.rpc_codigo_acceso(uuid) from public, anon;
grant execute on function public.rpc_codigo_acceso(uuid) to authenticated;

-- Solo la función del servidor (clave de servicio) consume el código. Devuelve la cuenta o null (sin decir por qué).
create or replace function public.rpc_consumir_codigo_acceso(p_correo text, p_codigo text) returns uuid
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_id uuid; v_cod uuid;
begin
  select u.id into v_id from auth.users u where lower(u.email) = lower(trim(p_correo));
  if v_id is null then return null; end if;
  select c.id into v_cod from public.codigos_acceso c
   where c.usuario_id = v_id and c.usado_en is null and c.expira_en > now()
     and c.codigo_hash = encode(extensions.digest(upper(regexp_replace(coalesce(p_codigo, ''), '[\s-]', '', 'g')), 'sha256'), 'hex')
   for update;
  if v_cod is null then return null; end if;
  update public.codigos_acceso set usado_en = now() where id = v_cod;
  insert into public.auditoria (usuario_id, accion, entidad, entidad_id, detalle)
  values (v_id, 'acceso_restablecido', 'perfil', v_id::text, '{}'::jsonb);
  return v_id;
end $$;
revoke all on function public.rpc_consumir_codigo_acceso(text, text) from public, anon, authenticated;
grant execute on function public.rpc_consumir_codigo_acceso(text, text) to service_role;
