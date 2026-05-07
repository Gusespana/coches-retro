/**
 * GAME DNA SCHEMA
 * ===============
 * This is the contract between the (stable) engine and the (evolving) data.
 * The engine NEVER reads anything outside this shape.
 * AI evolution NEVER writes anything outside this shape.
 *
 * Every field has a `min` and `max` defined in DNA_BOUNDS — these are
 * safety rails so AI cannot push the game into unplayable territory.
 */

export interface GameDNA {
  version: string;              // semver, e.g. "0.1.0"
  car: {
    maxSpeed: number;           // px / frame (at 60fps)
    acceleration: number;       // delta per frame while throttling
    braking: number;            // delta per frame while braking
    turnRate: number;           // radians per frame at full lock
    drift: {
      factor: number;           // 0..1, lateral velocity preserved per frame
      threshold: number;        // speed at which drift starts kicking in
    };
  };
  ai: {
    rivalCount: number;         // 0..6
    rivalSpeedMultiplier: number; // 0..1.2 — fraction of player maxSpeed
    aggressiveness: number;     // 0..1 — how often rivals try to block
  };
  track: {
    length: number;             // total track length in px
    curveDensity: number;       // 0..1 — probability of a curve segment
    curvature: number;          // max radians per segment
    width: number;              // track width in px
  };
  boosts: {
    frequency: number;          // 0..1 — chance per segment of a boost pad
    powerMultiplier: number;    // 1..2.5 — speed multiplier when active
    durationMs: number;         // boost duration
  };
  fun: {
    crashForgiveness: number;   // 0..1 — how much speed survives a crash
    rubberBanding: number;      // 0..1 — rivals slow down when player is behind
  };
  meta: {
    raceDurationTargetSec: number; // 30..120 — design target, not enforced
  };
}

/**
 * SAFETY BOUNDS
 * Any AI-proposed DNA must be clamped to these ranges before being applied.
 * If you add a new field to DNA, add its bounds here too.
 */
export const DNA_BOUNDS = {
  car: {
    maxSpeed: { min: 3, max: 10 },
    acceleration: { min: 0.05, max: 0.25 },
    braking: { min: 0.1, max: 0.4 },
    turnRate: { min: 0.02, max: 0.08 },
    drift: {
      factor: { min: 0.7, max: 0.98 },
      threshold: { min: 1, max: 6 },
    },
  },
  ai: {
    rivalCount: { min: 0, max: 6 },
    rivalSpeedMultiplier: { min: 0.4, max: 1.1 },
    aggressiveness: { min: 0, max: 1 },
  },
  track: {
    length: { min: 3000, max: 20000 },
    curveDensity: { min: 0.1, max: 0.9 },
    curvature: { min: 0.01, max: 0.08 },
    width: { min: 800, max: 2400 },
  },
  boosts: {
    frequency: { min: 0, max: 0.4 },
    powerMultiplier: { min: 1, max: 2.5 },
    durationMs: { min: 500, max: 4000 },
  },
  fun: {
    crashForgiveness: { min: 0, max: 1 },
    rubberBanding: { min: 0, max: 1 },
  },
  meta: {
    raceDurationTargetSec: { min: 30, max: 180 },
  },
} as const;

/**
 * Clamp a candidate DNA against the safety bounds.
 * This MUST be called before applying any DNA from Supabase or from AI.
 */
export function clampDNA(dna: GameDNA): GameDNA {
  const c = (v: number, { min, max }: { min: number; max: number }) =>
    Math.max(min, Math.min(max, v));

  return {
    version: dna.version,
    car: {
      maxSpeed: c(dna.car.maxSpeed, DNA_BOUNDS.car.maxSpeed),
      acceleration: c(dna.car.acceleration, DNA_BOUNDS.car.acceleration),
      braking: c(dna.car.braking, DNA_BOUNDS.car.braking),
      turnRate: c(dna.car.turnRate, DNA_BOUNDS.car.turnRate),
      drift: {
        factor: c(dna.car.drift.factor, DNA_BOUNDS.car.drift.factor),
        threshold: c(dna.car.drift.threshold, DNA_BOUNDS.car.drift.threshold),
      },
    },
    ai: {
      rivalCount: Math.round(c(dna.ai.rivalCount, DNA_BOUNDS.ai.rivalCount)),
      rivalSpeedMultiplier: c(
        dna.ai.rivalSpeedMultiplier,
        DNA_BOUNDS.ai.rivalSpeedMultiplier
      ),
      aggressiveness: c(dna.ai.aggressiveness, DNA_BOUNDS.ai.aggressiveness),
    },
    track: {
      length: c(dna.track.length, DNA_BOUNDS.track.length),
      curveDensity: c(dna.track.curveDensity, DNA_BOUNDS.track.curveDensity),
      curvature: c(dna.track.curvature, DNA_BOUNDS.track.curvature),
      width: c(dna.track.width, DNA_BOUNDS.track.width),
    },
    boosts: {
      frequency: c(dna.boosts.frequency, DNA_BOUNDS.boosts.frequency),
      powerMultiplier: c(
        dna.boosts.powerMultiplier,
        DNA_BOUNDS.boosts.powerMultiplier
      ),
      durationMs: c(dna.boosts.durationMs, DNA_BOUNDS.boosts.durationMs),
    },
    fun: {
      crashForgiveness: c(
        dna.fun.crashForgiveness,
        DNA_BOUNDS.fun.crashForgiveness
      ),
      rubberBanding: c(dna.fun.rubberBanding, DNA_BOUNDS.fun.rubberBanding),
    },
    meta: {
      raceDurationTargetSec: c(
        dna.meta.raceDurationTargetSec,
        DNA_BOUNDS.meta.raceDurationTargetSec
      ),
    },
  };
}
