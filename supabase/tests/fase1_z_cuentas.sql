-- Pruebas de la migración 0016 (Fase 1, bloque 1.5): sesiones por rol, suspensión automática, R-45 y avisos de la cuenta.
-- Corre DESPUÉS de fase1_seguridad.sql y fase1_web.sql (orden alfabético) y usa sus cuentas:
-- Administrador ...0a, Director ...d1 y colaboradores ...c1 y ...c2.
-- Si alguna comprobación falla, el script se detiene con «FALLÓ: …».
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

-- Punto de partida conocido: las cuatro cuentas activas y con actividad reciente.
update public.perfiles set estado = 'activo', ultimo_acceso = now(), suspendido_auto_en = null, motivo_estado = null
 where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000d1',
              '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2');
delete from public.dispositivos where usuario_id in ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2');
delete from public.avisos_cuenta;

select pg_temp.afirmar((select count(*) = 4 from public.configuracion
                         where clave in ('sesion_horas_colaborador', 'sesion_horas_director', 'sesion_horas_admin', 'acuerdos_vigencia_dias')),
                       '0016: los valores de control de sesiones y acuerdos existen');

-- --------------------------------------------------------------- R-33: sesiones por rol
delete from auth.sessions;
insert into auth.sessions (user_id, created_at) values
  ('00000000-0000-0000-0000-00000000000a', now() - interval '13 hours'),   -- Administrador: vence a las 12 horas
  ('00000000-0000-0000-0000-0000000000d1', now() - interval '13 hours'),   -- Director: sigue (7 días)
  ('00000000-0000-0000-0000-0000000000d1', now() - interval '8 days'),     -- Director: vencida
  ('00000000-0000-0000-0000-0000000000c1', now() - interval '15 days'),    -- colaborador: vencida (14 días)
  ('00000000-0000-0000-0000-0000000000c2', now() - interval '1 day');      -- colaborador: sigue
create temp table _m1 as select public._mantenimiento_cuentas() as r;
select pg_temp.afirmar((select (r ->> 'sesiones_cerradas')::int = 3 from _m1), 'R-33: se cierran las 3 sesiones vencidas');
select pg_temp.afirmar(not exists (select 1 from auth.sessions where user_id = '00000000-0000-0000-0000-00000000000a'),
                       'R-33: la sesión del Administrador vence a las 12 horas');
select pg_temp.afirmar((select count(*) = 1 from auth.sessions where user_id = '00000000-0000-0000-0000-0000000000d1'),
                       'R-33: el Director conserva su sesión de 13 horas y pierde la de 8 días');
select pg_temp.afirmar(exists (select 1 from auth.sessions where user_id = '00000000-0000-0000-0000-0000000000c2')
                       and not exists (select 1 from auth.sessions where user_id = '00000000-0000-0000-0000-0000000000c1'),
                       'R-33: el colaborador conserva la sesión de 1 día y pierde la de 15');

-- --------------------------------------------------------------- 4.9: suspensión automática por inactividad
update public.perfiles set ultimo_acceso = now() - interval '31 days'
 where id in ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d1');
delete from public.permisos_opcionales where usuario_id = '00000000-0000-0000-0000-0000000000c2';
insert into public.permisos_opcionales (usuario_id, codigo, activo, motivo)
values ('00000000-0000-0000-0000-0000000000c2', 'O-03', true, 'prueba 0016');
create temp table _m2 as select public._mantenimiento_cuentas() as r;
select pg_temp.afirmar((select (r ->> 'suspendidas')::int >= 1 from _m2), '4.9: la revisión informa cuántas cuentas suspendió');
select pg_temp.afirmar((select estado = 'suspendido' and suspendido_auto_en is not null and motivo_estado like 'Suspensión automática%'
                          from public.perfiles where id = '00000000-0000-0000-0000-0000000000c2'),
                       '4.9: el colaborador con 31 días sin actividad queda suspendido automáticamente');
select pg_temp.afirmar(not exists (select 1 from public.permisos_opcionales
                                    where usuario_id = '00000000-0000-0000-0000-0000000000c2' and activo),
                       '4.9: al suspender se apagan sus permisos opcionales');
