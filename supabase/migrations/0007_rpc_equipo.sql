-- Pijao Nos Une · 0007 · gestión del equipo (secciones 4 y 10)

create or replace function public._exigir_staff_o(p_permiso text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.mi_rol() is null then
    raise exception 'Cuenta no activa' using errcode = '42501';
  end if;
  if public.es_staff() then return; end if;
  if p_permiso is not null and public.tiene_permiso(p_permiso) then return; end if;
  raise exception 'No tiene permiso para esta acción' using errcode = '42501';
end $$;
revoke all on function public._exigir_staff_o(text) from public, anon, authenticated;

-- Invitación de 72 horas y un solo uso. Solo el Administrador puede invitar a un Director.
create or replace function public.rpc_invitar(p_nombre text, p_celular text default null, p_correo text default null,
                                              p_rol text default 'colaborador') returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_codigo text; v_exp timestamptz;
begin
  perform public._exigir_staff_o('O-08');
  if p_rol = 'director' and not public.es_admin() then
    raise exception 'Solo el Administrador puede invitar a un Director' using errcode = '42501';
  end if;
  if p_rol not in ('colaborador', 'director') then raise exception 'Rol no válido'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'Escriba el nombre de la persona'; end if;
  v_codigo := upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 1, 8));
  v_exp := now() + make_interval(hours => public.cfg_num('invitacion_horas', 72)::int);
  insert into public.invitaciones (codigo, nombre, celular, correo, rol_destino, creado_por, expira_en)
  values (v_codigo, trim(p_nombre), p_celular, p_correo, p_rol, auth.uid(), v_exp);
  perform public.fn_auditar('invitar', 'invitacion', v_codigo, jsonb_build_object('rol', p_rol, 'nombre', p_nombre));
  return jsonb_build_object('ok', true, 'codigo', v_codigo, 'expira_en', v_exp);
