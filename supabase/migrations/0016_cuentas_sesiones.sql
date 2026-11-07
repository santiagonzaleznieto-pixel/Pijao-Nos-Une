-- Pijao Nos Une · 0016 · cuentas y sesiones (Fase 1, bloque 1.5)
--   R-33   la sesión dura 14 días para el colaborador, 7 para el Director y 12 horas para el Administrador.
--   4.9    suspensión automática del colaborador tras 30 días sin actividad (configurable; 0 = no suspender).
--   R-45   los acuerdos se vuelven a aceptar si cambia su texto y cada 6 meses (10.7).
--   4.10   aviso de ingreso desde un teléfono nuevo, que llega a los teléfonos habituales de la persona.
--   P-07   aviso cuando cambia la contraseña (la recuperación con código por correo la hace la app con Supabase Auth).
-- El plan gratuito de Supabase no limita la duración de las sesiones, así que una tarea de pg_cron las cierra cada hora.

-- ======================================================================= valores de control (P-42)

insert into public.configuracion (clave, valor, descripcion) values
  ('sesion_horas_colaborador', '336'::jsonb, 'R-33: horas que dura la sesión de un colaborador antes de volver a entrar (336 = 14 días)'),
  ('sesion_horas_director', '168'::jsonb, 'R-33: horas que dura la sesión del Director antes de volver a entrar (168 = 7 días)'),
  ('sesion_horas_admin', '12'::jsonb, 'R-33: horas que dura la sesión del Administrador antes de volver a entrar'),
  ('acuerdos_vigencia_dias', '180'::jsonb, 'R-45 y 10.7: días que vale la aceptación de los acuerdos antes de pedirla de nuevo')
on conflict (clave) do nothing;

update public.configuracion
   set descripcion = '4.9: días sin actividad antes de suspender automáticamente a un colaborador (0 = no suspender)'
 where clave = 'inactividad_suspension_dias';

-- Una suspensión automática no borra el teléfono: puede tener visitas sin enviar que se recuperan al reactivar la cuenta.
alter table public.perfiles add column if not exists suspendido_auto_en timestamptz;

-- ======================================================================= avisos de la cuenta (4.10 y P-07)

create table if not exists public.avisos_cuenta (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  tipo text not null check (tipo in ('dispositivo_nuevo', 'clave_cambiada')),
  mensaje text not null,
  datos jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  leido_en timestamptz
);
create index if not exists ix_avisos_cuenta_usuario on public.avisos_cuenta (usuario_id, creado_en desc);
alter table public.avisos_cuenta enable row level security;
revoke all on public.avisos_cuenta from public, anon, authenticated;   -- solo por las funciones de abajo

create or replace function public._fecha_co(p timestamptz default now()) returns text
language sql stable set search_path = public, pg_temp as $$
  select to_char(p at time zone 'America/Bogota', 'DD/MM/YYYY "a las" HH24:MI')
$$;
revoke all on function public._fecha_co(timestamptz) from public, anon, authenticated;

create or replace function public.rpc_mis_avisos() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', a.id, 'tipo', a.tipo, 'mensaje', a.mensaje, 'datos', a.datos, 'creado_en', a.creado_en)
                     order by a.creado_en desc)
      from (select * from public.avisos_cuenta
             where usuario_id = auth.uid() and leido_en is null and creado_en > now() - interval '30 days'
             order by creado_en desc limit 20) a), '[]'::jsonb);
end $$;

