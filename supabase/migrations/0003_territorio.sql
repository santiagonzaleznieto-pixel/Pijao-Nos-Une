-- Pijao Nos Une · 0003 · territorio: zonas, viviendas, hogares, personas, visitas (secciones 5 a 8)
-- Los identificadores nacen en el teléfono (uuid) para que reenviar un registro no lo duplique.

create table if not exists public.zonas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('barrio','vereda','sector')),
  poligono jsonb,                       -- GeoJSON Polygon o MultiPolygon
  viviendas_estimadas int,
  meta_cobertura_pct numeric,
  meta_fecha date,
  activo boolean not null default true,
  creado_por uuid,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.asignaciones_zona (
  id uuid primary key default gen_random_uuid(),
  zona_id uuid not null references public.zonas(id) on delete cascade,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  desde date not null default current_date,
  hasta date,
  activo boolean not null default true,
  asignado_por uuid,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create unique index if not exists uq_asignacion_activa on public.asignaciones_zona (zona_id, usuario_id) where activo;

create table if not exists public.viviendas (
  id uuid primary key,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  precision_m real,
  altitud_m real,
  fuente_ubicacion text not null default 'gps' check (fuente_ubicacion in ('gps','manual','geocodificada')),
  zona_id uuid references public.zonas(id),
  zona_urbana_rural text check (zona_urbana_rural in ('urbana','rural')),
  barrio_vereda text,
  direccion text,
  complemento text,
  nombre_finca text,
  indicaciones text,
  referencia text,
  tipo_vivienda text,
  estado_ocupacion text,
  tenencia text,
  servicios text[],
  via_acceso text,
  riesgos text[],
  actividad_economica text,
  estado text not null default 'por_visitar' check (estado in (
    'por_visitar','visitada_conversacion','visitada_sin_contacto','requiere_seguimiento',
    'no_contactar','deshabitada','direccion_inexistente','fuera_de_pijao')),
  foto_principal_path text,
  es_reconocimiento boolean not null default false,
  requiere_aprobacion boolean not null default false,
  calidad text check (calidad in ('verde','amarillo','rojo')),
  creado_por uuid,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  eliminado_en timestamptz,
  motivo_eliminacion text
);
create index if not exists ix_viviendas_lat_lng on public.viviendas (lat, lng);
create index if not exists ix_viviendas_sync on public.viviendas (actualizado_en, id);

create table if not exists public.hogares (
  id uuid primary key,
  vivienda_id uuid not null references public.viviendas(id),
  total_personas int not null check (total_personas >= 1),
  edades jsonb not null default '{}'::jsonb,
  mujeres int,
  hombres int,
  votantes_pijao_est int,
  votantes_otro_mpio_est int,
  votantes_no_sabe_est int,
  futuros_primeros_votantes int,
  sosten_persona_id uuid,
  sosten_relacion text,
  sosten_sexo text,
  sosten_ocupacion text,
  sosten_situacion_laboral text,
  jefatura_femenina boolean,
  familiares_fuera jsonb,
  mascotas jsonb,
  otros_hogares boolean,
  creado_por uuid,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  eliminado_en timestamptz
);
create index if not exists ix_hogares_sync on public.hogares (actualizado_en, id);

-- Datos sensibles cifrados por campo (cédula, teléfonos, correo, simpatía). La tabla NO es legible por la app:
-- se lee mediante la vista enmascarada personas_v o la función rpc_persona_completa (con auditoría).
create table if not exists public.personas (
  id uuid primary key,
  hogar_id uuid references public.hogares(id),
  vivienda_id uuid references public.viviendas(id),
  primer_nombre text not null,
  segundo_nombre text,
  primer_apellido text not null,
  segundo_apellido text,
  apodo text,
  tipo_documento text not null default 'CC' check (tipo_documento in ('CC','CE')),
  cedula_enc bytea,
  cedula_hash text,
  cedula_ult3 text,
  fecha_nacimiento date,
  mayor_edad_confirmada boolean not null default false,
  sexo text check (sexo in ('mujer','hombre','prefiere_no_decir')),
  ocupacion text,
  telefono_enc bytea,
  telefono_ult4 text,
  telefono_es_whatsapp boolean,
  telefono2_enc bytea,
  correo_enc bytea,
  correo_parcial text,
  canal_preferido text,
  mejor_horario text,
  anios_en_pijao text,
  vive_en_otra_ciudad text,
  vota_en_pijao text check (vota_en_pijao in ('si','no','no_sabe')),
  puesto_votacion text,
  mesa_votacion text,
  interes_info boolean,
  voluntario text check (voluntario in ('si','no','tal_vez')),
  anfitrion boolean,
  temas_interes text[],
  simpatia_enc bytea,
  estado text not null default 'activa' check (estado in ('activa','no_contactar','se_mudo','fallecida','solicito_eliminacion')),
  creado_por uuid,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  eliminado_en timestamptz
);
-- R-17: la cédula no se repite entre personas.
create unique index if not exists uq_personas_cedula on public.personas (cedula_hash)
  where cedula_hash is not null and eliminado_en is null;
create index if not exists ix_personas_sync on public.personas (actualizado_en, id);

create table if not exists public.consentimientos (
  id uuid primary key,
  persona_id uuid references public.personas(id),
  hogar_id uuid references public.hogares(id),
  vivienda_id uuid references public.viviendas(id),
  proposito text not null check (proposito in (
    'registro_vivienda','datos_personales','contacto_whatsapp','contacto_llamada','contacto_sms',
    'contacto_correo','dato_sensible_simpatia','uso_historia','uso_foto')),
  version_texto text not null,
  metodo text not null check (metodo in ('firma_pantalla','verbal','papel')),
  evidencia jsonb not null default '{}'::jsonb,
  otorgado_en timestamptz not null,
  lat double precision,
  lng double precision,
  recogido_por uuid,
  estado text not null default 'vigente' check (estado in ('vigente','revocado')),
  revocado_en timestamptz,
  revocado_motivo text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists ix_consent_persona on public.consentimientos (persona_id);

create table if not exists public.visitas (
  id uuid primary key,
  vivienda_id uuid not null references public.viviendas(id),
  hogar_id uuid references public.hogares(id),
  fecha timestamptz not null default now(),
  usuario_id uuid not null,
  resultado text not null check (resultado in (
    'conversacion_completa','conversacion_breve','dejo_informacion','nadie_en_casa','pidio_volver',
    'rechazo','pidio_no_ser_visitado','casa_cerrada_deshabitada','direccion_erronea')),
  autorizacion_verbal boolean not null default false,
  notas text,
  seguimiento_requerido boolean not null default false,
  seguimiento_fecha timestamptz,
  seguimiento_motivo text,
  seguimiento_asignado_a uuid,
  volante_entregado boolean not null default false,
  ubicacion_manual boolean not null default false,
  motivo_manual text,
  no_autorizo_foto boolean not null default false,
  dispositivo_lat double precision,
  dispositivo_lng double precision,
  dispositivo_precision_m real,
  distancia_m real,
  calidad text check (calidad in ('verde','amarillo','rojo')),
  es_diferido boolean not null default false,
  verificada boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  eliminado_en timestamptz
);
create index if not exists ix_visitas_vivienda on public.visitas (vivienda_id);
create index if not exists ix_visitas_usuario_fecha on public.visitas (usuario_id, fecha desc);
create index if not exists ix_visitas_sync on public.visitas (actualizado_en, id);

create table if not exists public.fotos (
  id uuid primary key,
  vivienda_id uuid not null references public.viviendas(id),
  visita_id uuid references public.visitas(id),
  tipo text not null check (tipo in ('fachada','entorno','problema','autorizacion')),
  storage_path text not null,
  lat double precision,
  lng double precision,
  tomada_en timestamptz,
  tam_bytes int,
  hash text,
  con_personas boolean not null default false,
  subida boolean not null default false,
  usuario_id uuid,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  eliminado_en timestamptz
);
create index if not exists ix_fotos_vivienda on public.fotos (vivienda_id);
create index if not exists ix_fotos_sync on public.fotos (actualizado_en, id);

create table if not exists public.necesidades (
  id uuid primary key,
  hogar_id uuid references public.hogares(id),
  vivienda_id uuid references public.viviendas(id),
  zona_id uuid references public.zonas(id),
  tema text not null,
  prioridad smallint check (prioridad between 1 and 3),
  texto text,
  alcance text not null default 'hogar' check (alcance in ('hogar','colectiva')),
  estado text not null default 'recibida',
  origen text not null default 'visita' check (origen in ('visita','evento','encuesta','publico','lider','reporte')),
  desea_respuesta boolean not null default false,
  propuesta_id uuid,
  creado_por uuid,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  eliminado_en timestamptz
);
create index if not exists ix_necesidades_sync on public.necesidades (actualizado_en, id);

create trigger trg_touch_zonas before update on public.zonas for each row execute function public.fn_touch();
create trigger trg_touch_asig before update on public.asignaciones_zona for each row execute function public.fn_touch();
create trigger trg_touch_viviendas before update on public.viviendas for each row execute function public.fn_touch();
create trigger trg_touch_hogares before update on public.hogares for each row execute function public.fn_touch();
create trigger trg_touch_personas before update on public.personas for each row execute function public.fn_touch();
create trigger trg_touch_consent before update on public.consentimientos for each row execute function public.fn_touch();
create trigger trg_touch_visitas before update on public.visitas for each row execute function public.fn_touch();
create trigger trg_touch_fotos before update on public.fotos for each row execute function public.fn_touch();
create trigger trg_touch_necesidades before update on public.necesidades for each row execute function public.fn_touch();
