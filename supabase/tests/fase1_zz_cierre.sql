-- Pruebas de la migración 0017 (cierre de la Fase 1): guion y preguntas frecuentes, métricas del piloto y revisión mensual
-- de permisos. Corre al final (orden alfabético) y usa las cuentas de fase1_seguridad.sql:
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
    if position(lower(p_texto) in lower(sqlerrm)) > 0 then
      raise notice 'ok · %', p_que;
      return;
    end if;
    raise exception 'FALLÓ: % (falló con otro mensaje: %)', p_que, sqlerrm;
  end;
  raise exception 'FALLÓ: % (no falló)', p_que;
end $$;
grant execute on function pg_temp.como(uuid, text), pg_temp.afirmar(boolean, text), pg_temp.debe_fallar(text, text, text)
  to authenticated, anon, service_role;

update public.perfiles set estado = 'activo', ultimo_acceso = now(), suspendido_auto_en = null
 where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000d1',
              '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2');

-- --------------------------------------------------------------- guion de visita y preguntas frecuentes (13.3)
select pg_temp.afirmar((select count(*) = 2 from public.textos_legales
                         where tipo in ('guion_visita', 'preguntas_frecuentes') and vigente and es_borrador),
                       '0017: el guion y las preguntas frecuentes existen como borrador vigente');

create temp table _acu as select public._version_acuerdos() as antes;
grant select on _acu to authenticated;

select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
select pg_temp.afirmar((select count(*) = 1 from public.textos_legales where tipo = 'guion_visita' and vigente),
                       '13.3: el colaborador descarga el guion vigente a su teléfono');
select pg_temp.debe_fallar($q$select public.rpc_texto_legal_publicar('guion_visita', 'v9', repeat('texto ', 10), false)$q$,
                           'administrador', '13.3: un colaborador no publica el guion');
reset role;

select pg_temp.como('00000000-0000-0000-0000-00000000000a', 'aal2');
set role authenticated;
select public.rpc_texto_legal_publicar('guion_visita', 'v2-prueba', '## Saludo' || chr(10) || 'Buenos días, vengo de Pijao Nos Une.', true);
select pg_temp.debe_fallar($q$select public.rpc_texto_legal_publicar('guion_falso', 'v1', repeat('texto ', 10), false)$q$,
                           'no válido', 'P-42: un tipo de texto inventado se rechaza');
reset role;
select pg_temp.afirmar((select version = 'v2-prueba' and not es_borrador from public.textos_legales where tipo = 'guion_visita' and vigente),
                       'P-42: el Administrador publica una versión nueva del guion aprobada por el abogado');
select pg_temp.afirmar((select count(*) = 1 from public.textos_legales where tipo = 'guion_visita' and vigente),
                       'P-42: solo queda una versión vigente del guion');
select pg_temp.afirmar((select antes is not distinct from public._version_acuerdos() from _acu),
                       'R-45: publicar el guion no obliga a volver a aceptar los acuerdos');

-- --------------------------------------------------------------- métricas del piloto (22.3)
delete from public.metricas_piloto;
select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
create temp table _m1 as select public.rpc_metricas(jsonb_build_array(
  jsonb_build_object('tipo', 'registro_segundos', 'valor', 75, 'detalle', 'con_contacto', 'ocurrido_en', now(), 'version_app', '0.15.0'),
  jsonb_build_object('tipo', 'registro_segundos', 'valor', 140, 'detalle', 'con_contacto', 'ocurrido_en', now()),
  jsonb_build_object('tipo', 'registro_calidad', 'detalle', 'verde', 'ocurrido_en', now()),
  jsonb_build_object('tipo', 'gps_error', 'detalle', 'baja_precision', 'ocurrido_en', now()),
  jsonb_build_object('tipo', 'gps_precision', 'valor', 8.5, 'ocurrido_en', now() + interval '10 days'),
  jsonb_build_object('tipo', 'nombre_persona', 'detalle', 'juan', 'ocurrido_en', now()),
  jsonb_build_object('tipo', 'gps_error', 'detalle', 'Juan Pérez 3001234567', 'ocurrido_en', now()),
  jsonb_build_object('tipo', 'registro_segundos', 'valor', -5, 'ocurrido_en', now()),
  jsonb_build_object('tipo', 'registro_segundos', 'valor', 'mucho', 'ocurrido_en', now()),
  '"texto suelto"'::jsonb)) as r;
select pg_temp.debe_fallar($q$select * from public.metricas_piloto$q$, 'permission denied',
                           '22.3: un colaborador no lee la tabla de métricas');
select pg_temp.debe_fallar($q$select public.rpc_metricas_piloto()$q$, 'director',
                           '22.3: un colaborador no ve el tablero del piloto');
select pg_temp.debe_fallar($q$select public.rpc_metricas('{"tipo": "gps_error"}'::jsonb)$q$, 'hasta 200',
                           '22.3: las métricas llegan en una lista');
