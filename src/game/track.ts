/**
 * TRACK GENERATOR — STABLE ENGINE COMPONENT
 * ==========================================
 * Generates a procedural top-down racing track from a seed and DNA.
 * Same seed + same DNA = same track. This determinism matters because
 * we want telemetry to be comparable across players on identical tracks.
 *
 * Track is represented as a list of "segments": each segment has a center
 * point, a heading, a width, and possibly a boost pad.
 */

import type { GameDNA } from "@/lib/dna-schema";

export interface TrackSegment {
  x: number;
  y: number;
  heading: number;     // radians
  width: number;
  hasBoost: boolean;
}

export interface Track {
  segments: TrackSegment[];
  totalLength: number;
  segmentSpacing: number;
}

// Mulberry32 PRNG — small, fast, deterministic
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateTrack(dna: GameDNA, seed: number): Track {
  const rng = mulberry32(seed);
  const segmentSpacing = 40; // px between segments
  const segmentCount = Math.floor(dna.track.length / segmentSpacing);

  const segments: TrackSegment[] = [];
  let x = 0;
  let y = 0;
  let heading = -Math.PI / 2; // start heading "up"

  for (let i = 0; i < segmentCount; i++) {
    // First 10 segments are straight (give the player a runway)
    const isCurveSegment =
      i > 10 && rng() < dna.track.curveDensity;

    if (isCurveSegment) {
      const direction = rng() < 0.5 ? -1 : 1;
      heading += direction * dna.track.curvature * (0.5 + rng() * 0.5);
    }

    x += Math.cos(heading) * segmentSpacing;
    y += Math.sin(heading) * segmentSpacing;

    const hasBoost = i > 20 && rng() < dna.boosts.frequency;

    segments.push({ x, y, heading, width: dna.track.width / 10, hasBoost });
  }

  return {
    segments,
    totalLength: dna.track.length,
    segmentSpacing,
  };
}

/**
 * Returns the closest track segment index to a given world position.
 * Used by physics to detect off-track and by AI to follow the racing line.
 */
export function nearestSegmentIndex(
  track: Track,
  x: number,
  y: number,
  hint: number = 0
): number {
  // Search a window around the hint for performance
  const window = 30;
  const start = Math.max(0, hint - window);
  const end = Math.min(track.segments.length, hint + window);

  let bestIdx = hint;
  let bestDist = Infinity;
  for (let i = start; i < end; i++) {
    const s = track.segments[i];
    const dx = s.x - x;
    const dy = s.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Distance from a point to the centerline of the nearest segment.
 * Used to know if the car is on the track.
 */
export function distanceToTrack(
  track: Track,
  x: number,
  y: number,
  hint: number
): { distance: number; segmentIndex: number } {
  const idx = nearestSegmentIndex(track, x, y, hint);
  const s = track.segments[idx];
  const dx = s.x - x;
  const dy = s.y - y;
  return { distance: Math.sqrt(dx * dx + dy * dy), segmentIndex: idx };
}
