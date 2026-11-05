-- Pijao Nos Une · 0013 · Fase 1, bloque 1.3: correcciones de seguridad del servidor
-- (hallazgos A1–A8, M1, M3, M4, M5, M7 y R-09 sin conexión de la sección 24.3 del documento maestro)
--
-- Después de aplicar esta migración, en el panel de Supabase (Authentication → Providers / Settings):
--   1. Desactivar «Allow new users to sign up» (A8). El registro solo se hace con la función registrar-con-codigo.
--   2. Longitud mínima de contraseña: 12.
--   3. Activar MFA con TOTP (aplicación autenticadora). No hace falta SMS.

-- ======================================================================= utilidades

-- A2: solo se aceptan del cliente los campos de una lista cerrada.
create or replace function public._solo_campos(j jsonb, campos text[]) returns jsonb
language sql immutable set search_path = public, pg_temp as $$
  select coalesce((select jsonb_object_agg(key, value) from jsonb_each(coalesce(j, '{}'::jsonb)) where key = any (campos)),
                  '{}'::jsonb)
$$;
revoke all on function public._solo_campos(jsonb, text[]) from public, anon, authenticated;

-- Algoritmo del rayo sobre un anillo GeoJSON [[lng, lat], ...] (igual que pijao/core/geo.py).
create or replace function public._punto_en_anillo(p_lat double precision, p_lng double precision, anillo jsonb) returns boolean
language plpgsql immutable set search_path = public, pg_temp as $$
declare n int := jsonb_array_length(anillo); i int; j int; xi float8; yi float8; xj float8; yj float8; dentro boolean := false;
begin
  if n is null or n < 3 then return false; end if;
  j := n - 1;
  for i in 0 .. n - 1 loop
    xi := (anillo -> i ->> 0)::float8; yi := (anillo -> i ->> 1)::float8;
    xj := (anillo -> j ->> 0)::float8; yj := (anillo -> j ->> 1)::float8;
    if (yi > p_lat) <> (yj > p_lat) and p_lng < (xj - xi) * (p_lat - yi) / (yj - yi) + xi then
      dentro := not dentro;
    end if;
    j := i;
  end loop;
  return dentro;
end $$;

create or replace function public._punto_en_poligono(p_lat double precision, p_lng double precision, g jsonb) returns boolean
language plpgsql immutable set search_path = public, pg_temp as $$
declare poly jsonb; k int;
begin
  if g is null or jsonb_typeof(g) <> 'object' then return false; end if;
  if g ->> 'type' = 'MultiPolygon' then
    for poly in select value from jsonb_array_elements(g -> 'coordinates') loop
      if public._punto_en_poligono(p_lat, p_lng, jsonb_build_object('type', 'Polygon', 'coordinates', poly)) then return true; end if;
    end loop;
    return false;
  end if;
  if g ->> 'type' <> 'Polygon' or not public._punto_en_anillo(p_lat, p_lng, g -> 'coordinates' -> 0) then return false; end if;
  for k in 1 .. coalesce(jsonb_array_length(g -> 'coordinates'), 1) - 1 loop
    if public._punto_en_anillo(p_lat, p_lng, g -> 'coordinates' -> k) then return false; end if;   -- cae en un hueco
  end loop;
  return true;
end $$;

-- La zona de una vivienda la decide el servidor a partir del polígono (A2), no el teléfono.
create or replace function public._zona_de_punto(p_lat double precision, p_lng double precision) returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select id from public.zonas where activo and poligono is not null and public._punto_en_poligono(p_lat, p_lng, poligono)
  order by creado_en limit 1
$$;
revoke all on function public._zona_de_punto(double precision, double precision) from public, anon, authenticated;

-- A4: las acciones de riesgo alto y las destructivas exigen la verificación en dos pasos, también al Director y al Administrador.
create or replace function public._aal2() returns boolean
language sql stable set search_path = public, pg_temp as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;
create or replace function public._exigir_aal2() returns void
language plpgsql stable set search_path = public, pg_temp as $$
begin
  if not public._aal2() then
    raise exception 'Esta acción exige la verificación en dos pasos (aplicación autenticadora)' using errcode = '42501';
  end if;
end $$;
revoke all on function public._exigir_aal2() from public, anon, authenticated;
grant execute on function public._aal2() to authenticated;

create or replace function public.tiene_permiso(p_codigo text, p_zona uuid default null) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when public.es_staff() then
      not coalesce((select requiere_2fa from public.permisos_catalogo where codigo = p_codigo), false) or public._aal2()
    else exists (
      select 1
      from public.permisos_opcionales po
      join public.perfiles pf on pf.id = po.usuario_id and pf.estado = 'activo'
      join public.permisos_catalogo pc on pc.codigo = po.codigo
      where po.usuario_id = auth.uid()
        and po.codigo = p_codigo
        and po.activo
        and (po.vence_en is null or po.vence_en > now())
        and (po.zonas is null or (p_zona is not null and p_zona = any (po.zonas)))
        and (not pc.requiere_2fa or public._aal2()))
  end
$$;

-- Ruta única de cada foto en el almacenamiento (la misma que arma pijao/core/payload.py: ruta_foto).
create or replace function public._ruta_foto(p_vivienda uuid, p_foto uuid) returns text
language sql immutable set search_path = public, pg_temp as $$
  select 'viviendas/' || p_vivienda::text || '/' || p_foto::text || '.jpg'
$$;

-- ======================================================================= configuración nueva

insert into public.configuracion (clave, valor, descripcion) values
  ('permiso_alto_max_dias', '90'::jsonb, 'M3: vigencia máxima de un permiso de riesgo alto'),
  ('no_contactar_max_dia', '15'::jsonb, 'M4: marcas de No contactar por colaborador y día antes de alertar'),
  ('accesos_completos_hora', '30'::jsonb, '8.9: accesos a datos completos por hora antes de alertar'),
  ('registro_intentos_max', '8'::jsonb, 'A7: intentos fallidos de registro por dirección en 15 minutos'),
  ('consentimiento_max_dias', '30'::jsonb, 'A1: antigüedad máxima de una autorización tomada sin conexión'),
  ('alerta_uso_pct', '80'::jsonb, '8.11: porcentaje del plan gratuito que dispara la alerta'),
  ('limite_bd_mb', '500'::jsonb, 'Plan gratuito de Supabase: base de datos'),
  ('limite_archivos_mb', '1024'::jsonb, 'Plan gratuito de Supabase: archivos'),
  ('version_minima_app', '"0.10.0"'::jsonb, 'N-13: versión mínima obligatoria de la app')
on conflict (clave) do nothing;
update public.configuracion set valor = '1024'::jsonb where clave = 'foto_lado_max_px';
update public.configuracion set valor = '100'::jsonb where clave = 'foto_peso_objetivo_kb';

-- Nuevo propósito para el plan de cierre (16.9): seguir recibiendo información de participación ciudadana.
alter table public.consentimientos drop constraint if exists consentimientos_proposito_check;
alter table public.consentimientos add constraint consentimientos_proposito_check check (proposito in (
  'registro_vivienda','datos_personales','contacto_whatsapp','contacto_llamada','contacto_sms',
  'contacto_correo','dato_sensible_simpatia','uso_historia','uso_foto','participacion_ciudadana'));
alter table public.consentimientos add column if not exists texto_hash text;

-- 16.5: el titular también puede pedir la prueba de su autorización.
alter table public.solicitudes_titulares drop constraint if exists solicitudes_titulares_tipo_check;
alter table public.solicitudes_titulares add constraint solicitudes_titulares_tipo_check check (tipo in (
  'consulta','actualizacion','supresion','revocatoria','queja','prueba_autorizacion'));

-- Control de versión para las ediciones (5.13).
alter table public.visitas add column if not exists version int not null default 1;

-- Dispositivos: borrado remoto (17.2) y salud de la flota (N-12).
alter table public.dispositivos add column if not exists orden_borrado boolean not null default false;
alter table public.dispositivos add column if not exists reportado_perdido_en timestamptz;
alter table public.dispositivos add column if not exists cola_pendiente int;
alter table public.dispositivos add column if not exists ultima_sincronizacion timestamptz;
alter table public.dispositivos add column if not exists espacio_libre_mb int;
alter table public.dispositivos add column if not exists bateria_pct int;

-- ======================================================================= auditoría (M5)

alter table public.auditoria add column if not exists actor_rol text;
alter table public.auditoria add column if not exists hash_anterior text;
alter table public.auditoria add column if not exists hash text;

create or replace function public.fn_auditoria_encadenar() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtext('pijao_auditoria'));
  select hash into new.hash_anterior from public.auditoria order by id desc limit 1;
  new.hash := encode(extensions.digest(
    coalesce(new.hash_anterior, '') || '|' || new.id || '|' || coalesce(new.usuario_id::text, '') || '|' || new.accion || '|' ||
    new.entidad || '|' || coalesce(new.entidad_id, '') || '|' || new.detalle::text || '|' || new.creado_en::text, 'sha256'), 'hex');
  return new;
end $$;
drop trigger if exists trg_auditoria_encadenar on public.auditoria;
create trigger trg_auditoria_encadenar before insert on public.auditoria
  for each row execute function public.fn_auditoria_encadenar();

drop trigger if exists trg_auditoria_no_truncate on public.auditoria;
create trigger trg_auditoria_no_truncate before truncate on public.auditoria
  for each statement execute function public.fn_auditoria_solo_agregar();
revoke truncate, update, delete on public.auditoria from public, anon, authenticated;

-- Verifica que nadie alteró la cadena de auditoría.
create or replace function public.rpc_verificar_auditoria() returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare r record; v_prev text; v_calc text; v_n bigint := 0;
begin
  if not public.es_admin() then raise exception 'Solo el Administrador' using errcode = '42501'; end if;
  for r in select * from public.auditoria where hash is not null order by id loop
    v_calc := encode(extensions.digest(
      coalesce(r.hash_anterior, '') || '|' || r.id || '|' || coalesce(r.usuario_id::text, '') || '|' || r.accion || '|' ||
      r.entidad || '|' || coalesce(r.entidad_id, '') || '|' || r.detalle::text || '|' || r.creado_en::text, 'sha256'), 'hex');
    if v_calc <> r.hash or (v_prev is not null and r.hash_anterior is distinct from v_prev) then
      return jsonb_build_object('integra', false, 'primer_id_roto', r.id, 'revisados', v_n);
    end if;
    v_prev := r.hash; v_n := v_n + 1;
  end loop;
  return jsonb_build_object('integra', true, 'revisados', v_n);