select pg_temp.debe_fallar($q$select public._revision_mensual_permisos()$q$, 'permission denied',
                           '4.5: la revisión mensual no se lanza desde la app');
reset role;
select pg_temp.afirmar((select (r ->> 'guardadas')::int = 5 from _m1),
                       '22.3: se guardan las 5 métricas válidas y se descartan tipos, textos libres y valores fuera de rango');
select pg_temp.afirmar(not exists (select 1 from public.metricas_piloto where detalle !~ '^[a-z_]+$' or tipo = 'nombre_persona'),
                       '22.3: ninguna métrica guarda texto libre (sin datos personales)');
select pg_temp.afirmar((select ocurrido_en < now() + interval '1 hour' from public.metricas_piloto where tipo = 'gps_precision'),
                       '22.3: una fecha futura del teléfono se corrige a la hora del servidor');

set role anon;
select pg_temp.debe_fallar($q$select public.rpc_metricas('[]'::jsonb)$q$, 'permission denied', '22.3: sin sesión no se envían métricas');
reset role;

update public.perfiles set estado = 'suspendido' where id = '00000000-0000-0000-0000-0000000000c2';
select pg_temp.como('00000000-0000-0000-0000-0000000000c2');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_metricas('[]'::jsonb)$q$, 'no activa', '22.3: una cuenta suspendida no envía métricas');
reset role;
update public.perfiles set estado = 'activo' where id = '00000000-0000-0000-0000-0000000000c2';

select pg_temp.como('00000000-0000-0000-0000-0000000000d1', 'aal2');
set role authenticated;
create temp table _t1 as select public.rpc_metricas_piloto() as r;
select pg_temp.debe_fallar($q$select public.rpc_metricas_piloto('2027-03-01', '2027-02-01')$q$, 'posterior',
                           '22.3: el periodo del tablero debe tener sentido');
reset role;
select pg_temp.afirmar((select (r -> 'registros' ->> 'total')::int = 2 and (r -> 'registros' ->> 'pct_bajo_90_seg')::numeric = 50
                          and (r -> 'calidad' ->> 'verde')::int = 1 and (r -> 'gps' -> 'errores' ->> 'baja_precision')::int = 1
                          and (r ->> 'colaboradores')::int = 1 from _t1),
                       '22.3: el Director ve los totales del piloto (registros, menos de 90 s, calidad y GPS)');
select pg_temp.afirmar((select r::text not like '%00000000-0000-0000-0000-0000000000c1%' from _t1),
                       '22.3: el tablero no muestra quién envió cada métrica');

update public.configuracion set valor = 'false'::jsonb where clave = 'metricas_piloto_activas';
select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
create temp table _m2 as select public.rpc_metricas(jsonb_build_array(jsonb_build_object('tipo', 'cola_atrasada', 'ocurrido_en', now()))) as r;
reset role;
select pg_temp.afirmar((select (r ->> 'apagadas')::boolean from _m2), 'P-42: el Administrador puede apagar las métricas del piloto');
update public.configuracion set valor = 'true'::jsonb where clave = 'metricas_piloto_activas';

-- --------------------------------------------------------------- revisión mensual de permisos (4.5 y R-04)
delete from public.avisos_cuenta where tipo = 'revision_permisos';
create temp table _rv1 as select public._revision_mensual_permisos() as r;
create temp table _rv2 as select public._revision_mensual_permisos() as r;
select pg_temp.afirmar((select (r ->> 'avisos')::int = 2 from _rv1), '4.5: el aviso mensual llega al Director y al Administrador');
select pg_temp.afirmar((select (r ->> 'avisos')::int = 0 from _rv2), '4.5: un solo aviso por mes aunque la tarea corra dos veces');
select pg_temp.afirmar(not exists (select 1 from public.avisos_cuenta where tipo = 'revision_permisos'
                                     and usuario_id in ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2')),
                       '4.5: los colaboradores no reciben el aviso de revisión');
select pg_temp.afirmar(exists (select 1 from public.auditoria where accion = 'revision_permisos'),
                       '4.5: la revisión mensual queda en la auditoría');
select pg_temp.como('00000000-0000-0000-0000-0000000000d1', 'aal2');
set role authenticated;
create temp table _av as select public.rpc_mis_avisos() as r;
reset role;
select pg_temp.afirmar((select exists (select 1 from jsonb_array_elements(r) e
                                        where e ->> 'tipo' = 'revision_permisos' and e ->> 'mensaje' like '%Colaboradores%') from _av),
                       '4.5: el Director ve el aviso en la app y en el panel');

delete from public.textos_legales where tipo = 'guion_visita' and version = 'v2-prueba';
update public.textos_legales set vigente = true where tipo = 'guion_visita' and version = 'v1-borrador';
delete from public.metricas_piloto;

\o
\echo 'TODAS LAS PRUEBAS DEL CIERRE DE LA FASE 1 PASARON'