create or replace function public.rpc_aviso_leido(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  update public.avisos_cuenta set leido_en = now() where id = p_id and usuario_id = auth.uid() and leido_en is null;
  return jsonb_build_object('ok', true);
end $$;

-- P-07: cualquier cambio de contraseña (recuperación con código o desde la app) deja un aviso y una huella en la auditoría.
create or replace function public.fn_auth_clave_cambiada() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password
     and exists (select 1 from public.perfiles where id = new.id) then
    begin
      insert into public.avisos_cuenta (usuario_id, tipo, mensaje)
      values (new.id, 'clave_cambiada',
              format('Su contraseña se cambió el %s. Si no fue usted, avise de inmediato al Administrador.', public._fecha_co()));
      perform public.fn_auditar('clave_cambiada', 'sesion', new.id::text);
    exception when others then
      null;   -- el aviso nunca impide el cambio de contraseña
    end;
  end if;
  return new;
end $$;
revoke all on function public.fn_auth_clave_cambiada() from public, anon, authenticated;
drop trigger if exists trg_auth_clave_cambiada on auth.users;
create trigger trg_auth_clave_cambiada after update of encrypted_password on auth.users
  for each row execute function public.fn_auth_clave_cambiada();

-- ======================================================================= latido del teléfono (N-12) con aviso de teléfono nuevo

create or replace function public.rpc_latido(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_ident text := nullif(p ->> 'identificador', ''); v_d public.dispositivos; v_activos int; v_auto boolean;
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
    -- 4.10: si la persona ya usaba otro teléfono, ese teléfono recibe el aviso en su próxima apertura.
    if v_activos > 0 then
      insert into public.avisos_cuenta (usuario_id, tipo, mensaje, datos)
      values (auth.uid(), 'dispositivo_nuevo',
              format('Se entró a su cuenta desde un teléfono nuevo (%s) el %s. Si no fue usted, toque «No fui yo» para cerrarlo y cambie su contraseña.',
                     coalesce(nullif(left(p ->> 'modelo', 60), ''), 'modelo desconocido'), public._fecha_co()),
              jsonb_build_object('dispositivo_id', v_d.id, 'modelo', left(p ->> 'modelo', 60)));
    end if;
  end if;
  update public.dispositivos set
    ultimo_acceso = now(), version_app = coalesce(p ->> 'version_app', version_app), modelo = coalesce(p ->> 'modelo', modelo),
    cola_pendiente = nullif(p ->> 'cola_pendiente', '')::int,
    ultima_sincronizacion = nullif(p ->> 'ultima_sincronizacion', '')::timestamptz,
    espacio_libre_mb = nullif(p ->> 'espacio_libre_mb', '')::int,
    bateria_pct = nullif(p ->> 'bateria_pct', '')::int
   where id = v_d.id;
  update public.perfiles set ultimo_acceso = now() where id = auth.uid() and estado = 'activo';   -- 4.9: cuenta como actividad
  select estado = 'suspendido' and suspendido_auto_en is not null into v_auto from public.perfiles where id = auth.uid();
  return jsonb_build_object('ok', true, 'activo', v_d.activo, 'dispositivo_id', v_d.id,
    'borrar_datos', v_d.orden_borrado or not v_d.activo or (public.mi_rol() is null and not coalesce(v_auto, false)),
    'version_minima', (select valor #>> '{}' from public.configuracion where clave = 'version_minima_app'));
end $$;

-- ======================================================================= R-45: volver a aceptar los acuerdos

-- Versión vigente de los acuerdos que firma el equipo. Si todos los textos tienen la misma versión, es esa versión.
create or replace function public._version_acuerdos() returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select case when count(distinct version) = 1 then max(version)
              else string_agg(tipo || ':' || version, ' + ' order by tipo) end
    from (select distinct on (tipo) tipo, version from public.textos_legales
           where tipo in ('acuerdo_confidencialidad', 'codigo_conducta') and vigente
           order by tipo, creado_en desc) t
$$;
revoke all on function public._version_acuerdos() from public, anon, authenticated;

create or replace function public._acuerdos_vigentes(v public.perfiles) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select v.acuerdos_aceptados_en is not null
     and v.acuerdos_aceptados_en > now() - make_interval(days => greatest(1, public.cfg_num('acuerdos_vigencia_dias', 180))::int)
     and (public._version_acuerdos() is null or v.acuerdos_version = public._version_acuerdos())
$$;
revoke all on function public._acuerdos_vigentes(public.perfiles) from public, anon, authenticated;

create or replace function public.rpc_acuerdos_vigentes() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  return jsonb_build_object(
    'version', public._version_acuerdos(),
    'textos', coalesce((
      select jsonb_agg(jsonb_build_object('tipo', tipo, 'version', version, 'contenido', contenido, 'borrador', es_borrador) order by tipo)
        from (select distinct on (tipo) tipo, version, contenido, es_borrador from public.textos_legales
               where tipo in ('acuerdo_confidencialidad', 'codigo_conducta') and vigente
               order by tipo, creado_en desc) t), '[]'::jsonb));
end $$;

create or replace function public.rpc_aceptar_acuerdos(p_version text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.perfiles; v_vigente text := public._version_acuerdos();
begin
  select * into v from public.perfiles where id = auth.uid();
  if not found or v.estado <> 'activo' then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  if v_vigente is not null and p_version is distinct from v_vigente then
    raise exception 'Los acuerdos cambiaron mientras los leía. Vuelva a abrirlos y acepte la versión nueva.';
  end if;
  update public.perfiles set acuerdos_aceptados_en = now(), acuerdos_version = coalesce(v_vigente, left(p_version, 60))
   where id = v.id;
  perform public.fn_auditar('aceptar_acuerdos', 'perfil', v.id::text, jsonb_build_object('version', coalesce(v_vigente, p_version)));
  return jsonb_build_object('ok', true);
end $$;

-- El perfil dice si los acuerdos siguen vigentes y cuánto dura la sesión de la persona.
create or replace function public.rpc_mi_perfil() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.perfiles;
begin
  select * into v from public.perfiles where id = auth.uid();
  if not found then
    return jsonb_build_object('existe', false);
  end if;
  update public.perfiles set ultimo_acceso = now() where id = v.id;
  return jsonb_build_object(
    'existe', true,
    'id', v.id,
    'nombre', v.nombre_completo,
    'rol', v.rol,
    'estado', v.estado,
    'motivo_estado', case when v.estado in ('suspendido', 'baja') then v.motivo_estado end,
    'suspension_automatica', v.estado = 'suspendido' and v.suspendido_auto_en is not null,
    'curso_aprobado', v.curso_aprobado_en is not null,
    'acuerdos_ok', v.acuerdos_aceptados_en is not null,
    'acuerdos_vigentes', public._acuerdos_vigentes(v),
    'acuerdos_version', public._version_acuerdos(),
    'sesion_horas', public.cfg_num(case v.rol when 'admin' then 'sesion_horas_admin' when 'director' then 'sesion_horas_director'
                                              else 'sesion_horas_colaborador' end,
                                   case v.rol when 'admin' then 12 when 'director' then 168 else 336 end),
    'aal', coalesce(auth.jwt() ->> 'aal', 'aal1'),
    'permisos', coalesce((
      select jsonb_agg(jsonb_build_object('codigo', po.codigo, 'zonas', po.zonas, 'vence_en', po.vence_en))
      from public.permisos_opcionales po
      where po.usuario_id = v.id and po.activo and (po.vence_en is null or po.vence_en > now())), '[]'::jsonb),
    'zonas', coalesce((
      select jsonb_agg(a.zona_id) from public.asignaciones_zona a where a.usuario_id = v.id and a.activo), '[]'::jsonb));
end $$;

-- ======================================================================= suspensión y reactivación manual

create or replace function public.rpc_suspender_usuario(p_id uuid, p_motivo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.perfiles;
begin
  perform public._exigir_staff_o(null);
  select * into v from public.perfiles where id = p_id;
  if not found then raise exception 'Cuenta no encontrada'; end if;
  if v.rol = 'admin' then raise exception 'No se puede suspender al Administrador'; end if;
  if v.rol = 'director' and not public.es_admin() then
    raise exception 'Solo el Administrador puede suspender al Director' using errcode = '42501';
  end if;
  -- Una suspensión manual sí borra el teléfono en la próxima conexión (17.2), aunque antes hubiera una automática.
  update public.perfiles set estado = 'suspendido', motivo_estado = p_motivo, suspendido_auto_en = null where id = p_id;
  update public.permisos_opcionales set activo = false where usuario_id = p_id and activo;   -- al suspender se apagan los extras
  perform public.fn_auditar('suspender_usuario', 'perfil', p_id::text, jsonb_build_object('motivo', p_motivo));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rpc_reactivar_usuario(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_staff_o(null);
  -- Al reactivar se reinicia el contador de inactividad; si no, la tarea de cada hora la suspendería otra vez.
  update public.perfiles set estado = 'activo', motivo_estado = null, suspendido_auto_en = null, ultimo_acceso = now()
   where id = p_id and estado = 'suspendido' and rol <> 'admin';
  if not found then raise exception 'La cuenta no está suspendida'; end if;
  perform public.fn_auditar('reactivar_usuario', 'perfil', p_id::text);
  return jsonb_build_object('ok', true);
end $$;

-- ======================================================================= tarea de cada hora: sesiones (R-33) e inactividad (4.9)

create or replace function public._mantenimiento_cuentas() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_ses int := 0; v_sus int := 0; r record;
  v_dias int := greatest(0, public.cfg_num('inactividad_suspension_dias', 30))::int;
begin
  -- R-33: borrar la sesión invalida su token de renovación; la app vuelve a pedir la contraseña en menos de una hora.
  if to_regclass('auth.sessions') is not null then
    with borradas as (
      delete from auth.sessions s
       using public.perfiles p
       where p.id = s.user_id
         and s.created_at < now() - make_interval(hours => greatest(1, case p.rol
               when 'admin' then public.cfg_num('sesion_horas_admin', 12)
               when 'director' then public.cfg_num('sesion_horas_director', 168)
               else public.cfg_num('sesion_horas_colaborador', 336) end)::int)
      returning s.user_id)
    select count(*) into v_ses from borradas;
  end if;

  -- 4.9: solo colaboradores. El Director y el Administrador nunca se suspenden solos.
  if v_dias > 0 then
    for r in
      update public.perfiles
         set estado = 'suspendido', suspendido_auto_en = now(),
             motivo_estado = format('Suspensión automática: %s días sin actividad. El Director puede reactivarla.', v_dias)
       where rol = 'colaborador' and estado = 'activo'
         and coalesce(ultimo_acceso, creado_en) < now() - make_interval(days => v_dias)
      returning id
    loop
      update public.permisos_opcionales set activo = false where usuario_id = r.id and activo;
      perform public.fn_auditar('suspension_automatica', 'perfil', r.id::text, jsonb_build_object('dias', v_dias));
      v_sus := v_sus + 1;
    end loop;
  end if;

  delete from public.avisos_cuenta where creado_en < now() - interval '90 days';
  return jsonb_build_object('sesiones_cerradas', v_ses, 'suspendidas', v_sus);
end $$;
revoke all on function public._mantenimiento_cuentas() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'pijao_cuentas';
  perform cron.schedule('pijao_cuentas', '20 * * * *', 'select public._mantenimiento_cuentas()');
exception when others then
  raise notice 'pg_cron no está disponible: active la extensión en el panel y vuelva a aplicar este bloque (%).', sqlerrm;
end $$;

grant execute on function public.rpc_mis_avisos(), public.rpc_aviso_leido(uuid), public.rpc_acuerdos_vigentes(),
  public.rpc_aceptar_acuerdos(text) to authenticated;
revoke execute on function public.rpc_mis_avisos(), public.rpc_aviso_leido(uuid), public.rpc_acuerdos_vigentes(),
  public.rpc_aceptar_acuerdos(text) from public, anon;
