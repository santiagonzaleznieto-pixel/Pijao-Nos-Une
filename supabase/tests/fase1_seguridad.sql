-- Pruebas de la Fase 1 (bloque 1.3): cada hallazgo de seguridad de la sección 24.3 tiene su comprobación.
-- Se ejecuta contra una base supabase/postgres con todas las migraciones aplicadas (tools/probar_migraciones.sh).
-- Si alguna comprobación falla, el script se detiene con «FALLÓ: …».
\set ON_ERROR_STOP on
\o /dev/null
set client_min_messages = notice;
set app.pii_key = 'llave-de-prueba-solo-para-el-ambiente-local-0123456789';

-- --------------------------------------------------------------- utilidades de prueba
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
-- Ejecuta SQL que DEBE fallar; si el mensaje contiene p_texto, la prueba pasa.
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
-- La migración 0009 quita el permiso de ejecución por defecto: se da a las utilidades de prueba.
grant execute on function pg_temp.como(uuid, text), pg_temp.afirmar(boolean, text), pg_temp.debe_fallar(text, text, text)
  to authenticated;

-- --------------------------------------------------------------- cuentas de prueba
insert into public.instalacion (clave, valor) values ('bootstrap', '{"token":"tok-prueba"}');
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-00000000000a', 'admin@prueba.co', '{"bootstrap_token":"tok-prueba","nombre_completo":"Admin"}');
select pg_temp.afirmar((select rol = 'admin' and estado = 'activo' from public.perfiles where id = '00000000-0000-0000-0000-00000000000a'),
                       'el Administrador se crea con el token de instalación');

-- A7: el código de invitación tiene 12 caracteres sin ambigüedades.
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
set role authenticated;
create temp table _cod as select (public.rpc_invitar('Ana Prueba', null, 'ana@prueba.co') ->> 'codigo') as c;
create temp table _cod2 as select (public.rpc_invitar('Beto Prueba') ->> 'codigo') as c;
create temp table _cod3 as select (public.rpc_invitar('Dora Directora', null, null, 'director') ->> 'codigo') as c;
reset role;
select pg_temp.afirmar((select c ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{12}$' from _cod), 'A7: código de 12 caracteres');
select pg_temp.afirmar(not exists (select 1 from public.auditoria where accion = 'invitar' and detalle ? 'nombre'),
                       'A6: la auditoría de la invitación no guarda el nombre');

-- A8: menor de edad, correo distinto al de la invitación y doble uso del mismo código.
select pg_temp.debe_fallar(format($q$insert into auth.users (id, email, raw_user_meta_data) values
  (gen_random_uuid(), 'ana@prueba.co', '{"codigo_invitacion":"%s","mayor_de_edad":false}')$q$, (select c from _cod)),
  'mayores de 18', 'A8: la base rechaza a un menor de edad');
select pg_temp.debe_fallar(format($q$insert into auth.users (id, email, raw_user_meta_data) values
  (gen_random_uuid(), 'otra@prueba.co', '{"codigo_invitacion":"%s","mayor_de_edad":true}')$q$, (select c from _cod)),
  'no coincide', 'A8: la base rechaza un correo distinto al de la invitación');
insert into auth.users (id, email, raw_user_meta_data)
select '00000000-0000-0000-0000-0000000000c1', 'ana@prueba.co',
       jsonb_build_object('codigo_invitacion', c, 'mayor_de_edad', true, 'nombre_completo', 'Ana Prueba') from _cod;
select pg_temp.debe_fallar(format($q$insert into auth.users (id, email, raw_user_meta_data) values
  (gen_random_uuid(), 'ana2@prueba.co', '{"codigo_invitacion":"%s","mayor_de_edad":true}')$q$, (select c from _cod)),
  'invitación vigente', 'A7: un código no se puede usar dos veces');
insert into auth.users (id, email, raw_user_meta_data)
select '00000000-0000-0000-0000-0000000000c2', 'beto@prueba.co',
       jsonb_build_object('codigo_invitacion', c, 'mayor_de_edad', true, 'nombre_completo', 'Beto Prueba') from _cod2;
insert into auth.users (id, email, raw_user_meta_data)
select '00000000-0000-0000-0000-0000000000d1', 'dora@prueba.co',
       jsonb_build_object('codigo_invitacion', c, 'mayor_de_edad', true, 'nombre_completo', 'Dora Directora') from _cod3;
select pg_temp.afirmar((select estado = 'pendiente' and rol = 'colaborador' from public.perfiles
                         where id = '00000000-0000-0000-0000-0000000000d1'),
                       'A7: una invitación de Director no da acceso de inmediato');

-- Aprobación, curso y designación del Director (esta última exige verificación en dos pasos).
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select public.rpc_aprobar_usuario('00000000-0000-0000-0000-0000000000c1');
select public.rpc_aprobar_usuario('00000000-0000-0000-0000-0000000000c2');
select public.rpc_aprobar_usuario('00000000-0000-0000-0000-0000000000d1');
select pg_temp.debe_fallar($q$select public.rpc_designar_director('00000000-0000-0000-0000-0000000000d1')$q$,
  'dos pasos', 'A4: designar al Director exige verificación en dos pasos');
reset role;
select pg_temp.como('00000000-0000-0000-0000-00000000000a', 'aal2');
set role authenticated;
select public.rpc_designar_director('00000000-0000-0000-0000-0000000000d1');
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
select public.rpc_completar_ingreso(90, 'v1');
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000c2');
set role authenticated;
select public.rpc_completar_ingreso(85, 'v1');
reset role;

-- --------------------------------------------------------------- registrar una visita
create or replace function pg_temp.visita(p_viv uuid, p_vis uuid, p_per uuid, p_cedula text, p_con jsonb,
                                         p_dlat float8 default 4.33340, p_extra_viv jsonb default '{}') returns jsonb
language sql as $$
  select jsonb_build_object(
    'vivienda', jsonb_build_object('id', p_viv, 'lat', 4.33340, 'lng', -75.70000, 'precision_m', 8, 'direccion', 'Calle 1') || p_extra_viv,
    'visita', jsonb_build_object('id', p_vis, 'resultado', 'conversacion_completa', 'autorizacion_verbal', true),
    'hogar', jsonb_build_object('id', gen_random_uuid(), 'total_personas', 2, 'edades', '{"25-34":2}'::jsonb, 'sosten_relacion', 'jefe'),
    'personas', case when p_per is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object(
      'id', p_per, 'primer_nombre', 'Rosa', 'primer_apellido', 'López', 'mayor_edad_confirmada', true, 'cedula', p_cedula,
      'telefono', '3001234567')) end,
    'consentimientos', p_con,
    'fotos', jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'tipo', 'fachada',
                                                  'storage_path', 'viviendas/otra/robada.jpg')),
    'dispositivo', jsonb_build_object('lat', p_dlat, 'lng', -75.70000))