select pg_temp.afirmar((select estado = 'activo' from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1'),
                       '4.9: el Director nunca se suspende solo');
select pg_temp.afirmar(exists (select 1 from public.auditoria where accion = 'suspension_automatica'
                                 and entidad_id = '00000000-0000-0000-0000-0000000000c2'),
                       '4.9: la suspensión automática queda en la auditoría');

-- Suspendido automáticamente: el teléfono NO borra sus datos (puede tener visitas sin enviar) y la app ve el motivo.
select pg_temp.como('00000000-0000-0000-0000-0000000000c2');
set role authenticated;
create temp table _l1 as select public.rpc_latido('{"identificador":"tel-c2","modelo":"Moto G"}'::jsonb) as r;
create temp table _p1 as select public.rpc_mi_perfil() as r;
reset role;
select pg_temp.afirmar((select not (r ->> 'borrar_datos')::boolean from _l1),
                       '4.9: una suspensión automática no ordena borrar el teléfono');
select pg_temp.afirmar((select (r ->> 'suspension_automatica')::boolean and r ->> 'motivo_estado' like 'Suspensión automática%' from _p1),
                       '4.9: la app recibe el motivo de la suspensión automática');

-- Una suspensión manual sí ordena borrar el teléfono (17.2).
select pg_temp.como('00000000-0000-0000-0000-0000000000d1', 'aal2');
set role authenticated;
select public.rpc_suspender_usuario('00000000-0000-0000-0000-0000000000c2', 'Prueba manual');
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000c2');
set role authenticated;
create temp table _l2 as select public.rpc_latido('{"identificador":"tel-c2","modelo":"Moto G"}'::jsonb) as r;
reset role;
select pg_temp.afirmar((select (r ->> 'borrar_datos')::boolean from _l2), '17.2: una suspensión manual sí ordena borrar el teléfono');

-- Al reactivar se reinicia el contador: la tarea de cada hora no la vuelve a suspender.
select pg_temp.como('00000000-0000-0000-0000-0000000000d1', 'aal2');
set role authenticated;
select public.rpc_reactivar_usuario('00000000-0000-0000-0000-0000000000c2');
reset role;
create temp table _m3 as select public._mantenimiento_cuentas() as r;
select pg_temp.afirmar((select estado = 'activo' and suspendido_auto_en is null
                          from public.perfiles where id = '00000000-0000-0000-0000-0000000000c2'),
                       '4.9: al reactivar, la cuenta no se vuelve a suspender en la siguiente revisión');

-- --------------------------------------------------------------- 4.10: aviso de ingreso desde un teléfono nuevo
select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
select public.rpc_latido('{"identificador":"tel-a","modelo":"Samsung A10"}'::jsonb);
create temp table _av0 as select public.rpc_mis_avisos() as r;
select public.rpc_latido('{"identificador":"tel-b","modelo":"Xiaomi Redmi 9"}'::jsonb);
create temp table _av1 as select public.rpc_mis_avisos() as r;
reset role;
select pg_temp.afirmar((select jsonb_array_length(r) = 0 from _av0), '4.10: el primer teléfono de la cuenta no genera aviso');
select pg_temp.afirmar((select jsonb_array_length(r) = 1 and r -> 0 ->> 'tipo' = 'dispositivo_nuevo'
                               and r -> 0 ->> 'mensaje' like '%Xiaomi Redmi 9%'
                               and (r -> 0 -> 'datos' ->> 'dispositivo_id')::uuid =
                                   (select id from public.dispositivos where identificador = 'tel-b'
                                       and usuario_id = '00000000-0000-0000-0000-0000000000c1')
                          from _av1),
                       '4.10: un segundo teléfono genera el aviso con su modelo y su identificador para cerrarlo');

-- Nadie lee ni marca los avisos de otra persona, y la tabla no se lee directamente.
select pg_temp.como('00000000-0000-0000-0000-0000000000c2');
set role authenticated;
create temp table _av2 as select public.rpc_mis_avisos() as r;
select public.rpc_aviso_leido((select (r -> 0 ->> 'id')::uuid from _av1));
select pg_temp.debe_fallar($q$select count(*) from public.avisos_cuenta$q$, 'permission denied',
                           '4.10: la tabla de avisos no se lee directamente');
reset role;
select pg_temp.afirmar((select jsonb_array_length(r) = 0 from _av2), '4.10: otra persona no ve los avisos ajenos');
select pg_temp.afirmar((select leido_en is null from public.avisos_cuenta where tipo = 'dispositivo_nuevo'),
                       '4.10: otra persona no marca como leído un aviso ajeno');

select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
select public.rpc_aviso_leido((select (r -> 0 ->> 'id')::uuid from _av1));
create temp table _av3 as select public.rpc_mis_avisos() as r;
reset role;
select pg_temp.afirmar((select jsonb_array_length(r) = 0 from _av3), '4.10: un aviso leído ya no se muestra');

set role anon;
select pg_temp.debe_fallar($q$select public.rpc_mis_avisos()$q$, 'permission denied', '4.10: sin sesión no hay avisos');
reset role;

-- --------------------------------------------------------------- P-07: aviso cuando cambia la contraseña
update auth.users set encrypted_password = 'clave-de-prueba-cambiada' where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.afirmar(exists (select 1 from public.avisos_cuenta
                                where usuario_id = '00000000-0000-0000-0000-0000000000c1' and tipo = 'clave_cambiada' and leido_en is null),
                       'P-07: cambiar la contraseña deja un aviso para la persona');
select pg_temp.afirmar(exists (select 1 from public.auditoria where accion = 'clave_cambiada'
                                 and entidad_id = '00000000-0000-0000-0000-0000000000c1'),
                       'P-07: el cambio de contraseña queda en la auditoría');
update auth.users set raw_user_meta_data = raw_user_meta_data where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.afirmar((select count(*) = 1 from public.avisos_cuenta
                         where usuario_id = '00000000-0000-0000-0000-0000000000c1' and tipo = 'clave_cambiada'),
                       'P-07: otros cambios de la cuenta no generan el aviso');

-- --------------------------------------------------------------- R-45: volver a aceptar los acuerdos
update public.perfiles set acuerdos_aceptados_en = now(), acuerdos_version = public._version_acuerdos()
 where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
create temp table _r1 as select public.rpc_mi_perfil() as r;
create temp table _t1 as select public.rpc_acuerdos_vigentes() as r;
reset role;
select pg_temp.afirmar((select (r ->> 'acuerdos_vigentes')::boolean and (r ->> 'sesion_horas')::int = 336 from _r1),
                       'R-45: acuerdos recién aceptados están vigentes y la sesión del colaborador es de 336 horas');
select pg_temp.afirmar((select jsonb_array_length(r -> 'textos') = 2 and r ->> 'version' is not null from _t1),
                       'R-45: la app recibe los dos textos de los acuerdos y su versión');

update public.perfiles set acuerdos_aceptados_en = now() - interval '7 months' where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
create temp table _r2 as select public.rpc_mi_perfil() as r;
reset role;
select pg_temp.afirmar((select not (r ->> 'acuerdos_vigentes')::boolean from _r2), 'R-45: a los 6 meses hay que volver a aceptar');

-- Se publica un código de conducta nuevo: la versión cambia y la aceptación anterior deja de valer.
update public.perfiles set acuerdos_aceptados_en = now() where id = '00000000-0000-0000-0000-0000000000c1';
create temp table _vers as select public._version_acuerdos() as anterior;
insert into public.textos_legales (tipo, version, contenido, vigente, es_borrador)
values ('codigo_conducta', 'v2-prueba', 'Código de conducta de prueba, versión 2.', true, true);
create temp table _vers2 as select public._version_acuerdos() as nueva;
grant select on _vers, _vers2 to authenticated;   -- la app recibe la versión por rpc_acuerdos_vigentes
select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
create temp table _r3 as select public.rpc_mi_perfil() as r;
select pg_temp.debe_fallar(format($q$select public.rpc_aceptar_acuerdos(%L)$q$, (select anterior from _vers)), 'cambiaron',
                           'R-45: no se acepta una versión vieja de los acuerdos');
select pg_temp.debe_fallar($q$select public._version_acuerdos()$q$, 'permission denied',
                           'R-45: la función interna de la versión no se llama desde la app');
select public.rpc_aceptar_acuerdos((select nueva from _vers2));
create temp table _r4 as select public.rpc_mi_perfil() as r;
reset role;
select pg_temp.afirmar((select not (r ->> 'acuerdos_vigentes')::boolean and r ->> 'acuerdos_version' like '%v2-prueba%' from _r3),
                       'R-45: si cambia un texto, hay que aceptar la versión nueva');
select pg_temp.afirmar((select (r ->> 'acuerdos_vigentes')::boolean from _r4), 'R-45: aceptar la versión nueva deja los acuerdos vigentes');
select pg_temp.afirmar(exists (select 1 from public.auditoria where accion = 'aceptar_acuerdos'
                                 and entidad_id = '00000000-0000-0000-0000-0000000000c1'),
                       'R-45: la aceptación queda en la auditoría');
delete from public.textos_legales where version = 'v2-prueba';

update public.perfiles set estado = 'suspendido' where id = '00000000-0000-0000-0000-0000000000c2';
select pg_temp.como('00000000-0000-0000-0000-0000000000c2');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_aceptar_acuerdos('v1-borrador')$q$, 'no activa',
                           'R-45: una cuenta suspendida no acepta acuerdos');
reset role;
update public.perfiles set estado = 'activo' where id = '00000000-0000-0000-0000-0000000000c2';

\o
\echo 'TODAS LAS PRUEBAS DE CUENTAS Y SESIONES PASARON'
