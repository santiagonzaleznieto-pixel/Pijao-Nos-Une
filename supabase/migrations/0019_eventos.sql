-- 0019 · Eventos del equipo (P-19, 10.4, O-10). El Director, el Administrador o quien tenga O-10 los crea en el panel;
-- todo el equipo activo los ve en la app (también sin señal, porque se descargan al teléfono). Solo para el equipo: las
-- invitaciones a ciudadanos y la asistencia con QR llegan con la página de la campaña.

create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(titulo) between 3 and 140),
  tipo text not null default 'reunion_vereda',
  descripcion text,
  lugar text,
  lat double precision,
  lng double precision,
  inicio timestamptz not null,
  fin timestamptz,
  zona_id uuid references public.zonas(id),
  asistentes_estimados int check (asistentes_estimados is null or asistentes_estimados >= 0),
  creado_por uuid not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  eliminado_en timestamptz,
  check (fin is null or fin >= inicio)
);
create index if not exists ix_eventos_inicio on public.eventos (inicio) where eliminado_en is null;
create index if not exists ix_eventos_actualizado on public.eventos (actualizado_en, id);

alter table public.eventos enable row level security;
drop policy if exists sel_activos_eventos on public.eventos;
create policy sel_activos_eventos on public.eventos for select to authenticated using ((select public.mi_rol()) is not null);
revoke insert, update, delete on public.eventos from anon, authenticated;
grant select on public.eventos to authenticated;

-- Crear o editar un evento (el mismo id lo actualiza).
create or replace function public.rpc_evento_guardar(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
begin
  perform public._exigir_staff_o('O-10');
  if length(coalesce(p ->> 'titulo', '')) < 3 then raise exception 'Escriba el nombre del evento'; end if;
  if nullif(p ->> 'inicio', '') is null then raise exception 'Falta la fecha y hora del evento'; end if;
  insert into public.eventos (id, titulo, tipo, descripcion, lugar, lat, lng, inicio, fin, zona_id, asistentes_estimados, creado_por)
  values (v_id, p ->> 'titulo', coalesce(nullif(p ->> 'tipo', ''), 'reunion_vereda'), nullif(p ->> 'descripcion', ''), nullif(p ->> 'lugar', ''),
          nullif(p ->> 'lat', '')::double precision, nullif(p ->> 'lng', '')::double precision, (p ->> 'inicio')::timestamptz,
          nullif(p ->> 'fin', '')::timestamptz, nullif(p ->> 'zona_id', '')::uuid, nullif(p ->> 'asistentes_estimados', '')::int, auth.uid())
  on conflict (id) do update set titulo = excluded.titulo, tipo = excluded.tipo, descripcion = excluded.descripcion, lugar = excluded.lugar,
    lat = excluded.lat, lng = excluded.lng, inicio = excluded.inicio, fin = excluded.fin, zona_id = excluded.zona_id,
    asistentes_estimados = excluded.asistentes_estimados, actualizado_en = now()
  where public.eventos.eliminado_en is null;
  perform public.fn_auditar('evento_guardar', 'evento', v_id::text, jsonb_build_object('titulo', p ->> 'titulo'));
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- Cancelar un evento: queda como lápida para que desaparezca de los teléfonos al sincronizar.
create or replace function public.rpc_evento_cancelar(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_staff_o('O-10');
  update public.eventos set eliminado_en = now(), actualizado_en = now() where id = p_id and eliminado_en is null;
  perform public.fn_auditar('evento_cancelar', 'evento', p_id::text);
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.rpc_evento_guardar(jsonb) from public, anon;
revoke all on function public.rpc_evento_cancelar(uuid) from public, anon;
grant execute on function public.rpc_evento_guardar(jsonb) to authenticated;
grant execute on function public.rpc_evento_cancelar(uuid) to authenticated;