$$;
create or replace function pg_temp.consent(p_per uuid, p_prop text, p_metodo text default 'verbal',
                                          p_evid jsonb default '{"verbal":true,"hora":"2026-11-04T10:00:00Z"}') returns jsonb
language sql as $$
  select jsonb_build_object('id', gen_random_uuid(), 'persona_id', p_per, 'proposito', p_prop, 'version_texto', 'v1-borrador',
    'metodo', p_metodo, 'evidencia', p_evid, 'otorgado_en', now() - interval '1 hour', 'lat', 4.3334, 'lng', -75.7)
$$;
grant execute on function pg_temp.visita(uuid, uuid, uuid, text, jsonb, float8, jsonb), pg_temp.consent(uuid, text, text, jsonb)
  to authenticated;

select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
-- A1: una autorización «global» (sin persona) ya no basta.
select pg_temp.debe_fallar(format('select public.rpc_registrar_visita(%L::jsonb)', pg_temp.visita(
  '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '12345678',
  jsonb_build_array(pg_temp.consent(null, 'registro_vivienda'), pg_temp.consent(null, 'datos_personales')))),
  'R-15', 'A1: el consentimiento de datos personales debe ser de cada persona');
-- A1: firma en pantalla sin trazos.
select pg_temp.debe_fallar(format('select public.rpc_registrar_visita(%L::jsonb)', pg_temp.visita(
  '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '12345678',
  jsonb_build_array(pg_temp.consent('30000000-0000-0000-0000-000000000001', 'datos_personales', 'firma_pantalla', '{"firma":[]}')))),
  'firma', 'A1: una firma vacía no vale como evidencia');
-- Registro válido. A2: el cliente intenta fijar la zona, marcarla verificada y apuntar a una foto ajena.
create temp table _r1 as select public.rpc_registrar_visita(pg_temp.visita(
  '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '12345678',
  jsonb_build_array(pg_temp.consent(null, 'registro_vivienda'), pg_temp.consent('30000000-0000-0000-0000-000000000001', 'datos_personales')),
  4.33340, '{"zona_id":"99999999-9999-9999-9999-999999999999","calidad":"verde","verificada":true}'::jsonb)) as r;
