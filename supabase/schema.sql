-- =====================================================================
-- EVOLVING RACING GAME — SUPABASE SCHEMA
-- =====================================================================
-- Run this in the Supabase SQL editor to set up the database.
-- Then run seed.sql to insert the default Game DNA.

-- ---------------------------------------------------------------------
-- 1. game_dna
-- Stores every version of the Game DNA. Only one row should be active
-- at a time (enforced by unique partial index).
-- ---------------------------------------------------------------------
create table if not exists public.game_dna (
  id            uuid primary key default gen_random_uuid(),
  version       text not null,
  dna           jsonb not null,
  is_active     boolean not null default false,
  notes         text,
  created_at    timestamptz not null default now(),
  created_by    text default 'manual'  -- 'manual' | 'ai-evolution'
);

create unique index if not exists game_dna_one_active
  on public.game_dna (is_active)
  where is_active = true;

create index if not exists game_dna_version_idx
  on public.game_dna (version);

-- ---------------------------------------------------------------------
-- 2. telemetry_events
-- The raw event log. AI evolution will aggregate from here.
-- Indexed by dna_version + type for fast cohort queries.
-- ---------------------------------------------------------------------
create table if not exists public.telemetry_events (
  id              bigserial primary key,
  type            text not null,
  session_id      uuid not null,
  dna_version     text not null,
  track_seed      bigint not null,
  time_in_race_ms integer not null,
  payload         jsonb not null default '{}'::jsonb,
  client_ts       timestamptz not null,
  server_ts       timestamptz not null default now()
);

create index if not exists telemetry_dna_type_idx
  on public.telemetry_events (dna_version, type);

create index if not exists telemetry_session_idx
  on public.telemetry_events (session_id);

create index if not exists telemetry_server_ts_idx
  on public.telemetry_events (server_ts desc);

-- ---------------------------------------------------------------------
-- 3. dna_evolution_log
-- Audit trail for every DNA change. AI proposals land here BEFORE being
-- promoted to active in game_dna.
-- ---------------------------------------------------------------------
create table if not exists public.dna_evolution_log (
  id                bigserial primary key,
  from_version      text,
  to_version        text not null,
  proposed_by       text not null,         -- 'manual' | 'ai-job-name'
  diff              jsonb not null,        -- { "car.maxSpeed": { from: 6.0, to: 6.5 } }
  reason            text,                  -- human or AI rationale
  approved          boolean not null default false,
  applied           boolean not null default false,
  metrics_snapshot  jsonb,                 -- aggregate metrics that justified the change
  created_at        timestamptz not null default now()
);

create index if not exists dna_evo_to_version_idx
  on public.dna_evolution_log (to_version);

-- ---------------------------------------------------------------------
-- 4. RLS POLICIES
-- ---------------------------------------------------------------------
-- For MVP: telemetry is anon-insert only, DNA is anon-read only.
-- All admin work happens through the Supabase dashboard with the
-- service-role key (server-side, never exposed to the client).

alter table public.game_dna enable row level security;
alter table public.telemetry_events enable row level security;
alter table public.dna_evolution_log enable row level security;

-- Anon can read the active DNA (and that's it)
create policy "anon reads active dna"
  on public.game_dna
  for select
  to anon
  using (is_active = true);

-- Anon can insert telemetry events (and that's it)
create policy "anon inserts telemetry"
  on public.telemetry_events
  for insert
  to anon
  with check (true);

-- dna_evolution_log: no anon access at all (admin/service-role only)
-- (No policy = no access under RLS)
