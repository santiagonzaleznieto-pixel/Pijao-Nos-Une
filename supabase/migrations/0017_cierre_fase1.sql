-- Pijao Nos Une · 0017 · cierre de la Fase 1
--   13.3 / 1.11  guion de visita y preguntas frecuentes dentro de la app. El Administrador los publica con versiones
--                en P-42, como los textos legales, y el abogado los revisa antes del piloto (23.1-14).
--   22.3 / 1.15  métricas del piloto sin datos personales: tiempo por registro, GPS, trabajo sin señal, envíos y calidad.
--   4.5 / R-04   aviso automático al Director el primer día de cada mes para revisar los permisos opcionales.

-- ======================================================================= guion de visita y preguntas frecuentes

do $$
declare r record;
begin
  for r in select conname from pg_constraint
            where conrelid = 'public.textos_legales'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%tipo%'
  loop
    execute format('alter table public.textos_legales drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.textos_legales add constraint textos_legales_tipo_check check (tipo in (
  'autorizacion', 'aviso_privacidad', 'acuerdo_confidencialidad', 'codigo_conducta', 'politica_tratamiento',
  'guion_visita', 'preguntas_frecuentes'));

create or replace function public.rpc_texto_legal_publicar(p_tipo text, p_version text, p_contenido text,
                                                           p_aprobado_abogado boolean default false) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_id uuid;
begin
  perform public._exigir_admin_aal2();
  if p_tipo is null or p_tipo not in ('autorizacion', 'aviso_privacidad', 'acuerdo_confidencialidad', 'codigo_conducta',
                                      'politica_tratamiento', 'guion_visita', 'preguntas_frecuentes') then
    raise exception 'Tipo de texto no válido';
  end if;
  if coalesce(p_version, '') !~ '^[A-Za-z0-9._-]{1,30}$' then
    raise exception 'La versión usa letras, números, punto o guion (por ejemplo v2 o 2027-02)';
  end if;
  if length(coalesce(trim(p_contenido), '')) < 20 or length(p_contenido) > 60000 then
    raise exception 'El texto debe tener entre 20 y 60.000 caracteres';
  end if;
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

-- Primer borrador. Formato: «## » abre una sección (o una pregunta) y «- » es un punto de una lista.
insert into public.textos_legales (tipo, version, contenido, vigente, es_borrador) values
('guion_visita', 'v1-borrador', $guion$
## Antes de tocar la puerta
- Lleve el carnet digital a la vista (Más → Carnet digital).
- Revise en el mapa si la casa pidió no ser contactada. Si es así, no toque.
- Trabaje en pareja en las veredas y avise a qué hora regresa.

## 1. Saludo y presentación
«Buenos días, mi nombre es (su nombre). Hago parte del equipo de Pijao Nos Une. Este es mi carnet: puede verificarlo con el código QR.»

## 2. Para qué venimos
«Estamos recorriendo Pijao casa por casa para conocer las necesidades de cada barrio y vereda. Con lo que nos cuenten se construyen las propuestas para el municipio. ¿Tiene unos minutos para conversar?»
- Si dice que no: agradezca, despídase con amabilidad y registre el resultado.
- Si pide que no vuelvan: respételo y márquelo en la app. No se vuelve a visitar.

## 3. La autorización de los datos
«Para anotar sus datos necesitamos su autorización. Solo los usamos para lo que usted autorice, no los compartimos con nadie y puede pedir que los borremos cuando quiera.»
- Lea el texto de autorización que muestra la app, sin resumirlo ni cambiarlo.
- Cada persona autoriza por sí misma. Nadie autoriza por otro adulto.
- Si no autoriza, se registra solo la visita, sin datos de personas.

## 4. La conversación
- Pregunte por las necesidades del hogar y del sector, y escuche sin interrumpir.
- No prometa obras, empleos, auxilios ni favores.
- Nunca ofrezca ni reciba dinero, regalos o mercados.
- No pida el voto ni pregunte por quién va a votar. La simpatía solo se anota si la persona la cuenta y la autoriza.

## 5. Despedida
«Muchas gracias por su tiempo. Le dejo este volante con la información y la página "Mis datos", donde puede consultar o borrar su información.»
- Revise en la app que el registro quedó guardado.

## Si algo sale mal
- Si alguien se molesta o se siente amenazado: despídase y retírese. Su seguridad va primero.
- Si abre un menor de edad: pregunte por un adulto. No se registran datos de menores.
- No pase datos de personas por los chats de WhatsApp del equipo.

BORRADOR: falta la revisión del abogado antes del piloto.
$guion$, true, true),
('preguntas_frecuentes', 'v1-borrador', $faq$
## ¿Qué es Pijao Nos Une?
Es el equipo de campaña de Jaime González a la Alcaldía de Pijao. Recorremos el municipio para conocer las necesidades de cada barrio y vereda.

## ¿Esto es de la Alcaldía o del gobierno?
No. Es una campaña ciudadana. No tiene que ver con subsidios ni con programas del Estado.

## ¿Para qué quieren mis datos?
Solo para lo que usted autorice: saber qué necesita su sector y, si lo acepta, contactarle con información. No se venden ni se comparten.

## ¿Es obligatorio darlos?
No. Puede conversar con nosotros sin dar ningún dato. También puede autorizar unas cosas y otras no.

## ¿Me van a dar algo a cambio?
No. La campaña no entrega dinero, regalos ni favores a cambio de datos o de apoyo. Si alguien se lo ofrece en nombre de la campaña, avísenos.

## ¿Quién ve mi información?
Solo las personas autorizadas del equipo. Sus datos completos están protegidos y cada consulta queda registrada.

## ¿Puedo borrar mis datos o dejar de recibir mensajes?
Sí, cuando quiera. En la página «Mis datos» (está en el volante) o en persona con cualquier miembro del equipo. Se aplica de inmediato.

## ¿Dónde voto?
Eso lo consulta en la página de la Registraduría con su cédula. La campaña no maneja esa información.

## Para el colaborador: ¿qué hago si no hay señal?
Siga trabajando: todo se guarda cifrado en el teléfono y se envía solo cuando vuelva la señal. No desinstale la app.

## Para el colaborador: ¿qué hago si pierdo el teléfono?
Avise de inmediato al Director para que lo cierre a distancia. Los datos del teléfono se borran solos.

BORRADOR: falta la revisión del abogado antes del piloto.
$faq$, true, true)
on conflict (tipo, version) do nothing;