reset role;
select pg_temp.afirmar((select (r ->> 'ok')::boolean from _r1), 'registro válido aceptado');
select pg_temp.afirmar((select zona_id is null from public.viviendas where id = '10000000-0000-0000-0000-000000000001'),
                       'A2: la zona la decide el servidor, no el cliente');
select pg_temp.afirmar((select storage_path = 'viviendas/10000000-0000-0000-0000-000000000001/' || id || '.jpg'
                          from public.fotos where vivienda_id = '10000000-0000-0000-0000-000000000001'),
                       'A2: la ruta de la foto la fija el servidor');
select pg_temp.afirmar((select cedula_enc is not null and cedula_ult3 = '678' from public.personas
                         where id = '30000000-0000-0000-0000-000000000001'), '8.8: la cédula se guarda cifrada');

-- M1: la misma cédula en otra visita devuelve «ya registrada» sin revelar el id.
select pg_temp.como('00000000-0000-0000-0000-0000000000c2');
set role authenticated;
create temp table _r2 as select public.rpc_registrar_visita(pg_temp.visita(
  '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '12345678',
  jsonb_build_array(pg_temp.consent(null, 'registro_vivienda'), pg_temp.consent('30000000-0000-0000-0000-000000000002', 'datos_personales')),
  4.33000)) as r;
-- M2: Beto no ve a Rosa (no la registró y no tiene zonas).
create temp table _vista_beto as select count(*) as n from public.personas_v where id = '30000000-0000-0000-0000-000000000001';
reset role;
select pg_temp.afirmar((select r -> 'personas_duplicadas' -> 0 ->> 'ya_registrada' = 'true'
                           and not (r -> 'personas_duplicadas' -> 0 ? 'id_existente') from _r2),
                       'M1: no se revela el id de la persona con la misma cédula');
-- R-09: el teléfono estaba a unos 380 m; se acepta y queda en revisión.
select pg_temp.afirmar((select (r ->> 'en_revision')::boolean and r ->> 'calidad' = 'rojo' from _r2),
                       'R-09: lo capturado lejos se acepta y se marca para revisión');
select pg_temp.afirmar((select n = 0 from _vista_beto), 'M2: un colaborador no ve personas fuera de lo suyo');

-- A4: el Director sin verificación en dos pasos no ve datos completos; con ella, sí.
select pg_temp.como('00000000-0000-0000-0000-0000000000d1');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_persona_completa('30000000-0000-0000-0000-000000000001')$q$,
  'permiso', 'A4: el Director necesita verificación en dos pasos para ver datos completos');
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000d1', 'aal2');
set role authenticated;
create temp table _completa as select public.rpc_persona_completa('30000000-0000-0000-0000-000000000001') as r;
reset role;
select pg_temp.afirmar((select r ->> 'cedula' = '12345678' from _completa), 'A4: con verificación en dos pasos sí ve la cédula');

-- M3: un permiso de riesgo alto necesita vencimiento.
select pg_temp.como('00000000-0000-0000-0000-0000000000d1');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_set_permiso('00000000-0000-0000-0000-0000000000c2', 'O-01', true)$q$,
  'vencimiento', 'M3: O-01 sin vencimiento se rechaza');
select pg_temp.debe_fallar($q$select public.rpc_set_permiso('00000000-0000-0000-0000-0000000000c2', 'O-01', true, now() + interval '200 days')$q$,
  'máximo', 'M3: O-01 a más de 90 días se rechaza');
select public.rpc_set_permiso('00000000-0000-0000-0000-0000000000c2', 'O-01', true, now() + interval '30 days');
-- A5: una solicitud de supresión bloquea el descifrado y oculta a la persona.
select public.rpc_solicitud_titular(jsonb_build_object('tipo', 'supresion', 'persona_id', '30000000-0000-0000-0000-000000000001',
                                                       'canal', 'whatsapp'));
reset role;
select pg_temp.como('00000000-0000-0000-0000-0000000000d1', 'aal2');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_persona_completa('30000000-0000-0000-0000-000000000001')$q$,
  'eliminación', 'A5: no se descifra a quien pidió la eliminación');
create temp table _vista_dir as select nombre_visible from public.personas_v where id = '30000000-0000-0000-0000-000000000001';
reset role;
select pg_temp.afirmar((select nombre_visible is null from _vista_dir), 'A5: la vista ya no muestra su nombre');

-- A6: el borrado definitivo exige Administrador con verificación en dos pasos.
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_borrar_persona('30000000-0000-0000-0000-000000000001', 'Acta 1')$q$,
  'dos pasos', 'A6: borrar exige verificación en dos pasos');
