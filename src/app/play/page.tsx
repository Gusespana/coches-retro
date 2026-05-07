"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GameCanvas from "@/components/GameCanvas";
import { DEFAULT_DNA } from "@/lib/dna-default";
import { clampDNA, type GameDNA } from "@/lib/dna-schema";
import type { RaceResult } from "@/types";

type PageState =
  | { kind: "loading" }
  | { kind: "racing"; dna: GameDNA }
  | { kind: "ended"; dna: GameDNA; result: RaceResult };

export default function PlayPage() {
  const [state, setState] = useState<PageState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dna")
      .then((r) => r.json())
      .then((dna: GameDNA) => {
        if (cancelled) return;
        // Defensive clamp on the client too — never trust the wire
        setState({ kind: "racing", dna: clampDNA(dna) });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ kind: "racing", dna: clampDNA(DEFAULT_DNA) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center">
        <p className="text-xs text-neon-cyan retro-text-glow">
          Loading DNA...
        </p>
      </main>
    );
  }

  if (state.kind === "racing") {
    return (
      <GameCanvas
        dna={state.dna}
        onRaceEnd={(result) =>
          setState({ kind: "ended", dna: state.dna, result })
        }
      />
    );
  }

  // ended
  const r = state.result;
  const sec = (r.durationMs / 1000).toFixed(1);
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center">
      <h2
        className={`text-xl retro-text-glow sm:text-3xl ${
          r.finished ? "text-neon-yellow" : "text-neon-pink"
        }`}
      >
        {r.finished ? "FINISHED!" : "ABANDONED"}
      </h2>

      <div className="space-y-3 text-[10px] text-neon-cyan sm:text-xs">
        {r.finished && <div>Position: P{r.position}</div>}
        <div>Time: {sec}s</div>
        <div>Crashes: {r.crashes}</div>
        <div>Boosts: {r.boostsUsed}</div>
        {!r.finished && (
          <div>Progress: {Math.round(r.progressPct * 100)}%</div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => setState({ kind: "racing", dna: state.dna })}
          className="btn-neon text-[10px] sm:text-xs"
        >
          ▶ Race Again
        </button>
        <Link href="/" className="btn-neon text-[10px] sm:text-xs">
          ⌂ Home
        </Link>
      </div>

      <p className="mt-8 text-[8px] text-neon-purple opacity-60">
        DNA v{state.dna.version}
      </p>
    </main>
  );
}
