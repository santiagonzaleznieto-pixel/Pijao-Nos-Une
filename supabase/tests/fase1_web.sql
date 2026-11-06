-- Pruebas de la migración 0014 (Fase 1, bloques 1.10 y 1.13): panel web y páginas públicas.
-- Corre DESPUÉS de fase1_seguridad.sql (orden alfabético) y usa sus cuentas: Administrador ...0a y Director ...d1.
-- Si alguna comprobación falla, el script se detiene con «FALLÓ: …».
\set ON_ERROR_STOP on
\o /dev/null
set client_min_messages = notice;

create or replace function pg_temp.como(p_uid uuid, p_aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', p_aal)::text, false);
  perform set_config('request.jwt.claim.sub', p_uid::text, false);
end $$;
create or replace function pg_temp.como_anonimo(p_ip text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', false);
  perform set_config('request.jwt.claim.sub', '', false);
  perform set_config('request.headers', json_build_object('x-forwarded-for', p_ip || ', 10.0.0.1')::text, false);
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
grant execute on function pg_temp.como(uuid, text), pg_temp.como_anonimo(text), pg_temp.afirmar(boolean, text),
  pg_temp.debe_fallar(text, text, text) to authenticated, anon, service_role;

-- --------------------------------------------------------------- P-42 configuración: solo el Administrador, con 2 pasos
select pg_temp.como('00000000-0000-0000-0000-0000000000d1', 'aal2');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_config_guardar('radio_duplicados_m', '20')$q$, 'Solo el Administrador',
                           'P-42: el Director no cambia la configuración');
reset role;

select pg_temp.como('00000000-0000-0000-0000-00000000000a', 'aal1');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_config_guardar('radio_duplicados_m', '20')$q$, 'dos pasos',
                           'P-42: el Administrador sin verificación en dos pasos no cambia la configuración');
reset role;

select pg_temp.como('00000000-0000-0000-0000-00000000000a', 'aal2');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_config_guardar('radio_duplicados_m', '"veinte"')$q$, 'mismo tipo',
                           'P-42: un número no se cambia por texto');
select pg_temp.debe_fallar($q$select public.rpc_config_guardar('radio_duplicados_m', '-3')$q$, 'negativo',
                           'P-42: no se aceptan valores negativos');
select pg_temp.debe_fallar($q$select public.rpc_config_guardar('curso_minimo', '120')$q$, 'porcentaje',
                           'P-42: un porcentaje no pasa de 100');
select pg_temp.debe_fallar($q$select public.rpc_config_guardar('ultimo_respaldo', '{}')$q$, 'sistema',
                           'P-42: el último respaldo no se edita a mano');
select pg_temp.debe_fallar($q$select public.rpc_config_guardar('no_existe', '1')$q$, 'desconocido',
                           'P-42: no se crean claves nuevas desde el panel');
select pg_temp.debe_fallar($q$select public.rpc_config_guardar('version_minima_app', '"once"')$q$, '0.11.0',
                           'P-42: la versión mínima tiene el formato 0.11.0');
select pg_temp.debe_fallar($q$select public.rpc_config_guardar('calendario_legal',
  '[{"fecha":"2027-02-30","hito":"Fecha imposible","estado":"prensa"}]')$q$, 'no existe',
  'P-42: el calendario legal rechaza fechas que no existen');
select pg_temp.debe_fallar($q$select public.rpc_config_guardar('canal_titulares_correo', '"no-es-correo"')$q$, 'correo',
                           'P-42: el correo de atención debe ser válido');
select public.rpc_config_guardar('centro_lng', '-75.71');
select public.rpc_config_guardar('radio_duplicados_m', '20');
select public.rpc_config_guardar('canal_titulares_correo', '"datos@pijaonosune.co"');
select public.rpc_config_guardar('calendario_legal',
  '[{"fecha":"2027-10-31","hito":"Elecciones","estado":"confirmada"},{"fecha":null,"hito":"Testigos","estado":"pendiente"}]');
reset role;
select pg_temp.afirmar((select valor = '20'::jsonb from public.configuracion where clave = 'radio_duplicados_m')
                       and (select valor = '-75.71'::jsonb from public.configuracion where clave = 'centro_lng'),
                       'P-42: el Administrador cambia los valores de control (también coordenadas negativas)');
