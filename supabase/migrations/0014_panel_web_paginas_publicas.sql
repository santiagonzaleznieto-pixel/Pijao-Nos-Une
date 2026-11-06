-- Pijao Nos Une · 0014 · Fase 1, bloques 1.10 y 1.13: panel web del Director y del Administrador y páginas públicas
-- (P-36, P-37, P-41, P-42, P-43, P-50, P-52 y P-53 del documento maestro).
--
-- Principios:
--   · El panel solo LEE con las reglas por fila que ya existen; todo cambio pasa por una función rpc_* que valida.
--   · La configuración (P-42) la cambia solo el Administrador y con la verificación en dos pasos.
--   · Las páginas públicas usan la clave pública (anon) y solo pueden llamar a las funciones rpc_publico_*:
--     nunca leen tablas, tienen límite de uso por conexión y en total, y no devuelven datos personales.

-- ======================================================================= utilidades

create or replace function public._exigir_admin_aal2() returns void
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.es_admin() then raise exception 'Solo el Administrador' using errcode = '42501'; end if;
  perform public._exigir_aal2();
end $$;
revoke all on function public._exigir_admin_aal2() from public, anon, authenticated;

-- Número de caso visible para el titular: los 8 primeros caracteres del identificador (igual que rpc_solicitud_titular).
create or replace function public._numero_caso(p_id uuid) returns text
language sql immutable set search_path = public, pg_temp as $$
  select upper(left(replace(p_id::text, '-', ''), 8))
$$;
revoke all on function public._numero_caso(uuid) from public, anon, authenticated;
create index if not exists ix_titulares_numero_caso on public.solicitudes_titulares (public._numero_caso(id));
create index if not exists ix_titulares_pendientes on public.solicitudes_titulares (plazo_interno)
  where estado in ('recibida', 'en_proceso');

-- ======================================================================= configuración nueva y descripciones (P-42)

insert into public.configuracion (clave, valor, descripcion) values
  ('panel_inactividad_min', '15'::jsonb, 'Panel web: minutos sin uso antes de cerrar la sesión'),
  ('canal_titulares_correo', '""'::jsonb, '16.5: correo para las solicitudes de los titulares. Se muestra en las páginas públicas'),
  ('canal_titulares_whatsapp', '""'::jsonb, '16.5: WhatsApp para las solicitudes de los titulares. Se muestra en las páginas públicas'),
  ('responsable_tratamiento', '"Campaña Pijao Nos Une · candidato Jaime González · Pijao, Quindío"'::jsonb,
   'Responsable del tratamiento que aparece en las páginas públicas (lo confirma el abogado)'),
  ('publico_max_hora', '40'::jsonb, 'Páginas públicas: solicitudes por hora en total antes de pausar el formulario'),
  ('publico_max_ip_hora', '5'::jsonb, 'Páginas públicas: solicitudes por hora desde una misma conexión'),
  ('ultimo_respaldo', 'null'::jsonb, '8.10: lo escribe tools/respaldo.ps1 al terminar cada respaldo (no se edita a mano)'),
  ('calendario_legal', $cal$[
    {"fecha": "2026-10-31", "hito": "Apertura de la inscripción de cédulas y del registro de grupos significativos de ciudadanos", "estado": "confirmada"},
    {"fecha": "2027-06-30", "hito": "Cierre de inscripción de grupos significativos y promotores del voto en blanco; apertura de la inscripción de candidaturas", "estado": "prensa"},
    {"fecha": "2027-07-31", "hito": "Cierre de la inscripción de candidaturas y entrega de firmas; publicación del censo electoral", "estado": "prensa"},
    {"fecha": "2027-08-02", "hito": "Inicio del periodo de modificación de candidaturas", "estado": "prensa"},
    {"fecha": "2027-08-05", "hito": "Inicio de la propaganda electoral en medios de comunicación", "estado": "prensa"},
    {"fecha": "2027-08-31", "hito": "Cierre de la inscripción de cédulas", "estado": "prensa"},
    {"fecha": "2027-10-16", "hito": "Sorteo y publicación de jurados de votación (a más tardar)", "estado": "prensa"},
    {"fecha": null, "hito": "Inicio de la propaganda en espacio público", "estado": "pendiente"},
    {"fecha": null, "hito": "Último día para inscribir testigos electorales", "estado": "pendiente"},
    {"fecha": "2027-10-31", "hito": "Elecciones (8:00 a. m. a 4:00 p. m.)", "estado": "confirmada"},
    {"fecha": "2027-11-02", "hito": "Inicio de los escrutinios generales", "estado": "prensa"},
    {"fecha": "2028-01-01", "hito": "Posesión de las nuevas autoridades", "estado": "confirmada"}
  ]$cal$::jsonb, '2.2 y 14.7: calendario legal (Resolución 12338 de 2026; el abogado confirma cada fecha)')
