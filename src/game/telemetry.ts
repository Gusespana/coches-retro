/**
 * TELEMETRY COLLECTOR — STABLE ENGINE COMPONENT
 * ==============================================
 * Buffers events in memory and flushes them in batches to /api/telemetry.
 * Flushes:
 *   - Every 5 seconds (interval)
 *   - On race_end
 *   - On page hide / unload (sendBeacon for reliability)
 *
 * If the server is unreachable, events are kept in memory until next flush.
 * We do NOT use localStorage — telemetry should never be re-sent days later.
 */

import type { TelemetryEvent, TelemetryEventType } from "@/types";

let buffer: TelemetryEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let raceStartedAt = 0;
let sessionId = "";
let dnaVersion = "";
let trackSeed = 0;

function genUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function initTelemetry(opts: {
  dnaVersion: string;
  trackSeed: number;
}) {
  if (!sessionId) sessionId = genUUID();
  dnaVersion = opts.dnaVersion;
  trackSeed = opts.trackSeed;
  raceStartedAt = performance.now();

  if (!flushTimer) {
    flushTimer = setInterval(flush, 5000);
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", flushSync);
      window.addEventListener("beforeunload", flushSync);
    }
  }
}

export function recordEvent(
  type: TelemetryEventType,
  payload: Record<string, number | string | boolean> = {}
) {
  const evt: TelemetryEvent = {
    type,
    session_id: sessionId,
    dna_version: dnaVersion,
    track_seed: trackSeed,
    time_in_race_ms: Math.max(0, performance.now() - raceStartedAt),
    payload,
    client_ts: Date.now(),
  };
  buffer.push(evt);

  // Flush immediately on critical events
  if (type === "race_end" || type === "abandon") {
    flush();
  }
}

async function flush() {
  if (buffer.length === 0) return;
  const events = buffer;
  buffer = [];
  try {
    await fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
  } catch {
    // Re-queue on failure — but cap to avoid unbounded growth
    if (buffer.length < 200) {
      buffer = [...events, ...buffer];
    }
  }
}

// Synchronous variant for unload events — uses sendBeacon
function flushSync() {
  if (buffer.length === 0) return;
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify({ events: buffer })], {
      type: "application/json",
    });
    navigator.sendBeacon("/api/telemetry", blob);
    buffer = [];
  }
}

export function teardownTelemetry() {
  flush();
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  if (typeof window !== "undefined") {
    window.removeEventListener("pagehide", flushSync);
    window.removeEventListener("beforeunload", flushSync);
  }
}