select pg_temp.afirmar(exists (select 1 from public.auditoria where accion = 'configuracion' and entidad_id = 'radio_duplicados_m'
                               and detalle -> 'antes' = '15'::jsonb and detalle -> 'despues' = '20'::jsonb),
                       'P-42: cada cambio queda en la auditoría con el valor anterior y el nuevo');
select pg_temp.afirmar((select count(*) = 0 from public.configuracion where descripcion is null),
                       'P-42: todos los valores de control tienen descripción');

-- --------------------------------------------------------------- P-42 catálogos
select pg_temp.como('00000000-0000-0000-0000-00000000000a', 'aal2');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_catalogo_guardar('C-01', 'nuevo_estado', 'Nuevo', 9)$q$, 'del sistema',
                           'P-42: a un catálogo del sistema no se le agregan opciones');
select pg_temp.debe_fallar($q$select public.rpc_catalogo_guardar('C-02', 'rechazo', 'Rechazó', 5, false)$q$, 'no se desactivan',
                           'P-42: las opciones de un catálogo del sistema no se desactivan');
select pg_temp.debe_fallar($q$select public.rpc_catalogo_guardar('C-08', 'Mal Clave', 'X', 1)$q$, 'minúsculas',
                           'P-42: la clave de una opción usa minúsculas');
select public.rpc_catalogo_guardar('C-01', 'por_visitar', 'Sin visitar todavía', 0);
select public.rpc_catalogo_guardar('C-08', 'cultura_paz', 'Cultura de paz', 20);
select public.rpc_catalogo_guardar('C-08', 'otro', 'Otro tema', 13, false);
reset role;
select pg_temp.afirmar((select etiqueta = 'Sin visitar todavía' from public.catalogos where catalogo = 'C-01' and clave = 'por_visitar')
                       and exists (select 1 from public.catalogos where catalogo = 'C-08' and clave = 'cultura_paz' and activo)
                       and exists (select 1 from public.catalogos where catalogo = 'C-08' and clave = 'otro' and not activo),
                       'P-42: se renombran, agregan y desactivan opciones de los catálogos');

-- --------------------------------------------------------------- P-42 textos legales con versiones
select pg_temp.como('00000000-0000-0000-0000-00000000000a', 'aal2');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_texto_legal_publicar('aviso_privacidad', 'v1-borrador', 'Texto repetido de prueba suficiente')$q$,
                           'Ya existe', 'P-42: no se repite el número de versión');
select pg_temp.debe_fallar($q$select public.rpc_texto_legal_publicar('aviso_privacidad', 'v2', 'corto')$q$, '20 y 60.000',
                           'P-42: el texto no puede estar casi vacío');
select public.rpc_texto_legal_publicar('aviso_privacidad', 'v2', 'Aviso de privacidad, versión 2, aprobado por el abogado.', true);
reset role;
select pg_temp.afirmar((select count(*) = 1 from public.textos_legales where tipo = 'aviso_privacidad' and vigente)
                       and (select version = 'v2' and not es_borrador from public.textos_legales where tipo = 'aviso_privacidad' and vigente)
                       and exists (select 1 from public.textos_legales where tipo = 'aviso_privacidad' and version = 'v1-borrador' and not vigente),
                       'P-42: la versión nueva queda vigente y la anterior se guarda');

-- --------------------------------------------------------------- P-42 plantillas de permisos
select pg_temp.como('00000000-0000-0000-0000-00000000000a', 'aal2');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_plantilla_guardar('Plantilla mala', array['O-03','O-99'])$q$, 'O-99',
                           'P-42: una plantilla no acepta permisos que no existen');
select public.rpc_plantilla_guardar('Coordinador de vereda', array['O-09','O-03','O-09'], true);
reset role;
select pg_temp.afirmar((select codigos = array['O-03','O-09'] and limitar_a_zona from public.plantillas_permisos
                         where nombre = 'Coordinador de vereda'), 'P-42: se crea una plantilla sin repetidos');
select pg_temp.como('00000000-0000-0000-0000-00000000000a', 'aal2');
set role authenticated;
select public.rpc_plantilla_eliminar('Coordinador de vereda');
reset role;
select pg_temp.afirmar(not exists (select 1 from public.plantillas_permisos where nombre = 'Coordinador de vereda'),
                       'P-42: se elimina una plantilla');

