-- Pijao Nos Une · 0005 · seguridad: RLS, permisos mínimos, vistas enmascaradas y almacenamiento privado (8.4, 8.5)
--
-- Principio: la app NO escribe directamente en las tablas. Toda escritura pasa por funciones rpc_* que validan
-- las reglas de negocio (R-xx) dentro de la base de datos. La app solo lee lo que cada rol puede ver.

-- 1) Nadie hereda permisos por defecto.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;
grant usage on schema public to authenticated;

-- 2) Activar RLS en todas las tablas.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- 3) Funciones auxiliares que usan las políticas.
grant execute on function public.mi_rol() to authenticated;
grant execute on function public.es_admin() to authenticated;
grant execute on function public.es_staff() to authenticated;
grant execute on function public.tiene_permiso(text, uuid) to authenticated;
grant execute on function public.cfg_num(text, numeric) to authenticated;

-- 4) Lectura general para cuentas activas (el mapa completo es de todo el equipo).
do $$
declare t text;
begin
  foreach t in array array[
    'catalogos','configuracion','zonas','asignaciones_zona','viviendas','hogares','visitas','fotos',
    'necesidades','anuncios','permisos_catalogo','plantillas_permisos'
  ] loop
    execute format('grant select on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', 'sel_activos_' || t, t);
    execute format('create policy %I on public.%I for select to authenticated using (public.mi_rol() is not null)',
                   'sel_activos_' || t, t);
  end loop;
end $$;

-- 5) Lectura restringida.
grant select on public.textos_legales to authenticated;
drop policy if exists sel_textos on public.textos_legales;
create policy sel_textos on public.textos_legales for select to authenticated using (true);

grant select on public.perfiles to authenticated;
drop policy if exists sel_perfiles on public.perfiles;
create policy sel_perfiles on public.perfiles for select to authenticated
  using (id = auth.uid() or public.es_staff() or public.tiene_permiso('O-08'));

grant select on public.invitaciones to authenticated;
drop policy if exists sel_invitaciones on public.invitaciones;
create policy sel_invitaciones on public.invitaciones for select to authenticated
  using (public.es_staff() or public.tiene_permiso('O-08'));

grant select on public.permisos_opcionales to authenticated;
drop policy if exists sel_permisos on public.permisos_opcionales;
create policy sel_permisos on public.permisos_opcionales for select to authenticated
  using (usuario_id = auth.uid() or public.es_staff());

grant select on public.consentimientos to authenticated;
drop policy if exists sel_consentimientos on public.consentimientos;
create policy sel_consentimientos on public.consentimientos for select to authenticated
  using (public.es_staff() or recogido_por = auth.uid());

grant select on public.tareas to authenticated;
drop policy if exists sel_tareas on public.tareas;
create policy sel_tareas on public.tareas for select to authenticated
  using (asignado_a = auth.uid() or creado_por = auth.uid() or public.es_staff() or public.tiene_permiso('O-09'));

grant select on public.anuncios_lecturas to authenticated;
drop policy if exists sel_lecturas on public.anuncios_lecturas;
create policy sel_lecturas on public.anuncios_lecturas for select to authenticated
  using (usuario_id = auth.uid() or public.es_staff());

grant select on public.jornadas to authenticated;
drop policy if exists sel_jornadas on public.jornadas;
create policy sel_jornadas on public.jornadas for select to authenticated
  using (usuario_id = auth.uid() or public.es_staff() or public.tiene_permiso('O-21'));

grant select on public.ubicaciones_jornada to authenticated;
drop policy if exists sel_ubicaciones on public.ubicaciones_jornada;
create policy sel_ubicaciones on public.ubicaciones_jornada for select to authenticated
  using (usuario_id = auth.uid() or public.es_staff() or public.tiene_permiso('O-21'));

grant select on public.sos_alertas to authenticated;
drop policy if exists sel_sos on public.sos_alertas;
create policy sel_sos on public.sos_alertas for select to authenticated
  using (usuario_id = auth.uid() or public.es_staff());

