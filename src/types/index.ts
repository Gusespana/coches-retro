/**
 * TELEMETRY EVENTS
 * ================
 * The complete vocabulary of things players can do that we want to learn from.
 * Adding a new event type means adding a row schema in Supabase.
 */

export type TelemetryEventType =
  | "race_start"
  | "race_end"
  | "crash"
  | "boost_used"
  | "abandon"
  | "drift"
  | "lap_complete";

export interface TelemetryEvent {
  type: TelemetryEventType;
  session_id: string;        // a uuid generated at app load
  dna_version: string;       // the DNA in use when event fired
  track_seed: number;        // RNG seed for the current track
  time_in_race_ms: number;   // ms since race_start
  payload: Record<string, number | string | boolean>;
  client_ts: number;         // Date.now() on the client
}

/**
 * RUNTIME STATE
 * Internal to the engine — never persisted, never sent to server.
 */
export interface RaceResult {
  finished: boolean;
  durationMs: number;
  position: number;          // 1 = winner, 2 = second, etc.
  crashes: number;
  boostsUsed: number;
  progressPct: number;       // 0..1
}