-- --------------------------------------------------------------- P-41 exportación técnica de la auditoría
select pg_temp.como('00000000-0000-0000-0000-0000000000d1', 'aal2');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_auditoria_exportar('Revisión mensual')$q$, 'Solo el Administrador',
                           'P-41: el Director no exporta la vista técnica');
reset role;
select pg_temp.como('00000000-0000-0000-0000-00000000000a', 'aal2');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_auditoria_exportar('')$q$, 'motivo', 'P-41: exportar exige un motivo');
create temp table _exp as select public.rpc_auditoria_exportar('Revisión mensual de seguridad', null, null, null, 'configuracion') as r;
reset role;
select pg_temp.afirmar((select (r ->> 'total')::int >= 4 and jsonb_typeof(r -> 'filas') = 'array'
                               and (r -> 'filas' -> 0) ? 'hash' from _exp),
                       'P-41: el Administrador exporta con filtros y con la huella de cada fila');
select pg_temp.afirmar(exists (select 1 from public.exportaciones where tipo = 'auditoria_tecnica')
                       and exists (select 1 from public.auditoria where accion = 'exportar' and entidad_id = 'auditoria'),
                       'P-41: la exportación queda registrada y auditada');

-- --------------------------------------------------------------- P-43 salud del sistema
select pg_temp.como('00000000-0000-0000-0000-0000000000d1', 'aal2');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_salud_sistema()$q$, 'Solo el Administrador', 'P-43: el Director no ve la salud técnica');
reset role;
select pg_temp.como('00000000-0000-0000-0000-00000000000a', 'aal2');
set role authenticated;
create temp table _salud as select public.rpc_salud_sistema() as r;
reset role;
select pg_temp.afirmar((select r ?& array['usuarios','errores','sincronizacion','recursos','seguridad','respaldo','versiones',
                                          'titulares','perdidos','flota'] from _salud),
                       'P-43: la salud del sistema trae todos los apartados de 9.6 y N-12');

-- El respaldo lo anota solo el script del Administrador (service_role), nunca un usuario de la app.
select pg_temp.como('00000000-0000-0000-0000-00000000000a', 'aal2');
set role authenticated;
select pg_temp.debe_fallar($q$select public.rpc_respaldo_registrado('{"mb":1}')$q$, 'permission denied',
                           '8.10: un usuario no puede anotar un respaldo falso');
reset role;
set role service_role;
select public.rpc_respaldo_registrado('{"mb":12.5,"archivos":40,"equipo":"PC-ADMIN"}');
reset role;
select pg_temp.afirmar((select (valor ->> 'mb')::numeric = 12.5 from public.configuracion where clave = 'ultimo_respaldo'),
                       '8.10: el script de respaldo anota el último respaldo');

-- --------------------------------------------------------------- páginas públicas: lo que NO puede hacer la clave pública
select pg_temp.como_anonimo('200.1.1.1');
set role anon;
select pg_temp.debe_fallar($q$select count(*) from public.perfiles$q$, 'permission denied',
                           'Públicas: la clave pública no lee las tablas');
select pg_temp.debe_fallar($q$select count(*) from public.solicitudes_titulares$q$, 'permission denied',
                           'Públicas: la clave pública no lee las solicitudes');
select pg_temp.debe_fallar($q$select public.rpc_config_guardar('radio_duplicados_m', '1')$q$, 'permission denied',
                           'Públicas: la clave pública no llama a las funciones del panel');
select pg_temp.debe_fallar($q$select public.rpc_solicitud_titular('{"tipo":"consulta"}')$q$, 'permission denied',
                           'Públicas: la clave pública no usa la función interna de solicitudes');
reset role;

-- --------------------------------------------------------------- P-53 textos públicos
select pg_temp.como_anonimo('200.1.1.1');
set role anon;
create temp table _txt as select public.rpc_publico_textos() as r;
reset role;
select pg_temp.afirmar((select r -> 'aviso' ->> 'version' = 'v2' and r ->> 'correo' = 'datos@pijaonosune.co'
                               and (r -> 'politica' ->> 'borrador')::boolean from _txt),
                       'P-53: la página pública muestra el texto vigente, si es borrador y el canal de atención');

