"use client";

interface Props {
  speed: number;
  maxSpeed: number;
  progressPct: number;
  elapsedMs: number;
  boosting: boolean;
}

export default function HUD({
  speed,
  maxSpeed,
  progressPct,
  elapsedMs,
  boosting,
}: Props) {
  const speedPct = Math.min(100, (speed / maxSpeed) * 100);
  const sec = Math.floor(elapsedMs / 1000);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");

  return (
    <>
      {/* Top: time + progress */}
      <div className="pointer-events-none fixed left-3 top-3 z-20 text-[10px] text-neon-cyan retro-text-glow sm:text-xs">
        <div>⏱ {mm}:{ss}</div>
        <div className="mt-1 h-1 w-32 bg-black/60">
          <div
            className="h-full bg-neon-cyan"
            style={{ width: `${progressPct * 100}%` }}
          />
        </div>
      </div>

      {/* Bottom-center: speed */}
      <div className="pointer-events-none fixed bottom-3 left-1/2 z-20 -translate-x-1/2 text-center">
        <div
          className={`text-xs retro-text-glow sm:text-sm ${
            boosting ? "text-neon-yellow" : "text-neon-cyan"
          }`}
        >
          {Math.round(speed * 30)} KM/H
        </div>
        <div className="mt-1 h-1 w-40 bg-black/60">
          <div
            className={`h-full transition-[width] duration-75 ${
              boosting ? "bg-neon-yellow" : "bg-neon-cyan"
            }`}
            style={{ width: `${speedPct}%` }}
          />
        </div>
        {boosting && (
          <div className="mt-1 text-[8px] text-neon-yellow retro-text-glow">
            ⚡ BOOST
          </div>
        )}
      </div>
    </>
  );
}