grant select on public.alertas_calidad to authenticated;
drop policy if exists sel_alertas on public.alertas_calidad;
create policy sel_alertas on public.alertas_calidad for select to authenticated
  using (public.es_staff() or public.tiene_permiso('O-07'));

grant select on public.verificaciones to authenticated;
drop policy if exists sel_verificaciones on public.verificaciones;
create policy sel_verificaciones on public.verificaciones for select to authenticated
  using (public.es_staff() or public.tiene_permiso('O-07'));

grant select on public.incidentes to authenticated;
drop policy if exists sel_incidentes on public.incidentes;
create policy sel_incidentes on public.incidentes for select to authenticated
  using (reportado_por = auth.uid() or public.es_staff());

grant select on public.solicitudes_titulares to authenticated;
drop policy if exists sel_titulares on public.solicitudes_titulares;
create policy sel_titulares on public.solicitudes_titulares for select to authenticated
  using (registrado_por = auth.uid() or public.es_staff());

grant select on public.dispositivos to authenticated;
drop policy if exists sel_dispositivos on public.dispositivos;
create policy sel_dispositivos on public.dispositivos for select to authenticated
  using (usuario_id = auth.uid() or public.es_admin());

grant select on public.exportaciones to authenticated;
drop policy if exists sel_exportaciones on public.exportaciones;
create policy sel_exportaciones on public.exportaciones for select to authenticated
  using (public.es_staff());

grant select on public.auditoria to authenticated;
drop policy if exists sel_auditoria on public.auditoria;
create policy sel_auditoria on public.auditoria for select to authenticated
  using (public.es_admin()
         or (public.es_staff() and entidad not in ('seguridad', 'sesion'))
         or usuario_id = auth.uid());

-- 'personas' e 'instalacion' no tienen ningún permiso ni política: son inaccesibles desde la app.

-- 6) Vistas.
-- Personas enmascaradas (7.4): nombre y primer apellido, solo los últimos dígitos de cédula y teléfono, solo la edad.
create or replace view public.personas_v as
select
  p.id, p.hogar_id, p.vivienda_id,
  trim(concat_ws(' ', p.primer_nombre, p.primer_apellido)) as nombre_visible,
  p.apodo,
  case when p.fecha_nacimiento is not null
       then date_part('year', age(current_date, p.fecha_nacimiento))::int end as edad_anios,
  p.sexo, p.ocupacion,
  p.cedula_ult3, p.telefono_ult4, p.correo_parcial,
  p.canal_preferido, p.mejor_horario, p.anios_en_pijao, p.vive_en_otra_ciudad,
  p.vota_en_pijao, p.interes_info, p.voluntario, p.anfitrion, p.temas_interes, p.estado,
  exists (select 1 from public.consentimientos c
          where c.persona_id = p.id and c.estado = 'vigente' and c.proposito like 'contacto\_%') as tiene_contacto_autorizado,
  p.creado_por, p.creado_en, p.actualizado_en, p.eliminado_en
from public.personas p
where public.mi_rol() is not null;
grant select on public.personas_v to authenticated;

create or replace view public.directorio_v as
select id, nombre_completo, foto_path, rol, estado, actualizado_en
from public.perfiles
where public.mi_rol() is not null;
grant select on public.directorio_v to authenticated;

-- 7) Almacenamiento privado (8.5): no hay enlaces públicos; la app pide enlaces temporales.
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('documentos', 'documentos', false) on conflict (id) do nothing;

drop policy if exists pijao_fotos_leer on storage.objects;
create policy pijao_fotos_leer on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and public.mi_rol() is not null);
drop policy if exists pijao_fotos_subir on storage.objects;
create policy pijao_fotos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.mi_rol() is not null);
drop policy if exists pijao_docs_subir on storage.objects;
create policy pijao_docs_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and public.mi_rol() is not null);
drop policy if exists pijao_docs_leer on storage.objects;
create policy pijao_docs_leer on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and public.es_staff());
