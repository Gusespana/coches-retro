/**
 * GAME ENGINE — STABLE ENGINE COMPONENT
 * ======================================
 * The core game loop. Reads the DNA at start of race and never re-reads it
 * mid-race (so a DNA hot-swap during a race won't break things).
 *
 * Renders top-down to a Canvas 2D context. Optimized for mobile by:
 *   - Capping DPR at 2 (avoids huge backbuffers on retina phones)
 *   - Using simple shape primitives (no heavy textures)
 *   - One render pass per frame, no off-screen buffers
 *
 * The engine emits telemetry events and calls back to React when the race ends.
 */

import type { GameDNA } from "@/lib/dna-schema";
import type { RaceResult } from "@/types";
import {
  type CarState,
  type CarInput,
  createCar,
  stepCar,
  applyCrash,
  activateBoost,
} from "./physics";
import {
  type Track,
  generateTrack,
  nearestSegmentIndex,
  distanceToTrack,
} from "./track";
import { type Rival, createRivals, stepRivals } from "./ai";
import {
  initTelemetry,
  recordEvent,
  teardownTelemetry,
} from "./telemetry";

export interface EngineCallbacks {
  onRaceEnd: (result: RaceResult) => void;
  onTick?: (info: {
    speed: number;
    progressPct: number;
    elapsedMs: number;
    boosting: boolean;
  }) => void;
}

export interface EngineHandle {
  stop: () => void;
  setInput: (input: Partial<CarInput>) => void;
  abandon: () => void;
}

export function startGame(
  canvas: HTMLCanvasElement,
  dna: GameDNA,
  callbacks: EngineCallbacks
): EngineHandle {
  // Track seed: time-based but exposed in telemetry so we can replay
  const trackSeed = Math.floor(Math.random() * 0xffffffff);
  const track = generateTrack(dna, trackSeed);

  initTelemetry({ dnaVersion: dna.version, trackSeed });

  // Player starts at segment 0
  const startSeg = track.segments[0];
  const player = createCar(startSeg.x, startSeg.y, startSeg.heading);
  const rivals: Rival[] = createRivals(dna, track);

  const input: CarInput = {
    throttle: true, // mobile auto-throttle by default
    brake: false,
    steer: 0,
    boost: false,
  };

  let running = true;
  let lastT = performance.now();
  let raceStartT = lastT;
  let playerSegIdx = 0;
  let crashes = 0;
  let boostsUsed = 0;
  let lastDriftReportT = 0;
  let driftStartedAt: number | null = null;
  let lastBoostSegIdx = -1;
  let crashCooldownUntil = 0;

  recordEvent("race_start", {
    rival_count: dna.ai.rivalCount,
    track_length: dna.track.length,
  });

  // ----- DPR-aware sizing -----
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
  }
  resize();
  window.addEventListener("resize", resize);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not supported");

  // ----- Frame loop -----
  function frame(now: number) {
    if (!running) return;
    const dtMs = Math.min(50, now - lastT); // clamp on tab-switch resume
    lastT = now;

    // Step player
    const td = distanceToTrack(track, player.x, player.y, playerSegIdx);
    const onTrack = td.distance < dna.track.width / 2;
    playerSegIdx = td.segmentIndex;

    stepCar(player, input, dna, dtMs, onTrack);

    // Drift telemetry: aggregate drift sessions instead of spamming events
    if (player.isDrifting && driftStartedAt === null) {
      driftStartedAt = now;
    }
    if (!player.isDrifting && driftStartedAt !== null) {
      const driftMs = now - driftStartedAt;
      if (driftMs > 200) {
        recordEvent("drift", { duration_ms: Math.round(driftMs) });
      }
      driftStartedAt = null;
    }

    // Crash detection: way off track
    if (
      td.distance > dna.track.width &&
      now > crashCooldownUntil &&
      player.speed > 1
    ) {
      crashes++;
      applyCrash(player, dna);
      recordEvent("crash", { speed: Math.round(player.speed * 100) / 100 });
      crashCooldownUntil = now + 600;
    }

    // Boost pickup
    const segHere = track.segments[playerSegIdx];
    if (
      segHere?.hasBoost &&
      playerSegIdx !== lastBoostSegIdx &&
      onTrack
    ) {
      lastBoostSegIdx = playerSegIdx;
      boostsUsed++;
      activateBoost(player, dna);
      recordEvent("boost_used", {});
    }

    // Step rivals
    stepRivals(rivals, track, dna, dtMs, playerSegIdx);

    // Win condition: reached last segment
    const progressPct = playerSegIdx / (track.segments.length - 1);
    if (progressPct >= 1) {
      finishRace(true);
      return;
    }

    // Render
    render(ctx!, canvas, track, player, rivals, playerSegIdx);

    callbacks.onTick?.({
      speed: player.speed,
      progressPct,
      elapsedMs: now - raceStartT,
      boosting: player.boostMsRemaining > 0,
    });

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function finishRace(finished: boolean) {
    if (!running) return;
    running = false;
    window.removeEventListener("resize", resize);

    // Compute position based on rival progress
    let position = 1;
    for (const r of rivals) {
      if (r.segmentIndex > playerSegIdx) position++;
    }

    const durationMs = performance.now() - raceStartT;
    const progressPct = playerSegIdx / (track.segments.length - 1);

    if (finished) {
      recordEvent("race_end", {
        duration_ms: Math.round(durationMs),
        finished: true,
        position,
        crashes,
        boosts_used: boostsUsed,
      });
    } else {
      recordEvent("abandon", {
        time_in_race_ms: Math.round(durationMs),
        progress_pct: Math.round(progressPct * 1000) / 1000,
      });
    }

    teardownTelemetry();
    callbacks.onRaceEnd({
      finished,
      durationMs,
      position,
      crashes,
      boostsUsed,
      progressPct,
    });
  }

  return {
    stop: () => {
      running = false;
      window.removeEventListener("resize", resize);
      teardownTelemetry();
    },
    setInput: (next) => {
      Object.assign(input, next);
      if (next.boost && player.boostMsRemaining === 0) {
        // manual boost button only triggers if we have a stockpile in future
        // for MVP boosts come exclusively from track pads
      }
    },
    abandon: () => finishRace(false),
  };
}