on conflict (clave) do nothing;

-- Los valores iniciales de 0008 no tenían descripción: el Administrador debe entender qué cambia (19.1).
update public.configuracion c set descripcion = v.d
  from (values
    ('radio_duplicados_m', 'R-08: radio para avisar de otra vivienda cercana (metros)'),
    ('distancia_max_registro_m', 'R-09: distancia máxima entre el teléfono y el punto para «Registrar aquí» (metros)'),
    ('precision_min_m', 'R-10: precisión mínima aceptada del GPS (metros)'),
    ('ubicacion_manual_max_m', 'R-12: distancia máxima de una ubicación manual (metros)'),
    ('ajuste_pin_max_m', 'Cuánto se puede mover a mano el punto de una vivienda (metros)'),
    ('ventana_edicion_h', '5.13: horas en que el autor puede editar su registro'),
    ('fotos_max_visita', 'R-14: fotos por visita'),
    ('foto_lado_max_px', 'Lado mayor de la foto (píxeles)'),
    ('foto_peso_objetivo_kb', 'Peso objetivo de cada foto (KB)'),
    ('invitacion_horas', 'Vigencia de una invitación (horas)'),
    ('sesion_colaborador_dias', 'Duración de la sesión del colaborador (días)'),
    ('sesion_director_dias', 'Duración de la sesión del Director (días)'),
    ('sesion_admin_horas', 'Duración de la sesión del Administrador (horas)'),
    ('inactividad_suspension_dias', 'Días sin uso para la suspensión automática'),
    ('max_dispositivos', 'Teléfonos por colaborador'),
    ('intentos_fallidos', 'Intentos fallidos antes de bloquear'),
    ('bloqueo_min', 'Minutos de bloqueo tras los intentos fallidos'),
    ('grupo_minimo', 'R-29: tamaño mínimo de un grupo en las estadísticas («menos de 5»)'),
    ('verificacion_porcentaje', '6.5: porcentaje semanal de verificación por llamada'),
    ('retencion_ubicacion_dias', 'R-31: días que se guarda la ubicación de la jornada'),
    ('papelera_dias', 'Días en la papelera antes del borrado'),
    ('mensajes_hora_ini', 'Hora de inicio de mensajes a ciudadanos (0 a 23)'),
    ('mensajes_hora_fin', 'Hora de fin de mensajes a ciudadanos (0 a 23)'),
    ('silencio_ini', 'Hora de inicio del silencio de notificaciones (0 a 23)'),
    ('silencio_fin', 'Hora de fin del silencio de notificaciones (0 a 23)'),
    ('alertas_tope', 'Alertas de tope de gastos (porcentajes)'),
    ('curso_minimo', 'Puntaje mínimo del curso de ingreso (%)'),
    ('certificado_meses', 'Vigencia del certificado y del carnet (meses)'),
    ('titulares_plazo_interno_dias', '16.5: plazo interno de respuesta a titulares (días hábiles)'),
    ('ritmo_sospechoso_seg', '6.5: segundos mínimos entre dos registros completos'),
    ('velocidad_max_ms', '6.5: velocidad máxima creíble entre dos registros (metros por segundo)'),
    ('gps_muestreo_seg', 'Segundos que el teléfono toma muestras del GPS'),
    ('jornada_intervalo_seg', 'Segundos entre dos ubicaciones de la jornada'),
    ('centro_lat', 'Latitud del centro de Pijao'),
    ('centro_lng', 'Longitud del centro de Pijao'),
    ('radio_municipio_km', 'Radio del municipio para validar coordenadas (km)')
  ) as v(k, d)
 where c.clave = v.k and c.descripcion is null;