end $$;

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
  update public.perfiles set estado = 'suspendido', motivo_estado = p_motivo where id = p_id;
  update public.permisos_opcionales set activo = false where usuario_id = p_id and activo;   -- al suspender se apagan los extras
  perform public.fn_auditar('suspender_usuario', 'perfil', p_id::text, jsonb_build_object('motivo', p_motivo));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rpc_reactivar_usuario(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_staff_o(null);
  update public.perfiles set estado = 'activo', motivo_estado = null
   where id = p_id and estado = 'suspendido' and rol <> 'admin';
  if not found then raise exception 'La cuenta no está suspendida'; end if;
  perform public.fn_auditar('reactivar_usuario', 'perfil', p_id::text);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rpc_baja_usuario(p_id uuid, p_motivo text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Solo el Administrador' using errcode = '42501'; end if;
  update public.perfiles set estado = 'baja', motivo_estado = p_motivo where id = p_id and rol <> 'admin';
  if not found then raise exception 'Cuenta no encontrada'; end if;
  update public.permisos_opcionales set activo = false where usuario_id = p_id and activo;
  update public.asignaciones_zona set activo = false, hasta = current_date where usuario_id = p_id and activo;
  perform public.fn_auditar('baja_usuario', 'perfil', p_id::text, jsonb_build_object('motivo', p_motivo));
  return jsonb_build_object('ok', true);
end $$;

-- Solo el Administrador designa al Director; la persona anterior pierde el rol (4.3).
create or replace function public.rpc_designar_director(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.perfiles;
begin
  if not public.es_admin() then raise exception 'Solo el Administrador' using errcode = '42501'; end if;
  select * into v from public.perfiles where id = p_id;
  if not found or v.rol = 'admin' or v.estado not in ('activo', 'aprobado') then
    raise exception 'La cuenta no puede ser Director';
  end if;
  update public.perfiles set rol = 'colaborador' where rol = 'director' and id <> p_id;
  update public.perfiles set rol = 'director', estado = 'activo',
         curso_aprobado_en = coalesce(curso_aprobado_en, now()), acuerdos_aceptados_en = coalesce(acuerdos_aceptados_en, now())
   where id = p_id;
  perform public.fn_auditar('designar_director', 'perfil', p_id::text);
  return jsonb_build_object('ok', true);
end $$;

-- Enciende o apaga un permiso opcional (4.5). Queda quién lo dio, cuándo, por qué y hasta cuándo.
create or replace function public.rpc_set_permiso(p_usuario uuid, p_codigo text, p_activo boolean,
                                                  p_vence timestamptz default null, p_zonas uuid[] default null,
                                                  p_motivo text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_def public.permisos_catalogo; v_rol text;
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

-- Plantilla = atajo para encender varios permisos a la vez. No es un rol (4.6).
create or replace function public.rpc_aplicar_plantilla(p_usuario uuid, p_nombre text, p_vence timestamptz default null,
                                                        p_zonas uuid[] default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_pl public.plantillas_permisos; v_c text; v_n int := 0;
begin
  if not public.es_staff() then raise exception 'Solo el Director o el Administrador' using errcode = '42501'; end if;
  select * into v_pl from public.plantillas_permisos where nombre = p_nombre;
  if not found then raise exception 'Plantilla desconocida'; end if;
  foreach v_c in array v_pl.codigos loop
    perform public.rpc_set_permiso(
      p_usuario, v_c, true, p_vence,
      case when v_pl.limitar_a_zona and p_zonas is not null
                and (select acepta_zonas from public.permisos_catalogo where codigo = v_c) then p_zonas end,
      'Plantilla: ' || p_nombre);
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'permisos', v_n);
end $$;

create or replace function public.rpc_asignar_zona(p_zona uuid, p_usuario uuid, p_activo boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_staff_o('O-14');
  if p_activo then
    insert into public.asignaciones_zona (zona_id, usuario_id, asignado_por)
    select p_zona, p_usuario, auth.uid()
     where not exists (select 1 from public.asignaciones_zona where zona_id = p_zona and usuario_id = p_usuario and activo);
  else
    update public.asignaciones_zona set activo = false, hasta = current_date
     where zona_id = p_zona and usuario_id = p_usuario and activo;
  end if;
  perform public.fn_auditar('asignar_zona', 'zona', p_zona::text, jsonb_build_object('usuario', p_usuario, 'activo', p_activo));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rpc_crear_tarea(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
begin
  perform public._exigir_staff_o('O-09');
  insert into public.tareas (id, tipo, titulo, descripcion, asignado_a, creado_por, fecha_limite, prioridad, vivienda_id, zona_id)
  values (v_id, coalesce(p ->> 'tipo', 'otra'), p ->> 'titulo', p ->> 'descripcion',
          nullif(p ->> 'asignado_a', '')::uuid, auth.uid(), nullif(p ->> 'fecha_limite', '')::timestamptz,
          coalesce(p ->> 'prioridad', 'normal'), nullif(p ->> 'vivienda_id', '')::uuid, nullif(p ->> 'zona_id', '')::uuid)
  on conflict (id) do nothing;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.rpc_crear_anuncio(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
begin
  perform public._exigir_staff_o('O-11');
  insert into public.anuncios (id, titulo, texto, prioridad, zona_id, fijado, caduca_en, creado_por)
  values (v_id, p ->> 'titulo', p ->> 'texto', coalesce(p ->> 'prioridad', 'normal'), nullif(p ->> 'zona_id', '')::uuid,
          coalesce((p ->> 'fijado')::boolean, false), nullif(p ->> 'caduca_en', '')::timestamptz, auth.uid())
  on conflict (id) do nothing;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.rpc_anuncio_leido(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  insert into public.anuncios_lecturas (anuncio_id, usuario_id) values (p_id, auth.uid()) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rpc_resolver_alerta(p_id uuid, p_resolucion text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_staff_o('O-07');
  update public.alertas_calidad set resuelta_en = now(), resuelta_por = auth.uid(), resolucion = p_resolucion
   where id = p_id and resuelta_en is null;
  perform public.fn_auditar('resolver_alerta', 'alerta', p_id::text, jsonb_build_object('resolucion', p_resolucion));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rpc_resolver_titular(p_id uuid, p_estado text, p_respuesta text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_staff() then raise exception 'Solo el Director o el Administrador' using errcode = '42501'; end if;
  if p_estado not in ('en_proceso', 'resuelta', 'rechazada') then raise exception 'Estado no válido'; end if;
  update public.solicitudes_titulares
     set estado = p_estado, respuesta = p_respuesta, atendida_por = auth.uid(),
         resuelta_en = case when p_estado in ('resuelta', 'rechazada') then now() end
   where id = p_id;
  perform public.fn_auditar('resolver_titular', 'solicitud', p_id::text, jsonb_build_object('estado', p_estado));
  return jsonb_build_object('ok', true);
end $$;

-- Registro diferido (ubicación manual a más de 100 m): se aprueba o se descarta.
create or replace function public.rpc_aprobar_diferido(p_vivienda uuid, p_aprobar boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_staff_o('O-07');
  if p_aprobar then
    update public.viviendas set requiere_aprobacion = false where id = p_vivienda;
    update public.visitas set es_diferido = false where vivienda_id = p_vivienda;
  else
    update public.viviendas set eliminado_en = now(), motivo_eliminacion = 'Registro diferido no aprobado' where id = p_vivienda;
  end if;
  perform public.fn_auditar('aprobar_diferido', 'vivienda', p_vivienda::text, jsonb_build_object('aprobar', p_aprobar));
  return jsonb_build_object('ok', true);
end $$;

-- Plan de cierre (16.9): anonimiza los datos personales. Los archivos de fotos y firmas se borran con tools/admin_cli.py.
create or replace function public.rpc_plan_cierre(p_confirmacion text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_p int; v_c int; v_v int;
begin
  if not public.es_admin() then raise exception 'Solo el Administrador' using errcode = '42501'; end if;
  if p_confirmacion is distinct from 'ELIMINAR DATOS PERSONALES' then
    raise exception 'Escriba exactamente: ELIMINAR DATOS PERSONALES';
  end if;
  update public.personas set
    primer_nombre = '(eliminado)', segundo_nombre = null, primer_apellido = '(eliminado)', segundo_apellido = null,
    apodo = null, cedula_enc = null, cedula_hash = null, cedula_ult3 = null, fecha_nacimiento = null,
    telefono_enc = null, telefono_ult4 = null, telefono2_enc = null, correo_enc = null, correo_parcial = null,
    simpatia_enc = null, puesto_votacion = null, mesa_votacion = null, estado = 'solicito_eliminacion';
  get diagnostics v_p = row_count;
  update public.consentimientos set evidencia = '{}'::jsonb, estado = 'revocado', revocado_en = coalesce(revocado_en, now()),
         revocado_motivo = coalesce(revocado_motivo, 'Plan de cierre');
  get diagnostics v_c = row_count;
  update public.visitas set notas = null;
  get diagnostics v_v = row_count;
  perform public.fn_auditar('plan_cierre', 'seguridad', null, jsonb_build_object('personas', v_p, 'consentimientos', v_c, 'visitas', v_v));
  return jsonb_build_object('ok', true, 'personas', v_p, 'consentimientos', v_c, 'visitas', v_v);
end $$;

grant execute on function public.rpc_invitar(text, text, text, text) to authenticated;
grant execute on function public.rpc_aprobar_usuario(uuid) to authenticated;
grant execute on function public.rpc_suspender_usuario(uuid, text) to authenticated;
grant execute on function public.rpc_reactivar_usuario(uuid) to authenticated;
grant execute on function public.rpc_baja_usuario(uuid, text) to authenticated;
grant execute on function public.rpc_designar_director(uuid) to authenticated;
grant execute on function public.rpc_set_permiso(uuid, text, boolean, timestamptz, uuid[], text) to authenticated;
grant execute on function public.rpc_aplicar_plantilla(uuid, text, timestamptz, uuid[]) to authenticated;
grant execute on function public.rpc_asignar_zona(uuid, uuid, boolean) to authenticated;
grant execute on function public.rpc_crear_tarea(jsonb) to authenticated;
grant execute on function public.rpc_crear_anuncio(jsonb) to authenticated;
grant execute on function public.rpc_anuncio_leido(uuid) to authenticated;
grant execute on function public.rpc_resolver_alerta(uuid, text) to authenticated;
grant execute on function public.rpc_resolver_titular(uuid, text, text) to authenticated;
grant execute on function public.rpc_aprobar_diferido(uuid, boolean) to authenticated;
grant execute on function public.rpc_plan_cierre(text) to authenticated;
