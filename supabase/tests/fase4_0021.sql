-- Pruebas de la migración 0021 (Personas, dónde vota, duplicados y fusión, historia, sorteo del 5 % e informe semanal).
-- Usa las cuentas de fase1_seguridad.sql: Administrador (…0a), Ana (…c1) y Beto (…c2), colaboradores.
\set ON_ERROR_STOP on
\o /dev/null
set client_min_messages = notice;
set app.pii_key = 'llave-de-prueba-solo-para-el-ambiente-local-0123456789';

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

-- Cuentas activas y sin permisos opcionales (para probar lo que ve un colaborador común).
update public.perfiles set estado = 'activo'
 where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2');
update public.permisos_opcionales set activo = false
 where usuario_id in ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2');

-- Datos: dos casas en el mismo predio del IGAC (la misma vivienda registrada dos veces) con la misma persona repetida, y una
-- tercera casa de Beto. Ana registró las dos primeras.
insert into public.viviendas (id, lat, lng, direccion, barrio_vereda, referencia, creado_por) values
  ('21000000-0000-0000-0000-0000000000a1', 4.33350, -75.70450, 'Calle 5 # 3-10', 'Centro', 'Predio IGAC 635480100000000100015000000000', '00000000-0000-0000-0000-0000000000c1'),
  ('21000000-0000-0000-0000-0000000000a2', 4.33352, -75.70451, 'calle 5 #3-10', 'Centro', 'Predio IGAC 635480100000000100015000000000', '00000000-0000-0000-0000-0000000000c1'),
  ('21000000-0000-0000-0000-0000000000b1', 4.34000, -75.71000, 'Finca La Esperanza', 'La Mina', null, '00000000-0000-0000-0000-0000000000c2');
insert into public.personas (id, vivienda_id, primer_nombre, primer_apellido, segundo_apellido, creado_por, estado,
                             cedula_enc, cedula_hash, cedula_ult3, telefono_enc, telefono_ult4, fecha_nacimiento, correo_enc) values
  ('21000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-0000000000a1', 'María', 'Gómez', 'Ruiz',
   '00000000-0000-0000-0000-0000000000c1', 'activa', null, null, null,
   public._enc('3101234567'), '4567', '1980-05-04', public._enc('maria@correo.co')),
  ('21000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-0000000000a2', 'Maria', 'Gomez', null,
   '00000000-0000-0000-0000-0000000000c1', 'activa', public._enc('24123456'), public._hash('24123456'), '456',
   null, null, '1980-05-04', null),
  ('21000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-0000000000b1', 'Pedro', 'Ríos', null,
   '00000000-0000-0000-0000-0000000000c2', 'activa', public._enc('1094000111'), public._hash('1094000111'), '111',
   public._enc('3209998877'), '8877', null, null);
insert into public.consentimientos (id, persona_id, proposito, version_texto, metodo, otorgado_en) values
  ('21000000-0000-0000-0000-0000000000c1', '21000000-0000-0000-0000-000000000001', 'contacto_llamada', 'v1', 'verbal', now() - interval '20 days'),
  ('21000000-0000-0000-0000-0000000000c2', '21000000-0000-0000-0000-000000000002', 'datos_personales', 'v1', 'verbal', now() - interval '20 days');
-- Visita de la semana pasada (con conversación) en la casa repetida.
insert into public.visitas (id, vivienda_id, usuario_id, resultado, fecha) values
  ('21000000-0000-0000-0000-0000000000f1', '21000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1',
   'conversacion_completa', ((public._lunes_anterior() + 2)::timestamp + interval '10 hours') at time zone 'America/Bogota'),
  ('21000000-0000-0000-0000-0000000000f2', '21000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1',
   'nadie_en_casa', ((public._lunes_anterior() + 3)::timestamp + interval '9 hours') at time zone 'America/Bogota');

