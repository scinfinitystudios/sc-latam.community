-- SC Gaming Bets: esquema inicial SOLO para pronósticos de demostración.
-- No almacena dinero, depósitos, retiros ni apuestas de valor monetario.
-- Revisar y ejecutar manualmente en Supabase SQL Editor después de confirmar el proyecto.

create extension if not exists pgcrypto;

create table if not exists public.esports_games (
  id text primary key,
  name text not null unique,
  icon text not null default '🎮',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.esports_matches (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.esports_games(id),
  team_a text not null,
  team_b text not null,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'live', 'finished', 'cancelled')),
  starts_at timestamptz,
  score_a integer,
  score_b integer,
  is_demo boolean not null default true,
  source_name text,
  source_match_id text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (team_a <> team_b)
);

create table if not exists public.esports_markets (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.esports_matches(id) on delete cascade,
  label text not null,
  odds numeric(8,3) not null check (odds > 1 and odds <= 1000),
  status text not null default 'open'
    check (status in ('open', 'suspended', 'settled', 'cancelled')),
  is_demo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.esports_demo_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  market_id uuid not null references public.esports_markets(id) on delete cascade,
  demo_points numeric(10,2) not null check (demo_points > 0 and demo_points <= 1000),
  odds_snapshot numeric(8,3) not null check (odds_snapshot > 1 and odds_snapshot <= 1000),
  hypothetical_return numeric(12,2) generated always as (round(demo_points * odds_snapshot, 2)) stored,
  created_at timestamptz not null default now()
);

create index if not exists esports_matches_game_status_idx
  on public.esports_matches(game_id, status, starts_at);
create index if not exists esports_markets_match_status_idx
  on public.esports_markets(match_id, status);
create index if not exists esports_demo_predictions_user_created_idx
  on public.esports_demo_predictions(user_id, created_at desc);

alter table public.esports_games enable row level security;
alter table public.esports_matches enable row level security;
alter table public.esports_markets enable row level security;
alter table public.esports_demo_predictions enable row level security;

drop policy if exists "Public can read active games" on public.esports_games;
create policy "Public can read active games"
  on public.esports_games for select
  using (is_active = true);

drop policy if exists "Public can read demo matches" on public.esports_matches;
create policy "Public can read demo matches"
  on public.esports_matches for select
  using (is_demo = true);

drop policy if exists "Public can read demo markets" on public.esports_markets;
create policy "Public can read demo markets"
  on public.esports_markets for select
  using (
    is_demo = true and exists (
      select 1 from public.esports_matches m
      where m.id = match_id and m.is_demo = true
    )
  );

drop policy if exists "Users can read their own demo predictions" on public.esports_demo_predictions;
create policy "Users can read their own demo predictions"
  on public.esports_demo_predictions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own demo predictions" on public.esports_demo_predictions;
create policy "Users can create their own demo predictions"
  on public.esports_demo_predictions for insert
  to authenticated
  with check (auth.uid() = user_id);

-- No UPDATE/DELETE policies are intentionally provided for demo predictions.
-- Seed the six supported games:
insert into public.esports_games (id, name, icon) values
  ('free-fire', 'Free Fire', '🔥'),
  ('minecraft', 'Minecraft', '⛏️'),
  ('valorant', 'Valorant', '🎯'),
  ('counter-strike-2', 'Counter-Strike 2', '🎮'),
  ('league-of-legends', 'League of Legends', '🛡️'),
  ('dota-2', 'Dota 2', '⚡')
on conflict (id) do update set name = excluded.name, icon = excluded.icon;