-- ======================================================================= métricas del piloto (22.3)

-- Sin datos personales: solo un tipo, un número y una categoría de una lista cerrada. La persona que la generó
-- queda para limitar el volumen, pero las consultas solo devuelven totales.
create table if not exists public.metricas_piloto (
  id bigint generated always as identity primary key,
  usuario_id uuid references public.perfiles(id) on delete set null,
  version_app text,
  tipo text not null check (tipo in ('registro_segundos', 'registro_calidad', 'registro_sin_senal', 'gps_precision',
                                     'gps_error', 'envio_error', 'envio_cuarentena', 'cola_atrasada')),
  valor numeric,
  detalle text check (detalle is null or detalle ~ '^[a-z_]{1,30}$'),
  ocurrido_en timestamptz not null,
  creado_en timestamptz not null default now()
);
create index if not exists ix_metricas_piloto_tipo on public.metricas_piloto (tipo, ocurrido_en);
create index if not exists ix_metricas_piloto_usuario on public.metricas_piloto (usuario_id, creado_en);
alter table public.metricas_piloto enable row level security;
revoke all on public.metricas_piloto from public, anon, authenticated;

insert into public.configuracion (clave, valor, descripcion) values
  ('metricas_piloto_activas', 'true'::jsonb, '22.3: los teléfonos envían las métricas del piloto (sin datos personales)')
on conflict (clave) do nothing;

