-- Pijao Nos Une · 0006 · funciones del núcleo (las reglas de negocio viven aquí, no solo en la app)
--
-- ANTES de usar la app hay que guardar la llave de cifrado de datos personales, UNA vez:
--   select vault.create_secret('<texto-largo-aleatorio>', 'pii_key');
-- (alternativa: alter database postgres set app.pii_key = '<texto-largo-aleatorio>';)
-- Guarde esa llave fuera de línea: sin ella no se pueden descifrar cédulas, teléfonos ni correos.

-- ---------------------------------------------------------------- auxiliares internos

create or replace function public._pii_key() returns text
language plpgsql security definer set search_path = public as $$
declare k text;
begin
  begin
    select decrypted_secret into k from vault.decrypted_secrets where name = 'pii_key' limit 1;
  exception when others then
    k := null;
  end;
  if k is null or k = '' then
    k := current_setting('app.pii_key', true);
  end if;
  if k is null or k = '' then
    raise exception 'Falta configurar la llave de cifrado (pii_key). Vea supabase/README.md';
  end if;
  return k;
end $$;

create or replace function public._enc(t text) returns bytea
language plpgsql security definer set search_path = public, extensions as $$
begin
  if t is null or t = '' then return null; end if;
  return extensions.pgp_sym_encrypt(t, public._pii_key());
end $$;

create or replace function public._dec(b bytea) returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  if b is null then return null; end if;
  return extensions.pgp_sym_decrypt(b, public._pii_key());
end $$;

create or replace function public._hash(t text) returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  if t is null or t = '' then return null; end if;
  return encode(extensions.hmac(t, public._pii_key(), 'sha256'), 'hex');
end $$;

revoke all on function public._pii_key() from public, anon, authenticated;
revoke all on function public._enc(text) from public, anon, authenticated;
revoke all on function public._dec(bytea) from public, anon, authenticated;
revoke all on function public._hash(text) from public, anon, authenticated;

create or replace function public.fn_auditar(p_accion text, p_entidad text, p_id text default null,
                                             p_detalle jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_ip text;
begin
  begin
    v_ip := (current_setting('request.headers', true)::jsonb) ->> 'x-forwarded-for';
  exception when others then
    v_ip := null;
  end;
  insert into public.auditoria (usuario_id, accion, entidad, entidad_id, detalle, ip)
  values (auth.uid(), p_accion, p_entidad, p_id, coalesce(p_detalle, '{}'::jsonb), v_ip);
end $$;
revoke all on function public.fn_auditar(text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.dist_m(lat1 double precision, lng1 double precision,
                                         lat2 double precision, lng2 double precision) returns double precision
language sql immutable as $$
  select 2 * 6371008.8 * asin(least(1.0, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2))))
$$;

create or replace function public.estado_por_resultado(p text) returns text
language sql immutable as $$
  select case p
    when 'conversacion_completa' then 'visitada_conversacion'
    when 'conversacion_breve' then 'visitada_conversacion'
    when 'dejo_informacion' then 'visitada_sin_contacto'
    when 'nadie_en_casa' then 'visitada_sin_contacto'
    when 'pidio_volver' then 'requiere_seguimiento'
    when 'rechazo' then 'visitada_sin_contacto'
    when 'pidio_no_ser_visitado' then 'no_contactar'
    when 'casa_cerrada_deshabitada' then 'deshabitada'
    when 'direccion_erronea' then 'direccion_inexistente'
    else 'visitada_sin_contacto' end
$$;

create or replace function public.sumar_dias_habiles(p_desde date, p_dias int) returns date
language plpgsql immutable as $$
declare d date := p_desde; n int := p_dias;
begin
  while n > 0 loop
    d := d + 1;
    if extract(isodow from d) < 6 then n := n - 1; end if;
  end loop;
  return d;
end $$;

-- ---------------------------------------------------------------- perfil e ingreso

create or replace function public.rpc_mi_perfil() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.perfiles;
begin
  select * into v from public.perfiles where id = auth.uid();
  if not found then
    return jsonb_build_object('existe', false);
  end if;
  update public.perfiles set ultimo_acceso = now() where id = v.id;
  return jsonb_build_object(
    'existe', true,
    'id', v.id,
    'nombre', v.nombre_completo,
    'rol', v.rol,
    'estado', v.estado,
    'curso_aprobado', v.curso_aprobado_en is not null,
    'acuerdos_ok', v.acuerdos_aceptados_en is not null,
    'aal', coalesce(auth.jwt() ->> 'aal', 'aal1'),
    'permisos', coalesce((
      select jsonb_agg(jsonb_build_object('codigo', po.codigo, 'zonas', po.zonas, 'vence_en', po.vence_en))
      from public.permisos_opcionales po
      where po.usuario_id = v.id and po.activo and (po.vence_en is null or po.vence_en > now())), '[]'::jsonb),
    'zonas', coalesce((
      select jsonb_agg(a.zona_id) from public.asignaciones_zona a where a.usuario_id = v.id and a.activo), '[]'::jsonb));
