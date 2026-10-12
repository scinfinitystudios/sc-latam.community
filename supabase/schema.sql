-- SC LATAM Community: initial schema.
-- Run in Supabase SQL Editor. Never put service_role keys in the website.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  game_user_id text not null,
  contact text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  status text not null default 'upcoming' check (status in ('draft', 'upcoming', 'active', 'completed', 'cancelled')),
  starts_at timestamptz,
  prize text,
  registration_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  status text not null default 'upcoming' check (status in ('draft', 'upcoming', 'active', 'completed', 'cancelled')),
  starts_at timestamptz,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  edition text not null default 'Bedrock',
  host text,
  port integer,
  status text not null default 'unknown' check (status in ('online', 'offline', 'maintenance', 'unknown')),
  description text not null default '',
  public_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint servers_port_range check (port is null or port between 1 and 65535)
);

create table if not exists public.champions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete set null,
  tournament_title text not null,
  champion_name text not null,
  placement integer not null default 1 check (placement > 0),
  notes text,
  awarded_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Security-definer avoids recursive RLS when policies need to check an admin role.
create or replace function public.is_sc_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_sc_admin() from public;
grant execute on function public.is_sc_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.tournaments enable row level security;
alter table public.events enable row level security;
alter table public.servers enable row level security;
alter table public.champions enable row level security;
alter table public.admin_audit_log enable row level security;

-- A user may read their own profile. Only admins may manage profiles.
drop policy if exists "profile_select_self_or_admin" on public.profiles;
create policy "profile_select_self_or_admin" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or (select public.is_sc_admin()));

drop policy if exists "profile_admin_manage" on public.profiles;
create policy "profile_admin_manage" on public.profiles
for all to authenticated
using ((select public.is_sc_admin()))
with check ((select public.is_sc_admin()));

-- All member records contain personal information: admins only.
drop policy if exists "members_admin_only" on public.members;
create policy "members_admin_only" on public.members
for all to authenticated
using ((select public.is_sc_admin()))
with check ((select public.is_sc_admin()));

-- Public visitors can read published/upcoming content; only admins can write.
drop policy if exists "tournaments_public_read" on public.tournaments;
create policy "tournaments_public_read" on public.tournaments
for select to anon, authenticated
using (status in ('upcoming', 'active', 'completed'));

drop policy if exists "tournaments_admin_manage" on public.tournaments;
create policy "tournaments_admin_manage" on public.tournaments
for all to authenticated
using ((select public.is_sc_admin()))
with check ((select public.is_sc_admin()));

drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events
for select to anon, authenticated
using (status in ('upcoming', 'active', 'completed'));

drop policy if exists "events_admin_manage" on public.events;
create policy "events_admin_manage" on public.events
for all to authenticated
using ((select public.is_sc_admin()))
with check ((select public.is_sc_admin()));

drop policy if exists "servers_public_read" on public.servers;
create policy "servers_public_read" on public.servers
for select to anon, authenticated
using (public_visible = true);

drop policy if exists "servers_admin_manage" on public.servers;
create policy "servers_admin_manage" on public.servers
for all to authenticated
using ((select public.is_sc_admin()))
with check ((select public.is_sc_admin()));

drop policy if exists "champions_public_read" on public.champions;
create policy "champions_public_read" on public.champions
for select to anon, authenticated
using (true);

drop policy if exists "champions_admin_manage" on public.champions;
create policy "champions_admin_manage" on public.champions
for all to authenticated
using ((select public.is_sc_admin()))
with check ((select public.is_sc_admin()));

-- Audit records are visible to admins and cannot be edited by ordinary clients.
drop policy if exists "audit_admin_read" on public.admin_audit_log;
create policy "audit_admin_read" on public.admin_audit_log
for select to authenticated
using ((select public.is_sc_admin()));

drop policy if exists "audit_admin_insert" on public.admin_audit_log;
create policy "audit_admin_insert" on public.admin_audit_log
for insert to authenticated
with check ((select public.is_sc_admin()) and actor_id = (select auth.uid()));

-- Indexes for common admin queries.
create index if not exists members_created_at_idx on public.members (created_at desc);
create index if not exists members_status_idx on public.members (status);
create index if not exists tournaments_status_idx on public.tournaments (status);
create index if not exists events_status_idx on public.events (status);
create index if not exists champions_awarded_at_idx on public.champions (awarded_at desc);

-- IMPORTANT: create the first auth user in Supabase Dashboard, then assign admin role
-- by running the separate statement in ADMIN_SETUP.md after substituting that user's UUID.
