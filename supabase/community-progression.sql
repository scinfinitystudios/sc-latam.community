-- SC LATAM Community: progression foundation (ranks, badges, and points).
-- Safe to run after profile-customization.sql. Does not change existing member data.
-- Members cannot award themselves points or badges from the browser; trusted server-side
-- logic/admin workflows must write to the ledger and member_badges tables.

create table if not exists public.sc_badges (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null default '🏅',
  category text not null default 'community'
    check (category in ('community', 'tournament', 'profile', 'special')),
  points_reward integer not null default 0
    check (points_reward >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.sc_member_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.sc_badges(id) on delete restrict,
  awarded_at timestamptz not null default now(),
  awarded_by uuid references auth.users(id) on delete set null,
  note text,
  primary key (user_id, badge_id)
);

create table if not exists public.sc_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null check (char_length(reason) between 2 and 160),
  source_type text not null default 'admin'
    check (source_type in ('admin', 'profile', 'event', 'tournament', 'badge', 'system')),
  source_id text,
  created_at timestamptz not null default now()
);

create index if not exists sc_member_badges_user_awarded_idx
  on public.sc_member_badges (user_id, awarded_at desc);
create index if not exists sc_points_ledger_user_created_idx
  on public.sc_points_ledger (user_id, created_at desc);
create index if not exists sc_points_ledger_source_idx
  on public.sc_points_ledger (source_type, source_id);

alter table public.sc_badges enable row level security;
alter table public.sc_member_badges enable row level security;
alter table public.sc_points_ledger enable row level security;

-- Public catalog contains only badge definitions, not private member information.
drop policy if exists "sc_badges_read_active" on public.sc_badges;
create policy "sc_badges_read_active"
  on public.sc_badges for select
  to anon, authenticated
  using (is_active = true);

-- Badge awards can be read by signed-in members; this table contains no email or profile data.
drop policy if exists "sc_member_badges_read_authenticated" on public.sc_member_badges;
create policy "sc_member_badges_read_authenticated"
  on public.sc_member_badges for select
  to authenticated
  using (true);

-- Members can read only their own points history.
drop policy if exists "sc_points_ledger_read_own" on public.sc_points_ledger;
create policy "sc_points_ledger_read_own"
  on public.sc_points_ledger for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Explicit least-privilege grants. No browser role can create or modify rewards.
revoke all on table public.sc_badges from anon, authenticated;
grant select on table public.sc_badges to anon, authenticated;

revoke all on table public.sc_member_badges from anon, authenticated;
grant select on table public.sc_member_badges to authenticated;

revoke all on table public.sc_points_ledger from anon, authenticated;
grant select on table public.sc_points_ledger to authenticated;

-- Starter badge catalog. Safe to rerun; existing definitions are refreshed.
insert into public.sc_badges (id, name, description, icon, category, points_reward, is_active, sort_order)
values
  ('welcome', 'Bienvenido a SC', 'Forma parte de SC LATAM Community.', '👋', 'community', 25, true, 10),
  ('profile_complete', 'Perfil listo', 'Completa la información básica de tu perfil.', '🪪', 'profile', 50, true, 20),
  ('community_member', 'Miembro activo', 'Participa de forma positiva en la comunidad.', '🤝', 'community', 50, true, 30),
  ('first_tournament', 'Primera competencia', 'Participa en tu primer torneo oficial.', '🎮', 'tournament', 100, true, 40),
  ('podium', 'En el podio', 'Consigue un puesto de podio en un torneo oficial.', '🥉', 'tournament', 250, true, 50),
  ('champion', 'Campeón SC', 'Gana un torneo oficial de SC LATAM.', '🏆', 'tournament', 500, true, 60),
  ('early_member', 'Pionero SC', 'Insignia especial para miembros seleccionados por el equipo.', '⭐', 'special', 0, true, 70)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  category = excluded.category,
  points_reward = excluded.points_reward,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

-- Rank thresholds are intentionally derived from total points (sum of ledger.amount),
-- rather than stored in a client-editable column:
-- 0-99 Novato | 100-299 Miembro | 300-699 Veterano | 700-1499 Élite | 1500+ Leyenda SC.
