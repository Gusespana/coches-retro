/**
 * RIVAL AI — STABLE ENGINE COMPONENT
 * ===================================
 * A simple "follow the racing line" AI. Each rival has a target segment
 * a few steps ahead on the track and tries to head toward it.
 *
 * Difficulty is controlled entirely by DNA:
 *   - rivalSpeedMultiplier: cap on rival's max speed as fraction of player's
 *   - aggressiveness: how much the rival cuts toward the player
 *   - rubberBanding: rivals slow down when they're far ahead
 *
 * Intentionally NOT smart. Future DNA can tune it; future engine versions
 * (manual review only) can replace it.
 */

import type { GameDNA } from "@/lib/dna-schema";
import { type Track, nearestSegmentIndex } from "./track";
import { type CarState, createCar, stepCar } from "./physics";

export interface Rival {
  car: CarState;
  segmentIndex: number;  // current progress on track
  lookahead: number;     // how many segments ahead it aims
}

export function createRivals(dna: GameDNA, track: Track): Rival[] {
  const rivals: Rival[] = [];
  for (let i = 0; i < dna.ai.rivalCount; i++) {
    const startSeg = track.segments[2];
    const offset = (i - dna.ai.rivalCount / 2) * 60;
    const px = -Math.sin(startSeg.heading);
    const py = Math.cos(startSeg.heading);
    const car = createCar(
      startSeg.x + px * offset,
      startSeg.y + py * offset,
      startSeg.heading
    );
    rivals.push({ car, segmentIndex: 2, lookahead: 8 + i });
  }
  return rivals;
}

export function stepRivals(
  rivals: Rival[],
  track: Track,
  dna: GameDNA,
  dtMs: number,
  playerSegmentIndex: number
): void {
  for (const rival of rivals) {
    rival.segmentIndex = nearestSegmentIndex(
      track,
      rival.car.x,
      rival.car.y,
      rival.segmentIndex
    );

    // Pick a target segment ahead
    const targetIdx = Math.min(
      track.segments.length - 1,
      rival.segmentIndex + rival.lookahead
    );
    const target = track.segments[targetIdx];

    // Steer toward target
    const dx = target.x - rival.car.x;
    const dy = target.y - rival.car.y;
    const desiredHeading = Math.atan2(dy, dx);
    let headingDiff = desiredHeading - rival.car.heading;
    // Normalize to [-PI, PI]
    while (headingDiff > Math.PI) headingDiff -= 2 * Math.PI;
    while (headingDiff < -Math.PI) headingDiff += 2 * Math.PI;
    const steer = Math.max(-1, Math.min(1, headingDiff * 3));

    // Rubber banding: if rival is way ahead of player, slow down
    const lead = rival.segmentIndex - playerSegmentIndex;
    let throttle = true;
    if (lead > 30) {
      throttle = Math.random() > dna.fun.rubberBanding;
    }

    // Aggressiveness adds noise (less aggressive = smoother, more aggressive = jerkier/cuts)
    const jitter = (Math.random() - 0.5) * dna.ai.aggressiveness * 0.3;

    stepCar(
      rival.car,
      { throttle, brake: false, steer: steer + jitter, boost: false },
      // Rivals get a capped maxSpeed via a shadow DNA
      shadowDNA(dna),
      dtMs,
      true
    );
  }
}

// Build a DNA where the rival's maxSpeed is capped by rivalSpeedMultiplier.
// We only override what the rival physics step needs — everything else is shared.
function shadowDNA(dna: GameDNA): GameDNA {
  return {
    ...dna,
    car: {
      ...dna.car,
      maxSpeed: dna.car.maxSpeed * dna.ai.rivalSpeedMultiplier,
    },
  };
}
