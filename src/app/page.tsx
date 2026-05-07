import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-10 text-center">
      <h1 className="mb-4 text-2xl text-neon-pink retro-text-glow sm:text-4xl">
        EVOLVING
      </h1>
      <h1 className="mb-12 text-2xl text-neon-cyan retro-text-glow sm:text-4xl">
        RACING
      </h1>

      <p className="mb-12 max-w-xs text-[10px] leading-relaxed text-neon-yellow sm:text-xs">
        A racing game that learns from how you play.
        <br />
        <br />
        Drift hard. Hit boosts. Try to win.
      </p>

      <Link href="/play" className="btn-neon text-xs sm:text-sm">
        ▶ Start Race
      </Link>

      <p className="mt-12 text-[8px] text-neon-purple opacity-60 sm:text-[10px]">
        v0.1 — DNA-driven
      </p>
    </main>
  );
}
