-- Pijao Nos Une · 0001 · base, catálogos y configuración
-- Ejecutar los archivos en orden numérico en el editor SQL de Supabase (o con `supabase db push`).

create extension if not exists pgcrypto with schema extensions;

-- Mantiene actualizado_en en cada UPDATE (lo usa la sincronización por cursor).
create or replace function public.fn_touch() returns trigger
language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

create table if not exists public.catalogos (
  id bigint generated always as identity primary key,
  catalogo text not null,
  clave text not null,
  etiqueta text not null,
  orden int not null default 0,
  activo boolean not null default true,
  actualizado_en timestamptz not null default now(),
  unique (catalogo, clave)
);

create table if not exists public.configuracion (
  clave text primary key,
  valor jsonb not null,
  descripcion text,
  actualizado_por uuid,
  actualizado_en timestamptz not null default now()
);

-- Secretos de instalación (token de arranque del Administrador). Ningún rol de la app la puede leer.
create table if not exists public.instalacion (
  clave text primary key,
  valor jsonb not null
);

create table if not exists public.textos_legales (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('autorizacion','aviso_privacidad','acuerdo_confidencialidad','codigo_conducta','politica_tratamiento')),
  version text not null,
  contenido text not null,
  vigente boolean not null default true,
  es_borrador boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (tipo, version)
);

create table if not exists public.permisos_catalogo (
  codigo text primary key check (codigo ~ '^O-[0-9]{2}$'),
  nombre text not null,
  descripcion text,
  riesgo text not null check (riesgo in ('bajo','medio','alto')),
  requiere_2fa boolean not null default false,
  acepta_zonas boolean not null default false
);

create table if not exists public.plantillas_permisos (
  nombre text primary key,
  codigos text[] not null default '{}',
  limitar_a_zona boolean not null default false
);

create trigger trg_touch_catalogos before update on public.catalogos
  for each row execute function public.fn_touch();
create trigger trg_touch_configuracion before update on public.configuracion
  for each row execute function public.fn_touch();
create trigger trg_touch_textos before update on public.textos_legales
  for each row execute function public.fn_touch();