-- --------------------------------------------------------------- P-50 «Mis datos»
select pg_temp.como_anonimo('200.1.1.1');
set role anon;
select pg_temp.debe_fallar($q$select public.rpc_publico_solicitud('{"tipo":"consulta","nombre":"Rosa Pérez","contacto":"3001234567"}')$q$,
                           'aceptar', 'P-50: hay que aceptar el uso de los datos de la solicitud');
select pg_temp.debe_fallar($q$select public.rpc_publico_solicitud('{"tipo":"borrar_todo","nombre":"Rosa Pérez","contacto":"3001234567","acepta":true}')$q$,
                           'Elija', 'P-50: el tipo de solicitud debe ser uno de los de la ley');
select public.rpc_publico_solicitud('{"tipo":"consulta","nombre":"Robot","contacto":"3000000000","acepta":true,"sitio_web":"http://spam"}');
create temp table _sol as select public.rpc_publico_solicitud(
  '{"tipo":"supresion","nombre":"Rosa Pérez","contacto":"300 123 4567","lugar":"Vereda La Mina","detalle":"Quiero que borren mis datos","acepta":true}') as r;
reset role;
select pg_temp.afirmar(not exists (select 1 from public.solicitudes_titulares where nombre_solicitante = 'Robot'),
                       'P-50: lo que envía un robot (campo trampa) no se guarda');
select pg_temp.afirmar((select (r ->> 'numero_caso') ~ '^[0-9A-F]{8}$' from _sol)
                       and exists (select 1 from public.solicitudes_titulares s, _sol
                                    where public._numero_caso(s.id) = _sol.r ->> 'numero_caso' and s.canal = 'formulario'
                                      and s.registrado_por is null and s.persona_id is null and s.plazo_legal > current_date
                                      and s.detalle like 'Barrio o vereda: Vereda La Mina%'),
                       'P-50: la solicitud crea un caso con número, canal «formulario» y plazos');
select pg_temp.afirmar(not exists (select 1 from public.intentos_publicos where huella like '%200.1.1.1%'),
                       'P-50: no se guarda la dirección IP, solo una huella');

-- Estado del caso: hace falta el número y el mismo contacto (sin importar los espacios).
select pg_temp.como_anonimo('200.1.1.1');
set role anon;
create temp table _est as
  select public.rpc_publico_estado_caso((select r ->> 'numero_caso' from _sol), '3001234567') as bien,
         public.rpc_publico_estado_caso((select r ->> 'numero_caso' from _sol), '3119999999') as mal;
reset role;
select pg_temp.afirmar((select (bien ->> 'encontrado')::boolean and bien ->> 'estado' = 'recibida' and not (bien ? 'respuesta')
                               and not (mal ->> 'encontrado')::boolean from _est),
                       'P-50: el estado del caso se consulta con número y contacto, y no muestra la respuesta');
select pg_temp.como_anonimo('200.6.6.6');
set role anon;
select public.rpc_publico_estado_caso((select r ->> 'numero_caso' from _sol), '3110000001');
select public.rpc_publico_estado_caso((select r ->> 'numero_caso' from _sol), '3110000002');
select public.rpc_publico_estado_caso((select r ->> 'numero_caso' from _sol), '3110000003');
select pg_temp.debe_fallar(format($q$select public.rpc_publico_estado_caso(%L, '3110000004')$q$, (select r ->> 'numero_caso' from _sol)),
                           'Demasiadas', 'P-50: un mismo número de caso admite pocas consultas por hora');
reset role;

-- Límite por conexión: la configuración permite 5 por hora desde la misma conexión.
select pg_temp.como_anonimo('200.9.9.9');
set role anon;
select public.rpc_publico_solicitud('{"tipo":"consulta","nombre":"Persona Uno","contacto":"3000000001","acepta":true}');
select public.rpc_publico_solicitud('{"tipo":"consulta","nombre":"Persona Uno","contacto":"3000000001","acepta":true}');
select public.rpc_publico_solicitud('{"tipo":"consulta","nombre":"Persona Uno","contacto":"3000000001","acepta":true}');
select public.rpc_publico_solicitud('{"tipo":"consulta","nombre":"Persona Uno","contacto":"3000000001","acepta":true}');
select public.rpc_publico_solicitud('{"tipo":"consulta","nombre":"Persona Uno","contacto":"3000000001","acepta":true}');
select pg_temp.debe_fallar($q$select public.rpc_publico_solicitud('{"tipo":"consulta","nombre":"Persona Uno","contacto":"3000000001","acepta":true}')$q$,
                           'Demasiadas solicitudes', 'P-50: una misma conexión tiene un límite por hora');
