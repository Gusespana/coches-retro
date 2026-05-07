import type { GameDNA } from "./dna-schema";

/**
 * DEFAULT GAME DNA
 * ================
 * This is the bootstrap DNA — used when Supabase is unreachable
 * (offline mode, first deploy, dev environment).
 *
 * It is also the seed for `supabase/seed.sql`.
 * Keep this in sync with the seed.
 */
export const DEFAULT_DNA: GameDNA = {
  version: "0.1.0",
  car: {
    maxSpeed: 6.0,
    acceleration: 0.12,
    braking: 0.2,
    turnRate: 0.05,
    drift: {
      factor: 0.92,
      threshold: 3.5,
    },
  },
  ai: {
    rivalCount: 3,
    rivalSpeedMultiplier: 0.85,
    aggressiveness: 0.5,
  },
  track: {
    length: 8000,
    curveDensity: 0.6,
    curvature: 0.04,
    width: 1500,
  },
  boosts: {
    frequency: 0.15,
    powerMultiplier: 1.6,
    durationMs: 1500,
  },
  fun: {
    crashForgiveness: 0.4,
    rubberBanding: 0.2,
  },
  meta: {
    raceDurationTargetSec: 60,
  },
};