-- Valida un valor de configuración según su clave. Devuelve el mensaje de error o null si es válido.
create or replace function public._config_invalida(p_clave text, p_ant jsonb, p_valor jsonb) returns text
language plpgsql immutable set search_path = public, pg_temp as $$
declare v_num numeric; v_item jsonb; v_txt text;
begin
  if p_valor is null or jsonb_typeof(p_valor) <> jsonb_typeof(p_ant) then
    return format('El valor debe ser del mismo tipo que el actual (%s)', jsonb_typeof(p_ant));
  end if;
  case jsonb_typeof(p_valor)
  when 'number' then
    v_num := (p_valor #>> '{}')::numeric;
    if p_clave = 'centro_lat' then
      if v_num not between -5 and 14 then return 'La latitud debe estar dentro de Colombia'; end if;
    elsif p_clave = 'centro_lng' then
      if v_num not between -82 and -66 then return 'La longitud debe estar dentro de Colombia'; end if;
    elsif v_num < 0 then
      return 'El valor no puede ser negativo';
    elsif p_clave in ('alerta_uso_pct', 'curso_minimo', 'verificacion_porcentaje') and v_num > 100 then
      return 'Es un porcentaje: de 0 a 100';
    elsif p_clave in ('mensajes_hora_ini', 'mensajes_hora_fin', 'silencio_ini', 'silencio_fin') and v_num > 23 then
      return 'Es una hora del día: de 0 a 23';
    elsif p_clave in ('panel_inactividad_min', 'max_dispositivos', 'publico_max_hora', 'publico_max_ip_hora',
                      'grupo_minimo', 'invitacion_horas', 'permiso_alto_max_dias') and v_num < 1 then
      return 'El valor debe ser al menos 1';
    end if;
  when 'string' then
    v_txt := p_valor #>> '{}';
    if length(v_txt) > 300 then return 'Máximo 300 caracteres'; end if;
    if p_clave = 'version_minima_app' and v_txt !~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$' then
      return 'La versión se escribe así: 0.11.0';
    end if;
    if p_clave = 'canal_titulares_correo' and v_txt <> '' and v_txt !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
      return 'El correo no es válido';
    end if;
    if p_clave = 'canal_titulares_whatsapp' and v_txt <> '' and v_txt !~ '^\+?[0-9 ]{7,20}$' then
      return 'Escriba el número con el indicativo, por ejemplo +57 300 000 0000';
    end if;
  when 'array' then
    if jsonb_array_length(p_valor) > 60 then return 'Máximo 60 elementos'; end if;
    if p_clave = 'alertas_tope' then
      for v_item in select value from jsonb_array_elements(p_valor) loop
        if jsonb_typeof(v_item) <> 'number' or (v_item #>> '{}')::numeric not between 1 and 100 then
          return 'Cada alerta es un porcentaje de 1 a 100';
        end if;
      end loop;
    elsif p_clave = 'calendario_legal' then
      for v_item in select value from jsonb_array_elements(p_valor) loop
        if jsonb_typeof(v_item) <> 'object' or coalesce(trim(v_item ->> 'hito'), '') = '' or length(v_item ->> 'hito') > 200 then
          return 'Cada fecha necesita su hito (máximo 200 caracteres)';
        end if;
        if coalesce(v_item ->> 'estado', '') not in ('confirmada', 'prensa', 'pendiente') then
          return 'El estado de cada fecha es: confirmada, prensa o pendiente';
        end if;
        if coalesce(jsonb_typeof(v_item -> 'fecha'), 'null') not in ('null', 'string')
           or (jsonb_typeof(v_item -> 'fecha') = 'string' and (v_item ->> 'fecha') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') then
          return 'Las fechas se escriben AAAA-MM-DD o se dejan vacías';
        end if;
        if jsonb_typeof(v_item -> 'fecha') = 'string' then
          begin
            perform (v_item ->> 'fecha')::date;
          exception when others then
            return 'La fecha ' || (v_item ->> 'fecha') || ' no existe';
          end;
        end if;
      end loop;
    end if;
  else
    null;
  end case;
  return null;
end $$;
revoke all on function public._config_invalida(text, jsonb, jsonb) from public, anon, authenticated;

create or replace function public.rpc_config_guardar(p_clave text, p_valor jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_ant jsonb; v_error text;
begin
  perform public._exigir_admin_aal2();
  if p_clave in ('ultimo_respaldo') then raise exception 'Este valor lo escribe el sistema'; end if;
  select valor into v_ant from public.configuracion where clave = p_clave for update;
  if not found then raise exception 'Valor de configuración desconocido: %', p_clave; end if;
  v_error := public._config_invalida(p_clave, v_ant, p_valor);
  if v_error is not null then raise exception '%', v_error; end if;
  if v_ant = p_valor then return jsonb_build_object('ok', true, 'sin_cambios', true); end if;
  update public.configuracion set valor = p_valor, actualizado_por = auth.uid(), actualizado_en = now() where clave = p_clave;
  perform public.fn_auditar('configuracion', 'configuracion', p_clave, jsonb_build_object('antes', v_ant, 'despues', p_valor));
  return jsonb_build_object('ok', true);
end $$;

-- ======================================================================= catálogos C-01 a C-20 (P-42)

-- Los catálogos que el código y las reglas usan por su clave solo admiten cambios de nombre y de orden.
create or replace function public._catalogo_del_sistema(p_catalogo text) returns boolean
language sql immutable set search_path = public, pg_temp as $$
  select p_catalogo in ('C-01', 'C-02', 'C-09', 'C-10', 'C-11', 'C-18')
$$;
grant execute on function public._catalogo_del_sistema(text) to authenticated;

create or replace function public.rpc_catalogo_guardar(p_catalogo text, p_clave text, p_etiqueta text,
                                                       p_orden int default 0, p_activo boolean default true) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.catalogos;
begin
  perform public._exigir_admin_aal2();
  if coalesce(p_catalogo, '') !~ '^C-[0-9]{2}$' then raise exception 'Catálogo no válido'; end if;
  if coalesce(p_clave, '') !~ '^[a-z0-9_+-]{1,40}$' then
    raise exception 'La clave usa minúsculas, números y guion bajo (máximo 40)';
  end if;
  if coalesce(trim(p_etiqueta), '') = '' or length(p_etiqueta) > 120 then
    raise exception 'Escriba el nombre que verá el equipo (máximo 120 caracteres)';
  end if;
  if p_orden is null or p_orden not between 0 and 999 then raise exception 'El orden va de 0 a 999'; end if;
  select * into v from public.catalogos where catalogo = p_catalogo and clave = p_clave for update;
  if public._catalogo_del_sistema(p_catalogo) then
    if v.id is null then raise exception 'El catálogo % es del sistema: no se le agregan opciones', p_catalogo; end if;
    if not coalesce(p_activo, true) then raise exception 'El catálogo % es del sistema: sus opciones no se desactivan', p_catalogo; end if;
  end if;
  insert into public.catalogos (catalogo, clave, etiqueta, orden, activo)
  values (p_catalogo, p_clave, trim(p_etiqueta), p_orden, coalesce(p_activo, true))
  on conflict (catalogo, clave) do update
    set etiqueta = excluded.etiqueta, orden = excluded.orden, activo = excluded.activo, actualizado_en = now();
  perform public.fn_auditar('catalogo', 'configuracion', p_catalogo || ':' || p_clave,
    jsonb_build_object('antes', case when v.id is null then null else jsonb_build_object('etiqueta', v.etiqueta, 'orden', v.orden, 'activo', v.activo) end,
                       'despues', jsonb_build_object('etiqueta', trim(p_etiqueta), 'orden', p_orden, 'activo', coalesce(p_activo, true))));
  return jsonb_build_object('ok', true, 'nueva', v.id is null);
end $$;

-- ======================================================================= textos legales con versiones (P-42)

-- Publica una versión nueva: la anterior deja de estar vigente y queda guardada (las autorizaciones citan su versión).
create or replace function public.rpc_texto_legal_publicar(p_tipo text, p_version text, p_contenido text,
                                                           p_aprobado_abogado boolean default false) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_id uuid;
begin
  perform public._exigir_admin_aal2();
  if p_tipo is null or p_tipo not in ('autorizacion', 'aviso_privacidad', 'acuerdo_confidencialidad', 'codigo_conducta',
                                      'politica_tratamiento') then
    raise exception 'Tipo de texto no válido';
  end if;
  if coalesce(p_version, '') !~ '^[A-Za-z0-9._-]{1,30}$' then
    raise exception 'La versión usa letras, números, punto o guion (por ejemplo v2 o 2027-02)';
  end if;
  if length(coalesce(trim(p_contenido), '')) < 20 or length(p_contenido) > 60000 then
    raise exception 'El texto debe tener entre 20 y 60.000 caracteres';
  end if;
  -- Un solo cambio de textos a la vez: así nunca quedan dos versiones vigentes del mismo tipo.
  perform pg_advisory_xact_lock(hashtext('pijao_texto_' || p_tipo));
  if exists (select 1 from public.textos_legales where tipo = p_tipo and version = p_version) then
    raise exception 'Ya existe la versión % de ese texto: use un número nuevo', p_version;
  end if;
  update public.textos_legales set vigente = false, actualizado_en = now() where tipo = p_tipo and vigente;
  insert into public.textos_legales (tipo, version, contenido, vigente, es_borrador)
  values (p_tipo, p_version, p_contenido, true, not coalesce(p_aprobado_abogado, false))
  returning id into v_id;
  perform public.fn_auditar('texto_legal', 'configuracion', v_id::text,
    jsonb_build_object('tipo', p_tipo, 'version', p_version, 'aprobado_abogado', coalesce(p_aprobado_abogado, false),
                       'sha256', encode(extensions.digest(p_contenido, 'sha256'), 'hex')));
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- ======================================================================= plantillas de permisos (P-42, 4.6)

create or replace function public.rpc_plantilla_guardar(p_nombre text, p_codigos text[], p_limitar_a_zona boolean default false)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_malo text; v_hay_malo boolean;
begin
  perform public._exigir_admin_aal2();
  if length(coalesce(trim(p_nombre), '')) not between 3 and 80 then raise exception 'El nombre tiene entre 3 y 80 caracteres'; end if;
  select true, c into v_hay_malo, v_malo from unnest(coalesce(p_codigos, '{}')) as c
   where c is null or not exists (select 1 from public.permisos_catalogo where codigo = c) limit 1;
  if v_hay_malo then raise exception 'Permiso desconocido: %', coalesce(v_malo, '(vacío)'); end if;
  insert into public.plantillas_permisos (nombre, codigos, limitar_a_zona)
  values (trim(p_nombre), (select coalesce(array_agg(distinct c order by c), '{}') from unnest(coalesce(p_codigos, '{}')) as c),
          coalesce(p_limitar_a_zona, false))
  on conflict (nombre) do update set codigos = excluded.codigos, limitar_a_zona = excluded.limitar_a_zona;
  perform public.fn_auditar('plantilla', 'configuracion', trim(p_nombre),
                            jsonb_build_object('codigos', p_codigos, 'limitar_a_zona', p_limitar_a_zona));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rpc_plantilla_eliminar(p_nombre text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public._exigir_admin_aal2();
  delete from public.plantillas_permisos where nombre = p_nombre;
  if not found then raise exception 'Plantilla no encontrada'; end if;
  perform public.fn_auditar('plantilla_eliminada', 'configuracion', p_nombre);
  return jsonb_build_object('ok', true);
end $$;

-- ======================================================================= auditoría: exportación técnica (P-41)

-- Solo el Administrador exporta, con motivo, y la exportación misma queda en la auditoría (8.9).
create or replace function public.rpc_auditoria_exportar(p_motivo text, p_desde timestamptz default null,
                                                         p_hasta timestamptz default null, p_usuario uuid default null,
                                                         p_accion text default null, p_entidad_id text default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_filas jsonb; v_n int;
begin
  perform public._exigir_admin_aal2();
  if length(coalesce(trim(p_motivo), '')) < 5 then raise exception 'Escriba el motivo de la exportación'; end if;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.seq), '[]'::jsonb), count(*) into v_filas, v_n
    from (select a.seq, a.id, a.creado_en, a.usuario_id, p.nombre_completo as usuario, a.actor_rol, a.accion, a.entidad,
                 a.entidad_id, a.detalle, a.ip, a.hash_anterior, a.hash
            from public.auditoria a left join public.perfiles p on p.id = a.usuario_id
           where (p_desde is null or a.creado_en >= p_desde)
             and (p_hasta is null or a.creado_en < p_hasta)
             and (p_usuario is null or a.usuario_id = p_usuario)
             and (p_accion is null or a.accion = p_accion)
             and (p_entidad_id is null or a.entidad_id = p_entidad_id)
           order by a.seq desc nulls last
           limit 5000) t;
  insert into public.exportaciones (usuario_id, tipo, motivo, filas) values (auth.uid(), 'auditoria_tecnica', trim(p_motivo), v_n);
  perform public.fn_auditar('exportar', 'seguridad', 'auditoria',
    jsonb_build_object('motivo', trim(p_motivo), 'filas', v_n, 'desde', p_desde, 'hasta', p_hasta, 'usuario', p_usuario,
                       'accion', p_accion, 'entidad_id', p_entidad_id));
  return jsonb_build_object('ok', true, 'filas', v_filas, 'total', v_n, 'limite', 5000);
end $$;

-- ======================================================================= páginas públicas: límite de uso

-- Límite de uso de las páginas públicas. No guarda la dirección IP: solo una huella con sal secreta, por un día.
create table if not exists public.intentos_publicos (
  id bigint generated always as identity primary key,
  huella text not null,
  accion text not null,
  creado_en timestamptz not null default now()
);
alter table public.intentos_publicos enable row level security;   -- sin políticas: nadie la lee desde fuera
create index if not exists ix_intentos_publicos on public.intentos_publicos (accion, huella, creado_en desc);
create index if not exists ix_intentos_publicos_fecha on public.intentos_publicos (creado_en);

insert into public.instalacion (clave, valor)
values ('sal_publica', to_jsonb(encode(extensions.gen_random_bytes(24), 'hex')))
on conflict (clave) do nothing;

create or replace function public._huella_conexion() returns text
language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare v_ip text; v_sal text;
begin
  -- Primero las cabeceras que pone la red de Supabase (Cloudflare) y que el cliente no puede falsificar;
  -- x-forwarded-for queda de último recurso porque su primer valor lo puede escribir quien llama.
  begin
    v_ip := coalesce(
      nullif(trim((current_setting('request.headers', true)::jsonb) ->> 'cf-connecting-ip'), ''),
      nullif(trim((current_setting('request.headers', true)::jsonb) ->> 'x-real-ip'), ''),
      trim(split_part((current_setting('request.headers', true)::jsonb) ->> 'x-forwarded-for', ',', 1)));
  exception when others then
    v_ip := null;
  end;
  select valor #>> '{}' into v_sal from public.instalacion where clave = 'sal_publica';
  return encode(extensions.hmac(coalesce(nullif(v_ip, ''), 'sin-ip'), coalesce(v_sal, 'pijao'), 'sha256'), 'hex');
end $$;
revoke all on function public._huella_conexion() from public, anon, authenticated;

-- p_max_total null = sin tope global (las consultas de solo lectura no deben poder bloquear a todos).
create or replace function public._limite_publico(p_accion text, p_max_conexion int, p_max_total int default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_huella text := public._huella_conexion();
begin
  -- Un candado por acción evita que muchas peticiones simultáneas se salten el conteo.
  perform pg_advisory_xact_lock(hashtext('pijao_publico_' || p_accion));
  if (select count(*) from public.intentos_publicos
       where accion = p_accion and huella = v_huella and creado_en > now() - interval '1 hour') >= p_max_conexion then
    raise exception 'Demasiadas solicitudes desde esta conexión. Intente de nuevo en una hora.' using errcode = 'P0001';
  end if;
  if p_max_total is not null and (select count(*) from public.intentos_publicos
       where accion = p_accion and creado_en > now() - interval '1 hour') >= p_max_total then
    raise exception 'El formulario recibe muchas solicitudes en este momento. Intente más tarde o escríbanos por correo o WhatsApp.'
      using errcode = 'P0001';
  end if;
  insert into public.intentos_publicos (huella, accion) values (v_huella, p_accion);
  delete from public.intentos_publicos where creado_en < now() - interval '1 day';
end $$;
revoke all on function public._limite_publico(text, int, int) from public, anon, authenticated;

-- ======================================================================= salud del sistema (P-43, 9.6 y N-12)

create or replace function public.rpc_salud_sistema() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public._exigir_admin_aal2();
  return jsonb_build_object(
    'generado_en', now(),
    'usuarios', jsonb_build_object(
      'activos', (select count(*) from public.perfiles where estado = 'activo'),
      'pendientes', (select count(*) from public.perfiles where estado = 'pendiente'),
      'aprobados_sin_ingreso', (select count(*) from public.perfiles where estado = 'aprobado'),
      'suspendidos', (select count(*) from public.perfiles where estado = 'suspendido'),
      'usaron_app_7_dias', (select count(distinct usuario_id) from public.dispositivos where ultimo_acceso > now() - interval '7 days')),
    'errores', jsonb_build_object(
      'ultimo_dia', (select count(*) from public.errores_app where creado_en > now() - interval '1 day'),
      'ultima_semana', (select count(*) from public.errores_app where creado_en > now() - interval '7 days'),
      'recientes', coalesce((select jsonb_agg(e order by e.creado_en desc) from (
          select creado_en, version_app, pantalla, mensaje from public.errores_app order by creado_en desc limit 10) e), '[]'::jsonb)),
    'sincronizacion', jsonb_build_object(
      'registros_por_enviar', (select coalesce(sum(cola_pendiente), 0) from public.dispositivos where activo),
      'telefonos_atrasados', (select count(*) from public.dispositivos where activo and coalesce(cola_pendiente, 0) > 0
                                and (ultima_sincronizacion is null or ultima_sincronizacion < now() - interval '24 hours'))),
    'recursos', public.rpc_uso_recursos(),
    'seguridad', jsonb_build_object(
      'registros_fallidos_24h', (select count(*) from public.intentos_registro where not exito and creado_en > now() - interval '1 day'),
      'formularios_publicos_24h', (select count(*) from public.intentos_publicos where creado_en > now() - interval '1 day'),
      'alertas_abiertas', coalesce((select jsonb_object_agg(tipo, n) from (
          select tipo, count(*) as n from public.alertas_calidad where resuelta_en is null group by tipo) a), '{}'::jsonb),
      'exportaciones_7_dias', (select count(*) from public.exportaciones where creado_en > now() - interval '7 days'),
      'accesos_completos_24h', (select count(*) from public.auditoria where accion = 'ver_datos_completos'
                                  and creado_en > now() - interval '1 day')),
    'respaldo', (select valor from public.configuracion where clave = 'ultimo_respaldo'),
    'versiones', coalesce((select jsonb_agg(v order by v.telefonos desc) from (
        select coalesce(version_app, '(desconocida)') as version, count(*) as telefonos
          from public.dispositivos where activo group by 1) v), '[]'::jsonb),
    'version_minima', (select valor #>> '{}' from public.configuracion where clave = 'version_minima_app'),
    'titulares', jsonb_build_object(
      'pendientes', (select count(*) from public.solicitudes_titulares where estado in ('recibida', 'en_proceso')),
      'vencidas_plazo_interno', (select count(*) from public.solicitudes_titulares
                                  where estado in ('recibida', 'en_proceso') and plazo_interno < current_date),
      'vencidas_plazo_legal', (select count(*) from public.solicitudes_titulares
                                where estado in ('recibida', 'en_proceso') and plazo_legal < current_date)),
    'perdidos', coalesce((select jsonb_agg(d order by d.reportado_perdido_en desc) from (
        select x.id, p.nombre_completo as usuario, x.modelo, x.reportado_perdido_en, x.ultimo_acceso,
               x.ultimo_acceso > x.reportado_perdido_en as se_conecto_despues
          from public.dispositivos x join public.perfiles p on p.id = x.usuario_id
         where x.reportado_perdido_en > now() - interval '90 days') d), '[]'::jsonb),
    'flota', coalesce((select jsonb_agg(d order by d.ultimo_acceso desc) from (
        select x.id, p.nombre_completo as usuario, x.modelo, x.version_app, x.ultimo_acceso, x.cola_pendiente,
               x.ultima_sincronizacion, x.espacio_libre_mb, x.bateria_pct
          from public.dispositivos x join public.perfiles p on p.id = x.usuario_id
         where x.activo order by x.ultimo_acceso desc limit 300) d), '[]'::jsonb),
    'auditoria_24h', (select count(*) from public.auditoria where creado_en > now() - interval '1 day'));
end $$;

-- tools/respaldo.ps1 anota el último respaldo con la clave service_role (que nunca sale del computador del Administrador).
create or replace function public.rpc_respaldo_registrado(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.configuracion
     set valor = jsonb_build_object('en', now(), 'mb', nullif(p ->> 'mb', '')::numeric,
                                    'archivos', nullif(p ->> 'archivos', '')::int, 'equipo', left(p ->> 'equipo', 60)),
         actualizado_en = now()
   where clave = 'ultimo_respaldo';
  perform public.fn_auditar('respaldo', 'seguridad', null, jsonb_build_object('mb', p ->> 'mb', 'archivos', p ->> 'archivos'));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.rpc_respaldo_registrado(jsonb) from public, anon, authenticated;
grant execute on function public.rpc_respaldo_registrado(jsonb) to service_role;

-- ======================================================================= páginas públicas (P-50, P-52, P-53)

-- P-52: al escanear el QR del carnet, cualquiera comprueba si la persona pertenece al equipo y si el carnet está vigente.
-- Solo devuelve el nombre si el carnet está vigente (no revela quién fue dado de baja).
create or replace function public.rpc_publico_carnet(p_id text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.perfiles; v_uuid uuid; v_vence timestamptz;
begin
  perform public._limite_publico('carnet', 60);
  begin
    v_uuid := p_id::uuid;
  exception when others then
    return jsonb_build_object('vigente', false, 'consultado_en', now());
  end;
  select * into v from public.perfiles where id = v_uuid;
  if not found or v.estado <> 'activo' or v.curso_aprobado_en is null then
    return jsonb_build_object('vigente', false, 'consultado_en', now());
  end if;
  v_vence := v.curso_aprobado_en + make_interval(months => public.cfg_num('certificado_meses', 6)::int);
  if v_vence < now() then
    return jsonb_build_object('vigente', false, 'consultado_en', now());
  end if;
  return jsonb_build_object('vigente', true, 'nombre', v.nombre_completo,
    'rol', case v.rol when 'director' then 'Director de campaña' when 'admin' then 'Administrador del sistema'
                      else 'Colaborador del equipo' end,
    'vence', v_vence::date, 'consultado_en', now());
end $$;

-- P-50: formulario «Mis datos». Crea un caso con número; la campaña verifica la identidad al responder.
-- No pide cédula (no se reciben datos que no hagan falta, 16.6). El campo «sitio_web» es una trampa para robots.
create or replace function public.rpc_publico_solicitud(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_tipo text := p ->> 'tipo';
  v_nombre text := trim(coalesce(p ->> 'nombre', ''));
  v_contacto text := trim(coalesce(p ->> 'contacto', ''));
  v_lugar text := trim(coalesce(p ->> 'lugar', ''));
  v_detalle text := trim(coalesce(p ->> 'detalle', ''));
  v_id uuid := gen_random_uuid();
  v_dias int;
  v_interno date; v_legal date;
begin
  -- El límite va primero: ni la trampa para robots ni los errores de validación se saltan el cupo.
  perform public._limite_publico('solicitud', public.cfg_num('publico_max_ip_hora', 5)::int,
                                 public.cfg_num('publico_max_hora', 40)::int);
  if coalesce(p ->> 'sitio_web', '') <> '' then
    -- Un robot llenó el campo oculto: se responde igual que siempre, pero no se guarda nada.
    return jsonb_build_object('ok', true, 'numero_caso', public._numero_caso(v_id));
  end if;
  if v_tipo is null or v_tipo not in ('consulta', 'actualizacion', 'supresion', 'revocatoria', 'queja', 'prueba_autorizacion') then
    raise exception 'Elija qué quiere hacer con sus datos';
  end if;
  if length(v_nombre) not between 3 and 120 then raise exception 'Escriba su nombre completo'; end if;
  if length(v_contacto) not between 7 and 120 then
    raise exception 'Escriba un teléfono o un correo para responderle';
  end if;
  if length(v_lugar) > 120 or length(v_detalle) > 2000 then raise exception 'El texto es demasiado largo'; end if;
  if (p ->> 'acepta') is distinct from 'true' then
    raise exception 'Debe aceptar que usemos estos datos solo para atender su solicitud';
  end if;
  v_dias := case when v_tipo in ('consulta', 'prueba_autorizacion') then 10 else 15 end;
  v_interno := public.sumar_dias_habiles(current_date, public.cfg_num('titulares_plazo_interno_dias', 5)::int);
  v_legal := public.sumar_dias_habiles(current_date, v_dias);
  insert into public.solicitudes_titulares (id, persona_id, nombre_solicitante, contacto, tipo, detalle, canal,
                                            registrado_por, plazo_interno, plazo_legal)
  values (v_id, null, v_nombre, v_contacto, v_tipo,
          nullif(concat_ws(E'\n', case when v_lugar <> '' then 'Barrio o vereda: ' || v_lugar end, nullif(v_detalle, '')), ''),
          'formulario', null, v_interno, v_legal);
  perform public.fn_auditar('solicitud_titular_publica', 'solicitud', v_id::text, jsonb_build_object('tipo', v_tipo));
  return jsonb_build_object('ok', true, 'numero_caso', public._numero_caso(v_id), 'plazo_legal', v_legal);
end $$;

-- P-50: consultar el estado de un caso con el número y el mismo contacto que se dio. No devuelve la respuesta
-- (puede tener datos personales): esa se envía al contacto del titular.
create or replace function public.rpc_publico_estado_caso(p_numero text, p_contacto text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.solicitudes_titulares;
begin
  perform public._limite_publico('estado_caso', 10, 300);
  if coalesce(trim(p_numero), '') !~ '^[0-9A-Fa-f]{8}$' or length(coalesce(trim(p_contacto), '')) < 7 then
    return jsonb_build_object('encontrado', false);
  end if;
  -- Máximo 5 consultas por hora sobre un mismo número de caso, vengan de donde vengan (adivinar el contacto).
  perform public._limite_publico('caso:' || upper(trim(p_numero)), 1000, 5);
  select * into v from public.solicitudes_titulares
   where public._numero_caso(id) = upper(trim(p_numero))
     and lower(regexp_replace(coalesce(contacto, ''), '\s', '', 'g')) = lower(regexp_replace(p_contacto, '\s', '', 'g'))
   limit 1;
  if not found then return jsonb_build_object('encontrado', false); end if;
  return jsonb_build_object('encontrado', true, 'tipo', v.tipo, 'estado', v.estado, 'recibido_en', v.recibido_en::date,
                            'plazo_legal', v.plazo_legal, 'resuelta_en', v.resuelta_en::date);
end $$;

-- P-53: textos vigentes de la política y del aviso de privacidad, con los canales de atención.
create or replace function public.rpc_publico_textos() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'aviso', (select jsonb_build_object('version', version, 'contenido', contenido, 'borrador', es_borrador,
                                        'actualizado', actualizado_en::date)
                from public.textos_legales where tipo = 'aviso_privacidad' and vigente order by creado_en desc limit 1),
    'politica', (select jsonb_build_object('version', version, 'contenido', contenido, 'borrador', es_borrador,
                                           'actualizado', actualizado_en::date)
                   from public.textos_legales where tipo = 'politica_tratamiento' and vigente order by creado_en desc limit 1),
    'responsable', (select valor #>> '{}' from public.configuracion where clave = 'responsable_tratamiento'),
    'correo', (select valor #>> '{}' from public.configuracion where clave = 'canal_titulares_correo'),
    'whatsapp', (select valor #>> '{}' from public.configuracion where clave = 'canal_titulares_whatsapp'))
$$;

-- ======================================================================= permisos de ejecución

grant execute on function public.rpc_config_guardar(text, jsonb) to authenticated;
grant execute on function public.rpc_catalogo_guardar(text, text, text, int, boolean) to authenticated;
grant execute on function public.rpc_texto_legal_publicar(text, text, text, boolean) to authenticated;
grant execute on function public.rpc_plantilla_guardar(text, text[], boolean) to authenticated;
grant execute on function public.rpc_plantilla_eliminar(text) to authenticated;
grant execute on function public.rpc_auditoria_exportar(text, timestamptz, timestamptz, uuid, text, text) to authenticated;
grant execute on function public.rpc_salud_sistema() to authenticated;

grant usage on schema public to anon;
grant execute on function public.rpc_publico_carnet(text) to anon, authenticated;
grant execute on function public.rpc_publico_solicitud(jsonb) to anon, authenticated;
grant execute on function public.rpc_publico_estado_caso(text, text) to anon, authenticated;
grant execute on function public.rpc_publico_textos() to anon, authenticated;
