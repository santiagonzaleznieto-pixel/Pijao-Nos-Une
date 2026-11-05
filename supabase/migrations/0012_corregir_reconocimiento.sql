-- Pijao Nos Une · 0012 · el reconocimiento debe indicar la fuente de la ubicación (columna obligatoria)
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

