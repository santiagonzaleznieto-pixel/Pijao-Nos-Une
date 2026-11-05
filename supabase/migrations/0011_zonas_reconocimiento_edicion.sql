-- Pijao Nos Une · 0011 · zonas con polígono, reconocimiento, edición de visitas y atención de SOS

create or replace function public.rpc_guardar_zona(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
begin
  perform public._exigir_staff_o('O-14');
  if coalesce(trim(p ->> 'nombre'), '') = '' then raise exception 'Escriba el nombre de la zona'; end if;
  if coalesce(p ->> 'tipo', '') not in ('barrio', 'vereda', 'sector') then raise exception 'Tipo de zona no válido'; end if;
  if jsonb_typeof(p -> 'poligono') = 'array' and jsonb_array_length(p -> 'poligono') between 1 and 2 then
    raise exception 'El polígono necesita al menos 3 puntos';
  end if;
  insert into public.zonas (id, nombre, tipo, poligono, viviendas_estimadas, meta_cobertura_pct, meta_fecha, activo, creado_por)
  values (v_id, trim(p ->> 'nombre'), p ->> 'tipo', p -> 'poligono', nullif(p ->> 'viviendas_estimadas', '')::int,
          nullif(p ->> 'meta_cobertura_pct', '')::numeric, nullif(p ->> 'meta_fecha', '')::date, coalesce((p ->> 'activo')::boolean, true), auth.uid())
  on conflict (id) do update
    set nombre = excluded.nombre, tipo = excluded.tipo, poligono = coalesce(excluded.poligono, public.zonas.poligono),
        viviendas_estimadas = excluded.viviendas_estimadas, meta_cobertura_pct = excluded.meta_cobertura_pct,
        meta_fecha = excluded.meta_fecha, activo = excluded.activo;
  perform public.fn_auditar('guardar_zona', 'zona', v_id::text, jsonb_build_object('nombre', p ->> 'nombre'));
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.rpc_eliminar_zona(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_staff_o('O-14');
  update public.zonas set activo = false where id = p_id;
  update public.asignaciones_zona set activo = false, hasta = current_date where zona_id = p_id and activo;
  perform public.fn_auditar('eliminar_zona', 'zona', p_id::text);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rpc_registrar_reconocimiento(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
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
  if exists (select 1 from jsonb_array_elements(coalesce(p -> 'fotos', '[]'::jsonb)) as t(c) where c ->> 'tipo' = 'fachada') then v_calidad := 'verde'; end if;
  insert into public.viviendas
  select * from jsonb_populate_record(null::public.viviendas,
    (v_viv - 'solo_visita') || jsonb_build_object('estado', 'por_visitar', 'es_reconocimiento', true, 'requiere_aprobacion', false,
      'fuente_ubicacion', coalesce(nullif(v_viv ->> 'fuente_ubicacion', ''), 'gps'), 'calidad', v_calidad, 'creado_por', auth.uid(), 'creado_en', now(), 'actualizado_en', now()));
  for v_foto in select c from jsonb_array_elements(coalesce(p -> 'fotos', '[]'::jsonb)) as t(c) loop
    insert into public.fotos
    select * from jsonb_populate_record(null::public.fotos,
      v_foto || jsonb_build_object('vivienda_id', v_vid, 'usuario_id', auth.uid(), 'subida', false,
      'con_personas', coalesce((v_foto ->> 'con_personas')::boolean, false), 'creado_en', now(), 'actualizado_en', now()))
    on conflict (id) do nothing;
  end loop;
  update public.viviendas set foto_principal_path = (select storage_path from public.fotos where vivienda_id = v_vid and tipo = 'fachada' order by creado_en limit 1)
   where id = v_vid;
  perform public.fn_auditar('registrar_reconocimiento', 'vivienda', v_vid::text);
  return jsonb_build_object('ok', true, 'calidad', v_calidad, 'advertencias', to_jsonb(v_avisos));
end $$;

create or replace function public.rpc_editar_visita(p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.visitas;
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  select * into v from public.visitas where id = p_id and eliminado_en is null;
  if not found then raise exception 'Visita no encontrada'; end if;
  if not (public.es_staff() or public.tiene_permiso('O-06')
          or (v.usuario_id = auth.uid() and now() - v.creado_en <= make_interval(hours => public.cfg_num('ventana_edicion_h', 72)::int))) then
    raise exception 'R-22: ya pasó la ventana de edición; solicite la corrección al Director' using errcode = '42501';
  end if;
  update public.visitas set
    notas = case when p ? 'notas' then nullif(p ->> 'notas', '') else notas end,
    volante_entregado = case when p ? 'volante_entregado' then (p ->> 'volante_entregado')::boolean else volante_entregado end,
    seguimiento_requerido = case when p ? 'seguimiento_requerido' then (p ->> 'seguimiento_requerido')::boolean else seguimiento_requerido end,
    seguimiento_motivo = case when p ? 'seguimiento_motivo' then nullif(p ->> 'seguimiento_motivo', '') else seguimiento_motivo end,
    seguimiento_fecha = case when p ? 'seguimiento_fecha' then nullif(p ->> 'seguimiento_fecha', '')::timestamptz else seguimiento_fecha end
   where id = p_id;
  perform public.fn_auditar('editar_visita', 'visita', p_id::text, jsonb_build_object('campos', (select jsonb_agg(k) from jsonb_object_keys(p) k)));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rpc_atender_sos(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_staff() then raise exception 'Solo el Director o el Administrador' using errcode = '42501'; end if;
  update public.sos_alertas set atendida_en = now(), atendida_por = auth.uid() where id = p_id and atendida_en is null;
  perform public.fn_auditar('atender_sos', 'seguridad', p_id::text);
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.rpc_guardar_zona(jsonb) to authenticated;
grant execute on function public.rpc_eliminar_zona(uuid) to authenticated;
grant execute on function public.rpc_registrar_reconocimiento(jsonb) to authenticated;
grant execute on function public.rpc_editar_visita(uuid, jsonb) to authenticated;
grant execute on function public.rpc_atender_sos(uuid) to authenticated;