end $$;

create or replace function public.fn_auditar(p_accion text, p_entidad text, p_id text default null,
                                             p_detalle jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_ip text;
begin
  begin
    v_ip := (current_setting('request.headers', true)::jsonb) ->> 'x-forwarded-for';
  exception when others then
    v_ip := null;
  end;
  insert into public.auditoria (usuario_id, accion, entidad, entidad_id, detalle, ip, actor_rol)
  values (auth.uid(), p_accion, p_entidad, p_id, coalesce(p_detalle, '{}'::jsonb), v_ip,
          coalesce(auth.role(), current_user));
end $$;
revoke all on function public.fn_auditar(text, text, text, jsonb) from public, anon, authenticated;

-- ======================================================================= alta de cuentas (A7, A8)

create table if not exists public.intentos_registro (
  id bigint generated always as identity primary key,
  ip text,
  exito boolean not null,
  creado_en timestamptz not null default now()
);
alter table public.intentos_registro enable row level security;   -- sin políticas: solo la función de servidor (service_role)
create index if not exists ix_intentos_ip on public.intentos_registro (ip, creado_en desc);

create or replace function public.rpc_registro_permitido(p_ip text) returns boolean
language sql stable security definer set search_path = public as $$
  select (select count(*) from public.intentos_registro
           where ip = p_ip and not exito and creado_en > now() - interval '15 minutes')
         < public.cfg_num('registro_intentos_max', 8)
$$;
create or replace function public.rpc_registrar_intento(p_ip text, p_exito boolean) returns void
language sql security definer set search_path = public as $$
  insert into public.intentos_registro (ip, exito) values (p_ip, p_exito);
  delete from public.intentos_registro where creado_en < now() - interval '2 days';
$$;
revoke all on function public.rpc_registro_permitido(text) from public, anon, authenticated;
revoke all on function public.rpc_registrar_intento(text, boolean) from public, anon, authenticated;
grant execute on function public.rpc_registro_permitido(text) to service_role;
grant execute on function public.rpc_registrar_intento(text, boolean) to service_role;

-- Antes de crear la cuenta: la invitación se valida y se consume con bloqueo (dos registros a la vez no usan el mismo código).
create or replace function public.fn_auth_antes_de_crear() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_token text;
  v_inv public.invitaciones;
begin
  if (v_meta ->> 'bootstrap_token') is not null then
    select valor ->> 'token' into v_token from public.instalacion where clave = 'bootstrap';
    if v_token is not null and v_token = (v_meta ->> 'bootstrap_token')
       and not exists (select 1 from public.perfiles where rol = 'admin') then
      return new;
    end if;
    raise exception 'Instalación no autorizada' using errcode = '42501';
  end if;
  select * into v_inv from public.invitaciones
   where codigo = upper(coalesce(v_meta ->> 'codigo_invitacion', ''))
     and estado = 'pendiente' and expira_en > now()
   for update;
  if not found then
    raise exception 'Se necesita una invitación vigente' using errcode = '42501';
  end if;
  if coalesce((v_meta ->> 'mayor_de_edad')::boolean, false) is not true then
    raise exception 'R-06: solo pueden registrarse personas mayores de 18 años' using errcode = '42501';
  end if;
  if nullif(trim(v_inv.correo), '') is not null and lower(trim(v_inv.correo)) <> lower(trim(new.email)) then
    raise exception 'El correo no coincide con el de la invitación' using errcode = '42501';
  end if;
  update public.invitaciones set estado = 'usada', usada_en = now() where id = v_inv.id;
  return new;
end $$;

-- Después de crear la cuenta: toda cuenta nueva, incluida la de un Director invitado, queda pendiente de aprobación.
create or replace function public.fn_auth_despues_de_crear() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_inv public.invitaciones;
  v_serv boolean := coalesce((v_meta ->> 'es_servidor_publico')::boolean, false);
  v_contr boolean := coalesce((v_meta ->> 'es_contratista_estado')::boolean, false);
begin
  if (v_meta ->> 'bootstrap_token') is not null then
    insert into public.perfiles (id, nombre_completo, correo, rol, estado, mayor_de_edad, curso_aprobado_en, acuerdos_aceptados_en)
    values (new.id, coalesce(nullif(v_meta ->> 'nombre_completo', ''), 'Administrador'), new.email, 'admin', 'activo', true, now(), now());
    delete from public.instalacion where clave = 'bootstrap';
    return new;
  end if;

  select * into v_inv from public.invitaciones
   where codigo = upper(coalesce(v_meta ->> 'codigo_invitacion', '')) and estado = 'usada' and usada_por is null
   limit 1;
  if not found then
    raise exception 'Invitación no encontrada' using errcode = '42501';
  end if;

  insert into public.perfiles (
    id, nombre_completo, celular, correo, rol, estado, tipo_vinculacion, es_servidor_publico, es_contratista_estado,
    mayor_de_edad, contacto_emergencia_nombre, contacto_emergencia_celular, invitado_por, motivo_estado)
  values (
    new.id,
    coalesce(nullif(v_meta ->> 'nombre_completo', ''), v_inv.nombre),
    coalesce(nullif(v_meta ->> 'celular', ''), v_inv.celular),
    new.email, 'colaborador', 'pendiente',
    nullif(v_meta ->> 'tipo_vinculacion', ''), v_serv, v_contr, true,
    v_meta ->> 'contacto_emergencia_nombre', v_meta ->> 'contacto_emergencia_celular', v_inv.creado_por,
    case when v_inv.rol_destino = 'director' then 'Invitado como Director: lo designa el Administrador' end);

  update public.invitaciones set usada_por = new.id where id = v_inv.id;

  if v_serv or v_contr then   -- R-07: alerta al Director para revisión del abogado
    insert into public.alertas_calidad (tipo, severidad, usuario_id, detalle)
    values ('servidor_publico_o_contratista', 'media', new.id,
            jsonb_build_object('es_servidor_publico', v_serv, 'es_contratista_estado', v_contr));
  end if;
  return new;
end $$;

-- A7: código de 12 caracteres sin letras ni números que se confundan. La auditoría no guarda el nombre (A6).
create or replace function public.rpc_invitar(p_nombre text, p_celular text default null, p_correo text default null,
                                              p_rol text default 'colaborador') returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(12);
  v_codigo text := '';
  v_exp timestamptz;
  i int;
begin
  perform public._exigir_staff_o('O-08');
  if p_rol = 'director' and not public.es_admin() then
    raise exception 'Solo el Administrador puede invitar a un Director' using errcode = '42501';
  end if;
  if p_rol not in ('colaborador', 'director') then raise exception 'Rol no válido'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'Escriba el nombre de la persona'; end if;
  for i in 0 .. 11 loop
    v_codigo := v_codigo || substr(v_alfabeto, (get_byte(v_bytes, i) % length(v_alfabeto)) + 1, 1);
  end loop;
  v_exp := now() + make_interval(hours => public.cfg_num('invitacion_horas', 72)::int);
  insert into public.invitaciones (codigo, nombre, celular, correo, rol_destino, creado_por, expira_en)
  values (v_codigo, trim(p_nombre), p_celular, nullif(lower(trim(p_correo)), ''), p_rol, auth.uid(), v_exp);
  perform public.fn_auditar('invitar', 'invitacion', null, jsonb_build_object('rol', p_rol));
  return jsonb_build_object('ok', true, 'codigo', v_codigo, 'expira_en', v_exp);
end $$;

-- 4.9: se aprueba o se rechaza con motivo.
create or replace function public.rpc_aprobar_usuario(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_staff_o('O-08');
  update public.perfiles set estado = 'aprobado', aprobado_por = auth.uid(), motivo_estado = null
   where id = p_id and estado = 'pendiente' and rol = 'colaborador';
  if not found then raise exception 'No hay una solicitud pendiente para esa cuenta'; end if;
  perform public.fn_auditar('aprobar_usuario', 'perfil', p_id::text);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rpc_rechazar_usuario(p_id uuid, p_motivo text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_staff_o('O-08');
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Escriba el motivo del rechazo'; end if;
  update public.perfiles set estado = 'baja', motivo_estado = 'Solicitud rechazada: ' || trim(p_motivo)
   where id = p_id and estado = 'pendiente' and rol = 'colaborador';
  if not found then raise exception 'No hay una solicitud pendiente para esa cuenta'; end if;
  perform public.fn_auditar('rechazar_usuario', 'perfil', p_id::text, jsonb_build_object('motivo', p_motivo));
  return jsonb_build_object('ok', true);
end $$;

-- A4 y 4.3: designar al Director exige la verificación en dos pasos. La persona anterior pierde el rol.
create or replace function public.rpc_designar_director(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.perfiles;
begin
  if not public.es_admin() then raise exception 'Solo el Administrador' using errcode = '42501'; end if;
  perform public._exigir_aal2();
  select * into v from public.perfiles where id = p_id;
  if not found or v.rol = 'admin' or v.estado not in ('activo', 'aprobado') then
    raise exception 'La cuenta no puede ser Director';
  end if;
  update public.perfiles set rol = 'colaborador' where rol = 'director' and id <> p_id;
  update public.perfiles set rol = 'director', estado = 'activo', motivo_estado = null,
         curso_aprobado_en = coalesce(curso_aprobado_en, now()), acuerdos_aceptados_en = coalesce(acuerdos_aceptados_en, now())
   where id = p_id;
  update public.permisos_opcionales set activo = false where usuario_id = p_id and activo;   -- el Director no usa extras
  perform public.fn_auditar('designar_director', 'perfil', p_id::text);
  return jsonb_build_object('ok', true);
end $$;

-- M3: los permisos de riesgo alto exigen vencimiento, con un máximo configurable.
create or replace function public.rpc_set_permiso(p_usuario uuid, p_codigo text, p_activo boolean,
                                                  p_vence timestamptz default null, p_zonas uuid[] default null,
                                                  p_motivo text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_def public.permisos_catalogo; v_rol text; v_max int := public.cfg_num('permiso_alto_max_dias', 90)::int;
begin
  if not public.es_staff() then raise exception 'Solo el Director o el Administrador' using errcode = '42501'; end if;
  select * into v_def from public.permisos_catalogo where codigo = p_codigo;
  if not found then raise exception 'Permiso desconocido: %', p_codigo; end if;
  select rol into v_rol from public.perfiles where id = p_usuario;
  if v_rol is distinct from 'colaborador' then
    raise exception 'Los permisos opcionales son solo para colaboradores';
  end if;
  if p_zonas is not null and not v_def.acepta_zonas then
    raise exception 'El permiso % no se puede limitar a una zona', p_codigo;
  end if;
  if p_activo and p_vence is not null and p_vence <= now() then
    raise exception 'La fecha de vencimiento ya pasó';
  end if;
  if p_activo and v_def.riesgo = 'alto' then
    if p_vence is null then
      raise exception 'M3: el permiso % es de riesgo alto y necesita fecha de vencimiento (máximo % días)', p_codigo, v_max;
    end if;
    if p_vence > now() + make_interval(days => v_max) then
      raise exception 'M3: un permiso de riesgo alto vence en máximo % días', v_max;
    end if;
  end if;
  if not p_activo then
    update public.permisos_opcionales set activo = false where usuario_id = p_usuario and codigo = p_codigo and activo;
  else
    update public.permisos_opcionales
       set vence_en = p_vence, zonas = p_zonas, motivo = p_motivo, otorgado_por = auth.uid(), otorgado_en = now()
     where usuario_id = p_usuario and codigo = p_codigo and activo;
    if not found then
      insert into public.permisos_opcionales (usuario_id, codigo, otorgado_por, vence_en, zonas, motivo)
      values (p_usuario, p_codigo, auth.uid(), p_vence, p_zonas, p_motivo);
    end if;
  end if;
  perform public.fn_auditar('permiso', 'perfil', p_usuario::text,
    jsonb_build_object('codigo', p_codigo, 'activo', p_activo, 'vence', p_vence, 'zonas', p_zonas, 'motivo', p_motivo));
  return jsonb_build_object('ok', true);
end $$;

-- ======================================================================= registrar una visita (A1, A2, M1, R-09)

create or replace function public._consentimiento_valido(c jsonb, p_fotos jsonb) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_fecha timestamptz;
  v_version_vigente text;
  v_metodo text := c ->> 'metodo';
begin
  begin
    v_fecha := (c ->> 'otorgado_en')::timestamptz;
  exception when others then
    return 'la fecha de la autorización no es válida';
  end;
  if v_fecha is null then return 'falta la fecha de la autorización'; end if;
  if v_fecha > now() + interval '10 minutes' then return 'la fecha de la autorización está en el futuro'; end if;
  if v_fecha < now() - make_interval(days => public.cfg_num('consentimiento_max_dias', 30)::int) then
    return 'la autorización es demasiado antigua';
  end if;
  if coalesce(c ->> 'version_texto', '') = '' then return 'falta la versión del texto de autorización'; end if;
  select version into v_version_vigente from public.textos_legales
   where tipo = 'autorizacion' and vigente and not es_borrador order by creado_en desc limit 1;
  if v_version_vigente is not null and c ->> 'version_texto' <> v_version_vigente then
    return 'la versión del texto de autorización no es la vigente (' || v_version_vigente || ')';
  end if;
  if v_metodo = 'firma_pantalla' then
    if coalesce(jsonb_typeof(c -> 'evidencia' -> 'firma'), 'null') = 'null'
       or (c -> 'evidencia' ->> 'firma') in ('', '[]', '{}') then
      return 'falta la firma en pantalla';
    end if;
  elsif v_metodo = 'verbal' then
    if not coalesce((c -> 'evidencia' ->> 'verbal')::boolean, false) or coalesce(c -> 'evidencia' ->> 'hora', '') = '' then
      return 'falta la confirmación y la hora de la autorización verbal';
    end if;
  elsif v_metodo = 'papel' then
    if not exists (select 1 from jsonb_array_elements(coalesce(p_fotos, '[]'::jsonb)) as t(f) where f ->> 'tipo' = 'autorizacion') then
      return 'falta la foto de la autorización en papel';
    end if;
  else
    return 'método de autorización desconocido';
  end if;
  return null;
end $$;
revoke all on function public._consentimiento_valido(jsonb, jsonb) from public, anon, authenticated;

create or replace function public.rpc_registrar_visita(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  c_viv constant text[] := array['id','lat','lng','precision_m','altitud_m','fuente_ubicacion','zona_urbana_rural','barrio_vereda',
    'direccion','complemento','nombre_finca','indicaciones','referencia','tipo_vivienda','estado_ocupacion','tenencia','servicios',
    'via_acceso','riesgos','actividad_economica'];
  c_hog constant text[] := array['id','total_personas','edades','mujeres','hombres','votantes_pijao_est','votantes_otro_mpio_est',
    'votantes_no_sabe_est','futuros_primeros_votantes','sosten_persona_id','sosten_relacion','sosten_sexo','sosten_ocupacion',
    'sosten_situacion_laboral','familiares_fuera','mascotas','otros_hogares'];
  c_per constant text[] := array['id','primer_nombre','segundo_nombre','primer_apellido','segundo_apellido','apodo','tipo_documento',
    'fecha_nacimiento','mayor_edad_confirmada','sexo','ocupacion','telefono_es_whatsapp','canal_preferido','mejor_horario',
    'anios_en_pijao','vive_en_otra_ciudad','vota_en_pijao','puesto_votacion','mesa_votacion','interes_info','voluntario','anfitrion',
    'temas_interes'];
  c_con constant text[] := array['id','persona_id','proposito','version_texto','metodo','evidencia','otorgado_en','lat','lng'];
  c_nec constant text[] := array['id','tema','prioridad','texto','alcance','origen','desea_respuesta'];
  c_vis constant text[] := array['id','resultado','autorizacion_verbal','notas','seguimiento_requerido','seguimiento_fecha',
    'seguimiento_motivo','volante_entregado','motivo_manual','no_autorizo_foto','dispositivo_precision_m'];
  c_fot constant text[] := array['id','tipo','lat','lng','tomada_en','tam_bytes','hash','con_personas'];
  v_uid uuid := auth.uid();
  v_viv jsonb := p -> 'vivienda';
  v_vis jsonb := p -> 'visita';
  v_hog jsonb := p -> 'hogar';
  v_dev jsonb := coalesce(p -> 'dispositivo', '{}'::jsonb);
  v_fotos jsonb := coalesce(p -> 'fotos', '[]'::jsonb);
  v_cons jsonb := coalesce(p -> 'consentimientos', '[]'::jsonb);
  v_vid uuid;
  v_visita_id uuid;
  v_hogar_id uuid;
  v_zona uuid;
  v_resultado text;
  v_manual boolean;
  v_solo boolean;
  v_existe boolean;
  v_estado_prev text;
  v_lat double precision;
  v_lng double precision;
  v_prec double precision;
  v_dlat double precision;
  v_dlng double precision;
  v_dist double precision;
  v_diferido boolean := false;
  v_revision boolean := false;
  v_calidad text := 'verde';
  v_motivos text[] := '{}';
  v_avisos text[] := '{}';
  v_dups jsonb := '[]'::jsonb;
  v_per jsonb;
  v_con jsonb;
  v_nec jsonb;
  v_foto jsonb;
  v_pid uuid;
  v_ced text;
  v_tel text;
  v_correo text;
  v_otro uuid;
  v_nac date;
  v_consent boolean;
  v_consent_simp boolean;
  v_error_con text;
  v_n_fachada int;
  v_fecha timestamptz;
  v_prev record;
  v_dt double precision;
  v_dd double precision;
  v_asignado uuid;
  v_hash_texto text;
begin
  if public.mi_rol() is null then
    raise exception 'Cuenta no activa' using errcode = '42501';
  end if;
  v_vid := (v_viv ->> 'id')::uuid;
  v_visita_id := (v_vis ->> 'id')::uuid;
  if v_vid is null or v_visita_id is null then
    raise exception 'Faltan los identificadores de la vivienda o de la visita';
  end if;
  v_resultado := v_vis ->> 'resultado';
  v_manual := coalesce((v_vis ->> 'ubicacion_manual')::boolean, false);
  v_solo := coalesce((v_viv ->> 'solo_visita')::boolean, false);
  v_fecha := least(coalesce(nullif(v_vis ->> 'fecha', '')::timestamptz, now()), now() + interval '10 minutes');
  v_dlat := nullif(v_dev ->> 'lat', '')::double precision;
  v_dlng := nullif(v_dev ->> 'lng', '')::double precision;

  -- Idempotencia: reenviar el mismo registro no lo duplica.
  if exists (select 1 from public.visitas where id = v_visita_id) then
    return jsonb_build_object('ok', true, 'duplicado', true);
  end if;

  select exists (select 1 from public.viviendas where id = v_vid) into v_existe;
  if v_solo and not v_existe then
    raise exception 'La vivienda % no existe', v_vid;
  end if;
  if v_existe then
    select lat, lng, precision_m, estado into v_lat, v_lng, v_prec, v_estado_prev
      from public.viviendas where id = v_vid;
    if v_estado_prev = 'no_contactar' and not public.es_staff() then
      raise exception 'R-21: la vivienda está marcada como No contactar';
    end if;
  else
    v_lat := (v_viv ->> 'lat')::double precision;
    v_lng := (v_viv ->> 'lng')::double precision;
    v_prec := nullif(v_viv ->> 'precision_m', '')::double precision;
  end if;
  if v_lat is null or v_lng is null then
    raise exception 'Falta la ubicación de la vivienda';
  end if;
  if v_lat not between -5 and 14 or v_lng not between -82 and -66 then
    raise exception 'Coordenadas fuera de Colombia (¿latitud y longitud invertidas?)';
  end if;

  -- R-09 / R-12: distancia entre el teléfono y el punto. Lo capturado sin conexión no se rechaza: se acepta y se marca (24.2).
  if v_dlat is not null and v_dlng is not null then
    v_dist := public.dist_m(v_dlat, v_dlng, v_lat, v_lng);
    if not v_manual and not v_existe and v_dist > public.cfg_num('distancia_max_registro_m', 50) then
      v_revision := true;
      v_calidad := 'rojo';
      v_motivos := v_motivos || format('R-09: el teléfono estaba a %s m de la vivienda', round(v_dist));
    end if;
    if v_manual and v_dist > public.cfg_num('ubicacion_manual_max_m', 100) then
      v_diferido := true;
      v_avisos := v_avisos || 'Registro diferido: queda pendiente de aprobación'::text;
    end if;
  elsif not v_existe then
    v_calidad := 'rojo';
    v_motivos := v_motivos || 'Sin ubicación del dispositivo'::text;
  end if;

  -- R-10: precisión del GPS.
  if not v_existe and coalesce(v_viv ->> 'fuente_ubicacion', 'gps') = 'gps'
     and (v_prec is null or v_prec > public.cfg_num('precision_min_m', 20)) then
    v_calidad := 'rojo';
    v_motivos := v_motivos || 'Precisión del GPS débil'::text;
  end if;

  -- R-13: foto de fachada.
  select count(*) into v_n_fachada from jsonb_array_elements(v_fotos) as t(c) where c ->> 'tipo' = 'fachada';
  if not v_existe and v_n_fachada = 0 and not coalesce((v_vis ->> 'no_autorizo_foto')::boolean, false) then
    v_calidad := 'rojo';
    v_motivos := v_motivos || 'Falta la foto de fachada'::text;
  end if;
  -- R-14: máximo de fotos por visita.
  if jsonb_array_length(v_fotos) > public.cfg_num('fotos_max_visita', 6) then
    raise exception 'R-14: máximo % fotos por visita', public.cfg_num('fotos_max_visita', 6);
  end if;

  -- Autorización verbal cuando hubo conversación (6.3, paso 4).
  if v_resultado in ('conversacion_completa', 'conversacion_breve', 'pidio_volver')
     and not coalesce((v_vis ->> 'autorizacion_verbal')::boolean, false) then
    v_calidad := 'rojo';
    v_motivos := v_motivos || 'Falta la autorización verbal'::text;
  end if;

  if v_hog is not null and jsonb_typeof(v_hog) = 'object' and v_calidad = 'verde'
     and nullif(v_hog ->> 'sosten_relacion', '') is null and nullif(v_hog ->> 'sosten_persona_id', '') is null then
    v_calidad := 'amarillo';
    v_motivos := v_motivos || 'Falta el principal sostén del hogar'::text;
  end if;
  if v_manual and nullif(v_vis ->> 'motivo_manual', '') is null and v_calidad = 'verde' then
    v_calidad := 'amarillo';
    v_motivos := v_motivos || 'Falta el motivo de la ubicación manual'::text;
  end if;

  -- Vivienda: se crea, o se actualiza su estado si ya existía. La zona la decide el polígono (A2).
  if not v_existe then
    v_zona := public._zona_de_punto(v_lat, v_lng);
    insert into public.viviendas
    select * from jsonb_populate_record(null::public.viviendas,
      public._solo_campos(v_viv, c_viv) || jsonb_build_object(
        'zona_id', v_zona,
        'estado', public.estado_por_resultado(v_resultado),
        'fuente_ubicacion', case when coalesce(v_viv ->> 'fuente_ubicacion', '') in ('gps', 'manual', 'geocodificada')
                                 then v_viv ->> 'fuente_ubicacion' when v_manual then 'manual' else 'gps' end,
        'es_reconocimiento', false,
        'requiere_aprobacion', v_diferido or v_revision,
        'calidad', v_calidad,
        'creado_por', v_uid, 'creado_en', now(), 'actualizado_en', now()));
    -- R-08: posible duplicado (otra vivienda a menos de 15 m). Se avisa, no se bloquea.
    for v_prev in
      select id from public.viviendas
       where id <> v_vid and eliminado_en is null
         and lat between v_lat - 0.0005 and v_lat + 0.0005 and lng between v_lng - 0.0005 and v_lng + 0.0005
         and public.dist_m(lat, lng, v_lat, v_lng) <= public.cfg_num('radio_duplicados_m', 15)
    loop
      insert into public.alertas_calidad (tipo, severidad, usuario_id, vivienda_id, detalle)
      values ('posible_duplicado', 'baja', v_uid, v_vid, jsonb_build_object('otra_vivienda', v_prev.id));
      v_avisos := v_avisos || 'Hay otra vivienda registrada a menos de 15 m'::text;
      exit;
    end loop;
  else
    update public.viviendas set estado = public.estado_por_resultado(v_resultado), calidad = v_calidad where id = v_vid;
  end if;
  if v_revision then
    insert into public.alertas_calidad (tipo, severidad, usuario_id, vivienda_id, visita_id, detalle)
    values ('distancia_excedida', 'media', v_uid, v_vid, v_visita_id, jsonb_build_object('metros', round(v_dist)));
  end if;

  -- Fuera del municipio.
  if public.dist_m(v_lat, v_lng, public.cfg_num('centro_lat', 4.3333), public.cfg_num('centro_lng', -75.7))
       > public.cfg_num('radio_municipio_km', 30) * 1000 then
    insert into public.alertas_calidad (tipo, severidad, usuario_id, vivienda_id, detalle)
    values ('fuera_del_municipio', 'media', v_uid, v_vid, jsonb_build_object('lat', v_lat, 'lng', v_lng));
    v_avisos := v_avisos || 'El punto parece estar fuera del municipio'::text;
  end if;

  -- Hogar.
  if v_hog is not null and jsonb_typeof(v_hog) = 'object' then
    v_hogar_id := (v_hog ->> 'id')::uuid;
    if (select coalesce(sum(value::int), 0) from jsonb_each_text(coalesce(v_hog -> 'edades', '{}'::jsonb)))
         <> (v_hog ->> 'total_personas')::int then
      raise exception 'Los rangos de edad no suman el total de personas del hogar';
    end if;
    insert into public.hogares
    select * from jsonb_populate_record(null::public.hogares,
      public._solo_campos(v_hog, c_hog) || jsonb_build_object(
        'vivienda_id', v_vid,
        'edades', coalesce(v_hog -> 'edades', '{}'::jsonb),
        'jefatura_femenina', (v_hog ->> 'sosten_sexo') = 'mujer',
        'creado_por', v_uid, 'creado_en', now(), 'actualizado_en', now()))
    on conflict (id) do nothing;
  end if;

  -- Cada autorización debe tener evidencia válida (A1). Una autorización inválida detiene el registro completo.
  for v_con in select c from jsonb_array_elements(v_cons) as t(c) loop
    v_error_con := public._consentimiento_valido(v_con, v_fotos);
    if v_error_con is not null then
      raise exception 'A1: autorización no válida (%): %', coalesce(v_con ->> 'proposito', '?'), v_error_con;
    end if;
  end loop;
  select encode(extensions.digest(contenido, 'sha256'), 'hex') into v_hash_texto
    from public.textos_legales where tipo = 'autorizacion' and vigente order by es_borrador, creado_en desc limit 1;

  -- Personas (R-15, R-16, R-17, R-19).
  for v_per in select c from jsonb_array_elements(coalesce(p -> 'personas', '[]'::jsonb)) as t(c) loop
    v_pid := (v_per ->> 'id')::uuid;

    -- A1: la autorización de datos personales es de ESA persona; ya no vale una «global».
    select exists (
      select 1 from jsonb_array_elements(v_cons) as t(c)
       where c ->> 'proposito' = 'datos_personales'
         and c ->> 'persona_id' = v_per ->> 'id') into v_consent;
    if not v_consent then
      raise exception 'R-15: falta la autorización de datos personales de %', coalesce(v_per ->> 'primer_nombre', 'una persona');
    end if;

    v_nac := nullif(v_per ->> 'fecha_nacimiento', '')::date;
    if v_nac is not null then
      if date_part('year', age(current_date, v_nac)) < 18 then
        raise exception 'R-16: solo se registran personas mayores de 18 años';
      end if;
      if date_part('year', age(current_date, v_nac)) > 110 then
        raise exception 'La fecha de nacimiento no es válida';
      end if;
    elsif not coalesce((v_per ->> 'mayor_edad_confirmada')::boolean, false) then
      raise exception 'R-16: confirme que la persona es mayor de 18 años';
    end if;

    v_ced := nullif(regexp_replace(coalesce(v_per ->> 'cedula', ''), '\D', '', 'g'), '');
    if v_ced is not null and v_ced !~ '^\d{6,10}$' then
      raise exception 'R-17: la cédula debe tener entre 6 y 10 dígitos';
    end if;
    v_otro := null;
    if v_ced is not null then
      select id into v_otro from public.personas
       where cedula_hash = public._hash(v_ced) and eliminado_en is null and id <> v_pid limit 1;
    end if;
    if v_otro is not null then
      -- M1: no se revela el id de la persona existente; solo que ya está registrada, y queda en la auditoría.
      v_dups := v_dups || jsonb_build_object('id_cliente', v_pid, 'ya_registrada', true);
      perform public.fn_auditar('cedula_ya_registrada', 'persona', v_otro::text, jsonb_build_object('vivienda', v_vid));
      continue;
    end if;

    insert into public.personas
    select * from jsonb_populate_record(null::public.personas,
      public._solo_campos(v_per, c_per) || jsonb_build_object(
        'hogar_id', v_hogar_id, 'vivienda_id', v_vid, 'estado', 'activa',
        'tipo_documento', case when v_per ->> 'tipo_documento' in ('CC', 'CE') then v_per ->> 'tipo_documento' else 'CC' end,
        'mayor_edad_confirmada', coalesce((v_per ->> 'mayor_edad_confirmada')::boolean, v_nac is not null),
        'creado_por', v_uid, 'creado_en', now(), 'actualizado_en', now()))
    on conflict (id) do nothing;

    v_tel := nullif(regexp_replace(coalesce(v_per ->> 'telefono', ''), '\D', '', 'g'), '');
    v_correo := nullif(v_per ->> 'correo', '');
    select exists (
      select 1 from jsonb_array_elements(v_cons) as t(c)
       where c ->> 'proposito' = 'dato_sensible_simpatia'
         and c ->> 'persona_id' = v_per ->> 'id') into v_consent_simp;
    if nullif(v_per ->> 'simpatia', '') is not null and not v_consent_simp then
      v_avisos := v_avisos || 'R-19: la simpatía no se guardó porque falta la autorización específica'::text;
    end if;

    update public.personas set
      cedula_enc = public._enc(v_ced),
      cedula_hash = public._hash(v_ced),
      cedula_ult3 = case when v_ced is not null then right(v_ced, 3) end,
      telefono_enc = public._enc(v_tel),
      telefono_ult4 = case when v_tel is not null then right(v_tel, 4) end,
      telefono2_enc = public._enc(nullif(regexp_replace(coalesce(v_per ->> 'telefono2', ''), '\D', '', 'g'), '')),
      correo_enc = public._enc(v_correo),
      correo_parcial = case when v_correo is not null and position('@' in v_correo) > 1 then
        left(split_part(v_correo, '@', 1), 1) || '•••@' || left(split_part(v_correo, '@', 2), 1) || '•••.' ||
        regexp_replace(split_part(v_correo, '@', 2), '^.*\.', '') end,
      simpatia_enc = case when v_consent_simp then public._enc(nullif(v_per ->> 'simpatia', '')) end
    where id = v_pid and creado_por = v_uid;
  end loop;

  -- Consentimientos (se omiten los de personas que no se guardaron por estar duplicadas).
  for v_con in select c from jsonb_array_elements(v_cons) as t(c) loop
    if nullif(v_con ->> 'persona_id', '') is not null
       and not exists (select 1 from public.personas where id = (v_con ->> 'persona_id')::uuid and creado_por = v_uid) then
      continue;
    end if;
    insert into public.consentimientos
    select * from jsonb_populate_record(null::public.consentimientos,
      public._solo_campos(v_con, c_con) || jsonb_build_object(
        'vivienda_id', v_vid, 'hogar_id', v_hogar_id, 'recogido_por', v_uid,
        'estado', 'vigente', 'revocado_en', null, 'revocado_motivo', null,
        'evidencia', coalesce(v_con -> 'evidencia', '{}'::jsonb),
        'texto_hash', v_hash_texto,
        'creado_en', now(), 'actualizado_en', now()))
    on conflict (id) do nothing;
  end loop;

  -- Necesidades.
  for v_nec in select c from jsonb_array_elements(coalesce(p -> 'necesidades', '[]'::jsonb)) as t(c) loop
    insert into public.necesidades
    select * from jsonb_populate_record(null::public.necesidades,
      public._solo_campos(v_nec, c_nec) || jsonb_build_object(
        'hogar_id', v_hogar_id, 'vivienda_id', v_vid,
        'zona_id', (select zona_id from public.viviendas where id = v_vid),
        'estado', 'recibida',
        'alcance', case when v_nec ->> 'alcance' in ('hogar', 'colectiva') then v_nec ->> 'alcance' else 'hogar' end,
        'origen', case when v_nec ->> 'origen' in ('visita', 'evento', 'encuesta', 'publico', 'lider', 'reporte')
                       then v_nec ->> 'origen' else 'visita' end,
        'desea_respuesta', coalesce((v_nec ->> 'desea_respuesta')::boolean, false),
        'creado_por', v_uid, 'creado_en', now(), 'actualizado_en', now()))
    on conflict (id) do nothing;
  end loop;

  -- R-26: ritmo y saltos de ubicación sospechosos.
  select v.fecha as fecha, vv.lat as lat, vv.lng as lng into v_prev
    from public.visitas v join public.viviendas vv on vv.id = v.vivienda_id
   where v.usuario_id = v_uid and v.eliminado_en is null
   order by v.fecha desc limit 1;
  if found then
    v_dt := abs(extract(epoch from (v_fecha - v_prev.fecha)));
    v_dd := public.dist_m(v_prev.lat, v_prev.lng, v_lat, v_lng);
    if v_dt < public.cfg_num('ritmo_sospechoso_seg', 90) then
      insert into public.alertas_calidad (tipo, severidad, usuario_id, visita_id, vivienda_id, detalle)
      values ('ritmo_sospechoso', 'media', v_uid, v_visita_id, v_vid, jsonb_build_object('segundos', v_dt));
    elsif v_dd > 100 and v_dd / greatest(v_dt, 1) > public.cfg_num('velocidad_max_ms', 15) then
      insert into public.alertas_calidad (tipo, severidad, usuario_id, visita_id, vivienda_id, detalle)
      values ('salto_de_ubicacion', 'alta', v_uid, v_visita_id, v_vid, jsonb_build_object('metros', v_dd, 'segundos', v_dt));
    end if;
  end if;
  -- N-08: el teléfono informó una ubicación simulada.
  if coalesce((v_dev ->> 'ubicacion_simulada')::boolean, false) then
    insert into public.alertas_calidad (tipo, severidad, usuario_id, visita_id, vivienda_id, detalle)
    values ('gps_falso', 'alta', v_uid, v_visita_id, v_vid, '{}'::jsonb);
    v_calidad := 'rojo';
    v_motivos := v_motivos || 'El teléfono reportó una ubicación simulada'::text;
  end if;

  -- El seguimiento solo se asigna a otra persona con O-09 o siendo Director o Administrador.
  v_asignado := nullif(v_vis ->> 'seguimiento_asignado_a', '')::uuid;
  if v_asignado is not null and v_asignado <> v_uid and not (public.es_staff() or public.tiene_permiso('O-09')) then
    v_asignado := v_uid;
  end if;

  -- Visita.
  insert into public.visitas
  select * from jsonb_populate_record(null::public.visitas,
    public._solo_campos(v_vis, c_vis) || jsonb_build_object(
      'vivienda_id', v_vid, 'hogar_id', v_hogar_id, 'usuario_id', v_uid, 'fecha', v_fecha,
      'autorizacion_verbal', coalesce((v_vis ->> 'autorizacion_verbal')::boolean, false),
      'seguimiento_requerido', coalesce((v_vis ->> 'seguimiento_requerido')::boolean, false),
      'seguimiento_asignado_a', v_asignado,
      'volante_entregado', coalesce((v_vis ->> 'volante_entregado')::boolean, false),
      'ubicacion_manual', v_manual,
      'no_autorizo_foto', coalesce((v_vis ->> 'no_autorizo_foto')::boolean, false),
      'dispositivo_lat', v_dlat, 'dispositivo_lng', v_dlng,
      'distancia_m', v_dist, 'calidad', v_calidad, 'es_diferido', v_diferido or v_revision, 'verificada', false,
      'version', 1, 'creado_en', now(), 'actualizado_en', now()));

  -- Fotos: la ruta del archivo la fija el servidor (A2), así nadie apunta a la foto de otro.
  for v_foto in select c from jsonb_array_elements(v_fotos) as t(c) loop
    insert into public.fotos
    select * from jsonb_populate_record(null::public.fotos,
      public._solo_campos(v_foto, c_fot) || jsonb_build_object(
        'vivienda_id', v_vid, 'visita_id', v_visita_id, 'usuario_id', v_uid, 'subida', false,
        'storage_path', public._ruta_foto(v_vid, (v_foto ->> 'id')::uuid),
        'con_personas', coalesce((v_foto ->> 'con_personas')::boolean, false),
        'creado_en', now(), 'actualizado_en', now()))
    on conflict (id) do nothing;
  end loop;
  update public.viviendas
     set foto_principal_path = (select storage_path from public.fotos
                                 where vivienda_id = v_vid and tipo = 'fachada' and not con_personas and eliminado_en is null
                                 order by creado_en desc limit 1)
   where id = v_vid
     and exists (select 1 from public.fotos where vivienda_id = v_vid and visita_id = v_visita_id and tipo = 'fachada');

  -- Seguimiento (6.7): se crea una tarea para quien corresponda.
  if coalesce((v_vis ->> 'seguimiento_requerido')::boolean, false) then
    insert into public.tareas (tipo, titulo, descripcion, asignado_a, creado_por, fecha_limite, prioridad, estado, vivienda_id)
    values ('seguimiento', 'Seguimiento de visita',
            coalesce(nullif(v_vis ->> 'seguimiento_motivo', ''), 'Volver a visitar'),
            coalesce(v_asignado, v_uid), v_uid,
            nullif(v_vis ->> 'seguimiento_fecha', '')::timestamptz, 'normal', 'pendiente', v_vid);
  end if;

  -- R-20 / R-21: si pidió no ser visitado, nadie del hogar queda contactable.
  if v_resultado = 'pidio_no_ser_visitado' then
    update public.personas set estado = 'no_contactar' where vivienda_id = v_vid and eliminado_en is null;
    update public.consentimientos
       set estado = 'revocado', revocado_en = now(), revocado_motivo = 'Pidió no ser visitado'
     where vivienda_id = v_vid and estado = 'vigente' and proposito like 'contacto\_%';
  end if;

  perform public.fn_auditar('registrar_visita', 'visita', v_visita_id::text,
    jsonb_build_object('vivienda', v_vid, 'calidad', v_calidad, 'resultado', v_resultado));

  return jsonb_build_object('ok', true, 'calidad', v_calidad, 'motivos', to_jsonb(v_motivos),
    'advertencias', to_jsonb(v_avisos), 'personas_duplicadas', v_dups, 'diferido', v_diferido,
    'en_revision', v_revision, 'zona_id', (select zona_id from public.viviendas where id = v_vid));
end $$;

-- Reconocimiento (5.10) con las mismas protecciones de campos y rutas.
create or replace function public.rpc_registrar_reconocimiento(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  c_viv constant text[] := array['id','lat','lng','precision_m','altitud_m','fuente_ubicacion','zona_urbana_rural','barrio_vereda',
    'direccion','complemento','nombre_finca','indicaciones','referencia','tipo_vivienda'];
  c_fot constant text[] := array['id','tipo','lat','lng','tomada_en','tam_bytes','hash','con_personas'];
  v_viv jsonb := p -> 'vivienda';
  v_vid uuid := (p -> 'vivienda' ->> 'id')::uuid;
  v_lat double precision := (p -> 'vivienda' ->> 'lat')::double precision;
  v_lng double precision := (p -> 'vivienda' ->> 'lng')::double precision;
  v_foto jsonb; v_prev record; v_calidad text := 'amarillo'; v_avisos text[] := '{}';
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  if v_vid is null or v_lat is null or v_lng is null then raise exception 'Faltan la vivienda o su ubicación'; end if;
  if v_lat not between -5 and 14 or v_lng not between -82 and -66 then raise exception 'Coordenadas fuera de Colombia'; end if;
  if exists (select 1 from public.viviendas where id = v_vid) then return jsonb_build_object('ok', true, 'duplicado', true); end if;
  for v_prev in
    select id from public.viviendas
     where eliminado_en is null and lat between v_lat - 0.0005 and v_lat + 0.0005 and lng between v_lng - 0.0005 and v_lng + 0.0005
       and public.dist_m(lat, lng, v_lat, v_lng) <= public.cfg_num('radio_duplicados_m', 15) limit 1
  loop
    insert into public.alertas_calidad (tipo, severidad, usuario_id, vivienda_id, detalle)
    values ('posible_duplicado', 'baja', auth.uid(), v_vid, jsonb_build_object('otra_vivienda', v_prev.id));
    v_avisos := v_avisos || 'Hay otra vivienda registrada a menos de 15 m'::text;
  end loop;
  if exists (select 1 from jsonb_array_elements(coalesce(p -> 'fotos', '[]'::jsonb)) as t(c) where c ->> 'tipo' = 'fachada') then
    v_calidad := 'verde';
  end if;
  insert into public.viviendas
  select * from jsonb_populate_record(null::public.viviendas,
    public._solo_campos(v_viv, c_viv) || jsonb_build_object(
      'zona_id', public._zona_de_punto(v_lat, v_lng),
      'estado', 'por_visitar', 'es_reconocimiento', true, 'requiere_aprobacion', false,
      'fuente_ubicacion', case when coalesce(v_viv ->> 'fuente_ubicacion', '') in ('gps', 'manual') then v_viv ->> 'fuente_ubicacion' else 'gps' end,
      'calidad', v_calidad, 'creado_por', auth.uid(), 'creado_en', now(), 'actualizado_en', now()));
  for v_foto in select c from jsonb_array_elements(coalesce(p -> 'fotos', '[]'::jsonb)) as t(c) loop
    if v_foto ->> 'tipo' <> 'fachada' then continue; end if;   -- en reconocimiento solo hay fachada
    insert into public.fotos
    select * from jsonb_populate_record(null::public.fotos,
      public._solo_campos(v_foto, c_fot) || jsonb_build_object(
        'vivienda_id', v_vid, 'usuario_id', auth.uid(), 'subida', false,
        'storage_path', public._ruta_foto(v_vid, (v_foto ->> 'id')::uuid),
        'con_personas', coalesce((v_foto ->> 'con_personas')::boolean, false), 'creado_en', now(), 'actualizado_en', now()))
    on conflict (id) do nothing;
  end loop;
  update public.viviendas set foto_principal_path = (
      select storage_path from public.fotos where vivienda_id = v_vid and tipo = 'fachada' and not con_personas
      order by creado_en limit 1)
   where id = v_vid;
  perform public.fn_auditar('registrar_reconocimiento', 'vivienda', v_vid::text);
  return jsonb_build_object('ok', true, 'calidad', v_calidad, 'advertencias', to_jsonb(v_avisos));
end $$;

create or replace function public.rpc_foto_subida(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  update public.fotos f set subida = true
   where f.id = p_id and f.usuario_id = auth.uid()
     and exists (select 1 from storage.objects o where o.bucket_id = 'fotos' and o.name = f.storage_path);
  return jsonb_build_object('ok', true, 'marcada', found);
end $$;

-- ======================================================================= edición con control de versión (5.13)

create or replace function public.rpc_editar_visita(p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.visitas; v_version int := nullif(p ->> 'version', '')::int;
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  select * into v from public.visitas where id = p_id and eliminado_en is null for update;
  if not found then raise exception 'Visita no encontrada'; end if;
  if not (public.es_staff() or public.tiene_permiso('O-06')
          or (v.usuario_id = auth.uid() and now() - v.creado_en <= make_interval(hours => public.cfg_num('ventana_edicion_h', 72)::int))) then
    raise exception 'R-22: ya pasó la ventana de edición; solicite la corrección al Director' using errcode = '42501';
  end if;
  if v_version is not null and v_version <> v.version then
    -- Otra persona editó antes: se guardan ambas versiones en la auditoría y gana la más reciente (5.13).
    insert into public.alertas_calidad (tipo, severidad, usuario_id, visita_id, vivienda_id, detalle)
    values ('conflicto_edicion', 'baja', auth.uid(), p_id, v.vivienda_id,
            jsonb_build_object('version_cliente', v_version, 'version_servidor', v.version));
  end if;
  update public.visitas set
    notas = case when p ? 'notas' then nullif(p ->> 'notas', '') else notas end,
    volante_entregado = case when p ? 'volante_entregado' then (p ->> 'volante_entregado')::boolean else volante_entregado end,
    seguimiento_requerido = case when p ? 'seguimiento_requerido' then (p ->> 'seguimiento_requerido')::boolean else seguimiento_requerido end,
    seguimiento_motivo = case when p ? 'seguimiento_motivo' then nullif(p ->> 'seguimiento_motivo', '') else seguimiento_motivo end,
    seguimiento_fecha = case when p ? 'seguimiento_fecha' then nullif(p ->> 'seguimiento_fecha', '')::timestamptz else seguimiento_fecha end,
    version = version + 1
   where id = p_id;
  perform public.fn_auditar('editar_visita', 'visita', p_id::text, jsonb_build_object(
    'campos', (select jsonb_agg(k) from jsonb_object_keys(p) k),
    'antes', jsonb_build_object('notas', v.notas, 'volante_entregado', v.volante_entregado,
                                'seguimiento_requerido', v.seguimiento_requerido, 'seguimiento_motivo', v.seguimiento_motivo,
                                'seguimiento_fecha', v.seguimiento_fecha),
    'version', v.version + 1));
  return jsonb_build_object('ok', true, 'version', v.version + 1);
end $$;

-- ======================================================================= datos completos y vista enmascarada (A5, M2)

create or replace function public.rpc_persona_completa(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.personas; v_zona uuid; v_simpatia boolean; v_n int;
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  select * into v from public.personas where id = p_id and eliminado_en is null;
  if not found then raise exception 'Persona no encontrada'; end if;
  if v.estado = 'solicito_eliminacion' then
    raise exception 'A5: la persona pidió la eliminación de sus datos; no se pueden consultar' using errcode = '42501';
  end if;
  select zona_id into v_zona from public.viviendas where id = v.vivienda_id;
  if not public.tiene_permiso('O-01', v_zona) then
    raise exception 'No tiene permiso para ver datos completos (con verificación en dos pasos)' using errcode = '42501';
  end if;
  v_simpatia := public.tiene_permiso('O-02', v_zona);
  perform public.fn_auditar('ver_datos_completos', 'persona', p_id::text, jsonb_build_object('simpatia', v_simpatia));
  -- 8.9: muchos accesos a datos completos en poco tiempo generan una alerta.
  select count(*) into v_n from public.auditoria
   where usuario_id = auth.uid() and accion = 'ver_datos_completos' and creado_en > now() - interval '1 hour';
  if v_n = public.cfg_num('accesos_completos_hora', 30)::int then
    insert into public.alertas_calidad (tipo, severidad, usuario_id, detalle)
    values ('accesos_masivos', 'alta', auth.uid(), jsonb_build_object('accesos_ultima_hora', v_n));
  end if;
  return jsonb_build_object(
    'id', v.id,
    'nombre_completo', trim(concat_ws(' ', v.primer_nombre, v.segundo_nombre, v.primer_apellido, v.segundo_apellido)),
    'cedula', public._dec(v.cedula_enc),
    'telefono', public._dec(v.telefono_enc),
    'telefono2', public._dec(v.telefono2_enc),
    'correo', public._dec(v.correo_enc),
    'fecha_nacimiento', v.fecha_nacimiento,
    'simpatia', case when v_simpatia then public._dec(v.simpatia_enc) end);
end $$;

-- Qué personas puede ver cada quien en su versión enmascarada (M2): el Director y el Administrador, todas;
-- un colaborador, las que registró, las de sus zonas asignadas y las de las zonas de su permiso O-01.
create or replace function public._puede_ver_persona(p_creado_por uuid, p_vivienda uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.mi_rol() is not null and (
    public.es_staff()
    or p_creado_por = auth.uid()
    or exists (select 1 from public.viviendas v
                join public.asignaciones_zona a on a.zona_id = v.zona_id and a.activo and a.usuario_id = auth.uid()
               where v.id = p_vivienda)
    or public.tiene_permiso('O-01', (select zona_id from public.viviendas where id = p_vivienda)))
$$;
grant execute on function public._puede_ver_persona(uuid, uuid) to authenticated;

-- A5: quien pidió la eliminación ya no se ve (la fila queda sin datos para que los teléfonos borren su copia).
create or replace view public.personas_v as
select
  p.id, p.hogar_id, p.vivienda_id,
  case when p.estado = 'solicito_eliminacion' then null
       else trim(concat_ws(' ', p.primer_nombre, p.primer_apellido)) end as nombre_visible,
  case when p.estado = 'solicito_eliminacion' then null else p.apodo end as apodo,
  case when p.estado <> 'solicito_eliminacion' and p.fecha_nacimiento is not null
       then date_part('year', age(current_date, p.fecha_nacimiento))::int end as edad_anios,
  case when p.estado = 'solicito_eliminacion' then null else p.sexo end as sexo,
  case when p.estado = 'solicito_eliminacion' then null else p.ocupacion end as ocupacion,
  case when p.estado = 'solicito_eliminacion' then null else p.cedula_ult3 end as cedula_ult3,
  case when p.estado = 'solicito_eliminacion' then null else p.telefono_ult4 end as telefono_ult4,
  case when p.estado = 'solicito_eliminacion' then null else p.correo_parcial end as correo_parcial,
  p.canal_preferido, p.mejor_horario, p.anios_en_pijao, p.vive_en_otra_ciudad,
  p.vota_en_pijao, p.interes_info, p.voluntario, p.anfitrion, p.temas_interes, p.estado,
  p.estado <> 'solicito_eliminacion' and exists (
    select 1 from public.consentimientos c
     where c.persona_id = p.id and c.estado = 'vigente' and c.proposito like 'contacto\_%') as tiene_contacto_autorizado,
  p.creado_por, p.creado_en, p.actualizado_en, p.eliminado_en
from public.personas p
where public._puede_ver_persona(p.creado_por, p.vivienda_id);
grant select on public.personas_v to authenticated;

-- ======================================================================= fotos y almacenamiento (A3, 8.5)

-- Fotos restringidas: las de autorizaciones y las que muestran personas solo las ven quien las tomó y el Director o el Administrador.
create or replace function public._foto_visible(p_tipo text, p_con_personas boolean, p_usuario uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.mi_rol() is not null and (
    public.es_staff() or p_usuario = auth.uid()
    or (p_tipo not in ('autorizacion') and not coalesce(p_con_personas, false)))
$$;
grant execute on function public._foto_visible(text, boolean, uuid) to authenticated;

drop policy if exists sel_activos_fotos on public.fotos;
create policy sel_activos_fotos on public.fotos for select to authenticated
  using (public._foto_visible(tipo, con_personas, usuario_id));

create or replace function public._archivo_foto_visible(p_nombre text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.fotos f
                  where f.storage_path = p_nombre and f.eliminado_en is null
                    and public._foto_visible(f.tipo, f.con_personas, f.usuario_id))
$$;
create or replace function public._archivo_foto_subible(p_nombre text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.mi_rol() is not null and exists (
    select 1 from public.fotos f where f.storage_path = p_nombre and f.usuario_id = auth.uid() and not f.subida)
$$;
grant execute on function public._archivo_foto_visible(text) to authenticated;
grant execute on function public._archivo_foto_subible(text) to authenticated;

drop policy if exists pijao_fotos_leer on storage.objects;
create policy pijao_fotos_leer on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and public._archivo_foto_visible(name));
drop policy if exists pijao_fotos_subir on storage.objects;
create policy pijao_fotos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public._archivo_foto_subible(name));
-- Los documentos (actas, soportes) solo los suben y los ven el Director y el Administrador.
drop policy if exists pijao_docs_subir on storage.objects;
create policy pijao_docs_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and public.es_staff());

-- ======================================================================= No contactar y derechos de los titulares (M4)

-- Cualquier colaborador puede registrar la decisión de un ciudadano (nunca se bloquea un derecho),
-- pero cada marca sobre una persona ajena avisa al Director y un volumen anormal genera una alerta alta.
create or replace function public._vigilar_no_contactar(p_persona uuid, p_tipo text) returns void
language plpgsql security definer set search_path = public as $$
declare v_n int; v_propia boolean;
begin
  select exists (select 1 from public.personas where id = p_persona and creado_por = auth.uid()) into v_propia;
  if not v_propia and not public.es_staff() then
    insert into public.alertas_calidad (tipo, severidad, usuario_id, detalle)
    values ('no_contactar_registrado', 'baja', auth.uid(), jsonb_build_object('persona', p_persona, 'tipo', p_tipo));
  end if;
  select count(*) into v_n from public.auditoria
   where usuario_id = auth.uid() and accion in ('no_contactar', 'solicitud_titular') and creado_en > now() - interval '1 day';
  if v_n = public.cfg_num('no_contactar_max_dia', 15)::int then
    insert into public.alertas_calidad (tipo, severidad, usuario_id, detalle)
    values ('no_contactar_masivo', 'alta', auth.uid(), jsonb_build_object('marcas_ultimo_dia', v_n));
  end if;
end $$;
revoke all on function public._vigilar_no_contactar(uuid, text) from public, anon, authenticated;

create or replace function public.rpc_marcar_no_contactar(p_persona uuid, p_motivo text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  if not exists (select 1 from public.personas where id = p_persona and eliminado_en is null) then
    raise exception 'Persona no encontrada';
  end if;
  update public.personas set estado = 'no_contactar' where id = p_persona and estado = 'activa';
  update public.consentimientos
     set estado = 'revocado', revocado_en = now(), revocado_motivo = coalesce(p_motivo, 'No contactar')
   where persona_id = p_persona and estado = 'vigente' and proposito like 'contacto\_%';
  perform public.fn_auditar('no_contactar', 'persona', p_persona::text, jsonb_build_object('motivo', p_motivo));
  perform public._vigilar_no_contactar(p_persona, 'no_contactar');
  return jsonb_build_object('ok', true);
end $$;

-- 16.5: los casos se reciben por la app, por correo, por WhatsApp y por el formulario público.
create or replace function public.rpc_solicitud_titular(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_tipo text := p ->> 'tipo';
  v_persona uuid := nullif(p ->> 'persona_id', '')::uuid;
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_canal text := coalesce(nullif(p ->> 'canal', ''), 'app');
  v_dias int;
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  if v_canal not in ('app', 'correo', 'whatsapp', 'formulario', 'presencial', 'telefono') then
    raise exception 'Canal no válido';
  end if;
  v_dias := case when v_tipo in ('consulta', 'prueba_autorizacion') then 10 else 15 end;
  insert into public.solicitudes_titulares (id, persona_id, nombre_solicitante, contacto, tipo, detalle, canal,
                                            registrado_por, plazo_interno, plazo_legal)
  values (v_id, v_persona, p ->> 'nombre_solicitante', p ->> 'contacto', v_tipo, p ->> 'detalle', v_canal,
          auth.uid(), public.sumar_dias_habiles(current_date, public.cfg_num('titulares_plazo_interno_dias', 5)::int),
          public.sumar_dias_habiles(current_date, v_dias))
  on conflict (id) do nothing;
  if v_persona is not null and v_tipo in ('revocatoria', 'supresion') then
    update public.personas
       set estado = case when v_tipo = 'supresion' then 'solicito_eliminacion' else 'no_contactar' end
     where id = v_persona;
    update public.consentimientos
       set estado = 'revocado', revocado_en = now(), revocado_motivo = 'Solicitud del titular (' || v_tipo || ')'
     where persona_id = v_persona and estado = 'vigente' and (v_tipo = 'supresion' or proposito like 'contacto\_%');
    perform public._vigilar_no_contactar(v_persona, v_tipo);
  end if;
  perform public.fn_auditar('solicitud_titular', 'persona', coalesce(v_persona::text, v_id::text),
                            jsonb_build_object('tipo', v_tipo, 'canal', v_canal));
  return jsonb_build_object('ok', true, 'id', v_id, 'numero_caso', upper(left(replace(v_id::text, '-', ''), 8)));
end $$;

-- 16.5: prueba de la autorización, a pedido del titular (sin datos de otras personas).
create or replace function public.rpc_prueba_autorizacion(p_persona uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_staff() then raise exception 'Solo el Director o el Administrador' using errcode = '42501'; end if;
  perform public.fn_auditar('prueba_autorizacion', 'persona', p_persona::text);
  return jsonb_build_object('persona', p_persona, 'autorizaciones', coalesce((
    select jsonb_agg(jsonb_build_object(
      'proposito', c.proposito, 'metodo', c.metodo, 'version_texto', c.version_texto, 'texto_hash', c.texto_hash,
      'otorgado_en', c.otorgado_en, 'estado', c.estado, 'revocado_en', c.revocado_en,
      'recogida_por', (select nombre_completo from public.perfiles where id = c.recogido_por))
      order by c.otorgado_en)
    from public.consentimientos c where c.persona_id = p_persona), '[]'::jsonb));
end $$;

-- ======================================================================= borrado definitivo y plan de cierre (A6, 16.9)

-- Borrado definitivo de una persona, ejecutado por el Administrador con verificación en dos pasos y con acta.
create or replace function public.rpc_borrar_persona(p_id uuid, p_acta text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Solo el Administrador' using errcode = '42501'; end if;
  perform public._exigir_aal2();
  if coalesce(trim(p_acta), '') = '' then raise exception 'Escriba el número o la referencia del acta de eliminación'; end if;
  if not exists (select 1 from public.personas where id = p_id) then raise exception 'Persona no encontrada'; end if;
  update public.hogares set sosten_persona_id = null where sosten_persona_id = p_id;
  delete from public.consentimientos where persona_id = p_id;
  update public.solicitudes_titulares set nombre_solicitante = null, contacto = null
   where persona_id = p_id and estado in ('resuelta', 'rechazada');
  update public.solicitudes_titulares set persona_id = null where persona_id = p_id;
  delete from public.personas where id = p_id;
  perform public.fn_auditar('borrado_definitivo', 'persona', p_id::text, jsonb_build_object('acta', p_acta));
  return jsonb_build_object('ok', true);
end $$;

-- Plan de cierre (16.9): anonimiza todo lo que identifica a una persona o a su vivienda. Conserva a quienes autorizaron
-- seguir recibiendo información de participación ciudadana. Devuelve las rutas de fotos que hay que borrar del
-- almacenamiento con tools/cierre_fotos.py (Supabase no permite borrar archivos desde SQL).
create or replace function public.rpc_plan_cierre(p_confirmacion text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_p int; v_c int; v_v int; v_h int; v_rutas jsonb; v_conservar uuid[];
begin
  if not public.es_admin() then raise exception 'Solo el Administrador' using errcode = '42501'; end if;
  perform public._exigir_aal2();
  if p_confirmacion is distinct from 'ELIMINAR DATOS PERSONALES' then
    raise exception 'Escriba exactamente: ELIMINAR DATOS PERSONALES';
  end if;
  select coalesce(array_agg(distinct persona_id), '{}') into v_conservar from public.consentimientos
   where proposito = 'participacion_ciudadana' and estado = 'vigente' and persona_id is not null;

  update public.personas set
    primer_nombre = '(eliminado)', segundo_nombre = null, primer_apellido = '(eliminado)', segundo_apellido = null,
    apodo = null, cedula_enc = null, cedula_hash = null, cedula_ult3 = null, fecha_nacimiento = null,
    telefono_enc = null, telefono_ult4 = null, telefono2_enc = null, correo_enc = null, correo_parcial = null,
    simpatia_enc = null, puesto_votacion = null, mesa_votacion = null, mejor_horario = null, estado = 'solicito_eliminacion'
   where not (id = any (v_conservar));
  get diagnostics v_p = row_count;
  update public.consentimientos set evidencia = '{}'::jsonb, estado = 'revocado', revocado_en = coalesce(revocado_en, now()),
         revocado_motivo = coalesce(revocado_motivo, 'Plan de cierre')
   where persona_id is null or not (persona_id = any (v_conservar));
  get diagnostics v_c = row_count;
  update public.visitas set notas = null, seguimiento_motivo = null, dispositivo_lat = null, dispositivo_lng = null;
  get diagnostics v_v = row_count;
  update public.hogares set sosten_persona_id = null, familiares_fuera = null;
  get diagnostics v_h = row_count;
  -- Las viviendas quedan solo como punto aproximado (unos 100 m), sin dirección: sirven para estadísticas agregadas.
  update public.viviendas set direccion = null, complemento = null, nombre_finca = null, indicaciones = null, referencia = null,
         foto_principal_path = null, lat = round(lat::numeric, 3)::float8, lng = round(lng::numeric, 3)::float8;
  update public.necesidades set texto = null;
  update public.solicitudes_titulares set nombre_solicitante = null, contacto = null where estado in ('resuelta', 'rechazada');
  update public.invitaciones set nombre = '(eliminado)', celular = null, correo = null;
  delete from public.ubicaciones_jornada;
  select coalesce(jsonb_agg(storage_path), '[]'::jsonb) into v_rutas from public.fotos where eliminado_en is null;
  update public.fotos set eliminado_en = now(), lat = null, lng = null where eliminado_en is null;
  update public.dispositivos set orden_borrado = true;
  perform public.fn_auditar('plan_cierre', 'seguridad', null,
    jsonb_build_object('personas', v_p, 'consentimientos', v_c, 'visitas', v_v, 'hogares', v_h, 'fotos', jsonb_array_length(v_rutas)));
  return jsonb_build_object('ok', true, 'personas', v_p, 'consentimientos', v_c, 'visitas', v_v,
                            'rutas_fotos_para_borrar', v_rutas);
end $$;

-- ======================================================================= dispositivos, borrado remoto y salud de la flota

-- Latido del teléfono (N-12). Registra el dispositivo (máximo configurable, 4.10) y le dice si debe borrar sus datos (17.2).
create or replace function public.rpc_latido(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_ident text := nullif(p ->> 'identificador', ''); v_d public.dispositivos; v_activos int;
begin
  if auth.uid() is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if v_ident is null then raise exception 'Falta el identificador del dispositivo'; end if;
  select * into v_d from public.dispositivos where usuario_id = auth.uid() and identificador = v_ident;
  if not found then
    select count(*) into v_activos from public.dispositivos where usuario_id = auth.uid() and activo;
    if v_activos >= public.cfg_num('max_dispositivos', 2) and not public.es_staff() then
      return jsonb_build_object('ok', false, 'motivo', 'limite_dispositivos',
        'mensaje', 'Ya tiene el máximo de teléfonos permitidos. Pida al Administrador cerrar uno de ellos.');
    end if;
    insert into public.dispositivos (usuario_id, identificador, modelo, plataforma, version_app)
    values (auth.uid(), v_ident, p ->> 'modelo', p ->> 'plataforma', p ->> 'version_app') returning * into v_d;
    perform public.fn_auditar('dispositivo_nuevo', 'sesion', v_d.id::text, jsonb_build_object('modelo', p ->> 'modelo'));
  end if;
  update public.dispositivos set
    ultimo_acceso = now(), version_app = coalesce(p ->> 'version_app', version_app), modelo = coalesce(p ->> 'modelo', modelo),
    cola_pendiente = nullif(p ->> 'cola_pendiente', '')::int,
    ultima_sincronizacion = nullif(p ->> 'ultima_sincronizacion', '')::timestamptz,
    espacio_libre_mb = nullif(p ->> 'espacio_libre_mb', '')::int,
    bateria_pct = nullif(p ->> 'bateria_pct', '')::int
   where id = v_d.id;
  return jsonb_build_object('ok', true, 'activo', v_d.activo, 'dispositivo_id', v_d.id,
    'borrar_datos', v_d.orden_borrado or not v_d.activo or public.mi_rol() is null,
    'version_minima', (select valor #>> '{}' from public.configuracion where clave = 'version_minima_app'));
end $$;

create or replace function public.rpc_reportar_perdido(p_dispositivo uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  update public.dispositivos set activo = false, orden_borrado = true, reportado_perdido_en = now()
   where id = p_dispositivo and (usuario_id = auth.uid() or public.es_staff());
  if not found then raise exception 'Dispositivo no encontrado'; end if;
  perform public.fn_auditar('dispositivo_perdido', 'seguridad', p_dispositivo::text);
  return jsonb_build_object('ok', true);
end $$;

-- Reporte de errores propio (sin servicios de pago). El teléfono limpia los datos personales antes de enviar.
create table if not exists public.errores_app (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid,
  version_app text,
  pantalla text,
  mensaje text not null,
  traza text,
  creado_en timestamptz not null default now()
);
alter table public.errores_app enable row level security;
grant select on public.errores_app to authenticated;
drop policy if exists sel_errores on public.errores_app;
create policy sel_errores on public.errores_app for select to authenticated using (public.es_admin());

create or replace function public.rpc_reportar_error(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  -- Límite para no llenar la base gratuita: 50 errores por usuario y día.
  if (select count(*) from public.errores_app where usuario_id = auth.uid() and creado_en > now() - interval '1 day') >= 50 then
    return jsonb_build_object('ok', true, 'descartado', true);
  end if;
  insert into public.errores_app (usuario_id, version_app, pantalla, mensaje, traza)
  values (auth.uid(), left(p ->> 'version_app', 20), left(p ->> 'pantalla', 60), left(coalesce(p ->> 'mensaje', '(sin mensaje)'), 500),
          left(p ->> 'traza', 4000));
  delete from public.errores_app where creado_en < now() - interval '60 days';
  return jsonb_build_object('ok', true);
end $$;

-- 8.11 / 9.6: consumo frente a los límites del plan gratuito.
create or replace function public.rpc_uso_recursos() returns jsonb
language plpgsql security definer set search_path = public, storage as $$
declare v_bd numeric; v_arch numeric; v_lim_bd numeric := public.cfg_num('limite_bd_mb', 500);
        v_lim_arch numeric := public.cfg_num('limite_archivos_mb', 1024); v_alerta numeric := public.cfg_num('alerta_uso_pct', 80);
begin
  if not public.es_admin() then raise exception 'Solo el Administrador' using errcode = '42501'; end if;
  v_bd := pg_database_size(current_database()) / 1048576.0;
  select coalesce(sum((metadata ->> 'size')::bigint), 0) / 1048576.0 into v_arch from storage.objects;
  return jsonb_build_object(
    'base_mb', round(v_bd, 1), 'base_pct', round(100 * v_bd / v_lim_bd, 1),
    'archivos_mb', round(v_arch, 1), 'archivos_pct', round(100 * v_arch / v_lim_arch, 1),
    'alerta', v_bd >= v_lim_bd * v_alerta / 100 or v_arch >= v_lim_arch * v_alerta / 100,
    'errores_ultimo_dia', (select count(*) from public.errores_app where creado_en > now() - interval '1 day'),
    'dispositivos_con_cola', (select count(*) from public.dispositivos where activo and coalesce(cola_pendiente, 0) > 0
                                and ultima_sincronizacion < now() - interval '24 hours'));
end $$;

-- ======================================================================= jornada (M7)

create or replace function public.rpc_ubicaciones(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_j uuid; v_n int := 0; v_pt jsonb; v_lat float8; v_lng float8;
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  select id into v_j from public.jornadas where usuario_id = auth.uid() and fin is null order by inicio desc limit 1;
  if v_j is null then
    return jsonb_build_object('ok', true, 'guardadas', 0, 'motivo', 'sin jornada activa');
  end if;
  if jsonb_array_length(coalesce(p, '[]'::jsonb)) > 500 then raise exception 'Demasiados puntos en un envío'; end if;
  for v_pt in select c from jsonb_array_elements(coalesce(p, '[]'::jsonb)) as t(c) loop
    v_lat := nullif(v_pt ->> 'lat', '')::float8;
    v_lng := nullif(v_pt ->> 'lng', '')::float8;
    if v_lat is null or v_lng is null or v_lat not between -5 and 14 or v_lng not between -82 and -66 then
      continue;   -- se descarta el punto inválido
    end if;
    insert into public.ubicaciones_jornada (jornada_id, usuario_id, lat, lng, precision_m, tomada_en)
    values (v_j, auth.uid(), v_lat, v_lng, nullif(v_pt ->> 'precision_m', '')::real,
            least(coalesce(nullif(v_pt ->> 'tomada_en', '')::timestamptz, now()), now()));
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'guardadas', v_n);
end $$;

create or replace function public._purgar_ubicaciones() returns int
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  delete from public.ubicaciones_jornada
   where tomada_en < now() - make_interval(days => public.cfg_num('retencion_ubicacion_dias', 7)::int);
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public._purgar_ubicaciones() from public, anon, authenticated;

-- R-31: borrado automático cada noche con pg_cron (si la extensión está disponible en el proyecto).
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'pijao_purgar_ubicaciones';
  perform cron.schedule('pijao_purgar_ubicaciones', '15 3 * * *', 'select public._purgar_ubicaciones()');
exception when others then
  raise notice 'pg_cron no está disponible: active la extensión en el panel y vuelva a aplicar este bloque (%).', sqlerrm;
end $$;

-- ======================================================================= rotación de la llave de cifrado (8.8)

-- Se ejecuta SOLO desde el editor SQL del panel, por el Administrador: select public.admin_rotar_pii_key('<llave nueva>');
-- Después, actualizar el secreto 'pii_key' de Vault con la llave nueva y guardar la anterior fuera de línea por si acaso.
create or replace function public.admin_rotar_pii_key(p_nueva text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_vieja text := public._pii_key(); v_n int;
begin
  if length(coalesce(p_nueva, '')) < 32 then raise exception 'La llave nueva debe tener al menos 32 caracteres'; end if;
  update public.personas set
    cedula_hash = case when cedula_enc is null then null else encode(hmac(pgp_sym_decrypt(cedula_enc, v_vieja), p_nueva, 'sha256'), 'hex') end,
    cedula_enc = case when cedula_enc is null then null else pgp_sym_encrypt(pgp_sym_decrypt(cedula_enc, v_vieja), p_nueva) end,
    telefono_enc = case when telefono_enc is null then null else pgp_sym_encrypt(pgp_sym_decrypt(telefono_enc, v_vieja), p_nueva) end,
    telefono2_enc = case when telefono2_enc is null then null else pgp_sym_encrypt(pgp_sym_decrypt(telefono2_enc, v_vieja), p_nueva) end,
    correo_enc = case when correo_enc is null then null else pgp_sym_encrypt(pgp_sym_decrypt(correo_enc, v_vieja), p_nueva) end,
    simpatia_enc = case when simpatia_enc is null then null else pgp_sym_encrypt(pgp_sym_decrypt(simpatia_enc, v_vieja), p_nueva) end;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'personas', v_n,
    'siguiente_paso', 'Actualice ahora el secreto pii_key de Vault con la llave nueva');
end $$;
revoke all on function public.admin_rotar_pii_key(text) from public, anon, authenticated;

-- ======================================================================= plan gratuito: evitar la pausa por inactividad

-- La llama cada semana .github/workflows/mantener-activo.yml con la clave pública (anon). No devuelve datos.
create or replace function public.ping() returns text
language sql stable set search_path = public, pg_temp as $$ select 'ok' $$;
grant execute on function public.ping() to anon, authenticated;

-- ======================================================================= permisos de ejecución

grant execute on function public.rpc_verificar_auditoria() to authenticated;
grant execute on function public.rpc_rechazar_usuario(uuid, text) to authenticated;
grant execute on function public.rpc_prueba_autorizacion(uuid) to authenticated;
grant execute on function public.rpc_borrar_persona(uuid, text) to authenticated;
grant execute on function public.rpc_latido(jsonb) to authenticated;
grant execute on function public.rpc_reportar_perdido(uuid) to authenticated;
grant execute on function public.rpc_reportar_error(jsonb) to authenticated;
grant execute on function public.rpc_uso_recursos() to authenticated;
-- La purga ya no se llama desde la app: la hace pg_cron.
revoke execute on function public.rpc_purgar_ubicaciones() from authenticated;
