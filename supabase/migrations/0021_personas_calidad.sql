-- Pijao Nos Une · 0021 · Personas, dónde vota, duplicados, historia, sorteo del 5 % e informe semanal
--
-- Decisiones del dueño (23 de noviembre de 2026):
--  · Pestaña «Personas» con TODAS las personas registradas. El Director y el Administrador ven todos sus datos; un
--    colaborador ve completas las personas que él registró (y las de su permiso O-01) y, de las demás, solo el nombre
--    y la vereda o el barrio.
--  · Dónde vota cada persona (puesto y mesa): se consulta a mano en la Registraduría (pide un captcha que no se puede
--    automatizar) y se guarda aquí. Los puestos de Pijao son un catálogo (C-21) que el Director llena desde el panel.
--  · Duplicados y fusión de viviendas y personas conservando todo el historial (6.6, O-20).
--  · Historia completa de cada persona.
--  · Sorteo semanal del 5 % de las visitas para verificar por llamada (R-27) e informe semanal automático al Director.

-- ======================================================================= utilidades

-- Texto comparable: minúsculas, sin tildes y con un solo espacio.
create or replace function public._norm(t text) returns text
language sql immutable set search_path = public, pg_temp as $$
  select btrim(regexp_replace(lower(translate(coalesce(t, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')), '\s+', ' ', 'g'))
$$;
grant execute on function public._norm(text) to authenticated;

-- Fecha de Colombia (los informes y el sorteo cuentan semanas de lunes a domingo en hora local).
create or replace function public._hoy_co() returns date
language sql stable set search_path = public, pg_temp as $$
  select (now() at time zone 'America/Bogota')::date
$$;

-- Lunes de la semana anterior a la fecha dada (hora de Colombia).
create or replace function public._lunes_anterior(p_dia date default null) returns date
language sql stable set search_path = public, pg_temp as $$
  select (date_trunc('week', coalesce(p_dia, public._hoy_co())::timestamp) - interval '7 days')::date
$$;

-- ======================================================================= vista enmascarada con dónde vota

-- Se agregan el puesto y la mesa al final de la vista (para que la app los tenga sin conexión), sin tocar lo demás:
-- igual que 0018, sobre la definición vigente (que ya termina en los canales preferidos).
do $$
declare v text;
begin
  v := pg_get_viewdef('public.personas_v'::regclass);
  if v ~ 'puesto_votacion' then return; end if;
  if v !~ 'canales_preferidos\s+FROM personas p' then raise exception '0021: no se encontró el final de las columnas de personas_v'; end if;
  v := regexp_replace(v, 'canales_preferidos\s+FROM personas p',
    'canales_preferidos, '
    || 'CASE WHEN p.estado = ''solicito_eliminacion''::text THEN NULL::text ELSE p.puesto_votacion END AS puesto_votacion, '
    || 'CASE WHEN p.estado = ''solicito_eliminacion''::text THEN NULL::text ELSE p.mesa_votacion END AS mesa_votacion '
    || 'FROM personas p');
  execute 'create or replace view public.personas_v as ' || v;
end $$;
grant select on public.personas_v to authenticated;

-- ======================================================================= lista de personas (pestaña «Personas»)

-- ¿Quien consulta ve los datos completos de esta persona? Staff, quien la registró o quien tiene O-01 en su zona.
create or replace function public._ve_completa(p_creado_por uuid, p_zona uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select public.es_staff() or p_creado_por = auth.uid() or public.tiene_permiso('O-01', p_zona)
$$;
revoke all on function public._ve_completa(uuid, uuid) from public, anon, authenticated;

-- Una fila de la lista. Con datos completos: todo lo registrado (sin la simpatía, que sigue en rpc_persona_completa
-- con O-02). Sin datos completos: solo el nombre visible y la vereda o el barrio.
create or replace function public._persona_fila(p_id uuid, p_completo boolean) returns jsonb
language sql security definer set search_path = public, pg_temp as $$
  select case when p_completo then jsonb_build_object(
      'id', pe.id, 'vivienda_id', pe.vivienda_id, 'completo', true, 'propia', pe.creado_por = auth.uid(),
      'nombre', trim(concat_ws(' ', pe.primer_nombre, pe.segundo_nombre, pe.primer_apellido, pe.segundo_apellido)),
      'apodo', pe.apodo, 'tipo_documento', pe.tipo_documento, 'cedula', public._dec(pe.cedula_enc),
      'telefono', public._dec(pe.telefono_enc), 'telefono_es_whatsapp', pe.telefono_es_whatsapp,
      'telefono2', public._dec(pe.telefono2_enc), 'correo', public._dec(pe.correo_enc),
      'fecha_nacimiento', pe.fecha_nacimiento,
      'edad', case when pe.fecha_nacimiento is not null then date_part('year', age(current_date, pe.fecha_nacimiento))::int end,
      'sexo', pe.sexo, 'ocupacion', pe.ocupacion, 'canal_preferido', pe.canal_preferido, 'mejor_horario', pe.mejor_horario,
      'direccion', vi.direccion, 'complemento', vi.complemento, 'nombre_finca', vi.nombre_finca,
      'barrio_vereda', vi.barrio_vereda, 'zona_urbana_rural', vi.zona_urbana_rural, 'zona', z.nombre,
      'predio', vi.referencia, 'lat', vi.lat, 'lng', vi.lng,
      'vota_en_pijao', pe.vota_en_pijao, 'puesto_votacion', pe.puesto_votacion, 'mesa_votacion', pe.mesa_votacion,
      'anios_en_pijao', pe.anios_en_pijao, 'voluntario', pe.voluntario, 'interes_info', pe.interes_info, 'anfitrion', pe.anfitrion, 'temas_interes', pe.temas_interes,
      'estado', pe.estado,
      'contacto_autorizado', exists (select 1 from public.consentimientos c
                                      where c.persona_id = pe.id and c.estado = 'vigente' and c.proposito like 'contacto\_%'),
      'registrado_por', pf.nombre_completo, 'creado_en', pe.creado_en,
      'ultima_visita', (select max(v.fecha) from public.visitas v where v.vivienda_id = pe.vivienda_id and v.eliminado_en is null))
    else jsonb_build_object(
      'id', pe.id, 'completo', false, 'propia', false,
      'nombre', trim(concat_ws(' ', pe.primer_nombre, pe.primer_apellido)), 'barrio_vereda', vi.barrio_vereda,
      'zona_urbana_rural', vi.zona_urbana_rural) end
  from public.personas pe
  left join public.viviendas vi on vi.id = pe.vivienda_id
  left join public.zonas z on z.id = vi.zona_id
  left join public.perfiles pf on pf.id = pe.creado_por
  where pe.id = p_id
$$;
revoke all on function public._persona_fila(uuid, boolean) from public, anon, authenticated;

-- Filtros (todos opcionales) en p: texto (nombre, apodo o cédula exacta), vereda, zona, puesto, mesa, sin_puesto,
-- vota ('si','no','no_sabe','sin_dato'), predio, estado, mias, registro_por (solo staff), id (una sola persona),
-- limite (1-200) y desde.
-- Los filtros de datos completos (cédula, puesto, mesa, predio) solo encuentran personas que quien consulta ve completas:
-- así nadie averigua a quién pertenece una cédula que no le corresponde ver.
create or replace function public.rpc_personas_lista(p jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_staff boolean;
  v_texto text := nullif(btrim(coalesce(p ->> 'texto', '')), '');
  v_norm text;
  v_hash text;
  v_limite int := least(greatest(coalesce(nullif(p ->> 'limite', '')::int, 50), 1), 200);
  v_desde int := greatest(coalesce(nullif(p ->> 'desde', '')::int, 0), 0);
  v_total int;
  v_filas jsonb;
  v_completas int;
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  v_staff := public.es_staff();
  if v_texto is not null and regexp_replace(v_texto, '[\s.]', '', 'g') ~ '^\d{6,10}$' then
    v_hash := public._hash(regexp_replace(v_texto, '\D', '', 'g'));
  end if;
  v_norm := public._norm(v_texto);

  with base as materialized (
    select pe.id, pe.primer_nombre, pe.segundo_nombre, pe.primer_apellido, pe.segundo_apellido, pe.apodo, pe.cedula_hash,
           pe.puesto_votacion, pe.mesa_votacion, pe.vota_en_pijao, pe.estado, pe.creado_por,
           vi.barrio_vereda, vi.referencia, vi.zona_id,
           public._ve_completa(pe.creado_por, vi.zona_id) as completo
      from public.personas pe
      left join public.viviendas vi on vi.id = pe.vivienda_id
     where pe.eliminado_en is null and pe.estado <> 'solicito_eliminacion'
  ), filtrada as (
    select b.*,
           row_number() over (order by public._norm(concat_ws(' ', b.primer_nombre, b.primer_apellido)), b.id)::int as rn,
           count(*) over ()::int as total
      from base b
     where (v_texto is null
            or (v_hash is not null and b.completo and b.cedula_hash = v_hash)
            or (v_hash is null and public._norm(case when b.completo
                  then concat_ws(' ', b.primer_nombre, b.segundo_nombre, b.primer_apellido, b.segundo_apellido, b.apodo)
                  else concat_ws(' ', b.primer_nombre, b.primer_apellido) end) like '%' || v_norm || '%'))
       and (nullif(p ->> 'vereda', '') is null or public._norm(b.barrio_vereda) like '%' || public._norm(p ->> 'vereda') || '%')
       and (nullif(p ->> 'zona', '') is null or b.zona_id = (p ->> 'zona')::uuid)
       and (nullif(p ->> 'puesto', '') is null or (b.completo and public._norm(b.puesto_votacion) = public._norm(p ->> 'puesto')))
       and (nullif(p ->> 'mesa', '') is null or (b.completo and b.mesa_votacion = btrim(p ->> 'mesa')))
       and (not coalesce((p ->> 'sin_puesto')::boolean, false) or (b.completo and nullif(btrim(b.puesto_votacion), '') is null))
       and (nullif(p ->> 'vota', '') is null or (b.completo and
            case when p ->> 'vota' = 'sin_dato' then b.vota_en_pijao is null else b.vota_en_pijao = p ->> 'vota' end))
       and (nullif(p ->> 'predio', '') is null or (b.completo and b.referencia ilike '%' || btrim(p ->> 'predio') || '%'))
       and (nullif(p ->> 'estado', '') is null or b.estado = p ->> 'estado')
       and (not coalesce((p ->> 'mias')::boolean, false) or b.creado_por = v_uid)
       and (nullif(p ->> 'registro_por', '') is null or (v_staff and b.creado_por = (p ->> 'registro_por')::uuid))
       and (nullif(p ->> 'id', '') is null or b.id = (p ->> 'id')::uuid)
  )
  , pagina as (
    select f.id, f.completo, f.rn from filtrada f where f.rn > v_desde and f.rn <= v_desde + v_limite
  )
  select (select coalesce(max(f.total), 0) from filtrada f),
         (select coalesce(jsonb_agg(public._persona_fila(g.id, g.completo) order by g.rn), '[]'::jsonb) from pagina g),
         (select count(*) from pagina g where g.completo)
    into v_total, v_filas, v_completas;

  if v_completas > 0 then
    perform public.fn_auditar('ver_lista_personas', 'persona', null,
      jsonb_build_object('filtros', p - 'limite' - 'desde', 'desde', v_desde, 'filas', jsonb_array_length(v_filas),
                         'con_datos_completos', v_completas));
  end if;
  return jsonb_build_object('total', v_total, 'desde', v_desde, 'limite', v_limite, 'filas', v_filas);
end $$;

-- Conteos por puesto y mesa (de las personas que quien consulta ve completas), los puestos sugeridos (catálogo C-21 y
-- los ya escritos) y, para el staff, la lista del equipo para filtrar por quién registró.
create or replace function public.rpc_personas_resumen() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v jsonb;
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  with vis as materialized (
    select pe.id, pe.puesto_votacion, pe.mesa_votacion, pe.vota_en_pijao
      from public.personas pe left join public.viviendas vi on vi.id = pe.vivienda_id
     where pe.eliminado_en is null and pe.estado <> 'solicito_eliminacion' and public._ve_completa(pe.creado_por, vi.zona_id)
  ), puestos as (
    select btrim(puesto_votacion) as puesto, count(*)::int as n
      from vis where nullif(btrim(puesto_votacion), '') is not null group by 1
  ), mesas as (
    select btrim(puesto_votacion) as puesto, btrim(mesa_votacion) as mesa, count(*)::int as n
      from vis where nullif(btrim(puesto_votacion), '') is not null and nullif(btrim(mesa_votacion), '') is not null
     group by 1, 2
  )
  select jsonb_build_object(
    'total_visibles', (select count(*) from public.personas pe where pe.eliminado_en is null and pe.estado <> 'solicito_eliminacion'),
    'completas', (select count(*) from vis),
    'con_puesto', (select count(*) from vis where nullif(btrim(puesto_votacion), '') is not null),
    'vota', jsonb_build_object(
       'si', (select count(*) from vis where vota_en_pijao = 'si'),
       'no', (select count(*) from vis where vota_en_pijao = 'no'),
       'no_sabe', (select count(*) from vis where vota_en_pijao = 'no_sabe'),
       'sin_dato', (select count(*) from vis where vota_en_pijao is null)),
    'puestos', coalesce((
       select jsonb_agg(jsonb_build_object('puesto', pu.puesto, 'personas', pu.n,
                'mesas', coalesce((select jsonb_agg(jsonb_build_object('mesa', m.mesa, 'personas', m.n)
                                                   order by nullif(regexp_replace(m.mesa, '\D', '', 'g'), '')::int nulls last, m.mesa)
                                     from mesas m where m.puesto = pu.puesto), '[]'::jsonb))
              order by pu.n desc, pu.puesto)
         from puestos pu), '[]'::jsonb),
    'sugeridos', coalesce((
       select jsonb_agg(s.nombre order by s.orden, s.nombre) from (
         select etiqueta as nombre, min(orden) as orden from public.catalogos where catalogo = 'C-21' and activo group by etiqueta
         union
         select distinct btrim(puesto_votacion), 1000 from public.personas
          where nullif(btrim(puesto_votacion), '') is not null and eliminado_en is null
            and btrim(puesto_votacion) not in (select etiqueta from public.catalogos where catalogo = 'C-21')
       ) s), '[]'::jsonb),
    'equipo', case when public.es_staff() then coalesce((
       select jsonb_agg(jsonb_build_object('id', pf.id, 'nombre', pf.nombre_completo) order by pf.nombre_completo)
         from public.perfiles pf
        where exists (select 1 from public.personas pe where pe.creado_por = pf.id and pe.eliminado_en is null)), '[]'::jsonb) end)
  into v;
  return v;
end $$;

-- Guardar dónde vota una persona (lo consultado en la Registraduría o lo que dijo la persona).
create or replace function public.rpc_persona_votacion(p_id uuid, p_vota text, p_puesto text, p_mesa text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.personas; v_zona uuid; v_puesto text := nullif(btrim(coalesce(p_puesto, '')), '');
        v_mesa text := nullif(regexp_replace(coalesce(p_mesa, ''), '\D', '', 'g'), ''); v_vota text := nullif(p_vota, '');
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  select * into v from public.personas where id = p_id and eliminado_en is null for update;
  if not found or v.estado = 'solicito_eliminacion' then raise exception 'Persona no encontrada'; end if;
  select zona_id into v_zona from public.viviendas where id = v.vivienda_id;
  if not (public.es_staff() or v.creado_por = auth.uid() or public.tiene_permiso('O-06', v_zona)) then
    raise exception 'Solo quien registró a la persona, el Director o quien tiene permiso de editar puede cambiar dónde vota'
      using errcode = '42501';
  end if;
  if v_vota is not null and v_vota not in ('si', 'no', 'no_sabe') then raise exception '¿Vota en Pijao? Responda sí, no o no sabe'; end if;
  if v_puesto is not null and length(v_puesto) > 120 then raise exception 'El nombre del puesto es muy largo (máximo 120 caracteres)'; end if;
  if v_mesa is not null and (length(v_mesa) > 3 or v_mesa::int = 0) then raise exception 'La mesa es un número de 1 a 999'; end if;
  if v_vota = 'no' then v_puesto := null; v_mesa := null; end if;   -- vota en otro municipio
  if v_puesto is not null and v_vota is null then v_vota := 'si'; end if;
  if v_mesa is not null then v_mesa := ltrim(v_mesa, '0'); end if;
  update public.personas set vota_en_pijao = v_vota, puesto_votacion = v_puesto, mesa_votacion = v_mesa where id = p_id;
  perform public.fn_auditar('persona_votacion', 'persona', p_id::text, jsonb_build_object(
    'antes', jsonb_build_object('vota', v.vota_en_pijao, 'puesto', v.puesto_votacion, 'mesa', v.mesa_votacion),
    'despues', jsonb_build_object('vota', v_vota, 'puesto', v_puesto, 'mesa', v_mesa)));
  return jsonb_build_object('ok', true, 'vota_en_pijao', v_vota, 'puesto_votacion', v_puesto, 'mesa_votacion', v_mesa);
end $$;

-- ======================================================================= duplicados y fusión (6.6, O-20)

create table if not exists public.duplicados_descartados (
  tipo text not null check (tipo in ('vivienda', 'persona')),
  id_a uuid not null,
  id_b uuid not null,
  descartado_por uuid,
  descartado_en timestamptz not null default now(),
  primary key (tipo, id_a, id_b),
  check (id_a < id_b)
);
alter table public.duplicados_descartados enable row level security;
revoke all on public.duplicados_descartados from public, anon, authenticated;

create table if not exists public.fusiones (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('vivienda', 'persona')),
  conservada uuid not null,
  absorbida uuid not null,
  motivo text,
  hecha_por uuid,
  hecha_en timestamptz not null default now()
);
create index if not exists ix_fusiones_conservada on public.fusiones (conservada);
alter table public.fusiones enable row level security;
revoke all on public.fusiones from public, anon, authenticated;

-- Distancia aproximada en metros (suficiente para decenas de metros).
create or replace function public._metros(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable set search_path = public, pg_temp as $$
  select 111320.0 * sqrt(power(lat2 - lat1, 2) + power((lng2 - lng1) * cos(radians((lat1 + lat2) / 2)), 2))
$$;

create or replace function public._resumen_vivienda(p_id uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('id', v.id, 'direccion', v.direccion, 'nombre_finca', v.nombre_finca, 'barrio_vereda', v.barrio_vereda,
    'predio', v.referencia, 'estado', v.estado, 'lat', v.lat, 'lng', v.lng, 'creado_en', v.creado_en,
    'registrado_por', (select nombre_completo from public.perfiles where id = v.creado_por),
    'visitas', (select count(*) from public.visitas x where x.vivienda_id = v.id and x.eliminado_en is null),
    'personas', (select count(*) from public.personas x where x.vivienda_id = v.id and x.eliminado_en is null))
  from public.viviendas v where v.id = p_id
$$;
revoke all on function public._resumen_vivienda(uuid) from public, anon, authenticated;

create or replace function public._resumen_persona_dup(p_id uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('id', pe.id,
    'nombre', trim(concat_ws(' ', pe.primer_nombre, pe.segundo_nombre, pe.primer_apellido, pe.segundo_apellido)),
    'cedula_ult3', pe.cedula_ult3, 'telefono_ult4', pe.telefono_ult4, 'fecha_nacimiento', pe.fecha_nacimiento,
    'puesto_votacion', pe.puesto_votacion, 'mesa_votacion', pe.mesa_votacion, 'estado', pe.estado, 'creado_en', pe.creado_en,
    'direccion', vi.direccion, 'barrio_vereda', vi.barrio_vereda, 'vivienda_id', pe.vivienda_id,
    'registrado_por', (select nombre_completo from public.perfiles where id = pe.creado_por))
  from public.personas pe left join public.viviendas vi on vi.id = pe.vivienda_id where pe.id = p_id
$$;
revoke all on function public._resumen_persona_dup(uuid) from public, anon, authenticated;

-- Parejas que parecen la misma vivienda (mismo predio del IGAC, o muy cerca y con la misma dirección) o la misma persona
-- (mismo nombre y apellido y además la misma casa, la misma fecha de nacimiento, el mismo final de teléfono o el mismo
-- segundo apellido; nunca si tienen cédulas distintas). Las que el equipo marcó como «no son la misma» no vuelven.
create or replace function public.rpc_duplicados() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_radio double precision; v_viv jsonb; v_per jsonb;
begin
  perform public._exigir_staff_o('O-20');
  v_radio := public.cfg_num('radio_duplicados_m', 15);
  select coalesce(jsonb_agg(jsonb_build_object('a', public._resumen_vivienda(x.a), 'b', public._resumen_vivienda(x.b),
                                               'motivo', x.motivo, 'metros', round(x.m::numeric)) order by x.m), '[]'::jsonb)
    into v_viv
    from (
      select a.id as a, b.id as b, public._metros(a.lat, a.lng, b.lat, b.lng) as m,
             case when a.referencia like 'Predio IGAC %' and a.referencia = b.referencia then 'Mismo predio del IGAC'
                  else 'Muy cerca y con la misma dirección' end as motivo
        from public.viviendas a
        join public.viviendas b on b.id > a.id
         and b.lat between a.lat - 0.002 and a.lat + 0.002
         and b.lng between a.lng - 0.002 and a.lng + 0.002
       where a.eliminado_en is null and b.eliminado_en is null
         and ((a.referencia like 'Predio IGAC %' and a.referencia = b.referencia)
              or (public._metros(a.lat, a.lng, b.lat, b.lng) <= v_radio
                  and (public._norm(a.direccion) = public._norm(b.direccion)
                       or (nullif(a.nombre_finca, '') is not null and public._norm(a.nombre_finca) = public._norm(b.nombre_finca)))))
         and not exists (select 1 from public.duplicados_descartados d where d.tipo = 'vivienda' and d.id_a = a.id and d.id_b = b.id)
       order by 3 limit 100) x;

  select coalesce(jsonb_agg(jsonb_build_object('a', public._resumen_persona_dup(x.a), 'b', public._resumen_persona_dup(x.b),
                                               'motivo', x.motivo)), '[]'::jsonb)
    into v_per
    from (
      select a.id as a, b.id as b,
             case when a.vivienda_id = b.vivienda_id then 'Mismo nombre en la misma casa'
                  when a.fecha_nacimiento = b.fecha_nacimiento then 'Mismo nombre y fecha de nacimiento'
                  when a.telefono_ult4 = b.telefono_ult4 then 'Mismo nombre y mismo final de teléfono'
                  else 'Mismo nombre completo' end as motivo
        from public.personas a
        join public.personas b on b.id > a.id
         and public._norm(b.primer_nombre) = public._norm(a.primer_nombre)
         and public._norm(b.primer_apellido) = public._norm(a.primer_apellido)
       where a.eliminado_en is null and b.eliminado_en is null
         and a.estado <> 'solicito_eliminacion' and b.estado <> 'solicito_eliminacion'
         and not (a.cedula_hash is not null and b.cedula_hash is not null and a.cedula_hash <> b.cedula_hash)
         and (a.vivienda_id = b.vivienda_id or a.fecha_nacimiento = b.fecha_nacimiento or a.telefono_ult4 = b.telefono_ult4
              or (nullif(a.segundo_apellido, '') is not null and public._norm(a.segundo_apellido) = public._norm(b.segundo_apellido)))
         and not exists (select 1 from public.duplicados_descartados d where d.tipo = 'persona' and d.id_a = a.id and d.id_b = b.id)
       limit 100) x;
  return jsonb_build_object('viviendas', v_viv, 'personas', v_per);
end $$;

create or replace function public.rpc_duplicado_descartar(p_tipo text, p_a uuid, p_b uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public._exigir_staff_o('O-20');
  if p_tipo not in ('vivienda', 'persona') or p_a is null or p_b is null or p_a = p_b then raise exception 'Datos no válidos'; end if;
  insert into public.duplicados_descartados (tipo, id_a, id_b, descartado_por)
  values (p_tipo, least(p_a, p_b), greatest(p_a, p_b), auth.uid()) on conflict do nothing;
  perform public.fn_auditar('duplicado_descartado', p_tipo, least(p_a, p_b)::text, jsonb_build_object('otra', greatest(p_a, p_b)));
  return jsonb_build_object('ok', true);
end $$;

-- Pasa a la conservada todo lo que apunta a la absorbida (en cualquier tabla con esa columna), sin perder nada.
create or replace function public._mover_referencias(p_columnas text[], p_excluir text, p_de uuid, p_a uuid) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare r record; n int; total int := 0;
begin
  for r in
    select c.table_name::text as tabla, c.column_name::text as columna
      from information_schema.columns c
      join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
     where c.table_schema = 'public' and t.table_type = 'BASE TABLE' and c.data_type = 'uuid'
       and c.column_name::text = any (p_columnas) and c.table_name::text <> p_excluir
       and c.table_name::text not in ('duplicados_descartados', 'fusiones')
  loop
    execute format('update public.%I set %I = $1 where %I = $2', r.tabla, r.columna, r.columna) using p_a, p_de;
    get diagnostics n = row_count;
    total := total + n;
  end loop;
  return total;
end $$;
revoke all on function public._mover_referencias(text[], text, uuid, uuid) from public, anon, authenticated;

create or replace function public.rpc_fusionar_viviendas(p_conservar uuid, p_absorber uuid, p_motivo text default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare c public.viviendas; a public.viviendas; v_n int; v_ult_c timestamptz; v_ult_a timestamptz;
begin
  perform public._exigir_staff_o('O-20');
  if p_conservar is null or p_absorber is null or p_conservar = p_absorber then raise exception 'Elija dos viviendas distintas'; end if;
  select * into c from public.viviendas where id = p_conservar and eliminado_en is null for update;
  if not found then raise exception 'La vivienda que se conserva no existe o ya fue eliminada'; end if;
  select * into a from public.viviendas where id = p_absorber and eliminado_en is null for update;
  if not found then raise exception 'La vivienda repetida no existe o ya fue eliminada'; end if;

  select max(fecha) into v_ult_c from public.visitas where vivienda_id = c.id and eliminado_en is null;
  select max(fecha) into v_ult_a from public.visitas where vivienda_id = a.id and eliminado_en is null;
  v_n := public._mover_referencias(array['vivienda_id'], 'viviendas', a.id, c.id);

  update public.viviendas set
    direccion = coalesce(nullif(c.direccion, ''), a.direccion),
    complemento = coalesce(nullif(c.complemento, ''), a.complemento),
    nombre_finca = coalesce(nullif(c.nombre_finca, ''), a.nombre_finca),
    indicaciones = coalesce(nullif(c.indicaciones, ''), a.indicaciones),
    referencia = coalesce(nullif(c.referencia, ''), a.referencia),
    barrio_vereda = coalesce(nullif(c.barrio_vereda, ''), a.barrio_vereda),
    zona_id = coalesce(c.zona_id, a.zona_id),
    zona_urbana_rural = coalesce(c.zona_urbana_rural, a.zona_urbana_rural),
    tipo_vivienda = coalesce(c.tipo_vivienda, a.tipo_vivienda),
    foto_principal_path = coalesce(c.foto_principal_path, a.foto_principal_path),
    -- «No contactar» siempre gana; si no, queda el estado de la visita más reciente.
    estado = case when 'no_contactar' in (c.estado, a.estado) then 'no_contactar'
                  when v_ult_a is not null and (v_ult_c is null or v_ult_a > v_ult_c) then a.estado
                  else c.estado end
  where id = c.id;
  update public.viviendas set eliminado_en = now(), motivo_eliminacion = 'Unida con otra vivienda repetida (fusión)' where id = a.id;
  insert into public.fusiones (tipo, conservada, absorbida, motivo, hecha_por) values ('vivienda', c.id, a.id, nullif(btrim(p_motivo), ''), auth.uid());
  perform public.fn_auditar('fusionar_viviendas', 'vivienda', c.id::text,
    jsonb_build_object('absorbida', a.id, 'registros_movidos', v_n, 'motivo', nullif(btrim(p_motivo), '')));
  return jsonb_build_object('ok', true, 'conservada', c.id, 'registros_movidos', v_n);
end $$;

create or replace function public.rpc_fusionar_personas(p_conservar uuid, p_absorber uuid, p_motivo text default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare c public.personas; a public.personas; v_n int;
begin
  perform public._exigir_staff_o('O-20');
  if p_conservar is null or p_absorber is null or p_conservar = p_absorber then raise exception 'Elija dos personas distintas'; end if;
  select * into c from public.personas where id = p_conservar and eliminado_en is null for update;
  if not found or c.estado = 'solicito_eliminacion' then raise exception 'La persona que se conserva no existe'; end if;
  select * into a from public.personas where id = p_absorber and eliminado_en is null for update;
  if not found or a.estado = 'solicito_eliminacion' then raise exception 'La persona repetida no existe'; end if;
  if c.cedula_hash is not null and a.cedula_hash is not null and c.cedula_hash <> a.cedula_hash then
    raise exception 'Tienen cédulas distintas: no son la misma persona';
  end if;

  v_n := public._mover_referencias(array['persona_id', 'sosten_persona_id'], 'personas', a.id, c.id);
  -- La repetida suelta su cédula primero (la cédula no puede estar en dos personas).
  update public.personas set eliminado_en = now(), cedula_hash = null where id = a.id;
  update public.personas set
    vivienda_id = coalesce(c.vivienda_id, a.vivienda_id),
    hogar_id = coalesce(c.hogar_id, a.hogar_id),
    segundo_nombre = coalesce(nullif(c.segundo_nombre, ''), a.segundo_nombre),
    segundo_apellido = coalesce(nullif(c.segundo_apellido, ''), a.segundo_apellido),
    apodo = coalesce(nullif(c.apodo, ''), a.apodo),
    cedula_enc = coalesce(c.cedula_enc, a.cedula_enc),
    cedula_hash = coalesce(c.cedula_hash, a.cedula_hash),
    cedula_ult3 = coalesce(c.cedula_ult3, a.cedula_ult3),
    fecha_nacimiento = coalesce(c.fecha_nacimiento, a.fecha_nacimiento),
    mayor_edad_confirmada = c.mayor_edad_confirmada or a.mayor_edad_confirmada,
    sexo = coalesce(c.sexo, a.sexo),
    ocupacion = coalesce(nullif(c.ocupacion, ''), a.ocupacion),
    telefono_enc = coalesce(c.telefono_enc, a.telefono_enc),
    telefono_ult4 = case when c.telefono_enc is not null then c.telefono_ult4 else a.telefono_ult4 end,
    telefono_es_whatsapp = coalesce(c.telefono_es_whatsapp, a.telefono_es_whatsapp),
    telefono2_enc = coalesce(c.telefono2_enc, a.telefono2_enc),
    correo_enc = coalesce(c.correo_enc, a.correo_enc),
    correo_parcial = case when c.correo_enc is not null then c.correo_parcial else a.correo_parcial end,
    canal_preferido = coalesce(c.canal_preferido, a.canal_preferido),
    mejor_horario = coalesce(c.mejor_horario, a.mejor_horario),
    vota_en_pijao = coalesce(c.vota_en_pijao, a.vota_en_pijao),
    puesto_votacion = coalesce(nullif(c.puesto_votacion, ''), a.puesto_votacion),
    mesa_votacion = coalesce(nullif(c.mesa_votacion, ''), a.mesa_votacion),
    interes_info = coalesce(c.interes_info, a.interes_info),
    voluntario = coalesce(c.voluntario, a.voluntario),
    anfitrion = coalesce(c.anfitrion, a.anfitrion),
    temas_interes = coalesce(c.temas_interes, a.temas_interes),
    simpatia_enc = coalesce(c.simpatia_enc, a.simpatia_enc),
    estado = case when 'no_contactar' in (c.estado, a.estado) then 'no_contactar' else c.estado end
  where id = c.id;
  insert into public.fusiones (tipo, conservada, absorbida, motivo, hecha_por) values ('persona', c.id, a.id, nullif(btrim(p_motivo), ''), auth.uid());
  perform public.fn_auditar('fusionar_personas', 'persona', c.id::text,
    jsonb_build_object('absorbida', a.id, 'registros_movidos', v_n, 'motivo', nullif(btrim(p_motivo), '')));
  return jsonb_build_object('ok', true, 'conservada', c.id, 'registros_movidos', v_n);
end $$;

-- ======================================================================= sorteo semanal del 5 % (R-27)

-- La tabla existe desde 0004 pero ningún código la usaba: se completa con lo que necesita el sorteo y la llamada.
alter table public.verificaciones
  add column if not exists semana date,
  add column if not exists vivienda_id uuid,
  add column if not exists persona_id uuid,
  add column if not exists colaborador_id uuid,
  add column if not exists estado text not null default 'pendiente',
  add column if not exists notas text,
  add column if not exists verificado_por uuid,
  add column if not exists verificado_en timestamptz;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'verificaciones' and column_name = 'resultado') then
    update public.verificaciones set
      estado = case resultado when 'sin_respuesta' then 'no_contesto' when 'confirmada' then 'confirmada'
                              when 'no_confirmada' then 'no_confirmada' else estado end,
      notas = coalesce(notas, nota), verificado_por = coalesce(verificado_por, verificador),
      verificado_en = coalesce(verificado_en, verificada_en);
    alter table public.verificaciones drop column resultado, drop column nota, drop column verificador, drop column verificada_en;
  end if;
end $$;
update public.verificaciones set semana = date_trunc('week', sorteada_en at time zone 'America/Bogota')::date where semana is null;
alter table public.verificaciones alter column semana set not null;
alter table public.verificaciones drop constraint if exists verificaciones_estado_check;
alter table public.verificaciones add constraint verificaciones_estado_check check (estado in (
  'pendiente', 'confirmada', 'no_confirmada', 'no_contesto', 'numero_errado', 'no_quiso'));
create unique index if not exists uq_verificaciones_visita on public.verificaciones (visita_id);
create index if not exists ix_verificaciones_semana on public.verificaciones (semana, estado);
-- Solo por las funciones de abajo (la lista lleva teléfonos completos y queda en la auditoría).
drop policy if exists sel_verificaciones on public.verificaciones;
revoke all on public.verificaciones from public, anon, authenticated;

insert into public.configuracion (clave, valor, descripcion)
values ('verificacion_porcentaje', '5', 'Porcentaje de las visitas de cada semana que se sortea para verificar por llamada (R-27)')
on conflict (clave) do nothing;

-- Sortea la semana que empieza el lunes p_lunes. Solo visitas con conversación de casas donde alguien autorizó que lo
-- llamen o le escriban y dejó teléfono. Si la semana ya se sorteó, no repite.
create or replace function public._sortear_semana(p_lunes date) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_total int; v_n int; v_hechas int;
begin
  select count(*) into v_hechas from public.verificaciones where semana = p_lunes;
  select count(*) into v_total from public.visitas
   where eliminado_en is null and (fecha at time zone 'America/Bogota')::date >= p_lunes
     and (fecha at time zone 'America/Bogota')::date < p_lunes + 7;
  if v_hechas > 0 then
    return jsonb_build_object('semana', p_lunes, 'total_visitas', v_total, 'sorteadas', v_hechas, 'ya_estaba', true);
  end if;
  v_n := ceil(v_total * public.cfg_num('verificacion_porcentaje', 5) / 100.0)::int;
  insert into public.verificaciones (semana, visita_id, vivienda_id, persona_id, colaborador_id)
  select p_lunes, x.visita_id, x.vivienda_id, x.persona_id, x.usuario_id
    from (
      select distinct on (vs.id) vs.id as visita_id, vs.vivienda_id, pe.id as persona_id, vs.usuario_id
        from public.visitas vs
        join public.personas pe on pe.vivienda_id = vs.vivienda_id and pe.eliminado_en is null and pe.estado = 'activa'
                               and pe.telefono_enc is not null
       where vs.eliminado_en is null
         and (vs.fecha at time zone 'America/Bogota')::date >= p_lunes
         and (vs.fecha at time zone 'America/Bogota')::date < p_lunes + 7
         and vs.resultado in ('conversacion_completa', 'conversacion_breve', 'pidio_volver')
         and exists (select 1 from public.consentimientos c where c.persona_id = pe.id and c.estado = 'vigente'
                        and c.proposito in ('contacto_llamada', 'contacto_whatsapp', 'contacto_sms'))
       order by vs.id, random()
    ) x
   order by random()
   limit v_n
  on conflict (visita_id) do nothing;
  get diagnostics v_hechas = row_count;
  return jsonb_build_object('semana', p_lunes, 'total_visitas', v_total, 'sorteadas', v_hechas, 'meta', v_n, 'ya_estaba', false);
end $$;
revoke all on function public._sortear_semana(date) from public, anon, authenticated;

create or replace function public.rpc_sortear_verificaciones(p_semana date default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v jsonb; v_lunes date;
begin
  perform public._exigir_staff_o('O-07');
  v_lunes := coalesce(date_trunc('week', p_semana::timestamp)::date, public._lunes_anterior());
  if v_lunes >= date_trunc('week', public._hoy_co()::timestamp)::date then
    raise exception 'Solo se sortean semanas terminadas (de lunes a domingo)';
  end if;
  v := public._sortear_semana(v_lunes);
  if not (v ->> 'ya_estaba')::boolean then
    perform public.fn_auditar('sorteo_verificaciones', 'verificacion', v_lunes::text, v);
  end if;
  return v;
end $$;

-- Lista para llamar: quién y a qué número (solo staff y verificadores con O-07; queda en la auditoría).
create or replace function public.rpc_verificaciones(p_semana date default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_lunes date; v_filas jsonb;
begin
  perform public._exigir_staff_o('O-07');
  v_lunes := coalesce(date_trunc('week', p_semana::timestamp)::date, (select max(semana) from public.verificaciones));
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', vf.id, 'estado', vf.estado, 'notas', vf.notas, 'verificado_en', vf.verificado_en,
           'verificado_por', (select nombre_completo from public.perfiles where id = vf.verificado_por),
           'visita_fecha', vs.fecha,
           'resultado', coalesce((select etiqueta from public.catalogos where catalogo = 'C-02' and clave = vs.resultado), vs.resultado),
           'colaborador', (select nombre_completo from public.perfiles where id = vf.colaborador_id),
           'persona', trim(concat_ws(' ', pe.primer_nombre, pe.segundo_nombre, pe.primer_apellido, pe.segundo_apellido)),
           'persona_id', pe.id,
           'telefono', case when pe.estado = 'activa' then public._dec(pe.telefono_enc) end,
           'whatsapp', pe.telefono_es_whatsapp,
           'direccion', vi.direccion, 'barrio_vereda', vi.barrio_vereda)
         order by vf.estado <> 'pendiente', vs.fecha), '[]'::jsonb)
    into v_filas
    from public.verificaciones vf
    join public.visitas vs on vs.id = vf.visita_id
    left join public.personas pe on pe.id = vf.persona_id
    left join public.viviendas vi on vi.id = vf.vivienda_id
   where vf.semana = v_lunes;
  if jsonb_array_length(v_filas) > 0 then
    perform public.fn_auditar('ver_verificaciones', 'verificacion', v_lunes::text, jsonb_build_object('filas', jsonb_array_length(v_filas)));
  end if;
  return jsonb_build_object('semana', v_lunes, 'filas', v_filas,
    'semanas', coalesce((select jsonb_agg(s order by s desc) from (select distinct semana as s from public.verificaciones) x), '[]'::jsonb),
    'pendiente_sorteo', not exists (select 1 from public.verificaciones where semana = public._lunes_anterior()),
    'semana_anterior', public._lunes_anterior());
end $$;

-- Resultado de la llamada. «No confirmada» abre una alerta de calidad para el colaborador; dos o más en 90 días lo
-- pasan a revisión del Director (R-27).
create or replace function public.rpc_verificacion_resultado(p_id uuid, p_estado text, p_notas text default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare vf public.verificaciones; v_n int;
begin
  perform public._exigir_staff_o('O-07');
  if p_estado not in ('confirmada', 'no_confirmada', 'no_contesto', 'numero_errado', 'no_quiso', 'pendiente') then
    raise exception 'Resultado no válido';
  end if;
  select * into vf from public.verificaciones where id = p_id for update;
  if not found then raise exception 'Verificación no encontrada'; end if;
  update public.verificaciones set estado = p_estado, notas = nullif(btrim(coalesce(p_notas, '')), ''),
         verificado_por = case when p_estado = 'pendiente' then null else auth.uid() end,
         verificado_en = case when p_estado = 'pendiente' then null else now() end
   where id = p_id;
  update public.visitas set verificada = (p_estado = 'confirmada') where id = vf.visita_id;
  if p_estado = 'no_confirmada' and vf.estado <> 'no_confirmada' then
    insert into public.alertas_calidad (tipo, severidad, usuario_id, visita_id, vivienda_id, detalle)
    values ('verificacion_no_confirmada', 'alta', vf.colaborador_id, vf.visita_id, vf.vivienda_id,
            jsonb_build_object('verificacion_id', vf.id, 'notas', nullif(btrim(coalesce(p_notas, '')), '')));
    select count(*) into v_n from public.verificaciones
     where colaborador_id = vf.colaborador_id and estado = 'no_confirmada' and verificado_en > now() - interval '90 days';
    if v_n >= 2 and not exists (select 1 from public.alertas_calidad where tipo = 'colaborador_en_revision'
                                   and usuario_id = vf.colaborador_id and resuelta_en is null) then
      insert into public.alertas_calidad (tipo, severidad, usuario_id, detalle)
      values ('colaborador_en_revision', 'alta', vf.colaborador_id, jsonb_build_object('no_confirmadas_90_dias', v_n));
    end if;
  end if;
  perform public.fn_auditar('verificacion_resultado', 'verificacion', p_id::text,
    jsonb_build_object('antes', vf.estado, 'despues', p_estado));
  return jsonb_build_object('ok', true);
end $$;

-- ======================================================================= historia completa de una persona

create or replace function public.rpc_persona_historia(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare pe public.personas; v_zona uuid; v_staff boolean; v_ids text[]; v jsonb;
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  select * into pe from public.personas where id = p_id and eliminado_en is null;
  if not found or pe.estado = 'solicito_eliminacion' then raise exception 'Persona no encontrada'; end if;
  select zona_id into v_zona from public.viviendas where id = pe.vivienda_id;
  v_staff := public.es_staff();
  if not (public._ve_completa(pe.creado_por, v_zona) or exists (select 1 from public.personas_v x where x.id = p_id)) then
    raise exception 'No tiene permiso para ver la historia de esta persona' using errcode = '42501';
  end if;
  -- La historia incluye la de los registros repetidos que se unieron a esta persona.
  select array_agg(x) into v_ids
    from (select p_id::text as x union select absorbida::text from public.fusiones where tipo = 'persona' and conservada = p_id) s;

  with ev as (
    select pe.creado_en as fecha, 'registro'::text as tipo, 'Quedó registrada'::text as titulo, null::text as detalle,
           (select nombre_completo from public.perfiles where id = pe.creado_por) as por
    union all
    select vs.fecha, 'visita',
           'Visita: ' || coalesce((select etiqueta from public.catalogos where catalogo = 'C-02' and clave = vs.resultado), vs.resultado),
           nullif(concat_ws(' · ',
             case when vs.seguimiento_requerido then 'Seguimiento' || coalesce(': ' || vs.seguimiento_motivo, '') end,
             case when v_staff or vs.usuario_id = auth.uid() then nullif(vs.notas, '') end,
             case when vs.verificada then 'Verificada por llamada' end), ''),
           (select nombre_completo from public.perfiles where id = vs.usuario_id)
      from public.visitas vs where vs.vivienda_id = pe.vivienda_id and vs.eliminado_en is null
    union all
    select c.otorgado_en, 'autorizacion', 'Autorizó: ' || replace(replace(c.proposito, 'contacto_', 'contacto por '), '_', ' '),
           'Método: ' || replace(c.metodo, '_', ' '), (select nombre_completo from public.perfiles where id = c.recogido_por)
      from public.consentimientos c where c.persona_id::text = any (v_ids)
    union all
    select c.revocado_en, 'autorizacion', 'Retiró la autorización: ' || replace(c.proposito, '_', ' '), c.revocado_motivo, null
      from public.consentimientos c where c.persona_id::text = any (v_ids) and c.revocado_en is not null
    union all
    select n.creado_en, 'necesidad',
           'Necesidad: ' || coalesce((select etiqueta from public.catalogos where catalogo = 'C-08' and clave = n.tema), n.tema),
           'Estado: ' || replace(n.estado, '_', ' '), (select nombre_completo from public.perfiles where id = n.creado_por)
      from public.necesidades n
     where n.eliminado_en is null and (n.vivienda_id = pe.vivienda_id or (pe.hogar_id is not null and n.hogar_id = pe.hogar_id))
    union all
    select t.creado_en, 'tarea', 'Tarea: ' || t.titulo, 'Estado: ' || replace(t.estado, '_', ' '),
           (select nombre_completo from public.perfiles where id = t.asignado_a)
      from public.tareas t where t.persona_id::text = any (v_ids)
    union all
    select vf.verificado_en, 'verificacion', 'Verificación por llamada: ' || replace(vf.estado, '_', ' '),
           case when v_staff then nullif(vf.notas, '') end, (select nombre_completo from public.perfiles where id = vf.verificado_por)
      from public.verificaciones vf where vf.vivienda_id = pe.vivienda_id and vf.verificado_en is not null
    union all
    select f.hecha_en, 'fusion', 'Se unió con un registro repetido', nullif(f.motivo, ''),
           (select nombre_completo from public.perfiles where id = f.hecha_por)
      from public.fusiones f where f.tipo = 'persona' and f.conservada = p_id
    union all
    -- Para el Director y el Administrador: quién consultó o cambió los datos (auditoría).
    select au.creado_en, 'auditoria',
           case au.accion when 'ver_datos_completos' then 'Alguien vio sus datos completos'
                          when 'persona_votacion' then 'Cambió dónde vota'
                          when 'fusionar_personas' then 'Unión de registros repetidos'
                          else replace(au.accion, '_', ' ') end,
           case when au.accion = 'persona_votacion' then nullif(concat_ws(' · ', au.detalle #>> '{despues,puesto}',
                  case when au.detalle #>> '{despues,mesa}' is not null then 'mesa ' || (au.detalle #>> '{despues,mesa}') end), '') end,
           (select nombre_completo from public.perfiles where id = au.usuario_id)
      from public.auditoria au
     where v_staff and au.entidad = 'persona' and au.entidad_id = any (v_ids)
       and au.accion not in ('ver_lista_personas')
  )
  select coalesce(jsonb_agg(jsonb_build_object('fecha', s.fecha, 'tipo', s.tipo, 'titulo', s.titulo, 'detalle', s.detalle, 'por', s.por)
                            order by s.fecha desc), '[]'::jsonb)
    into v
    from (select * from ev where ev.fecha is not null order by ev.fecha desc limit 300) s;
  return v;
end $$;

-- ======================================================================= informe semanal al Director (9.11)

create or replace function public._informe_semana(p_lunes date) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_fin date := p_lunes + 7; v jsonb;
begin
  with vs as (
    select * from public.visitas where eliminado_en is null
       and (fecha at time zone 'America/Bogota')::date >= p_lunes and (fecha at time zone 'America/Bogota')::date < v_fin
  ), ant as (
    select count(*) as n from public.visitas where eliminado_en is null
       and (fecha at time zone 'America/Bogota')::date >= p_lunes - 7 and (fecha at time zone 'America/Bogota')::date < p_lunes
  ), activas as (
    select * from public.personas where eliminado_en is null and estado <> 'solicito_eliminacion'
  )
  select jsonb_build_object(
    'desde', p_lunes, 'hasta', v_fin - 1,
    'visitas', jsonb_build_object(
       'total', (select count(*) from vs),
       'con_conversacion', (select count(*) from vs where resultado in ('conversacion_completa', 'conversacion_breve', 'pidio_volver')),
       'sin_contacto', (select count(*) from vs where resultado not in ('conversacion_completa', 'conversacion_breve', 'pidio_volver')),
       'en_rojo', (select count(*) from vs where calidad = 'rojo'),
       'semana_anterior', (select n from ant)),
    'viviendas_nuevas', (select count(*) from public.viviendas where eliminado_en is null
                           and (creado_en at time zone 'America/Bogota')::date >= p_lunes and (creado_en at time zone 'America/Bogota')::date < v_fin),
    'personas_nuevas', (select count(*) from activas where (creado_en at time zone 'America/Bogota')::date >= p_lunes
                           and (creado_en at time zone 'America/Bogota')::date < v_fin),
    'necesidades_nuevas', (select count(*) from public.necesidades where eliminado_en is null
                           and (creado_en at time zone 'America/Bogota')::date >= p_lunes and (creado_en at time zone 'America/Bogota')::date < v_fin),
    'colaboradores_activos', (select count(distinct usuario_id) from vs),
    'por_colaborador', coalesce((select jsonb_agg(s.x order by (s.x ->> 'visitas')::int desc) from (
        select jsonb_build_object('nombre', coalesce(pf.nombre_completo, 'Sin nombre'), 'visitas', count(*),
                 'conversaciones', count(*) filter (where vs.resultado in ('conversacion_completa', 'conversacion_breve', 'pidio_volver')),
                 'en_rojo', count(*) filter (where vs.calidad = 'rojo')) as x
          from vs left join public.perfiles pf on pf.id = vs.usuario_id
         group by pf.id, pf.nombre_completo order by count(*) desc limit 15) s), '[]'::jsonb),
    'por_vereda', coalesce((select jsonb_agg(s.x order by (s.x ->> 'visitas')::int desc) from (
        select jsonb_build_object('vereda', coalesce(nullif(vi.barrio_vereda, ''), 'Sin vereda'), 'visitas', count(*)) as x
          from vs join public.viviendas vi on vi.id = vs.vivienda_id group by coalesce(nullif(vi.barrio_vereda, ''), 'Sin vereda')
         order by count(*) desc limit 15) s), '[]'::jsonb),
    'necesidades_top', coalesce((select jsonb_agg(s.x order by (s.x ->> 'n')::int desc) from (
        select jsonb_build_object('tema', coalesce((select etiqueta from public.catalogos where catalogo = 'C-08' and clave = n.tema), n.tema),
                                  'n', count(*)) as x
          from public.necesidades n where n.eliminado_en is null
           and (n.creado_en at time zone 'America/Bogota')::date >= p_lunes and (n.creado_en at time zone 'America/Bogota')::date < v_fin
         group by n.tema order by count(*) desc limit 5) s), '[]'::jsonb),
    'seguimientos_vencidos', (select count(*) from public.viviendas vi where vi.eliminado_en is null and vi.estado = 'requiere_seguimiento'
        and exists (select 1 from public.visitas x where x.vivienda_id = vi.id and x.eliminado_en is null and x.seguimiento_requerido
                       and x.seguimiento_fecha < now()
                       and x.fecha = (select max(y.fecha) from public.visitas y where y.vivienda_id = vi.id and y.eliminado_en is null))),
    'alertas', jsonb_build_object(
       'abiertas', (select count(*) from public.alertas_calidad where resuelta_en is null),
       'nuevas', (select count(*) from public.alertas_calidad where (creada_en at time zone 'America/Bogota')::date >= p_lunes
                    and (creada_en at time zone 'America/Bogota')::date < v_fin)),
    'verificaciones', jsonb_build_object(
       'sorteadas', (select count(*) from public.verificaciones where semana = p_lunes),
       'pendientes', (select count(*) from public.verificaciones where semana = p_lunes and estado = 'pendiente'),
       'confirmadas', (select count(*) from public.verificaciones where semana = p_lunes and estado = 'confirmada'),
       'no_confirmadas', (select count(*) from public.verificaciones where semana = p_lunes and estado = 'no_confirmada')),
    'votacion', jsonb_build_object(
       'personas', (select count(*) from activas),
       'con_puesto', (select count(*) from activas where nullif(btrim(puesto_votacion), '') is not null),
       'vota_si', (select count(*) from activas where vota_en_pijao = 'si'),
       'vota_no', (select count(*) from activas where vota_en_pijao = 'no'))
  ) into v;
  return v;
end $$;
revoke all on function public._informe_semana(date) from public, anon, authenticated;

create or replace function public.rpc_informe_semana(p_semana date default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public._exigir_staff_o('O-03');
  return public._informe_semana(coalesce(date_trunc('week', p_semana::timestamp)::date, public._lunes_anterior()));
end $$;

-- Aviso del lunes para el Director y el Administrador (en la app y en el panel).
alter table public.avisos_cuenta drop constraint if exists avisos_cuenta_tipo_check;
alter table public.avisos_cuenta add constraint avisos_cuenta_tipo_check
  check (tipo in ('dispositivo_nuevo', 'clave_cambiada', 'revision_permisos', 'informe_semanal'));

create or replace function public._fecha_corta(d date) returns text
language sql immutable set search_path = public, pg_temp as $$
  select extract(day from d)::int || ' de ' || (array['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
         'septiembre','octubre','noviembre','diciembre'])[extract(month from d)::int]
$$;

-- Cada lunes a las 6 a. m. (hora de Colombia): sortea la semana que terminó y deja el informe como aviso.
create or replace function public._tarea_semanal() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_lunes date := public._lunes_anterior(); v_sorteo jsonb; i jsonb; v_msg text;
begin
  v_sorteo := public._sortear_semana(v_lunes);
  i := public._informe_semana(v_lunes);
  v_msg := format('Informe de la semana del %s al %s: %s visitas (%s con conversación; la semana anterior fueron %s), %s personas nuevas, %s seguimientos vencidos y %s verificaciones por llamar.',
    public._fecha_corta(v_lunes), public._fecha_corta(v_lunes + 6),
    i #>> '{visitas,total}', i #>> '{visitas,con_conversacion}', i #>> '{visitas,semana_anterior}',
    i ->> 'personas_nuevas', i ->> 'seguimientos_vencidos', i #>> '{verificaciones,pendientes}');
  insert into public.avisos_cuenta (usuario_id, tipo, mensaje, datos)
  select pf.id, 'informe_semanal', v_msg, jsonb_build_object('semana', v_lunes)
    from public.perfiles pf
   where pf.rol in ('admin', 'director') and pf.estado = 'activo'
     and not exists (select 1 from public.avisos_cuenta a where a.usuario_id = pf.id and a.tipo = 'informe_semanal'
                        and a.datos ->> 'semana' = v_lunes::text);
  return jsonb_build_object('sorteo', v_sorteo, 'informe', i);
end $$;
revoke all on function public._tarea_semanal() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'pijao_semanal';
  perform cron.schedule('pijao_semanal', '0 11 * * 1', 'select public._tarea_semanal()');
exception when others then
  raise notice 'pg_cron no está disponible: el sorteo y el informe se pueden pedir desde el panel (%).', sqlerrm;
end $$;

-- ======================================================================= permisos de las funciones nuevas

revoke all on function public.rpc_personas_lista(jsonb), public.rpc_personas_resumen(), public.rpc_persona_votacion(uuid, text, text, text),
  public.rpc_duplicados(), public.rpc_duplicado_descartar(text, uuid, uuid), public.rpc_fusionar_viviendas(uuid, uuid, text),
  public.rpc_fusionar_personas(uuid, uuid, text), public.rpc_persona_historia(uuid), public.rpc_sortear_verificaciones(date),
  public.rpc_verificaciones(date), public.rpc_verificacion_resultado(uuid, text, text), public.rpc_informe_semana(date)
  from public, anon;
grant execute on function public.rpc_personas_lista(jsonb), public.rpc_personas_resumen(), public.rpc_persona_votacion(uuid, text, text, text),
  public.rpc_duplicados(), public.rpc_duplicado_descartar(text, uuid, uuid), public.rpc_fusionar_viviendas(uuid, uuid, text),
  public.rpc_fusionar_personas(uuid, uuid, text), public.rpc_persona_historia(uuid), public.rpc_sortear_verificaciones(date),
  public.rpc_verificaciones(date), public.rpc_verificacion_resultado(uuid, text, text), public.rpc_informe_semana(date)
  to authenticated;
revoke all on function public._hoy_co(), public._lunes_anterior(date),
  public._metros(double precision, double precision, double precision, double precision), public._fecha_corta(date)
  from public, anon;