end $$;

create or replace function public.rpc_completar_ingreso(p_puntaje int, p_acuerdos_version text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.perfiles;
begin
  select * into v from public.perfiles where id = auth.uid();
  if not found then raise exception 'Perfil no encontrado'; end if;
  if v.estado not in ('aprobado', 'activo') then
    raise exception 'La cuenta todavía no está aprobada por el Director';
  end if;
  if p_puntaje < public.cfg_num('curso_minimo', 80) then
    raise exception 'Puntaje insuficiente: el mínimo es %', public.cfg_num('curso_minimo', 80);
  end if;
  update public.perfiles
     set curso_aprobado_en = now(), curso_puntaje = p_puntaje, acuerdos_aceptados_en = now(),
         acuerdos_version = p_acuerdos_version, estado = 'activo'
   where id = v.id;
  perform public.fn_auditar('completar_ingreso', 'perfil', v.id::text, jsonb_build_object('puntaje', p_puntaje));
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- registrar una visita (secciones 5, 6 y 7)

create or replace function public.rpc_registrar_visita(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_viv jsonb := p -> 'vivienda';
  v_vis jsonb := p -> 'visita';
  v_hog jsonb := p -> 'hogar';
  v_dev jsonb := coalesce(p -> 'dispositivo', '{}'::jsonb);
  v_vid uuid;
  v_visita_id uuid;
  v_hogar_id uuid;
  v_resultado text;
  v_manual boolean;
  v_solo boolean;
  v_existe boolean;
  v_estado_prev text;
  v_lat double precision;
  v_lng double precision;
  v_prec double precision;
  v_dlat double precision;
  v_dlng double precision;
  v_dist double precision;
  v_diferido boolean := false;
  v_calidad text := 'verde';
  v_motivos text[] := '{}';
  v_avisos text[] := '{}';
  v_dups jsonb := '[]'::jsonb;
  v_per jsonb;
  v_con jsonb;
  v_nec jsonb;
  v_foto jsonb;
  v_pid uuid;
  v_ced text;
  v_tel text;
  v_correo text;
  v_otro uuid;
  v_nac date;
  v_consent boolean;
  v_consent_simp boolean;
  v_n_fachada int;
  v_fecha timestamptz;
  v_prev record;
  v_dt double precision;
  v_dd double precision;
begin
  if public.mi_rol() is null then
    raise exception 'Cuenta no activa' using errcode = '42501';
  end if;
  v_vid := (v_viv ->> 'id')::uuid;
  v_visita_id := (v_vis ->> 'id')::uuid;
  if v_vid is null or v_visita_id is null then
    raise exception 'Faltan los identificadores de la vivienda o de la visita';
  end if;
  v_resultado := v_vis ->> 'resultado';
  v_manual := coalesce((v_vis ->> 'ubicacion_manual')::boolean, false);
  v_solo := coalesce((v_viv ->> 'solo_visita')::boolean, false);
  v_fecha := coalesce(nullif(v_vis ->> 'fecha', '')::timestamptz, now());
  v_dlat := nullif(v_dev ->> 'lat', '')::double precision;
  v_dlng := nullif(v_dev ->> 'lng', '')::double precision;

  -- Idempotencia: reenviar el mismo registro no lo duplica.
  if exists (select 1 from public.visitas where id = v_visita_id) then
    return jsonb_build_object('ok', true, 'duplicado', true);
  end if;

  select exists (select 1 from public.viviendas where id = v_vid) into v_existe;
  if v_solo and not v_existe then
    raise exception 'La vivienda % no existe', v_vid;
  end if;
  if v_existe then
    select lat, lng, precision_m, estado into v_lat, v_lng, v_prec, v_estado_prev
      from public.viviendas where id = v_vid;
    if v_estado_prev = 'no_contactar' and not public.es_staff() then
      raise exception 'R-21: la vivienda está marcada como No contactar';
    end if;
  else
    v_lat := (v_viv ->> 'lat')::double precision;
    v_lng := (v_viv ->> 'lng')::double precision;
    v_prec := nullif(v_viv ->> 'precision_m', '')::double precision;
  end if;
  if v_lat is null or v_lng is null then
    raise exception 'Falta la ubicación de la vivienda';
  end if;
  if v_lat not between -5 and 14 or v_lng not between -82 and -66 then
    raise exception 'Coordenadas fuera de Colombia (¿latitud y longitud invertidas?)';
  end if;

  -- R-09 / R-12: distancia entre el teléfono y el punto.
  if v_dlat is not null and v_dlng is not null then
    v_dist := public.dist_m(v_dlat, v_dlng, v_lat, v_lng);
    if not v_manual and not v_existe and v_dist > public.cfg_num('distancia_max_registro_m', 50) then
      raise exception 'R-09: el teléfono está a % m de la vivienda (máximo %)',
        round(v_dist), public.cfg_num('distancia_max_registro_m', 50);
    end if;
    if v_manual and v_dist > public.cfg_num('ubicacion_manual_max_m', 100) then
      v_diferido := true;
      v_avisos := v_avisos || 'Registro diferido: queda pendiente de aprobación'::text;
    end if;
  elsif not v_existe then
    v_calidad := 'rojo';
    v_motivos := v_motivos || 'Sin ubicación del dispositivo'::text;
  end if;

  -- R-10: precisión del GPS.
  if not v_existe and coalesce(v_viv ->> 'fuente_ubicacion', 'gps') = 'gps'
     and (v_prec is null or v_prec > public.cfg_num('precision_min_m', 20)) then
    v_calidad := 'rojo';
    v_motivos := v_motivos || 'Precisión del GPS débil'::text;
  end if;

  -- R-13: foto de fachada.
  select count(*) into v_n_fachada
    from jsonb_array_elements(coalesce(p -> 'fotos', '[]'::jsonb)) as t(c) where c ->> 'tipo' = 'fachada';
  if not v_existe and v_n_fachada = 0
     and not coalesce((v_vis ->> 'no_autorizo_foto')::boolean, false)
     and not coalesce((v_viv ->> 'es_reconocimiento')::boolean, false) then
    v_calidad := 'rojo';
    v_motivos := v_motivos || 'Falta la foto de fachada'::text;
  end if;

  -- Autorización verbal cuando hubo conversación.
  if v_resultado in ('conversacion_completa', 'conversacion_breve', 'pidio_volver')
     and not coalesce((v_vis ->> 'autorizacion_verbal')::boolean, false) then
    v_calidad := 'rojo';
    v_motivos := v_motivos || 'Falta la autorización verbal'::text;
  end if;

  if v_hog is not null and jsonb_typeof(v_hog) = 'object' and v_calidad = 'verde'
     and nullif(v_hog ->> 'sosten_relacion', '') is null and nullif(v_hog ->> 'sosten_persona_id', '') is null then
    v_calidad := 'amarillo';
    v_motivos := v_motivos || 'Falta el principal sostén del hogar'::text;
  end if;
  if v_manual and nullif(v_vis ->> 'motivo_manual', '') is null and v_calidad = 'verde' then
    v_calidad := 'amarillo';
    v_motivos := v_motivos || 'Falta el motivo de la ubicación manual'::text;
  end if;

  -- Vivienda: se crea, o se actualiza su estado si ya existía.
  if not v_existe then
    insert into public.viviendas
    select * from jsonb_populate_record(null::public.viviendas,
      (v_viv - 'solo_visita') || jsonb_build_object(
        'estado', public.estado_por_resultado(v_resultado),
        'fuente_ubicacion', coalesce(nullif(v_viv ->> 'fuente_ubicacion', ''), case when v_manual then 'manual' else 'gps' end),
        'es_reconocimiento', coalesce((v_viv ->> 'es_reconocimiento')::boolean, false),
        'requiere_aprobacion', v_diferido,
        'calidad', v_calidad,
        'creado_por', v_uid, 'creado_en', now(), 'actualizado_en', now()));
    -- R-08: posible duplicado (otra vivienda a menos de 15 m). Se avisa, no se bloquea.
    for v_prev in
      select id from public.viviendas
       where id <> v_vid and eliminado_en is null
         and lat between v_lat - 0.0005 and v_lat + 0.0005 and lng between v_lng - 0.0005 and v_lng + 0.0005
         and public.dist_m(lat, lng, v_lat, v_lng) <= public.cfg_num('radio_duplicados_m', 15)
    loop
      insert into public.alertas_calidad (tipo, severidad, usuario_id, vivienda_id, detalle)
      values ('posible_duplicado', 'baja', v_uid, v_vid, jsonb_build_object('otra_vivienda', v_prev.id));
      v_avisos := v_avisos || 'Hay otra vivienda registrada a menos de 15 m'::text;
      exit;
    end loop;
  else
    update public.viviendas set estado = public.estado_por_resultado(v_resultado), calidad = v_calidad where id = v_vid;
  end if;

  -- Fuera del municipio.
  if public.dist_m(v_lat, v_lng, public.cfg_num('centro_lat', 4.3333), public.cfg_num('centro_lng', -75.7))
       > public.cfg_num('radio_municipio_km', 30) * 1000 then
    insert into public.alertas_calidad (tipo, severidad, usuario_id, vivienda_id, detalle)
    values ('fuera_del_municipio', 'media', v_uid, v_vid, jsonb_build_object('lat', v_lat, 'lng', v_lng));
    v_avisos := v_avisos || 'El punto parece estar fuera del municipio'::text;
  end if;

  -- Hogar.
  if v_hog is not null and jsonb_typeof(v_hog) = 'object' then
    v_hogar_id := (v_hog ->> 'id')::uuid;
    if (select coalesce(sum(value::int), 0) from jsonb_each_text(coalesce(v_hog -> 'edades', '{}'::jsonb)))
         <> (v_hog ->> 'total_personas')::int then
      raise exception 'Los rangos de edad no suman el total de personas del hogar';
    end if;
    insert into public.hogares
    select * from jsonb_populate_record(null::public.hogares,
      v_hog || jsonb_build_object(
        'vivienda_id', v_vid,
        'edades', coalesce(v_hog -> 'edades', '{}'::jsonb),
        'jefatura_femenina', (v_hog ->> 'sosten_sexo') = 'mujer',
        'creado_por', v_uid, 'creado_en', now(), 'actualizado_en', now()))
    on conflict (id) do nothing;
  end if;

  -- Personas (R-15, R-16, R-17, R-19).
  for v_per in select c from jsonb_array_elements(coalesce(p -> 'personas', '[]'::jsonb)) as t(c) loop
    v_pid := (v_per ->> 'id')::uuid;

    select exists (
      select 1 from jsonb_array_elements(coalesce(p -> 'consentimientos', '[]'::jsonb)) as t(c)
       where c ->> 'proposito' = 'datos_personales'
         and coalesce(c ->> 'estado', 'vigente') = 'vigente'
         and (c ->> 'persona_id' is null or c ->> 'persona_id' = v_per ->> 'id')) into v_consent;
    if not v_consent then
      raise exception 'R-15: falta la autorización de datos personales de %', coalesce(v_per ->> 'primer_nombre', 'una persona');
    end if;

    v_nac := nullif(v_per ->> 'fecha_nacimiento', '')::date;
    if v_nac is not null then
      if date_part('year', age(current_date, v_nac)) < 18 then
        raise exception 'R-16: solo se registran personas mayores de 18 años';
      end if;
    elsif not coalesce((v_per ->> 'mayor_edad_confirmada')::boolean, false) then
      raise exception 'R-16: confirme que la persona es mayor de 18 años';
    end if;

    v_ced := nullif(regexp_replace(coalesce(v_per ->> 'cedula', ''), '\D', '', 'g'), '');
    if v_ced is not null and v_ced !~ '^\d{6,10}$' then
      raise exception 'R-17: la cédula debe tener entre 6 y 10 dígitos';
    end if;
    v_otro := null;
    if v_ced is not null then
      select id into v_otro from public.personas
       where cedula_hash = public._hash(v_ced) and eliminado_en is null and id <> v_pid limit 1;
    end if;
    if v_otro is not null then
      v_dups := v_dups || jsonb_build_object('id_cliente', v_pid, 'id_existente', v_otro);
      continue;
    end if;

    insert into public.personas
    select * from jsonb_populate_record(null::public.personas,
      v_per || jsonb_build_object(
        'hogar_id', v_hogar_id, 'vivienda_id', v_vid, 'estado', 'activa',
        'tipo_documento', coalesce(nullif(v_per ->> 'tipo_documento', ''), 'CC'),
        'mayor_edad_confirmada', coalesce((v_per ->> 'mayor_edad_confirmada')::boolean, v_nac is not null),
        'creado_por', v_uid, 'creado_en', now(), 'actualizado_en', now()))
    on conflict (id) do nothing;

    v_tel := nullif(regexp_replace(coalesce(v_per ->> 'telefono', ''), '\D', '', 'g'), '');
    v_correo := nullif(v_per ->> 'correo', '');
    select exists (
      select 1 from jsonb_array_elements(coalesce(p -> 'consentimientos', '[]'::jsonb)) as t(c)
       where c ->> 'proposito' = 'dato_sensible_simpatia'
         and coalesce(c ->> 'estado', 'vigente') = 'vigente'
         and c ->> 'persona_id' = v_per ->> 'id') into v_consent_simp;
    if nullif(v_per ->> 'simpatia', '') is not null and not v_consent_simp then
      v_avisos := v_avisos || 'R-19: la simpatía no se guardó porque falta la autorización específica'::text;
    end if;

    update public.personas set
      cedula_enc = public._enc(v_ced),
      cedula_hash = public._hash(v_ced),
      cedula_ult3 = case when v_ced is not null then right(v_ced, 3) end,
      telefono_enc = public._enc(v_tel),
      telefono_ult4 = case when v_tel is not null then right(v_tel, 4) end,
      telefono2_enc = public._enc(nullif(regexp_replace(coalesce(v_per ->> 'telefono2', ''), '\D', '', 'g'), '')),
      correo_enc = public._enc(v_correo),
      correo_parcial = case when v_correo is not null and position('@' in v_correo) > 1 then
        left(split_part(v_correo, '@', 1), 1) || '•••@' || left(split_part(v_correo, '@', 2), 1) || '•••.' ||
        regexp_replace(split_part(v_correo, '@', 2), '^.*\.', '') end,
      simpatia_enc = case when v_consent_simp then public._enc(nullif(v_per ->> 'simpatia', '')) end
    where id = v_pid and creado_por = v_uid;
  end loop;

  -- Consentimientos (se omiten los de personas que no se guardaron por estar duplicadas).
  for v_con in select c from jsonb_array_elements(coalesce(p -> 'consentimientos', '[]'::jsonb)) as t(c) loop
    if nullif(v_con ->> 'persona_id', '') is not null
       and not exists (select 1 from public.personas where id = (v_con ->> 'persona_id')::uuid) then
      continue;
    end if;
    insert into public.consentimientos
    select * from jsonb_populate_record(null::public.consentimientos,
      v_con || jsonb_build_object(
        'vivienda_id', v_vid, 'hogar_id', v_hogar_id, 'recogido_por', v_uid,
        'estado', coalesce(v_con ->> 'estado', 'vigente'),
        'evidencia', coalesce(v_con -> 'evidencia', '{}'::jsonb),
        'creado_en', now(), 'actualizado_en', now()))
    on conflict (id) do nothing;
  end loop;

  -- Necesidades.
  for v_nec in select c from jsonb_array_elements(coalesce(p -> 'necesidades', '[]'::jsonb)) as t(c) loop
    insert into public.necesidades
    select * from jsonb_populate_record(null::public.necesidades,
      v_nec || jsonb_build_object(
        'hogar_id', v_hogar_id, 'vivienda_id', v_vid,
        'zona_id', (select zona_id from public.viviendas where id = v_vid),
        'estado', 'recibida',
        'alcance', coalesce(v_nec ->> 'alcance', 'hogar'),
        'origen', coalesce(v_nec ->> 'origen', 'visita'),
        'desea_respuesta', coalesce((v_nec ->> 'desea_respuesta')::boolean, false),
        'creado_por', v_uid, 'creado_en', now(), 'actualizado_en', now()))
    on conflict (id) do nothing;
  end loop;

  -- R-26: ritmo y saltos de ubicación sospechosos.
  select v.fecha as fecha, vv.lat as lat, vv.lng as lng into v_prev
    from public.visitas v join public.viviendas vv on vv.id = v.vivienda_id
   where v.usuario_id = v_uid and v.eliminado_en is null
   order by v.fecha desc limit 1;
  if found then
    v_dt := abs(extract(epoch from (v_fecha - v_prev.fecha)));
    v_dd := public.dist_m(v_prev.lat, v_prev.lng, v_lat, v_lng);
    if v_dt < public.cfg_num('ritmo_sospechoso_seg', 90) then
      insert into public.alertas_calidad (tipo, severidad, usuario_id, visita_id, vivienda_id, detalle)
      values ('ritmo_sospechoso', 'media', v_uid, v_visita_id, v_vid, jsonb_build_object('segundos', v_dt));
    elsif v_dd > 100 and v_dd / greatest(v_dt, 1) > public.cfg_num('velocidad_max_ms', 15) then
      insert into public.alertas_calidad (tipo, severidad, usuario_id, visita_id, vivienda_id, detalle)
      values ('salto_de_ubicacion', 'alta', v_uid, v_visita_id, v_vid, jsonb_build_object('metros', v_dd, 'segundos', v_dt));
    end if;
  end if;

  -- Visita.
  insert into public.visitas
  select * from jsonb_populate_record(null::public.visitas,
    v_vis || jsonb_build_object(
      'vivienda_id', v_vid, 'hogar_id', v_hogar_id, 'usuario_id', v_uid, 'fecha', v_fecha,
      'autorizacion_verbal', coalesce((v_vis ->> 'autorizacion_verbal')::boolean, false),
      'seguimiento_requerido', coalesce((v_vis ->> 'seguimiento_requerido')::boolean, false),
      'volante_entregado', coalesce((v_vis ->> 'volante_entregado')::boolean, false),
      'ubicacion_manual', v_manual,
      'no_autorizo_foto', coalesce((v_vis ->> 'no_autorizo_foto')::boolean, false),
      'dispositivo_lat', v_dlat, 'dispositivo_lng', v_dlng,
      'distancia_m', v_dist, 'calidad', v_calidad, 'es_diferido', v_diferido, 'verificada', false,
      'creado_en', now(), 'actualizado_en', now()));

  -- Fotos (los archivos suben aparte; aquí solo queda el registro).
  for v_foto in select c from jsonb_array_elements(coalesce(p -> 'fotos', '[]'::jsonb)) as t(c) loop
    insert into public.fotos
    select * from jsonb_populate_record(null::public.fotos,
      v_foto || jsonb_build_object(
        'vivienda_id', v_vid, 'visita_id', v_visita_id, 'usuario_id', v_uid, 'subida', false,
        'con_personas', coalesce((v_foto ->> 'con_personas')::boolean, false),
        'creado_en', now(), 'actualizado_en', now()))
    on conflict (id) do nothing;
  end loop;
  update public.viviendas
     set foto_principal_path = (select storage_path from public.fotos
                                 where vivienda_id = v_vid and tipo = 'fachada' order by creado_en limit 1)
   where id = v_vid and foto_principal_path is null;

  -- Seguimiento (6.7): se crea una tarea para quien corresponda.
  if coalesce((v_vis ->> 'seguimiento_requerido')::boolean, false) then
    insert into public.tareas (tipo, titulo, descripcion, asignado_a, creado_por, fecha_limite, prioridad, estado, vivienda_id)
    values ('seguimiento', 'Seguimiento de visita',
            coalesce(nullif(v_vis ->> 'seguimiento_motivo', ''), 'Volver a visitar'),
            coalesce(nullif(v_vis ->> 'seguimiento_asignado_a', '')::uuid, v_uid), v_uid,
            nullif(v_vis ->> 'seguimiento_fecha', '')::timestamptz, 'normal', 'pendiente', v_vid);
  end if;

  -- R-20 / R-21: si pidió no ser visitado, nadie del hogar queda contactable.
  if v_resultado = 'pidio_no_ser_visitado' then
    update public.personas set estado = 'no_contactar' where vivienda_id = v_vid and eliminado_en is null;
    update public.consentimientos
       set estado = 'revocado', revocado_en = now(), revocado_motivo = 'Pidió no ser visitado'
     where vivienda_id = v_vid and estado = 'vigente' and proposito like 'contacto\_%';
  end if;

  perform public.fn_auditar('registrar_visita', 'visita', v_visita_id::text,
    jsonb_build_object('vivienda', v_vid, 'calidad', v_calidad, 'resultado', v_resultado));

  return jsonb_build_object('ok', true, 'calidad', v_calidad, 'motivos', to_jsonb(v_motivos),
    'advertencias', to_jsonb(v_avisos), 'personas_duplicadas', v_dups, 'diferido', v_diferido);
end $$;

create or replace function public.rpc_foto_subida(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  update public.fotos set subida = true where id = p_id and usuario_id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

-- Datos completos de una persona: solo con O-01 (o Director/Administrador) y siempre con auditoría.
create or replace function public.rpc_persona_completa(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.personas; v_zona uuid; v_simpatia boolean;
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  select * into v from public.personas where id = p_id and eliminado_en is null;
  if not found then raise exception 'Persona no encontrada'; end if;
  select zona_id into v_zona from public.viviendas where id = v.vivienda_id;
  if not public.tiene_permiso('O-01', v_zona) then
    raise exception 'No tiene permiso para ver datos completos' using errcode = '42501';
  end if;
  v_simpatia := public.tiene_permiso('O-02', v_zona);
  perform public.fn_auditar('ver_datos_completos', 'persona', p_id::text, jsonb_build_object('simpatia', v_simpatia));
  return jsonb_build_object(
    'id', v.id,
    'nombre_completo', trim(concat_ws(' ', v.primer_nombre, v.segundo_nombre, v.primer_apellido, v.segundo_apellido)),
    'cedula', public._dec(v.cedula_enc),
    'telefono', public._dec(v.telefono_enc),
    'telefono2', public._dec(v.telefono2_enc),
    'correo', public._dec(v.correo_enc),
    'fecha_nacimiento', v.fecha_nacimiento,
    'simpatia', case when v_simpatia then public._dec(v.simpatia_enc) end);
end $$;

create or replace function public.rpc_viviendas_cercanas(p_lat double precision, p_lng double precision,
                                                         p_radio double precision default 15) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'lat', lat, 'lng', lng, 'direccion', direccion, 'estado', estado,
                                        'foto_principal_path', foto_principal_path,
                                        'distancia_m', round(public.dist_m(lat, lng, p_lat, p_lng))::int)
                     order by public.dist_m(lat, lng, p_lat, p_lng))
      from public.viviendas
     where eliminado_en is null
       and lat between p_lat - 0.002 and p_lat + 0.002 and lng between p_lng - 0.002 and p_lng + 0.002
       and public.dist_m(lat, lng, p_lat, p_lng) <= p_radio), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------- tareas, jornada y seguridad en terreno

create or replace function public.rpc_tarea_actualizar(p_id uuid, p_estado text, p_nota text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.tareas;
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  select * into v from public.tareas where id = p_id;
  if not found then raise exception 'Tarea no encontrada'; end if;
  if v.asignado_a is distinct from auth.uid() and v.creado_por is distinct from auth.uid()
     and not public.es_staff() and not public.tiene_permiso('O-09') then
    raise exception 'No puede modificar esta tarea' using errcode = '42501';
  end if;
  update public.tareas
     set estado = p_estado, nota_cierre = coalesce(p_nota, nota_cierre),
         cerrada_en = case when p_estado in ('hecha', 'cancelada') then now() else cerrada_en end
   where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rpc_jornada_iniciar() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  update public.jornadas set fin = now() where usuario_id = auth.uid() and fin is null;
  insert into public.jornadas (usuario_id) values (auth.uid()) returning id into v_id;
  perform public.fn_auditar('iniciar_jornada', 'jornada', v_id::text);
  return jsonb_build_object('ok', true, 'jornada_id', v_id);
end $$;

create or replace function public.rpc_jornada_terminar() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  update public.jornadas set fin = now() where usuario_id = auth.uid() and fin is null;
  perform public.fn_auditar('terminar_jornada', 'jornada', null);
  return jsonb_build_object('ok', true);
end $$;

-- R-31: solo se guardan ubicaciones mientras hay una jornada activa.
create or replace function public.rpc_ubicaciones(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_j uuid; v_n int := 0; v_pt jsonb;
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  select id into v_j from public.jornadas where usuario_id = auth.uid() and fin is null order by inicio desc limit 1;
  if v_j is null then
    return jsonb_build_object('ok', true, 'guardadas', 0, 'motivo', 'sin jornada activa');
  end if;
  for v_pt in select c from jsonb_array_elements(coalesce(p, '[]'::jsonb)) as t(c) loop
    insert into public.ubicaciones_jornada (jornada_id, usuario_id, lat, lng, precision_m, tomada_en)
    values (v_j, auth.uid(), (v_pt ->> 'lat')::double precision, (v_pt ->> 'lng')::double precision,
            nullif(v_pt ->> 'precision_m', '')::real, coalesce(nullif(v_pt ->> 'tomada_en', '')::timestamptz, now()));
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'guardadas', v_n);
end $$;

create or replace function public.rpc_sos(p_lat double precision, p_lng double precision, p_nota text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  insert into public.sos_alertas (usuario_id, lat, lng, nota) values (auth.uid(), p_lat, p_lng, p_nota) returning id into v_id;
  perform public.fn_auditar('sos', 'seguridad', v_id::text, jsonb_build_object('lat', p_lat, 'lng', p_lng));
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.rpc_purgar_ubicaciones() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if not public.es_admin() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Solo el Administrador' using errcode = '42501';
  end if;
  delete from public.ubicaciones_jornada
   where tomada_en < now() - make_interval(days => public.cfg_num('retencion_ubicacion_dias', 7)::int);
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'borradas', v_n);
end $$;

-- ---------------------------------------------------------------- incidentes y derechos de los titulares

create or replace function public.rpc_incidente(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  insert into public.incidentes (id, tipo, descripcion, lat, lng, mesa, evidencia_path, reportado_por)
  values (coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid()), p ->> 'tipo', p ->> 'descripcion',
          nullif(p ->> 'lat', '')::double precision, nullif(p ->> 'lng', '')::double precision,
          p ->> 'mesa', p ->> 'evidencia_path', auth.uid())
  on conflict (id) do nothing;
  perform public.fn_auditar('reportar_incidente', 'incidente', p ->> 'id', jsonb_build_object('tipo', p ->> 'tipo'));
  return jsonb_build_object('ok', true);
end $$;

-- R-20: una revocatoria o supresión deja a la persona en "No contactar" de inmediato.
create or replace function public.rpc_solicitud_titular(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_tipo text := p ->> 'tipo';
  v_persona uuid := nullif(p ->> 'persona_id', '')::uuid;
  v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  v_dias int;
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  v_dias := case when v_tipo = 'consulta' then 10 else 15 end;
  insert into public.solicitudes_titulares (id, persona_id, nombre_solicitante, contacto, tipo, detalle, canal,
                                            registrado_por, plazo_interno, plazo_legal)
  values (v_id, v_persona, p ->> 'nombre_solicitante', p ->> 'contacto', v_tipo, p ->> 'detalle', p ->> 'canal',
          auth.uid(), public.sumar_dias_habiles(current_date, public.cfg_num('titulares_plazo_interno_dias', 5)::int),
          public.sumar_dias_habiles(current_date, v_dias))
  on conflict (id) do nothing;
  if v_persona is not null and v_tipo in ('revocatoria', 'supresion') then
    update public.personas
       set estado = case when v_tipo = 'supresion' then 'solicito_eliminacion' else 'no_contactar' end
     where id = v_persona;
    update public.consentimientos
       set estado = 'revocado', revocado_en = now(), revocado_motivo = 'Solicitud del titular (' || v_tipo || ')'
     where persona_id = v_persona and estado = 'vigente' and (v_tipo = 'supresion' or proposito like 'contacto\_%');
  end if;
  perform public.fn_auditar('solicitud_titular', 'persona', coalesce(v_persona::text, v_id::text), jsonb_build_object('tipo', v_tipo));
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.rpc_marcar_no_contactar(p_persona uuid, p_motivo text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  update public.personas set estado = 'no_contactar' where id = p_persona;
  update public.consentimientos
     set estado = 'revocado', revocado_en = now(), revocado_motivo = coalesce(p_motivo, 'No contactar')
   where persona_id = p_persona and estado = 'vigente' and proposito like 'contacto\_%';
  perform public.fn_auditar('no_contactar', 'persona', p_persona::text, jsonb_build_object('motivo', p_motivo));
  return jsonb_build_object('ok', true);
end $$;

-- R-22 / R-23: el autor elimina durante 72 horas; Director, Administrador y O-06 siempre. Borrado lógico (papelera).
create or replace function public.rpc_eliminar_registro(p_tabla text, p_id uuid, p_motivo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_autor uuid; v_creado timestamptz; v_col text;
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  if p_tabla not in ('viviendas', 'visitas', 'hogares', 'personas', 'fotos', 'necesidades') then
    raise exception 'Tabla no permitida';
  end if;
  v_col := case when p_tabla in ('visitas', 'fotos') then 'usuario_id' else 'creado_por' end;
  execute format('select %I, creado_en from public.%I where id = $1', v_col, p_tabla) into v_autor, v_creado using p_id;
  if v_creado is null then raise exception 'Registro no encontrado'; end if;
  if not (public.es_staff() or public.tiene_permiso('O-06')
          or (v_autor = auth.uid() and now() - v_creado <= make_interval(hours => public.cfg_num('ventana_edicion_h', 72)::int))) then
    raise exception 'R-22: ya pasó la ventana de edición; solicite la corrección al Director' using errcode = '42501';
  end if;
  execute format('update public.%I set eliminado_en = now() where id = $1 and eliminado_en is null', p_tabla) using p_id;
  if p_tabla = 'viviendas' then
    update public.viviendas set motivo_eliminacion = p_motivo where id = p_id;
  end if;
  perform public.fn_auditar('eliminar', p_tabla, p_id::text, jsonb_build_object('motivo', p_motivo));
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- panel de campaña (9.3) con la regla de "menos de 5"

create or replace function public.rpc_panel_campana() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_min int := public.cfg_num('grupo_minimo', 5)::int;
begin
  if public.mi_rol() is null then raise exception 'Cuenta no activa' using errcode = '42501'; end if;
  return jsonb_build_object(
    'viviendas_conocidas', (select count(*) from public.viviendas where eliminado_en is null),
    'viviendas_visitadas', (select count(distinct vivienda_id) from public.visitas where eliminado_en is null and calidad = 'verde'),
    'hogares', (select count(*) from public.hogares where eliminado_en is null),
    'personas_autorizadas', (select count(*) from public.personas where eliminado_en is null and estado <> 'no_contactar'),
    'por_zona', coalesce((
      select jsonb_agg(jsonb_build_object(
        'zona_id', z.id, 'nombre', z.nombre,
        'conocidas', case when c.n between 1 and v_min - 1 then null else c.n end,
        'menor_minimo', c.n between 1 and v_min - 1,
        'visitadas', c.vis))
      from public.zonas z
      left join lateral (
        select count(*) as n,
               count(*) filter (where exists (select 1 from public.visitas vi
                                               where vi.vivienda_id = v.id and vi.calidad = 'verde' and vi.eliminado_en is null)) as vis
          from public.viviendas v where v.zona_id = z.id and v.eliminado_en is null) c on true
      where z.activo), '[]'::jsonb),
    'necesidades_por_tema', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tema', t.tema, 'n', case when t.n between 1 and v_min - 1 then null else t.n end,
        'menor_minimo', t.n between 1 and v_min - 1))
      from (select tema, count(*) as n from public.necesidades where eliminado_en is null
             group by tema order by count(*) desc limit 10) t), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------- permisos de ejecución

grant execute on function public.rpc_mi_perfil() to authenticated;
grant execute on function public.rpc_completar_ingreso(int, text) to authenticated;
grant execute on function public.rpc_registrar_visita(jsonb) to authenticated;
grant execute on function public.rpc_foto_subida(uuid) to authenticated;
grant execute on function public.rpc_persona_completa(uuid) to authenticated;
grant execute on function public.rpc_viviendas_cercanas(double precision, double precision, double precision) to authenticated;
grant execute on function public.rpc_tarea_actualizar(uuid, text, text) to authenticated;
grant execute on function public.rpc_jornada_iniciar() to authenticated;
grant execute on function public.rpc_jornada_terminar() to authenticated;
grant execute on function public.rpc_ubicaciones(jsonb) to authenticated;
grant execute on function public.rpc_sos(double precision, double precision, text) to authenticated;
grant execute on function public.rpc_purgar_ubicaciones() to authenticated;
grant execute on function public.rpc_incidente(jsonb) to authenticated;
grant execute on function public.rpc_solicitud_titular(jsonb) to authenticated;
grant execute on function public.rpc_marcar_no_contactar(uuid, text) to authenticated;
grant execute on function public.rpc_eliminar_registro(text, uuid, text) to authenticated;
grant execute on function public.rpc_panel_campana() to authenticated;
grant execute on function public.dist_m(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.estado_por_resultado(text) to authenticated;
