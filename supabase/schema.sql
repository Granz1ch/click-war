-- ============================================================
--  Click War — Supabase schema
--  ------------------------------------------------------------
--  Run this in the Supabase SQL Editor on your dashboard:
--      https://supabase.com/dashboard  ->  your project  ->  SQL Editor
--
--  After creating the tables, ALSO:
--    • Disable public registration via Auth (or keep anon signups
--      and let the app auth flow work against Supabase Auth).
--    • Enable Row Level Security (already on) and add the policies
--      defined at the bottom.
--    • Copy your project URL + anon key + service role key into
--      .env.local (see .env.example).
--
--  This file mirrors the local data model in lib/db.js so the two
--  backends are interchangeable.
-- ============================================================

-- ---------- profiles (players) ----------
create table if not exists public.players (
  id            uuid primary key default gen_random_uuid(),
  login         text unique not null,
  pass_hash     text not null,
  is_admin      boolean not null default false,
  banned        boolean not null default false,
  total_taps    bigint not null default 0,
  crystals      bigint not null default 0,
  rebirths      integer not null default 0,
  inventory     jsonb not null default '{}'::jsonb,   -- { pet_id: count }
  dex           jsonb not null default '[]'::jsonb,   -- [ pet_id ]
  skill_tree    jsonb not null default '{}'::jsonb,   -- { skill_id: level }
  created_at    timestamptz not null default now()
);

-- ---------- rooms ----------
create table if not exists public.rooms (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  tag           text unique not null,              -- up to 4 chars
  owner_id      uuid not null references public.players(id),
  max_players   integer not null default 10,
  created_at    timestamptz not null default now(),
  blocked       boolean not null default false,
  frozen        boolean not null default false,
  members       jsonb not null default '[]'::jsonb, -- [ player_id ]
  requests      jsonb not null default '[]'::jsonb, -- [ player_id ]
  chat          jsonb not null default '[]'::jsonb, -- [{ id, userId, login, text, at, special }]
  upgrades      jsonb not null default '{}'::jsonb, -- { upgrade_id: level }
  treasury      jsonb not null default '{"coins":0,"crystals":0,"star":0,"capacity":500,"petCapacity":10,"pets":{}}'::jsonb
);

-- ---------- promos ----------
create table if not exists public.promos (
  code          text primary key,
  title         text not null,
  rewards       jsonb not null default '{}'::jsonb, -- {coins?, crystals?, pets?:[{id,count}]}
  created_by    uuid references public.players(id),
  max_uses      integer,
  used_by       jsonb not null default '[]'::jsonb,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------- game log (optional, good for auditing) ----------
create table if not exists public.events (
  id            bigint generated always as identity primary key,
  room_id       uuid references public.rooms(id),
  player_id     uuid references public.players(id),
  kind          text not null,                      -- tap | hatch | deposit | ...
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

-- Logins must be unique case-insensitively (the app lowercases lookups).
create unique index if not exists players_login_lower_idx
  on public.players (lower(login));

-- ============================================================
--  Row Level Security
-- ============================================================
alter table public.players enable row level security;
alter table public.rooms enable row level security;
alter table public.promos enable row level security;
alter table public.events enable row level security;

-- Players: can see all profiles (for member lists) but only update self via
-- the service role from the server. The anon key is used for reads in the app.
create policy "players read all" on public.players
  for select using (true);

-- Rooms: readable by everyone (lobby). Writes go through the service role.
create policy "rooms read all" on public.rooms
  for select using (true);

create policy "promos read all" on public.promos
  for select using (true);

-- Only the service role (server) writes to players/rooms/promos/events.
-- Keep the anon key read-only for safety. Belos are open-by-name, so the
-- service role bypasses RLS automatically.

-- Useful helper view: room membership for the lobby.
create or replace view public.room_summary as
select
  r.id,
  r.name,
  r.tag,
  r.owner_id,
  r.max_players,
  r.created_at,
  r.blocked,
  r.frozen,
  jsonb_array_length(r.members) as member_count,
  (r.treasury->>'capacity')::bigint as capacity
from public.rooms r;

-- Optional convenience: enable realtime for room state sync.
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.promos;
