"use client";

import { useEffect, useRef, useState } from "react";
import type { GameDNA } from "@/lib/dna-schema";
import type { RaceResult } from "@/types";
import { startGame, type EngineHandle } from "@/game/engine";
import TouchControls from "./TouchControls";
import HUD from "./HUD";

interface Props {
  dna: GameDNA;
  onRaceEnd: (result: RaceResult) => void;
}

export default function GameCanvas({ dna, onRaceEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);

  const [hudState, setHudState] = useState({
    speed: 0,
    progressPct: 0,
    elapsedMs: 0,
    boosting: false,
  });

  // Mount engine. We intentionally only depend on the canvas element,
  // not on the DNA — DNA is captured on race start. Hot-swapping DNA
  // mid-race is explicitly disallowed.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handle = startGame(canvas, dna, {
      onRaceEnd,
      onTick: setHudState,
    });
    engineRef.current = handle;

    return () => {
      handle.stop();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ touchAction: "none" }}
      />

      <TouchControls
        onSteer={(v) => engineRef.current?.setInput({ steer: v })}
        onBrake={(b) => engineRef.current?.setInput({ brake: b })}
        onAbandon={() => engineRef.current?.abandon()}
      />

      <HUD
        speed={hudState.speed}
        maxSpeed={dna.car.maxSpeed * dna.boosts.powerMultiplier}
        progressPct={hudState.progressPct}
        elapsedMs={hudState.elapsedMs}
        boosting={hudState.boosting}
      />
    </div>
  );
}
