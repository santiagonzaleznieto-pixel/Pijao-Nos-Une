-- 0018 · Fase 3 para el equipo (pedidos del dueño del 10 de noviembre de 2026).
-- 1. Personas: fecha de cumpleaños (mes y día) y varios canales para recibir información.
-- 2. rpc_registrar_visita: acepta esos campos y el sostén del hogar sin «Relación» (sexo, ocupación o situación laboral
--    bastan para la calidad, igual que en la app).
-- 3. personas_v: muestra el cumpleaños (para «Cumpleañeros de hoy») y los canales.
-- 4. Panel: seguridad en terreno (jornadas activas y alertas SOS), estado de incidentes y de necesidades.
-- Todo es solo para el equipo; no hay nada público.

-- ---------------------------------------------------------------- 1. personas
alter table public.personas
  add column if not exists cumple_mes smallint check (cumple_mes between 1 and 12),
  add column if not exists cumple_dia smallint check (cumple_dia between 1 and 31),
  add column if not exists canales_preferidos text[];

-- El cumpleaños sale de la fecha de nacimiento cuando no se escogió aparte.
create or replace function public._cumple_desde_nacimiento() returns trigger language plpgsql set search_path = public as $$
begin
  if new.fecha_nacimiento is not null and (new.cumple_mes is null or new.cumple_dia is null) then
    new.cumple_mes := extract(month from new.fecha_nacimiento)::smallint;
    new.cumple_dia := extract(day from new.fecha_nacimiento)::smallint;
  end if;
  if new.canales_preferidos is null and new.canal_preferido is not null then
    new.canales_preferidos := array[new.canal_preferido];
  end if;
  return new;
end $$;
drop trigger if exists tr_personas_cumple on public.personas;
create trigger tr_personas_cumple before insert or update of fecha_nacimiento, cumple_mes, cumple_dia, canal_preferido, canales_preferidos
  on public.personas for each row execute function public._cumple_desde_nacimiento();

-- ---------------------------------------------------------------- 2. rpc_registrar_visita
-- Se modifica la definición vigente en dos puntos exactos; si no se encuentran, la migración se detiene (no adivina).
do $$
declare d text;
begin
  d := pg_get_functiondef('public.rpc_registrar_visita(jsonb)'::regprocedure);
  if position('''temas_interes''];' in d) = 0 then raise exception '0018: no se encontró la lista de campos de persona'; end if;
  d := replace(d, '''temas_interes''];', '''temas_interes'',''cumple_mes'',''cumple_dia'',''canales_preferidos''];');
  if position('and nullif(v_hog ->> ''sosten_relacion'', '''') is null and nullif(v_hog ->> ''sosten_persona_id'', '''') is null then' in d) = 0 then
    raise exception '0018: no se encontró la regla del sostén del hogar';
  end if;
  d := replace(d, 'and nullif(v_hog ->> ''sosten_relacion'', '''') is null and nullif(v_hog ->> ''sosten_persona_id'', '''') is null then',
    'and nullif(v_hog ->> ''sosten_relacion'', '''') is null and nullif(v_hog ->> ''sosten_persona_id'', '''') is null'
    || ' and nullif(v_hog ->> ''sosten_sexo'', '''') is null and nullif(v_hog ->> ''sosten_ocupacion'', '''') is null'
    || ' and nullif(v_hog ->> ''sosten_situacion_laboral'', '''') is null then');
  execute d;
end $$;

-- ---------------------------------------------------------------- 3. personas_v
do $$
declare v text;
begin
  v := pg_get_viewdef('public.personas_v'::regclass);
  if v !~ 'eliminado_en\s+FROM personas p' then raise exception '0018: no se encontró el final de las columnas de personas_v'; end if;
  v := regexp_replace(v, 'eliminado_en\s+FROM personas p', 'eliminado_en, p.cumple_mes, p.cumple_dia, p.canales_preferidos FROM personas p');
  execute 'create or replace view public.personas_v as ' || v;
end $$;

-- ---------------------------------------------------------------- 4. panel
-- Seguridad en terreno (P-46 en el panel): quién está en jornada y dónde se vio por última vez, y las alertas SOS.
create or replace function public.rpc_seguridad_panel() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.es_staff() then raise exception 'Solo el Director o el Administrador' using errcode = '42501'; end if;
  return jsonb_build_object(
    'jornadas', coalesce((
      select jsonb_agg(jsonb_build_object('id', j.id, 'usuario_id', j.usuario_id, 'nombre', p.nombre, 'inicio', j.inicio,
        'lat', u.lat, 'lng', u.lng, 'visto_en', u.tomada_en) order by j.inicio)
        from public.jornadas j join public.perfiles p on p.id = j.usuario_id
        left join lateral (select lat, lng, tomada_en from public.ubicaciones_jornada x where x.jornada_id = j.id order by tomada_en desc limit 1) u on true
       where j.fin is null and j.inicio > now() - interval '16 hours'), '[]'::jsonb),
    'sos', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'nombre', p.nombre, 'lat', s.lat, 'lng', s.lng, 'nota', s.nota, 'creada_en', s.creada_en,
        'atendida_en', s.atendida_en) order by s.creada_en desc)
        from public.sos_alertas s join public.perfiles p on p.id = s.usuario_id
       where s.atendida_en is null or s.creada_en > now() - interval '7 days'), '[]'::jsonb));
end $$;

-- Incidentes (P-34): el Director o el Administrador los revisan y resuelven.
create or replace function public.rpc_incidente_estado(p_id uuid, p_estado text, p_resolucion text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_staff() then raise exception 'Solo el Director o el Administrador' using errcode = '42501'; end if;
  if p_estado not in ('abierto', 'en_revision', 'resuelto') then raise exception 'Estado de incidente no válido'; end if;
  update public.incidentes set estado = p_estado, resolucion = coalesce(nullif(p_resolucion, ''), resolucion), actualizado_en = now() where id = p_id;
  perform public.fn_auditar('incidente_estado', 'incidente', p_id::text, jsonb_build_object('estado', p_estado));
  return jsonb_build_object('ok', true);
end $$;

-- Necesidades (P-26, 11.5): el recorrido de una necesidad, con los estados C-19.
create or replace function public.rpc_necesidad_estado(p_id uuid, p_estado text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_staff() then raise exception 'Solo el Director o el Administrador' using errcode = '42501'; end if;
  if p_estado not in ('recibida', 'clasificada', 'agrupada', 'evaluada', 'incluida_programa', 'derivada', 'no_viable', 'comunicada', 'cerrada') then
    raise exception 'Estado de necesidad no válido';
  end if;
  update public.necesidades set estado = p_estado, actualizado_en = now() where id = p_id and eliminado_en is null;
  perform public.fn_auditar('necesidad_estado', 'necesidad', p_id::text, jsonb_build_object('estado', p_estado));
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.rpc_seguridad_panel() from public, anon;
revoke all on function public.rpc_incidente_estado(uuid, text, text) from public, anon;
revoke all on function public.rpc_necesidad_estado(uuid, text) from public, anon;
revoke all on function public._cumple_desde_nacimiento() from public, anon, authenticated;
grant execute on function public.rpc_seguridad_panel() to authenticated;
grant execute on function public.rpc_incidente_estado(uuid, text, text) to authenticated;
grant execute on function public.rpc_necesidad_estado(uuid, text) to authenticated;
