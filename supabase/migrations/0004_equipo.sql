-- Pijao Nos Une · 0004 · equipo: tareas, anuncios, jornada, SOS, calidad, incidentes, derechos de titulares, auditoría

create table if not exists public.tareas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'otra',
  titulo text not null,
  descripcion text,
  asignado_a uuid,
  creado_por uuid,
  fecha_limite timestamptz,
  prioridad text not null default 'normal' check (prioridad in ('baja','normal','alta')),
  estado text not null default 'pendiente' check (estado in ('pendiente','en_curso','hecha','bloqueada','cancelada')),
  vivienda_id uuid references public.viviendas(id),
  persona_id uuid,
  zona_id uuid references public.zonas(id),
  nota_cierre text,
  cerrada_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists ix_tareas_asignado on public.tareas (asignado_a, estado);
create index if not exists ix_tareas_sync on public.tareas (actualizado_en, id);

create table if not exists public.anuncios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  texto text not null,
  prioridad text not null default 'normal' check (prioridad in ('normal','importante','urgente')),
  zona_id uuid references public.zonas(id),
  fijado boolean not null default false,
  caduca_en timestamptz,
  creado_por uuid,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists ix_anuncios_sync on public.anuncios (actualizado_en, id);

create table if not exists public.anuncios_lecturas (
  anuncio_id uuid not null references public.anuncios(id) on delete cascade,
  usuario_id uuid not null,
  leido_en timestamptz not null default now(),
  primary key (anuncio_id, usuario_id)
);

create table if not exists public.jornadas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null,
  inicio timestamptz not null default now(),
  fin timestamptz,
  pausada_hasta timestamptz,
  creado_en timestamptz not null default now()
);
create index if not exists ix_jornadas_usuario on public.jornadas (usuario_id, inicio desc);

-- R-31: solo durante la jornada activa; se borran a los 7 días (rpc_purgar_ubicaciones).
create table if not exists public.ubicaciones_jornada (
  id bigint generated always as identity primary key,
  jornada_id uuid references public.jornadas(id) on delete cascade,
  usuario_id uuid not null,
  lat double precision not null,
  lng double precision not null,
  precision_m real,
  tomada_en timestamptz not null default now()
);
create index if not exists ix_ubic_usuario on public.ubicaciones_jornada (usuario_id, tomada_en desc);

create table if not exists public.sos_alertas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null,
  lat double precision,
  lng double precision,
  nota text,
  creada_en timestamptz not null default now(),
  atendida_en timestamptz,
  atendida_por uuid
);

create table if not exists public.alertas_calidad (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  severidad text not null default 'media' check (severidad in ('baja','media','alta')),
  usuario_id uuid,
  visita_id uuid,
  vivienda_id uuid,
  detalle jsonb not null default '{}'::jsonb,
  creada_en timestamptz not null default now(),
  resuelta_en timestamptz,
  resuelta_por uuid,
  resolucion text
);
create index if not exists ix_alertas_abiertas on public.alertas_calidad (creada_en desc) where resuelta_en is null;

create table if not exists public.verificaciones (
  id uuid primary key default gen_random_uuid(),
  visita_id uuid not null references public.visitas(id),
  sorteada_en timestamptz not null default now(),
  verificador uuid,
  resultado text check (resultado in ('confirmada','no_confirmada','sin_respuesta')),
  nota text,
  verificada_en timestamptz
);

create table if not exists public.incidentes (
  id uuid primary key,
  tipo text not null,
  descripcion text not null,
  lat double precision,
  lng double precision,
  mesa text,
  evidencia_path text,
  reportado_por uuid not null,
  estado text not null default 'abierto' check (estado in ('abierto','en_revision','resuelto')),
  resolucion text,
  confidencial boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.solicitudes_titulares (
  id uuid primary key,
  persona_id uuid,
  nombre_solicitante text,
  contacto text,
  tipo text not null check (tipo in ('consulta','actualizacion','supresion','revocatoria','queja')),
  detalle text,
  canal text,
  registrado_por uuid,
  recibido_en timestamptz not null default now(),
  plazo_interno date,
  plazo_legal date,
  estado text not null default 'recibida' check (estado in ('recibida','en_proceso','resuelta','rechazada')),
  respuesta text,
  resuelta_en timestamptz,
  atendida_por uuid,
  actualizado_en timestamptz not null default now()
);

create table if not exists public.dispositivos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null,
  identificador text not null,
  modelo text,
  plataforma text,
  version_app text,
  ultimo_acceso timestamptz not null default now(),
  activo boolean not null default true,
  unique (usuario_id, identificador)
);

create table if not exists public.exportaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null,
  tipo text not null,
  motivo text not null,
  filas int,
  creado_en timestamptz not null default now()
);

-- Auditoría (8.9): solo se agrega; nadie la modifica ni la borra.
create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  usuario_id uuid,
  accion text not null,
  entidad text not null,
  entidad_id text,
  detalle jsonb not null default '{}'::jsonb,
  ip text,
  creado_en timestamptz not null default now()
);
create index if not exists ix_auditoria_fecha on public.auditoria (creado_en desc);
create index if not exists ix_auditoria_usuario on public.auditoria (usuario_id, creado_en desc);

create or replace function public.fn_auditoria_solo_agregar() returns trigger
language plpgsql as $$
begin
  raise exception 'La auditoría no se puede modificar ni borrar';
end $$;
create trigger trg_auditoria_no_update before update or delete on public.auditoria
  for each row execute function public.fn_auditoria_solo_agregar();

create trigger trg_touch_tareas before update on public.tareas for each row execute function public.fn_touch();
create trigger trg_touch_anuncios before update on public.anuncios for each row execute function public.fn_touch();
create trigger trg_touch_incidentes before update on public.incidentes for each row execute function public.fn_touch();
create trigger trg_touch_titulares before update on public.solicitudes_titulares for each row execute function public.fn_touch();