// =====================================================================
// RENDERING
// =====================================================================

function render(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  track: Track,
  player: CarState,
  rivals: Rival[],
  playerSegIdx: number
) {
  const w = canvas.width;
  const h = canvas.height;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const viewW = w / dpr;
  const viewH = h / dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Background — retro grid
  ctx.fillStyle = "#0a0a1f";
  ctx.fillRect(0, 0, viewW, viewH);

  // Camera follows player, looking ahead
  const camX = player.x;
  const camY = player.y;
  const camRot = -player.heading - Math.PI / 2; // rotate world so player faces up

  ctx.translate(viewW / 2, viewH * 0.7);
  ctx.rotate(camRot);
  ctx.translate(-camX, -camY);

  // Draw track — simple thick polyline through visible segments
  const visibleStart = Math.max(0, playerSegIdx - 5);
  const visibleEnd = Math.min(
    track.segments.length,
    playerSegIdx + 60
  );

  // Track surface
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#1a1a3a";
  ctx.lineWidth = (track.segments[0]?.width ?? 150) * 1.05;
  ctx.beginPath();
  for (let i = visibleStart; i < visibleEnd; i++) {
    const s = track.segments[i];
    if (i === visibleStart) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  }
  ctx.stroke();

  // Track centerline — neon
  ctx.strokeStyle = "#7700ff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = visibleStart; i < visibleEnd; i++) {
    const s = track.segments[i];
    if (i === visibleStart) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  }
  ctx.stroke();

  // Boost pads
  for (let i = visibleStart; i < visibleEnd; i++) {
    const s = track.segments[i];
    if (!s.hasBoost) continue;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.heading);
    ctx.fillStyle = "#f9f871";
    ctx.fillRect(-30, -8, 60, 16);
    ctx.restore();
  }

  // Finish line at the end
  if (visibleEnd >= track.segments.length - 1) {
    const last = track.segments[track.segments.length - 1];
    ctx.save();
    ctx.translate(last.x, last.y);
    ctx.rotate(last.heading);
    ctx.fillStyle = "#ffffff";
    for (let bx = -75; bx < 75; bx += 15) {
      for (let by = -15; by < 15; by += 15) {
        if (((bx + by) / 15) % 2 === 0) {
          ctx.fillRect(bx, by, 15, 15);
        }
      }
    }
    ctx.restore();
  }

  // Rivals
  for (const r of rivals) {
    drawCar(ctx, r.car, "#ff2a6d");
  }

  // Player
  drawCar(ctx, player, player.boostMsRemaining > 0 ? "#f9f871" : "#05d9e8");
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  car: CarState,
  color: string
) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.heading);

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(-16, -10, 32, 20);

  // Windshield
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(0, -8, 10, 16);

  // Drift sparks
  if (car.isDrifting) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillRect(-22, -12, 4, 4);
    ctx.fillRect(-22, 8, 4, 4);
  }

  ctx.restore();
}
