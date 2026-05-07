-- =====================================================================
-- EVOLUTION ANALYTICS QUERIES
-- =====================================================================
-- These are the building blocks for the future AI evolution system.
-- Each query produces a metric that maps to one or more DNA fields.
-- The eventual AI job will run these (or refinements of them) and
-- decide which DNA fields to nudge.

-- ---------------------------------------------------------------------
-- COMPLETION RATE per DNA version
-- Maps to: ai.rivalSpeedMultiplier, fun.crashForgiveness, track.length
-- Low completion rate => game is too hard => relax difficulty
-- ---------------------------------------------------------------------
select
  dna_version,
  count(*) filter (where type = 'race_start') as starts,
  count(*) filter (where type = 'race_end' and (payload->>'finished')::boolean) as finishes,
  round(
    100.0 * count(*) filter (where type = 'race_end' and (payload->>'finished')::boolean)
    / nullif(count(*) filter (where type = 'race_start'), 0),
    1
  ) as completion_rate_pct
from telemetry_events
where server_ts > now() - interval '7 days'
group by dna_version
order by dna_version;

-- ---------------------------------------------------------------------
-- ABANDON CURVE — when do players quit?
-- Maps to: meta.raceDurationTargetSec, track.length
-- If most abandons happen at <30% progress, races are too long or boring upfront.
-- ---------------------------------------------------------------------
select
  dna_version,
  width_bucket(((payload->>'progress_pct')::float)::numeric, 0, 1, 10) as progress_decile,
  count(*) as abandons
from telemetry_events
where type = 'abandon'
  and server_ts > now() - interval '7 days'
group by dna_version, progress_decile
order by dna_version, progress_decile;

-- ---------------------------------------------------------------------
-- CRASHES PER SESSION
-- Maps to: car.turnRate, car.drift.*, track.curvature, fun.crashForgiveness
-- ---------------------------------------------------------------------
select
  dna_version,
  count(*) filter (where type = 'crash')::float
    / nullif(count(distinct session_id), 0) as crashes_per_session
from telemetry_events
where server_ts > now() - interval '7 days'
group by dna_version
order by dna_version;

-- ---------------------------------------------------------------------
-- BOOST USAGE
-- Maps to: boosts.frequency, boosts.powerMultiplier
-- If usage is very low, players aren't seeing/finding boosts — frequency too low,
-- or they're skipping them — pad placement isn't appealing.
-- ---------------------------------------------------------------------
select
  dna_version,
  avg(boosts_per_race) as avg_boosts_per_race
from (
  select
    session_id,
    dna_version,
    count(*) filter (where type = 'boost_used') as boosts_per_race
  from telemetry_events
  where server_ts > now() - interval '7 days'
  group by session_id, dna_version
) s
group by dna_version
order by dna_version;

-- ---------------------------------------------------------------------
-- DRIFT ENGAGEMENT — total drift seconds per finished race
-- Maps to: car.drift.threshold, car.drift.factor, track.curvature
-- ---------------------------------------------------------------------
select
  dna_version,
  round(avg((payload->>'duration_ms')::float / 1000), 2) as avg_drift_seconds
from telemetry_events
where type = 'drift'
  and server_ts > now() - interval '7 days'
group by dna_version;

-- ---------------------------------------------------------------------
-- AVERAGE RACE DURATION (finished races only)
-- Maps to: meta.raceDurationTargetSec, track.length, ai.rivalSpeedMultiplier
-- ---------------------------------------------------------------------
select
  dna_version,
  round(avg((payload->>'duration_ms')::float / 1000), 1) as avg_seconds,
  count(*) as sample_size
from telemetry_events
where type = 'race_end'
  and (payload->>'finished')::boolean = true
  and server_ts > now() - interval '7 days'
group by dna_version
order by dna_version;
