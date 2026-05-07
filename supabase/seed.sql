-- =====================================================================
-- EVOLVING RACING GAME — SEED
-- =====================================================================
-- Run this AFTER schema.sql to insert the bootstrap Game DNA.
-- This must mirror DEFAULT_DNA in src/lib/dna-default.ts

insert into public.game_dna (version, dna, is_active, notes, created_by)
values (
  '0.1.0',
  '{
    "version": "0.1.0",
    "car": {
      "maxSpeed": 6.0,
      "acceleration": 0.12,
      "braking": 0.2,
      "turnRate": 0.05,
      "drift": { "factor": 0.92, "threshold": 3.5 }
    },
    "ai": {
      "rivalCount": 3,
      "rivalSpeedMultiplier": 0.85,
      "aggressiveness": 0.5
    },
    "track": {
      "length": 8000,
      "curveDensity": 0.6,
      "curvature": 0.04,
      "width": 1500
    },
    "boosts": {
      "frequency": 0.15,
      "powerMultiplier": 1.6,
      "durationMs": 1500
    },
    "fun": {
      "crashForgiveness": 0.4,
      "rubberBanding": 0.2
    },
    "meta": {
      "raceDurationTargetSec": 60
    }
  }'::jsonb,
  true,
  'Bootstrap DNA — initial values from DEFAULT_DNA',
  'manual'
)
on conflict do nothing;

-- Initial evolution log entry
insert into public.dna_evolution_log
  (from_version, to_version, proposed_by, diff, reason, approved, applied)
values (
  null,
  '0.1.0',
  'manual',
  '{}'::jsonb,
  'Initial bootstrap DNA',
  true,
  true
);