select pg_temp.debe_fallar($q$select public.rpc_plan_cierre('ELIMINAR DATOS PERSONALES')$q$,
  'dos pasos', 'A4: el plan de cierre exige verificación en dos pasos');
reset role;
select pg_temp.como('00000000-0000-0000-0000-00000000000a', 'aal2');
set role authenticated;
select public.rpc_borrar_persona('30000000-0000-0000-0000-000000000001', 'Acta 1');
reset role;
select pg_temp.afirmar(not exists (select 1 from public.personas where id = '30000000-0000-0000-0000-000000000001')
                       and not exists (select 1 from public.consentimientos where persona_id = '30000000-0000-0000-0000-000000000001'),
                       'A6: el borrado definitivo elimina a la persona y sus autorizaciones');

-- M5: la auditoría no se modifica, no se vacía y su cadena está íntegra.
select pg_temp.debe_fallar($q$update public.auditoria set accion = 'x'$q$, 'no se puede', 'M5: la auditoría no se edita');
select pg_temp.debe_fallar($q$truncate public.auditoria$q$, 'no se puede', 'M5: la auditoría no se vacía');
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
set role authenticated;
create temp table _cadena as select public.rpc_verificar_auditoria() as r;
reset role;
select pg_temp.afirmar((select (r ->> 'integra')::boolean and (r ->> 'revisados')::int > 5 from _cadena),
                       'M5: la cadena de huellas de la auditoría está íntegra');

-- A3: una foto de fachada sin personas la ve todo el equipo; una con personas, solo quien la tomó y el Director.
insert into public.fotos (id, vivienda_id, tipo, storage_path, con_personas, usuario_id)
values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'entorno',
        'viviendas/10000000-0000-0000-0000-000000000001/50000000-0000-0000-0000-000000000001.jpg', true,
        '00000000-0000-0000-0000-0000000000c1');
select pg_temp.como('00000000-0000-0000-0000-0000000000c2');
set role authenticated;
create temp table _fotos_beto as
  select count(*) filter (where tipo = 'fachada') as fachadas, count(*) filter (where con_personas) as con_personas
    from public.fotos where vivienda_id = '10000000-0000-0000-0000-000000000001';
reset role;
select pg_temp.afirmar((select fachadas = 1 and con_personas = 0 from _fotos_beto),
                       'A3: las fotos con personas no las ve cualquier colaborador');

-- 4.10 y 17.2: máximo de dos teléfonos y borrado remoto.
select pg_temp.como('00000000-0000-0000-0000-0000000000c2');
set role authenticated;
select public.rpc_latido('{"identificador":"tel-1"}');
select public.rpc_latido('{"identificador":"tel-2"}');
create temp table _tel3 as select public.rpc_latido('{"identificador":"tel-3"}') as r;
create temp table _id1 as select id from public.dispositivos where identificador = 'tel-1';
select public.rpc_reportar_perdido((select id from _id1));
create temp table _tel1 as select public.rpc_latido('{"identificador":"tel-1"}') as r;
reset role;
select pg_temp.afirmar((select r ->> 'motivo' = 'limite_dispositivos' from _tel3), '4.10: no se registra un tercer teléfono');
select pg_temp.afirmar((select (r ->> 'borrar_datos')::boolean from _tel1), '17.2: el teléfono perdido recibe la orden de borrado');

-- M7: los puntos de jornada fuera de Colombia se descartan.
select pg_temp.como('00000000-0000-0000-0000-0000000000c2');
set role authenticated;
select public.rpc_jornada_iniciar();
create temp table _ubic as select public.rpc_ubicaciones('[{"lat":4.33,"lng":-75.7},{"lat":91,"lng":0}]') as r;
reset role;
select pg_temp.afirmar((select (r ->> 'guardadas')::int = 1 from _ubic), 'M7: se descartan coordenadas inválidas');

-- Polígonos: la zona se asigna sola si el punto cae dentro.
insert into public.zonas (id, nombre, tipo, poligono) values ('40000000-0000-0000-0000-000000000001', 'Centro', 'barrio',
  '{"type":"Polygon","coordinates":[[[-75.71,4.32],[-75.69,4.32],[-75.69,4.34],[-75.71,4.34],[-75.71,4.32]]]}');
select pg_temp.afirmar(public._zona_de_punto(4.3334, -75.70) = '40000000-0000-0000-0000-000000000001'
                       and public._zona_de_punto(4.50, -75.70) is null, 'A2: el punto en polígono funciona');

\o
\echo 'TODAS LAS PRUEBAS DE LA FASE 1 PASARON'
