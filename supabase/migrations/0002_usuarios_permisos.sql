-- Pijao Nos Une · 0002 · usuarios, roles y permisos opcionales (sección 4)

create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text not null,
  celular text,
  correo text,
  foto_path text,
  rol text not null default 'colaborador' check (rol in ('admin','director','colaborador')),
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobado','activo','suspendido','baja')),
  tipo_vinculacion text check (tipo_vinculacion in ('voluntario','contratado')),
  es_servidor_publico boolean not null default false,
  es_contratista_estado boolean not null default false,
  mayor_de_edad boolean not null default false,
  contacto_emergencia_nombre text,
  contacto_emergencia_celular text,
  curso_aprobado_en timestamptz,
  curso_puntaje int,
  acuerdos_aceptados_en timestamptz,
  acuerdos_version text,
  invitado_por uuid,
  aprobado_por uuid,
  motivo_estado text,
  ultimo_acceso timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
-- R-01: solo puede existir una cuenta de Administrador. R-02: un solo Director activo.
create unique index if not exists uq_un_admin on public.perfiles (rol) where rol = 'admin';
create unique index if not exists uq_un_director_activo on public.perfiles (rol) where rol = 'director' and estado = 'activo';

create table if not exists public.invitaciones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  celular text,
  correo text,
  rol_destino text not null default 'colaborador' check (rol_destino in ('colaborador','director')),
  creado_por uuid not null,
  creado_en timestamptz not null default now(),
  expira_en timestamptz not null,
  usada_en timestamptz,
  usada_por uuid,
  estado text not null default 'pendiente' check (estado in ('pendiente','usada','vencida','cancelada'))
);

create table if not exists public.permisos_opcionales (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  codigo text not null references public.permisos_catalogo(codigo),
  otorgado_por uuid,
  otorgado_en timestamptz not null default now(),
  vence_en timestamptz,
  zonas uuid[],                       -- null = toda Pijao
  motivo text,
  activo boolean not null default true,
  actualizado_en timestamptz not null default now()
);
create unique index if not exists uq_permiso_activo on public.permisos_opcionales (usuario_id, codigo) where activo;

create trigger trg_touch_perfiles before update on public.perfiles
  for each row execute function public.fn_touch();
create trigger trg_touch_permisos before update on public.permisos_opcionales
  for each row execute function public.fn_touch();

-- ---------------------------------------------------------------- funciones de rol

create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid() and estado = 'activo'
$$;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'admin' from public.perfiles where id = auth.uid() and estado = 'activo'), false)
$$;

create or replace function public.es_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select rol in ('admin','director') from public.perfiles where id = auth.uid() and estado = 'activo'), false)
$$;

-- Permiso opcional vigente, con alcance por zona y verificación en dos pasos para los de riesgo alto.
create or replace function public.tiene_permiso(p_codigo text, p_zona uuid default null) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_staff() or exists (
    select 1
    from public.permisos_opcionales po
    join public.perfiles pf on pf.id = po.usuario_id and pf.estado = 'activo'
    join public.permisos_catalogo pc on pc.codigo = po.codigo
    where po.usuario_id = auth.uid()
      and po.codigo = p_codigo
      and po.activo
      and (po.vence_en is null or po.vence_en > now())
      and (po.zonas is null or (p_zona is not null and p_zona = any (po.zonas)))
      and (not pc.requiere_2fa or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2')
  )
$$;

create or replace function public.cfg_num(p_clave text, p_defecto numeric) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select (valor #>> '{}')::numeric from public.configuracion where clave = p_clave), p_defecto)
$$;

-- ---------------------------------------------------------------- altas de usuarios (auth)
-- Solo se puede crear una cuenta con: (a) el token de instalación del Administrador, o (b) un código de invitación vigente.

create or replace function public.fn_auth_antes_de_crear() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_token text;
begin
  if (v_meta ->> 'bootstrap_token') is not null then
    select valor ->> 'token' into v_token from public.instalacion where clave = 'bootstrap';
    if v_token is not null and v_token = (v_meta ->> 'bootstrap_token')
       and not exists (select 1 from public.perfiles where rol = 'admin') then
      return new;
    end if;
    raise exception 'Instalación no autorizada' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.invitaciones
    where codigo = upper(coalesce(v_meta ->> 'codigo_invitacion', ''))
      and estado = 'pendiente' and expira_en > now()
  ) then
    raise exception 'Se necesita una invitación vigente' using errcode = '42501';
  end if;
  return new;
end $$;

create or replace function public.fn_auth_despues_de_crear() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_inv public.invitaciones;
  v_rol text;
  v_estado text;
  v_serv boolean := coalesce((v_meta ->> 'es_servidor_publico')::boolean, false);
  v_contr boolean := coalesce((v_meta ->> 'es_contratista_estado')::boolean, false);
begin
  if (v_meta ->> 'bootstrap_token') is not null then
    insert into public.perfiles (id, nombre_completo, correo, rol, estado, mayor_de_edad, curso_aprobado_en, acuerdos_aceptados_en)
    values (new.id, coalesce(nullif(v_meta ->> 'nombre_completo', ''), 'Administrador'), new.email, 'admin', 'activo', true, now(), now());
    delete from public.instalacion where clave = 'bootstrap';
    return new;
  end if;

  select * into v_inv from public.invitaciones
   where codigo = upper(coalesce(v_meta ->> 'codigo_invitacion', '')) and estado = 'pendiente'
   limit 1;
  v_rol := coalesce(v_inv.rol_destino, 'colaborador');
  v_estado := case when v_rol = 'director' then 'activo' else 'pendiente' end;

  insert into public.perfiles (
    id, nombre_completo, celular, correo, rol, estado, tipo_vinculacion, es_servidor_publico, es_contratista_estado,
    mayor_de_edad, contacto_emergencia_nombre, contacto_emergencia_celular, invitado_por,
    curso_aprobado_en, acuerdos_aceptados_en)
  values (
    new.id,
    coalesce(nullif(v_meta ->> 'nombre_completo', ''), v_inv.nombre),
    coalesce(nullif(v_meta ->> 'celular', ''), v_inv.celular),
    new.email, v_rol, v_estado,
    nullif(v_meta ->> 'tipo_vinculacion', ''), v_serv, v_contr,
    coalesce((v_meta ->> 'mayor_de_edad')::boolean, false),
    v_meta ->> 'contacto_emergencia_nombre', v_meta ->> 'contacto_emergencia_celular', v_inv.creado_por,
    case when v_rol = 'director' then now() end,
    case when v_rol = 'director' then now() end);

  update public.invitaciones set estado = 'usada', usada_en = now(), usada_por = new.id where id = v_inv.id;

  if v_serv or v_contr then   -- R-07: alerta al Director para revisión del abogado
    insert into public.alertas_calidad (tipo, severidad, usuario_id, detalle)
    values ('servidor_publico_o_contratista', 'media', new.id,
            jsonb_build_object('es_servidor_publico', v_serv, 'es_contratista_estado', v_contr));
  end if;
  return new;
end $$;

drop trigger if exists trg_auth_antes on auth.users;
create trigger trg_auth_antes before insert on auth.users
  for each row execute function public.fn_auth_antes_de_crear();
drop trigger if exists trg_auth_despues on auth.users;
create trigger trg_auth_despues after insert on auth.users
  for each row execute function public.fn_auth_despues_de_crear();
