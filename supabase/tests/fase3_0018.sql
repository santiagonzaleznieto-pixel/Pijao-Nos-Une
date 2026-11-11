-- Pruebas de la migración 0018 (Fase 3 para el equipo): cumpleaños y varios canales en las personas, el sostén del hogar
-- sin «Relación», y el panel de seguridad, incidentes y necesidades. Usa las cuentas de fase1_seguridad.sql:
-- Administrador ...0a, Director ...d1 y colaboradores ...c1 y ...c2.
\set ON_ERROR_STOP on
\o /dev/null
set client_min_messages = notice;

create or replace function pg_temp.como(p_uid uuid, p_aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', p_aal)::text, false);
  perform set_config('request.jwt.claim.sub', p_uid::text, false);
end $$;
create or replace function pg_temp.afirmar(p_ok boolean, p_que text) returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'FALLÓ: %', p_que; end if;
  raise notice 'ok · %', p_que;
end $$;
create or replace function pg_temp.debe_fallar(p_sql text, p_texto text, p_que text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(lower(p_texto) in lower(sqlerrm)) > 0 then raise notice 'ok · %', p_que; return; end if;
    raise exception 'FALLÓ: % (falló con otro mensaje: %)', p_que, sqlerrm;
  end;
  raise exception 'FALLÓ: % (no falló)', p_que;
end $$;
grant execute on function pg_temp.como(uuid, text), pg_temp.afirmar(boolean, text), pg_temp.debe_fallar(text, text, text)
  to authenticated, anon, service_role;

update public.perfiles set estado = 'activo', ultimo_acceso = now(), suspendido_auto_en = null
 where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000d1',
              '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2');

-- Una visita como la arma la app 0.17.2: dos personas (una con cumpleaños aparte, otra con fecha de nacimiento) y varios canales.
create temp table _v as select
  'aaaaaaaa-0018-4000-8000-000000000001'::uuid as viv, 'aaaaaaaa-0018-4000-8000-000000000002'::uuid as vis,
  'aaaaaaaa-0018-4000-8000-000000000003'::uuid as hog, 'aaaaaaaa-0018-4000-8000-000000000004'::uuid as p1,
  'aaaaaaaa-0018-4000-8000-000000000005'::uuid as p2, 'aaaaaaaa-0018-4000-8000-000000000006'::uuid as nec,
  coalesce((select version from public.textos_legales where tipo = 'autorizacion' and vigente and not es_borrador order by creado_en desc limit 1), 'v1-borrador') as ver;
grant select on _v to authenticated;

select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
create temp table _r as select public.rpc_registrar_visita((select jsonb_build_object(
  'dispositivo', jsonb_build_object('lat', 4.3335, 'lng', -75.7045, 'precision_m', 8),
  'vivienda', jsonb_build_object('id', viv, 'lat', 4.3335, 'lng', -75.7045, 'precision_m', 8, 'fuente_ubicacion', 'gps', 'zona_urbana_rural', 'urbana',
    'direccion', 'Calle de prueba 0018', 'tipo_vivienda', 'casa', 'estado_ocupacion', 'habitada'),
  'visita', jsonb_build_object('id', vis, 'resultado', 'conversacion_completa', 'autorizacion_verbal', true, 'no_autorizo_foto', true),
  'hogar', jsonb_build_object('id', hog, 'total_personas', 2, 'edades', jsonb_build_object('25-34', 2), 'sosten_ocupacion', 'contratista_estado', 'sosten_sexo', 'mujer'),
  'personas', jsonb_build_array(
    jsonb_build_object('id', p1, 'primer_nombre', 'Ana', 'primer_apellido', 'Cero', 'mayor_edad_confirmada', true, 'cumple_mes', 11, 'cumple_dia', 10,
      'interes_info', true, 'canal_preferido', 'whatsapp', 'canales_preferidos', jsonb_build_array('whatsapp', 'llamada'), 'ocupacion', 'contratista_estado'),
    jsonb_build_object('id', p2, 'primer_nombre', 'Luis', 'primer_apellido', 'Ocho', 'fecha_nacimiento', '1990-12-25')),
  'necesidades', jsonb_build_array(jsonb_build_object('id', nec, 'tema', 'vias_movilidad', 'prioridad', 3, 'alcance', 'hogar')),
  'consentimientos', jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid(), 'proposito', 'registro_vivienda', 'metodo', 'verbal', 'version_texto', ver, 'otorgado_en', now(),
      'evidencia', jsonb_build_object('verbal', true, 'hora', now())),
    jsonb_build_object('id', gen_random_uuid(), 'persona_id', p1, 'proposito', 'datos_personales', 'metodo', 'verbal', 'version_texto', ver, 'otorgado_en', now(),
      'evidencia', jsonb_build_object('verbal', true, 'hora', now())),
    jsonb_build_object('id', gen_random_uuid(), 'persona_id', p2, 'proposito', 'datos_personales', 'metodo', 'verbal', 'version_texto', ver, 'otorgado_en', now(),
      'evidencia', jsonb_build_object('verbal', true, 'hora', now())),
    jsonb_build_object('id', gen_random_uuid(), 'persona_id', p1, 'proposito', 'contacto_whatsapp', 'metodo', 'verbal', 'version_texto', ver, 'otorgado_en', now(),
      'evidencia', jsonb_build_object('verbal', true, 'hora', now())),
    jsonb_build_object('id', gen_random_uuid(), 'persona_id', p1, 'proposito', 'contacto_llamada', 'metodo', 'verbal', 'version_texto', ver, 'otorgado_en', now(),
      'evidencia', jsonb_build_object('verbal', true, 'hora', now())))) from _v)) as r;
