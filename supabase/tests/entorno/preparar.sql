-- SOLO para pruebas locales y de integración continua (tools/probar_migraciones.sh). NUNCA se aplica en producción.
-- La imagen supabase/postgres no trae lo que en un proyecto real crean los servicios de autenticación (GoTrue)
-- y de almacenamiento. Aquí se completa lo mínimo, igual que en Supabase. Se ejecuta como supabase_admin.

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim', true), ''),
                  nullif(current_setting('request.jwt.claims', true), ''))::jsonb
$$;
grant execute on function auth.jwt() to public;

-- Columnas que el servicio de almacenamiento agrega con sus propias migraciones.
alter table storage.buckets add column if not exists public boolean default false;
alter table storage.objects add column if not exists metadata jsonb;
alter table storage.objects enable row level security;

-- En un proyecto de Supabase, el usuario «postgres» (el de las migraciones) puede crear disparadores en auth.users
-- y políticas en storage.objects. Aquí se le dan esos mismos permisos.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    execute 'grant supabase_auth_admin to postgres';
  end if;
  if exists (select 1 from pg_roles where rolname = 'supabase_storage_admin') then
    execute 'grant supabase_storage_admin to postgres';
  end if;
end $$;
grant all on schema auth, storage to postgres;
grant all on all tables in schema auth, storage to postgres;
grant usage on schema auth to authenticated, anon;
grant usage on schema storage to authenticated, anon;