reset role;
select pg_temp.como_anonimo('200.8.8.8');
set role anon;
select public.rpc_publico_solicitud('{"tipo":"queja","nombre":"Persona Dos","contacto":"3000000002","acepta":true}');
reset role;
select pg_temp.afirmar(true, 'P-50: otra conexión sigue pudiendo enviar');

-- La huella usa primero cf-connecting-ip: cambiar x-forwarded-for no da cupo nuevo.
select set_config('request.headers', '{"cf-connecting-ip":"200.9.9.9","x-forwarded-for":"1.1.1.1"}', false);
set role anon;
select pg_temp.debe_fallar($q$select public.rpc_publico_solicitud('{"tipo":"consulta","nombre":"Persona Uno","contacto":"3000000001","acepta":true}')$q$,
                           'Demasiadas solicitudes', 'P-50: falsificar x-forwarded-for no salta el límite');
-- El campo trampa también gasta cupo.
select pg_temp.debe_fallar($q$select public.rpc_publico_solicitud('{"tipo":"consulta","nombre":"Robot","contacto":"3000000000","acepta":true,"sitio_web":"x"}')$q$,
                           'Demasiadas solicitudes', 'P-50: la trampa para robots no se salta el límite');
reset role;

-- Tope total por hora: con el tope en 8 (ya hay 8 usos guardados en la última hora), el siguiente se pausa.
update public.configuracion set valor = '8'::jsonb where clave = 'publico_max_hora';
select pg_temp.como_anonimo('200.7.7.7');
set role anon;
select pg_temp.debe_fallar($q$select public.rpc_publico_solicitud('{"tipo":"consulta","nombre":"Persona Tres","contacto":"3000000003","acepta":true}')$q$,
                           'muchas solicitudes', 'P-50: el formulario se pausa al pasar el tope total por hora');
reset role;
update public.configuracion set valor = '40'::jsonb where clave = 'publico_max_hora';

-- --------------------------------------------------------------- P-52 verificación del carnet
select pg_temp.como_anonimo('200.1.1.1');
set role anon;
create temp table _carnet as select
  public.rpc_publico_carnet('00000000-0000-0000-0000-0000000000d1') as director,
  public.rpc_publico_carnet('00000000-0000-0000-0000-00000000ffff') as nadie,
  public.rpc_publico_carnet('no-es-un-id') as basura;
reset role;
select pg_temp.afirmar((select (director ->> 'vigente')::boolean and director ->> 'rol' = 'Director de campaña'
                               and director ? 'nombre' and director ? 'vence' from _carnet),
                       'P-52: el carnet de una persona activa aparece vigente con su nombre');
select pg_temp.afirmar((select not (nadie ->> 'vigente')::boolean and not (nadie ? 'nombre')
                               and not (basura ->> 'vigente')::boolean from _carnet),
                       'P-52: un código desconocido o mal escrito aparece como no vigente');

update public.perfiles set estado = 'suspendido' where id = '00000000-0000-0000-0000-0000000000d1';
select pg_temp.como_anonimo('200.1.1.1');
set role anon;
create temp table _carnet2 as select public.rpc_publico_carnet('00000000-0000-0000-0000-0000000000d1') as r;
reset role;
select pg_temp.afirmar((select not (r ->> 'vigente')::boolean and not (r ? 'nombre') from _carnet2),
                       'P-52: un carnet suspendido no es vigente y no muestra el nombre');
update public.perfiles set curso_aprobado_en = now() - interval '7 months', estado = 'activo'
 where id = '00000000-0000-0000-0000-0000000000d1';
select pg_temp.como_anonimo('200.1.1.1');
set role anon;
create temp table _carnet3 as select public.rpc_publico_carnet('00000000-0000-0000-0000-0000000000d1') as r;
reset role;
select pg_temp.afirmar((select not (r ->> 'vigente')::boolean from _carnet3),
                       'P-52: el carnet vence con el certificado (6 meses)');
update public.perfiles set curso_aprobado_en = now() where id = '00000000-0000-0000-0000-0000000000d1';

\o
\echo 'TODAS LAS PRUEBAS DEL PANEL WEB Y LAS PÁGINAS PÚBLICAS PASARON'
