import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { TelemetryEvent } from "@/types";

export const runtime = "edge";

const ALLOWED_TYPES = new Set([
  "race_start",
  "race_end",
  "crash",
  "boost_used",
  "abandon",
  "drift",
  "lap_complete",
]);

/**
 * POST /api/telemetry
 * Body: { events: TelemetryEvent[] }
 *
 * Validates the shape of every event and inserts them into Supabase.
 * Soft-fails (200 OK with logged drop count) if Supabase is misconfigured —
 * we never want telemetry failures to break the game.
 */
export async function POST(req: Request) {
  let body: { events: TelemetryEvent[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad-json" }, { status: 400 });
  }

  if (!Array.isArray(body.events)) {
    return NextResponse.json({ ok: false, reason: "no-events" }, { status: 400 });
  }

  // Cap batch size — anything bigger looks like abuse
  const events = body.events.slice(0, 200).filter(isValidEvent);

  if (!supabase) {
    console.warn(`[telemetry] dropped ${events.length} events — no supabase`);
    return NextResponse.json({ ok: true, stored: 0, source: "no-supabase" });
  }

  const rows = events.map((e) => ({
    type: e.type,
    session_id: e.session_id,
    dna_version: e.dna_version,
    track_seed: e.track_seed,
    time_in_race_ms: Math.floor(e.time_in_race_ms),
    payload: e.payload ?? {},
    client_ts: new Date(e.client_ts).toISOString(),
  }));

  const { error } = await supabase.from("telemetry_events").insert(rows);
  if (error) {
    console.error("[telemetry] insert error:", error.message);
    return NextResponse.json({ ok: false, reason: "db-error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, stored: rows.length });
}

function isValidEvent(e: unknown): e is TelemetryEvent {
  if (!e || typeof e !== "object") return false;
  const x = e as Record<string, unknown>;
  return (
    typeof x.type === "string" &&
    ALLOWED_TYPES.has(x.type) &&
    typeof x.session_id === "string" &&
    typeof x.dna_version === "string" &&
    typeof x.track_seed === "number" &&
    typeof x.time_in_race_ms === "number" &&
    typeof x.client_ts === "number" &&
    typeof x.payload === "object"
  );
}
