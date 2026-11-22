-- Pruebas de la migración 0020 (sin dos pasos y códigos para recuperar el acceso). Usa las cuentas de fase1_seguridad.sql.
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

update public.perfiles set estado = 'activo' where id in ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1');

-- Sin verificación en dos pasos: el Administrador con «aal1» cambia la configuración.
select pg_temp.como('00000000-0000-0000-0000-00000000000a', 'aal1');
set role authenticated;
select public.rpc_config_guardar('radio_duplicados_m', '21');
reset role;
select pg_temp.afirmar((select valor = '21'::jsonb from public.configuracion where clave = 'radio_duplicados_m'),
                       '0020: el Administrador sin dos pasos cambia la configuración');

-- Código para recuperar el acceso: lo da el Administrador; un colaborador no puede.
select pg_temp.como('00000000-0000-0000-0000-0000000000c1', 'aal1');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_codigo_acceso('00000000-0000-0000-0000-0000000000d1')$q$, 'permiso',
                           '0020: un colaborador no genera códigos de acceso');
reset role;
select pg_temp.como('00000000-0000-0000-0000-00000000000a', 'aal1');
set role authenticated;
create temp table _acceso as select public.rpc_codigo_acceso('00000000-0000-0000-0000-0000000000c1') ->> 'codigo' as c;
select pg_temp.debe_fallar($q$select count(*) from public.codigos_acceso$q$, 'permission denied',
                           '0020: nadie lee la tabla de códigos directamente');
select pg_temp.debe_fallar($q$select public.rpc_consumir_codigo_acceso('x@prueba.co', 'AAAAAAAAAA')$q$, 'permission denied',
                           '0020: una cuenta común no puede gastar códigos');
reset role;
create temp table _correo as select email as e from auth.users where id = '00000000-0000-0000-0000-0000000000c1';
grant select on _acceso, _correo to service_role;
set role service_role;
create temp table _uso as select
  public.rpc_consumir_codigo_acceso((select e from _correo), 'ZZZZZZZZZZ') as mal,
  public.rpc_consumir_codigo_acceso(upper((select e from _correo)), lower((select c from _acceso))) as bien;
create temp table _uso2 as select
  public.rpc_consumir_codigo_acceso((select e from _correo), (select c from _acceso)) as otra_vez;
reset role;
select pg_temp.afirmar((select mal is null and bien = '00000000-0000-0000-0000-0000000000c1' from _uso),
                       '0020: el código correcto devuelve la cuenta y uno equivocado no');
select pg_temp.afirmar((select otra_vez is null from _uso2), '0020: el código sirve una sola vez');

\o
\echo 'TODAS LAS PRUEBAS DE ACCESO (0020) PASARON'
