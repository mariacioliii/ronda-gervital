-- Ronda 2.0: entrar con usuario y contraseña desde cualquier celular (siempre Gervital)
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.cuentas (
  usuario text primary key,
  centro uuid not null references public.centros(id) on delete cascade,
  staff text not null,
  hash text not null,
  clave_centro text not null,
  activo boolean not null default true,
  creado timestamptz not null default now(),
  unique (centro, staff)
);
alter table public.cuentas enable row level security;
revoke all on public.cuentas from anon, authenticated;

create table if not exists public.intentos (usuario text not null, cuando timestamptz not null default now());
alter table public.intentos enable row level security;
revoke all on public.intentos from anon, authenticated;

create or replace function public.ronda_hay_cuentas()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.cuentas) $$;

create or replace function public.ronda_primer_admin(p_clave text, p_usuario text, p_pass text, p_staff text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare c uuid := public.ronda_centro(p_clave);
begin
  if c is null then raise exception 'centro no encontrado'; end if;
  if exists (select 1 from public.cuentas) then raise exception 'ya hay cuentas'; end if;
  if length(coalesce(p_pass, '')) < 4 then raise exception 'contraseña corta'; end if;
  insert into public.cuentas (usuario, centro, staff, hash, clave_centro)
  values (lower(trim(p_usuario)), c, p_staff, extensions.crypt(p_pass, extensions.gen_salt('bf')), p_clave);
  return true;
end $$;

create or replace function public.ronda_cuenta_guardar(p_clave text, p_staff text, p_usuario text, p_pass text default null, p_activo boolean default true)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare c uuid := public.ronda_centro(p_clave); u text := lower(trim(coalesce(p_usuario, '')));
begin
  if c is null then raise exception 'centro no encontrado'; end if;
  if length(u) < 3 then raise exception 'usuario corto'; end if;
  if exists (select 1 from public.cuentas where usuario = u and not (centro = c and staff = p_staff)) then raise exception 'usuario ocupado'; end if;
  if p_pass is not null and length(p_pass) < 4 then raise exception 'contraseña corta'; end if;
  if exists (select 1 from public.cuentas where centro = c and staff = p_staff) then
    update public.cuentas set usuario = u, activo = coalesce(p_activo, true),
      hash = case when p_pass is null then hash else extensions.crypt(p_pass, extensions.gen_salt('bf')) end
    where centro = c and staff = p_staff;
  else
    if p_pass is null then raise exception 'falta contraseña'; end if;
    insert into public.cuentas (usuario, centro, staff, hash, clave_centro, activo)
    values (u, c, p_staff, extensions.crypt(p_pass, extensions.gen_salt('bf')), p_clave, coalesce(p_activo, true));
  end if;
  return true;
end $$;

create or replace function public.ronda_entrar(p_usuario text, p_pass text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare u text := lower(trim(coalesce(p_usuario, ''))); r record;
begin
  delete from public.intentos where cuando < now() - interval '15 minutes';
  if (select count(*) from public.intentos where usuario = u) >= 8 then raise exception 'muchos intentos'; end if;
  select * into r from public.cuentas where usuario = u and activo;
  if r is null or r.hash <> extensions.crypt(coalesce(p_pass, ''), r.hash) then
    insert into public.intentos (usuario) values (u);
    return null;
  end if;
  delete from public.intentos where usuario = u;
  return jsonb_build_object('clave', r.clave_centro, 'staff', r.staff);
end $$;

create or replace function public.ronda_cambiar_pass(p_usuario text, p_actual text, p_nueva text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare u text := lower(trim(coalesce(p_usuario, ''))); r record;
begin
  if length(coalesce(p_nueva, '')) < 4 then raise exception 'contraseña corta'; end if;
  select * into r from public.cuentas where usuario = u and activo;
  if r is null or r.hash <> extensions.crypt(coalesce(p_actual, ''), r.hash) then return false; end if;
  update public.cuentas set hash = extensions.crypt(p_nueva, extensions.gen_salt('bf')) where usuario = u;
  return true;
end $$;

grant execute on function public.ronda_hay_cuentas() to anon;
grant execute on function public.ronda_primer_admin(text, text, text, text) to anon;
grant execute on function public.ronda_cuenta_guardar(text, text, text, text, boolean) to anon;
grant execute on function public.ronda_entrar(text, text) to anon;
grant execute on function public.ronda_cambiar_pass(text, text, text) to anon;