create temp table _pv as select id, cumple_mes, cumple_dia, canales_preferidos from public.personas_v where id in (select p1 from _v union select p2 from _v);
reset role;

select pg_temp.afirmar((select (r ->> 'calidad') = 'verde' from _r), '0018: el sostén sin «Relación» (solo sexo y ocupación) deja la visita en verde');
select pg_temp.afirmar((select cumple_mes = 11 and cumple_dia = 10 and canales_preferidos = array['whatsapp', 'llamada']
                          from public.personas where id = (select p1 from _v)), '0018: se guardan el cumpleaños y varios canales');
select pg_temp.afirmar((select cumple_mes = 12 and cumple_dia = 25 from public.personas where id = (select p2 from _v)),
                       '0018: sin cumpleaños aparte, sale de la fecha de nacimiento');
select pg_temp.afirmar((select count(*) = 2 and bool_and(cumple_mes is not null) from _pv), '0018: personas_v muestra el cumpleaños a quien la registró');
select pg_temp.afirmar((select count(*) = 2 from public.consentimientos where persona_id = (select p1 from _v) and proposito like 'contacto\_%'),
                       '0018: una autorización por cada canal elegido');

-- Seguridad en terreno: el colaborador inicia jornada, envía su ubicación y un SOS; el Director lo ve y lo atiende.
select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
select public.rpc_jornada_iniciar();
select public.rpc_ubicaciones(jsonb_build_array(jsonb_build_object('lat', 4.334, 'lng', -75.704, 'precision_m', 10)));
create temp table _sos as select (public.rpc_sos(4.334, -75.704, 'Prueba de SOS') ->> 'id')::uuid as id;
select pg_temp.debe_fallar('select public.rpc_seguridad_panel()', 'Director', 'P-46: un colaborador no ve la seguridad del equipo');
reset role;

select pg_temp.como('00000000-0000-0000-0000-0000000000d1', 'aal2');
set role authenticated;
create temp table _seg as select public.rpc_seguridad_panel() as r;
select public.rpc_atender_sos((select id from _sos));
reset role;
select pg_temp.afirmar((select exists (select 1 from jsonb_array_elements(r -> 'jornadas') j where (j ->> 'usuario_id')::uuid = '00000000-0000-0000-0000-0000000000c1'
                                         and j ->> 'lat' is not null) from _seg), 'P-46: el Director ve la jornada activa y la última ubicación');
select pg_temp.afirmar((select exists (select 1 from jsonb_array_elements(r -> 'sos') s where (s ->> 'id')::uuid = (select id from _sos)) from _seg),
                       'R-32: el Director ve la alerta SOS');
select pg_temp.afirmar((select atendida_en is not null from public.sos_alertas where id = (select id from _sos)), 'R-32: el SOS queda atendido');

-- Incidentes y necesidades: solo el equipo directivo cambia su estado.
select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
select public.rpc_incidente(jsonb_build_object('id', 'aaaaaaaa-0018-4000-8000-0000000000a1', 'tipo', 'rumor_desinformacion', 'descripcion', 'Prueba 0018'));
select pg_temp.debe_fallar($q$select public.rpc_incidente_estado('aaaaaaaa-0018-4000-8000-0000000000a1', 'resuelto')$q$, 'Director', 'P-34: un colaborador no resuelve incidentes');
select pg_temp.debe_fallar($q$select public.rpc_necesidad_estado('aaaaaaaa-0018-4000-8000-000000000006', 'clasificada')$q$, 'Director', 'P-26: un colaborador no cambia el estado de una necesidad');
reset role;
select pg_temp.como('00000000-0000-0000-0000-00000000000a', 'aal2');
set role authenticated;
select public.rpc_incidente_estado('aaaaaaaa-0018-4000-8000-0000000000a1', 'resuelto', 'Se aclaró con la comunidad');
select public.rpc_necesidad_estado('aaaaaaaa-0018-4000-8000-000000000006', 'clasificada');
select pg_temp.debe_fallar($q$select public.rpc_necesidad_estado('aaaaaaaa-0018-4000-8000-000000000006', 'inventado')$q$, 'no válido', 'P-26: un estado inventado se rechaza');
reset role;
select pg_temp.afirmar((select estado = 'resuelto' and resolucion like 'Se aclaró%' from public.incidentes where id = 'aaaaaaaa-0018-4000-8000-0000000000a1'),
                       'P-34: el Administrador resuelve el incidente');
select pg_temp.afirmar((select estado = 'clasificada' from public.necesidades where id = 'aaaaaaaa-0018-4000-8000-000000000006'),
                       'P-26: la necesidad pasa a clasificada');

-- Limpieza
delete from public.sos_alertas where id = (select id from _sos);
delete from public.ubicaciones_jornada where usuario_id = '00000000-0000-0000-0000-0000000000c1';
delete from public.jornadas where usuario_id = '00000000-0000-0000-0000-0000000000c1';
delete from public.incidentes where id = 'aaaaaaaa-0018-4000-8000-0000000000a1';

\o
\echo 'TODAS LAS PRUEBAS DE LA FASE 3 (0018) PASARON'
