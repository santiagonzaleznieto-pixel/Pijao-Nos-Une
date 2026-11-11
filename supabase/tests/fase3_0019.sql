-- Pruebas de la migración 0019 (eventos del equipo). Usa las cuentas de fase1_seguridad.sql.
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

select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_evento_guardar(jsonb_build_object('titulo', 'Reunión', 'inicio', now()))$q$, 'permiso', 'O-10: un colaborador sin permiso no crea eventos');
select pg_temp.debe_fallar($q$insert into public.eventos (titulo, inicio, creado_por) values ('Directo', now(), auth.uid())$q$, 'denied', 'P-19: nadie escribe eventos sin pasar por la función');
reset role;

select pg_temp.como('00000000-0000-0000-0000-0000000000d1', 'aal2');
set role authenticated;
create temp table _e as select (public.rpc_evento_guardar(jsonb_build_object('id', 'eeeeeeee-0019-4000-8000-000000000001', 'titulo', 'Encuentro con caficultores',
  'tipo', 'reunion_vereda', 'lugar', 'Escuela La Mina', 'inicio', now() + interval '2 days', 'fin', now() + interval '2 days 2 hours')) ->> 'id')::uuid as id;
select public.rpc_evento_guardar(jsonb_build_object('id', 'eeeeeeee-0019-4000-8000-000000000001', 'titulo', 'Encuentro con caficultores (cambio de hora)', 'inicio', now() + interval '3 days'));
select pg_temp.debe_fallar($q$select public.rpc_evento_guardar(jsonb_build_object('titulo', 'x', 'inicio', now()))$q$, 'nombre', 'P-19: un evento sin nombre se rechaza');
reset role;

select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
create temp table _ver as select count(*) as n from public.eventos where id = 'eeeeeeee-0019-4000-8000-000000000001' and titulo like '%cambio de hora%';
reset role;
select pg_temp.afirmar((select n = 1 from _ver), 'P-19: el colaborador ve el evento con el cambio');

select pg_temp.como('00000000-0000-0000-0000-0000000000d1', 'aal2');
set role authenticated;
select public.rpc_evento_cancelar('eeeeeeee-0019-4000-8000-000000000001');
reset role;
select pg_temp.afirmar((select eliminado_en is not null from public.eventos where id = 'eeeeeeee-0019-4000-8000-000000000001'),
                       'P-19: cancelar deja la lápida para borrarlo de los teléfonos');

delete from public.eventos where id = 'eeeeeeee-0019-4000-8000-000000000001';
\o
\echo 'TODAS LAS PRUEBAS DE EVENTOS (0019) PASARON'
