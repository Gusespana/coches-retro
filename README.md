# 🏎️ Evolving Racing Game

A retro arcade racing game that **evolves over time** based on player behavior.

## 🧬 Core Concept

The game engine is **stable and never modified** at runtime. All gameplay variables live in a JSON document called **Game DNA**. A future AI system will analyze telemetry and modify the DNA to improve the experience.

```
[ Player ] → [ Game Engine (stable) ] ← [ Game DNA (evolves) ]
                       ↓
                 [ Telemetry ]
                       ↓
              [ AI Evolution (future) ]
                       ↓
                 [ New DNA ]
```

## 🛠 Stack

- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind
- **Game Engine**: HTML5 Canvas 2D (no Phaser — keeps bundle small for mobile)
- **Backend**: Supabase (Postgres + auth + realtime)
- **Deploy**: Vercel (zero-config)

> Why Canvas 2D and not Phaser? For a top-down arcade racer, Phaser (8MB) is overkill. Canvas 2D gives us full control, tiny bundle, and zero SSR issues on Vercel.

## 📁 Architecture

```
src/
├── app/                      # Next.js App Router
│   ├── page.tsx             # Home (start screen)
│   ├── play/page.tsx        # Game screen
│   └── api/
│       ├── dna/route.ts     # GET active DNA
│       └── telemetry/route.ts  # POST telemetry events
├── game/                     # 🔒 STABLE ENGINE — never changed by AI
│   ├── engine.ts            # Game loop, render, input
│   ├── physics.ts           # Base car physics
│   ├── track.ts             # Track generation from DNA
│   ├── ai.ts                # Rival AI behavior
│   └── telemetry.ts         # In-game telemetry collector
├── lib/
│   ├── supabase.ts          # Supabase client
│   ├── dna-default.ts       # Fallback DNA (if Supabase unreachable)
│   └── dna-schema.ts        # TypeScript schema for DNA
├── components/
│   ├── GameCanvas.tsx       # React wrapper for canvas
│   ├── TouchControls.tsx    # Mobile controls
│   └── HUD.tsx              # Score, time, lap
└── types/
    └── index.ts
```

## 🧬 Game DNA Schema

The DNA is the **only thing that evolves**. Everything in `src/game/` is frozen.

```typescript
{
  version: "0.1.0",
  car: {
    maxSpeed: 6.0,
    acceleration: 0.12,
    braking: 0.2,
    turnRate: 0.05,
    drift: { factor: 0.92, threshold: 3.5 }
  },
  ai: {
    rivalCount: 3,
    rivalSpeedMultiplier: 0.85,
    aggressiveness: 0.5
  },
  track: {
    length: 8000,
    curveDensity: 0.6,
    curvature: 0.04,
    width: 1500
  },
  boosts: {
    frequency: 0.15,
    powerMultiplier: 1.6,
    durationMs: 1500
  },
  fun: {
    crashForgiveness: 0.4,
    rubberBanding: 0.2
  },
  meta: {
    raceDurationTargetSec: 60
  }
}
```

## 📊 Telemetry Schema

Every meaningful player action is captured:

| Event | Payload |
|---|---|
| `race_start` | dna_version, track_seed |
| `race_end` | duration_ms, finished, position |
| `crash` | speed, time_in_race_ms |
| `boost_used` | time_in_race_ms |
| `abandon` | time_in_race_ms, progress_pct |
| `drift` | duration_ms |

These flow into Supabase. A future AI job will:
1. Aggregate player metrics weekly
2. Detect patterns (too hard? too easy? boring?)
3. Propose a new DNA version
4. Log the change in `dna_evolution_log`

## 🚀 Setup

```bash
# 1. Install
npm install

# 2. Set up Supabase
# Create a project at supabase.com, then run /supabase/schema.sql in the SQL editor.
# Insert the default DNA via /supabase/seed.sql.

# 3. Configure env
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# 4. Run
npm run dev
```

## 🎮 Controls

- **Mobile**: Touch left/right halves of screen to steer; auto-throttle. Tap top center to brake/boost.
- **Desktop**: Arrow keys or WASD. Space = boost.

## 🔒 The Golden Rule

> **The engine is stable. Only the DNA evolves.**

If a feature requires changing `src/game/`, it is a v1 engine change and must go through manual code review. AI never touches engine code.

## 📈 Future Evolution Path

1. **MVP (now)**: Manual DNA edits via Supabase dashboard.
2. **Phase 2**: Admin UI to edit DNA + A/B test 2 versions.
3. **Phase 3**: Scheduled job analyzes telemetry, proposes DNA tweaks for human approval.
4. **Phase 4**: Autonomous evolution — AI ships new DNA daily within bounded ranges.