-- ----------------------------------------------------------------- lista de personas por rol
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
set role authenticated;
create temp table _adm as select public.rpc_personas_lista('{"texto": "pedro rios"}'::jsonb) as r;
create temp table _adm_ced as select public.rpc_personas_lista('{"texto": "1.094.000.111"}'::jsonb) as r;
reset role;
select pg_temp.afirmar((select (r ->> 'total')::int = 1 and r #>> '{filas,0,cedula}' = '1094000111'
                               and r #>> '{filas,0,telefono}' = '3209998877' from _adm),
                       '0021: el Administrador ve todos los datos de cualquier persona (búsqueda sin tildes)');
select pg_temp.afirmar((select (r ->> 'total')::int = 1 from _adm_ced), '0021: el Administrador busca por cédula exacta');

select pg_temp.como('00000000-0000-0000-0000-0000000000c2');
set role authenticated;
create temp table _beto as select public.rpc_personas_lista('{"texto": "maria gomez"}'::jsonb) as r;
create temp table _beto_ced as select public.rpc_personas_lista('{"texto": "24123456"}'::jsonb) as r;
create temp table _beto_propia as select public.rpc_personas_lista('{"mias": true, "texto": "pedro rios"}'::jsonb) as r;
reset role;
select pg_temp.afirmar((select (r ->> 'total')::int >= 2
                               and not exists (select 1 from jsonb_array_elements(r -> 'filas') x
                                                where (x ->> 'completo')::boolean or x ? 'cedula' or x ? 'telefono' or x ? 'correo')
                               and r #>> '{filas,0,barrio_vereda}' = 'Centro' from _beto),
                       '0021: un colaborador ve de las personas ajenas solo el nombre y la vereda');
select pg_temp.afirmar((select (r ->> 'total')::int = 0 from _beto_ced),
                       '0021: un colaborador no averigua de quién es una cédula que no le corresponde');
select pg_temp.afirmar((select (r ->> 'total')::int = 1 and r #>> '{filas,0,cedula}' = '1094000111' from _beto_propia),
                       '0021: un colaborador ve completas las personas que él registró');

-- ----------------------------------------------------------------- dónde vota
select pg_temp.como('00000000-0000-0000-0000-0000000000c2');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_persona_votacion('21000000-0000-0000-0000-000000000001', 'si', 'Puesto Centro', '3')$q$,
                           'Solo quien registró', '0021: un colaborador no cambia dónde vota una persona ajena');
create temp table _voto as select public.rpc_persona_votacion('21000000-0000-0000-0000-000000000003', null, 'Escuela La Mina', '007') as r;
reset role;
select pg_temp.afirmar((select vota_en_pijao = 'si' and puesto_votacion = 'Escuela La Mina' and mesa_votacion = '7'
                          from public.personas where id = '21000000-0000-0000-0000-000000000003'),
                       '0021: quien registró guarda puesto y mesa (vota en Pijao queda en sí y la mesa sin ceros)');
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
set role authenticated;
create temp table _res as select public.rpc_personas_resumen() as r;
create temp table _por_puesto as select public.rpc_personas_lista('{"puesto": "escuela la mina", "mesa": "7"}'::jsonb) as r;
reset role;
select pg_temp.afirmar((select exists (select 1 from jsonb_array_elements(r -> 'puestos') x
                                        where x ->> 'puesto' = 'Escuela La Mina' and x #>> '{mesas,0,mesa}' = '7'
                                          and (x #>> '{mesas,0,personas}')::int = 1)
                               and r -> 'sugeridos' ? 'Escuela La Mina' from _res),
                       '0021: el resumen cuenta personas por puesto y mesa y sugiere los puestos escritos');
select pg_temp.afirmar((select (r ->> 'total')::int = 1 from _por_puesto), '0021: la lista filtra por puesto y mesa');
select pg_temp.afirmar((select count(*) = 1 from public.auditoria where accion = 'persona_votacion'
                          and entidad_id = '21000000-0000-0000-0000-000000000003'),
                       '0021: el cambio de puesto queda en la auditoría');

-- ----------------------------------------------------------------- duplicados y fusión
select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_duplicados()$q$, 'permiso', '0021: un colaborador sin O-20 no ve los duplicados');
reset role;
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
set role authenticated;
create temp table _dup as select public.rpc_duplicados() as r;
reset role;
select pg_temp.afirmar((select exists (select 1 from jsonb_array_elements(r -> 'viviendas') x
                                        where x ->> 'motivo' = 'Mismo predio del IGAC') from _dup),
                       '0021: detecta la vivienda repetida por el predio del IGAC');
select pg_temp.afirmar((select exists (select 1 from jsonb_array_elements(r -> 'personas') x
                                        where x ->> 'motivo' = 'Mismo nombre y fecha de nacimiento') from _dup),
                       '0021: detecta la persona repetida (nombre sin tildes y misma fecha de nacimiento)');

select pg_temp.como('00000000-0000-0000-0000-00000000000a');
set role authenticated;
create temp table _fv as select public.rpc_fusionar_viviendas('21000000-0000-0000-0000-0000000000a1', '21000000-0000-0000-0000-0000000000a2', 'Registrada dos veces') as r;
create temp table _fp as select public.rpc_fusionar_personas('21000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000002', 'La misma señora') as r;
reset role;
select pg_temp.afirmar((select eliminado_en is not null from public.viviendas where id = '21000000-0000-0000-0000-0000000000a2')
                       and (select count(*) = 2 from public.visitas where vivienda_id = '21000000-0000-0000-0000-0000000000a1'),
                       '0021: al unir viviendas, la repetida se retira y sus visitas pasan a la que queda');
select pg_temp.afirmar((select public._dec(cedula_enc) = '24123456' and cedula_hash = public._hash('24123456')
                               and public._dec(telefono_enc) = '3101234567' and segundo_apellido = 'Ruiz'
                          from public.personas where id = '21000000-0000-0000-0000-000000000001')
                       and (select eliminado_en is not null and cedula_hash is null from public.personas where id = '21000000-0000-0000-0000-000000000002')
                       and (select persona_id = '21000000-0000-0000-0000-000000000001' from public.consentimientos where id = '21000000-0000-0000-0000-0000000000c2'),
                       '0021: al unir personas se completa la que queda (cédula, teléfono) y se conservan sus autorizaciones');
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_fusionar_personas('21000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000003')$q$,
                           'cédulas distintas', '0021: no se unen personas con cédulas distintas');
create temp table _hist as select public.rpc_persona_historia('21000000-0000-0000-0000-000000000001') as r;
reset role;
select pg_temp.afirmar((select exists (select 1 from jsonb_array_elements(r) x where x ->> 'tipo' = 'visita')
                               and exists (select 1 from jsonb_array_elements(r) x where x ->> 'tipo' = 'fusion')
                               and exists (select 1 from jsonb_array_elements(r) x where x ->> 'tipo' = 'autorizacion') from _hist),
                       '0021: la historia junta visitas, autorizaciones y la unión de registros repetidos');

-- «No son la misma»: la pareja no vuelve a aparecer.
insert into public.personas (id, vivienda_id, primer_nombre, primer_apellido, creado_por, estado, fecha_nacimiento) values
  ('21000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-0000000000b1', 'Pedro', 'Rios', '00000000-0000-0000-0000-0000000000c2', 'activa', null);
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
set role authenticated;
create temp table _dup2 as select public.rpc_duplicados() as r;
select public.rpc_duplicado_descartar('persona', '21000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000003');
create temp table _dup3 as select public.rpc_duplicados() as r;
reset role;
select pg_temp.afirmar((select exists (select 1 from jsonb_array_elements(r -> 'personas') x
                                        where x #>> '{a,id}' = '21000000-0000-0000-0000-000000000003'
                                          and x #>> '{b,id}' = '21000000-0000-0000-0000-000000000004'
                                          and x ->> 'motivo' = 'Mismo nombre en la misma casa') from _dup2)
                       and (select not exists (select 1 from jsonb_array_elements(r -> 'personas') x
                                        where x #>> '{a,id}' = '21000000-0000-0000-0000-000000000003'
                                          and x #>> '{b,id}' = '21000000-0000-0000-0000-000000000004') from _dup3),
                       '0021: una pareja marcada como «no son la misma» ya no aparece');

-- ----------------------------------------------------------------- sorteo del 5 % y verificación por llamada
select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_sortear_verificaciones()$q$, 'permiso', '0021: un colaborador sin O-07 no sortea');
select pg_temp.debe_fallar($q$select count(*) from public.verificaciones$q$, 'permission denied', '0021: nadie lee las verificaciones directamente');
reset role;
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
set role authenticated;
create temp table _s1 as select public.rpc_sortear_verificaciones() as r;
create temp table _s2 as select public.rpc_sortear_verificaciones() as r;
create temp table _ver as select public.rpc_verificaciones() as r;
select pg_temp.debe_fallar($q$select public.rpc_sortear_verificaciones(current_date)$q$, 'terminadas', '0021: la semana en curso no se sortea');
reset role;
select pg_temp.afirmar((select (r ->> 'sorteadas')::int >= 1 and not (r ->> 'ya_estaba')::boolean from _s1)
                       and (select (r ->> 'ya_estaba')::boolean from _s2),
                       '0021: el sorteo toma visitas con conversación y autorización de contacto, y no se repite');
select pg_temp.afirmar((select r #>> '{filas,0,telefono}' = '3101234567' and r #>> '{filas,0,estado}' = 'pendiente' from _ver),
                       '0021: la lista para llamar trae el teléfono de quien autorizó el contacto');
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select public.rpc_verificacion_resultado(((select r #>> '{filas,0,id}' from _ver))::uuid, 'no_confirmada', 'Dice que nadie fue');
reset role;
select pg_temp.afirmar((select count(*) = 1 from public.alertas_calidad where tipo = 'verificacion_no_confirmada'
                          and usuario_id = '00000000-0000-0000-0000-0000000000c1' and resuelta_en is null),
                       '0021: una visita no confirmada abre una alerta de calidad para el colaborador');

-- ----------------------------------------------------------------- informe semanal
select pg_temp.como('00000000-0000-0000-0000-0000000000c2');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_informe_semana()$q$, 'permiso', '0021: un colaborador sin O-03 no ve el informe');
reset role;
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
set role authenticated;
create temp table _inf as select public.rpc_informe_semana() as r;
reset role;
select pg_temp.afirmar((select (r #>> '{visitas,total}')::int >= 2 and (r #>> '{visitas,con_conversacion}')::int >= 1
                               and (r #>> '{verificaciones,no_confirmadas}')::int = 1 from _inf),
                       '0021: el informe de la semana cuenta visitas, conversaciones y verificaciones');
select public._tarea_semanal();
select public._tarea_semanal();
select pg_temp.afirmar((select count(*) = 1 from public.avisos_cuenta where tipo = 'informe_semanal'
                          and usuario_id = '00000000-0000-0000-0000-00000000000a'),
                       '0021: el lunes llega un solo aviso con el informe al Administrador');

\o
\echo '✔ Pruebas de la 0021 correctas'