-- El teléfono las guarda y las envía en lotes al sincronizar. Lo que no cumpla la lista cerrada se descarta.
create or replace function public.rpc_metricas(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_m jsonb; v_n int := 0; v_hoy int; v_cuando timestamptz; v_valor numeric; v_detalle text;
begin
  if auth.uid() is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if not exists (select 1 from public.perfiles where id = auth.uid() and estado = 'activo') then
    raise exception 'Cuenta no activa' using errcode = '42501';
  end if;
  if coalesce((select valor from public.configuracion where clave = 'metricas_piloto_activas'), 'true'::jsonb) = 'false'::jsonb then
    return jsonb_build_object('ok', true, 'guardadas', 0, 'apagadas', true);
  end if;
  if p is null or jsonb_typeof(p) <> 'array' then raise exception 'Se esperan hasta 200 métricas en una lista'; end if;
  if jsonb_array_length(p) > 200 then raise exception 'Se esperan hasta 200 métricas en una lista'; end if;
  -- Límite para no llenar la base gratuita: 2.000 métricas por persona y día.
  select count(*) into v_hoy from public.metricas_piloto where usuario_id = auth.uid() and creado_en > now() - interval '1 day';
  for v_m in select * from jsonb_array_elements(p) loop
    exit when v_hoy + v_n >= 2000;
    continue when jsonb_typeof(v_m) <> 'object'
      or coalesce(v_m ->> 'tipo', '') not in ('registro_segundos', 'registro_calidad', 'registro_sin_senal', 'gps_precision',
                                             'gps_error', 'envio_error', 'envio_cuarentena', 'cola_atrasada');
    v_detalle := nullif(v_m ->> 'detalle', '');
    continue when v_detalle is not null and v_detalle !~ '^[a-z_]{1,30}$';
    begin
      v_valor := (v_m ->> 'valor')::numeric;
      v_cuando := (v_m ->> 'ocurrido_en')::timestamptz;
    exception when others then
      continue;
    end;
    continue when v_valor is not null and (v_valor < 0 or v_valor > 100000);
    if v_cuando is null or v_cuando > now() + interval '1 hour' or v_cuando < now() - interval '60 days' then v_cuando := now(); end if;
    insert into public.metricas_piloto (usuario_id, version_app, tipo, valor, detalle, ocurrido_en)
    values (auth.uid(), left(v_m ->> 'version_app', 20), v_m ->> 'tipo', v_valor, v_detalle, v_cuando);
    v_n := v_n + 1;
  end loop;
  delete from public.metricas_piloto where ocurrido_en < now() - interval '400 days';
  return jsonb_build_object('ok', true, 'guardadas', v_n);
end $$;

-- Tablero del piloto para el Director y el Administrador: solo totales, medianas y porcentajes.
create or replace function public.rpc_metricas_piloto(p_desde date default null, p_hasta date default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_desde timestamptz; v_hasta timestamptz;
begin
  if not public.es_staff() then raise exception 'Solo el Director o el Administrador' using errcode = '42501'; end if;
  v_desde := (coalesce(p_desde, (now() at time zone 'America/Bogota')::date - 30)::timestamp) at time zone 'America/Bogota';
  v_hasta := ((coalesce(p_hasta, (now() at time zone 'America/Bogota')::date) + 1)::timestamp) at time zone 'America/Bogota';
  if v_hasta <= v_desde then raise exception 'La fecha final debe ser posterior a la inicial'; end if;
  if v_hasta - v_desde > interval '400 days' then raise exception 'El periodo máximo es de 400 días'; end if;

  return (
    with m as (select * from public.metricas_piloto where ocurrido_en >= v_desde and ocurrido_en < v_hasta),
    reg as (select * from m where tipo = 'registro_segundos')
    select jsonb_build_object(
      'desde', (v_desde at time zone 'America/Bogota')::date,
      'hasta', ((v_hasta at time zone 'America/Bogota')::date - 1),
      'colaboradores', (select count(distinct usuario_id) from m),
      'registros', jsonb_build_object(
        'total', (select count(*) from reg),
        'mediana_seg', (select round(percentile_cont(0.5) within group (order by valor)::numeric) from reg),
        'p90_seg', (select round(percentile_cont(0.9) within group (order by valor)::numeric) from reg),
        'pct_bajo_90_seg', (select round(100.0 * count(*) filter (where valor <= 90) / nullif(count(*), 0), 1) from reg),
        'por_tipo', coalesce((select jsonb_agg(jsonb_build_object('tipo', coalesce(detalle, 'otro'), 'total', n, 'mediana_seg', med,
                                                                 'pct_bajo_90_seg', bajo) order by n desc)
                                from (select detalle, count(*) n,
                                             round(percentile_cont(0.5) within group (order by valor)::numeric) med,
                                             round(100.0 * count(*) filter (where valor <= 90) / count(*), 1) bajo
                                        from reg group by detalle) t), '[]'::jsonb)),
      'calidad', jsonb_build_object(
        'verde', (select count(*) from m where tipo = 'registro_calidad' and detalle = 'verde'),
        'amarillo', (select count(*) from m where tipo = 'registro_calidad' and detalle = 'amarillo'),
        'rojo', (select count(*) from m where tipo = 'registro_calidad' and detalle = 'rojo')),
      'sin_senal', jsonb_build_object(
        'registros', (select count(*) from m where tipo = 'registro_sin_senal'),
        'pct', (select round(100.0 * (select count(*) from m where tipo = 'registro_sin_senal')
                              / nullif((select count(*) from m where tipo = 'registro_calidad'), 0), 1))),
      'gps', jsonb_build_object(
        'lecturas', (select count(*) from m where tipo = 'gps_precision'),
        'mediana_precision_m', (select round(percentile_cont(0.5) within group (order by valor)::numeric, 1)
                                  from m where tipo = 'gps_precision'),
        'errores', coalesce((select jsonb_object_agg(coalesce(detalle, 'otro'), n)
                               from (select detalle, count(*) n from m where tipo = 'gps_error' group by detalle) t), '{}'::jsonb)),
      'envios', jsonb_build_object(
        'errores', coalesce((select jsonb_object_agg(coalesce(detalle, 'otro'), n)
                               from (select detalle, count(*) n from m where tipo = 'envio_error' group by detalle) t), '{}'::jsonb),
        'en_revision', (select coalesce(sum(valor), 0) from m where tipo = 'envio_cuarentena'),
        'colas_atrasadas', (select count(*) from m where tipo = 'cola_atrasada')),
      'por_dia', coalesce((select jsonb_agg(jsonb_build_object('dia', dia, 'registros', registros, 'mediana_seg', mediana,
                                                              'gps_errores', gps, 'envio_errores', envio) order by dia)
                             from (select (ocurrido_en at time zone 'America/Bogota')::date dia,
                                          count(*) filter (where tipo = 'registro_segundos') registros,
                                          round((percentile_cont(0.5) within group (order by valor)
                                                 filter (where tipo = 'registro_segundos'))::numeric) mediana,
                                          count(*) filter (where tipo = 'gps_error') gps,
                                          count(*) filter (where tipo = 'envio_error') envio
                                     from m group by 1) d), '[]'::jsonb))
  );
end $$;

-- ======================================================================= revisión mensual de permisos (4.5 y R-04)

do $$
declare r record;
begin
  for r in select conname from pg_constraint
            where conrelid = 'public.avisos_cuenta'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%tipo%'
  loop
    execute format('alter table public.avisos_cuenta drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.avisos_cuenta add constraint avisos_cuenta_tipo_check
  check (tipo in ('dispositivo_nuevo', 'clave_cambiada', 'revision_permisos'));

create or replace function public._revision_mensual_permisos() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_datos jsonb; v_avisos int := 0; v_dest record;
begin
  select jsonb_build_object(
    'activos', count(*),
    'colaboradores', count(distinct po.usuario_id),
    'por_vencer_30_dias', count(*) filter (where po.vence_en is not null and po.vence_en <= now() + interval '30 days'),
    'sin_vencimiento', count(*) filter (where po.vence_en is null),
    'riesgo_alto_sin_vencimiento', count(*) filter (where po.vence_en is null
                                                      and po.codigo in ('O-01', 'O-02', 'O-05', 'O-12', 'O-13', 'O-16')),
    'de_cuentas_no_activas', count(*) filter (where p.estado <> 'activo'))
    into v_datos
    from public.permisos_opcionales po join public.perfiles p on p.id = po.usuario_id
   where po.activo and (po.vence_en is null or po.vence_en > now());

  for v_dest in select id from public.perfiles where rol in ('director', 'admin') and estado = 'activo' loop
    -- Un solo aviso por persona y mes, aunque la tarea corra dos veces.
    continue when exists (select 1 from public.avisos_cuenta where usuario_id = v_dest.id and tipo = 'revision_permisos'
                             and creado_en >= date_trunc('month', now() at time zone 'America/Bogota') at time zone 'America/Bogota');
    insert into public.avisos_cuenta (usuario_id, tipo, mensaje, datos)
    values (v_dest.id, 'revision_permisos',
            format('Revisión mensual de permisos: hay %s permisos opcionales activos en %s cuentas; %s vencen en los próximos 30 días y %s no tienen vencimiento. Revíselos en el panel web, sección Colaboradores.',
                   v_datos ->> 'activos', v_datos ->> 'colaboradores', v_datos ->> 'por_vencer_30_dias', v_datos ->> 'sin_vencimiento'),
            v_datos);
    v_avisos := v_avisos + 1;
  end loop;
  if v_avisos > 0 then
    perform public.fn_auditar('revision_permisos', 'permisos', null, v_datos);
  end if;
  return v_datos || jsonb_build_object('avisos', v_avisos);
end $$;
revoke all on function public._revision_mensual_permisos() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'pijao_revision_permisos';
  -- El día 1 de cada mes a las 8:00 de Colombia (13:00 UTC).
  perform cron.schedule('pijao_revision_permisos', '0 13 1 * *', 'select public._revision_mensual_permisos()');
exception when others then
  raise notice 'pg_cron no está disponible: active la extensión en el panel y vuelva a aplicar este bloque (%).', sqlerrm;
end $$;

grant execute on function public.rpc_metricas(jsonb), public.rpc_metricas_piloto(date, date) to authenticated;
revoke execute on function public.rpc_metricas(jsonb), public.rpc_metricas_piloto(date, date) from public, anon;
