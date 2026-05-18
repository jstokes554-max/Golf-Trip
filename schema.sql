-- =====================================================
-- Golf Trip Schema
-- Run this in the Supabase SQL editor.
-- =====================================================

create extension if not exists "pgcrypto";

-- ----- TABLES -----

create table trips (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text,
  team_names jsonb default '["Team Alpha","Team Bravo"]'::jsonb,
  created_at timestamptz default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null,
  handicap int not null,
  team int,
  created_at timestamptz default now()
);
create index players_trip_id_idx on players(trip_id);

create table courses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  round_id int not null,
  name text default '',
  par jsonb not null,
  si jsonb not null,
  unique (trip_id, round_id)
);
create index courses_trip_id_idx on courses(trip_id);

create table matches (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  round_id int not null,
  side_a jsonb not null,
  side_b jsonb not null,
  manual_result text,
  created_at timestamptz default now()
);
create index matches_trip_id_round_id_idx on matches(trip_id, round_id);

create table scores (
  match_id uuid not null references matches(id) on delete cascade,
  score_key text not null,
  hole_index int not null check (hole_index between 0 and 17),
  gross text,
  updated_at timestamptz default now(),
  primary key (match_id, score_key, hole_index)
);
create index scores_match_id_idx on scores(match_id);

-- ----- ROW LEVEL SECURITY -----
-- Public on every table. Access control is via the trip code in the URL.

alter table trips    enable row level security;
alter table players  enable row level security;
alter table courses  enable row level security;
alter table matches  enable row level security;
alter table scores   enable row level security;

create policy "public_all" on trips    for all using (true) with check (true);
create policy "public_all" on players  for all using (true) with check (true);
create policy "public_all" on courses  for all using (true) with check (true);
create policy "public_all" on matches  for all using (true) with check (true);
create policy "public_all" on scores   for all using (true) with check (true);

-- ----- REALTIME -----

alter publication supabase_realtime add table trips;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table courses;
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table scores;
