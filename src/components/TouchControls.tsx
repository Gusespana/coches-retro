"use client";

import { useEffect, useRef } from "react";

interface Props {
  onSteer: (value: number) => void;       // -1..1
  onBrake: (active: boolean) => void;
  onAbandon: () => void;
}

/**
 * TouchControls
 * Mobile-first input layer.
 * - Left half of screen: steer left
 * - Right half of screen: steer right
 * - Top "BRAKE" button: brake
 * - "X" button top-right: abandon race
 *
 * Throttle is automatic — keeps the experience snappy on small screens.
 * Multi-touch is supported (you can hold steer and brake simultaneously).
 */
export default function TouchControls({ onSteer, onBrake, onAbandon }: Props) {
  const activeTouches = useRef<Map<number, "left" | "right" | "brake">>(
    new Map()
  );

  useEffect(() => {
    function recompute() {
      const has = (v: "left" | "right" | "brake") =>
        Array.from(activeTouches.current.values()).includes(v);
      const left = has("left");
      const right = has("right");
      const brake = has("brake");
      onSteer(right ? 1 : left ? -1 : 0);
      onBrake(brake);
    }

    const onTouchStartLeft = (e: TouchEvent) => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        activeTouches.current.set(t.identifier, "left");
      }
      recompute();
    };
    const onTouchStartRight = (e: TouchEvent) => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        activeTouches.current.set(t.identifier, "right");
      }
      recompute();
    };
    const onTouchEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        activeTouches.current.delete(t.identifier);
      }
      recompute();
    };

    const left = document.getElementById("touch-left");
    const right = document.getElementById("touch-right");
    if (left && right) {
      left.addEventListener("touchstart", onTouchStartLeft, { passive: false });
      right.addEventListener("touchstart", onTouchStartRight, {
        passive: false,
      });
      left.addEventListener("touchend", onTouchEnd);
      right.addEventListener("touchend", onTouchEnd);
      left.addEventListener("touchcancel", onTouchEnd);
      right.addEventListener("touchcancel", onTouchEnd);
    }

    // Keyboard fallback for desktop
    const keys = { left: false, right: false, brake: false };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
      if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
      if (e.key === "ArrowDown" || e.key === "s") keys.brake = true;
      onSteer(keys.right ? 1 : keys.left ? -1 : 0);
      onBrake(keys.brake);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
      if (e.key === "ArrowDown" || e.key === "s") keys.brake = false;
      onSteer(keys.right ? 1 : keys.left ? -1 : 0);
      onBrake(keys.brake);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      if (left) {
        left.removeEventListener("touchstart", onTouchStartLeft);
        left.removeEventListener("touchend", onTouchEnd);
        left.removeEventListener("touchcancel", onTouchEnd);
      }
      if (right) {
        right.removeEventListener("touchstart", onTouchStartRight);
        right.removeEventListener("touchend", onTouchEnd);
        right.removeEventListener("touchcancel", onTouchEnd);
      }
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [onSteer, onBrake]);

  return (
    <>
      {/* Touch zones — invisible, full half-screen each */}
      <div
        id="touch-left"
        className="fixed bottom-0 left-0 z-10 h-2/3 w-1/2"
        aria-label="Steer left"
      />
      <div
        id="touch-right"
        className="fixed bottom-0 right-0 z-10 h-2/3 w-1/2"
        aria-label="Steer right"
      />

      {/* Visible left/right hint arrows */}
      <div className="pointer-events-none fixed bottom-6 left-6 z-20 text-3xl text-neon-cyan opacity-50">
        ◀
      </div>
      <div className="pointer-events-none fixed bottom-6 right-6 z-20 text-3xl text-neon-cyan opacity-50">
        ▶
      </div>

      {/* Abandon button */}
      <button
        onClick={onAbandon}
        className="fixed right-3 top-3 z-30 h-10 w-10 border-2 border-neon-pink text-xs text-neon-pink active:bg-neon-pink active:text-black"
        aria-label="Abandon race"
      >
        ✕
      </button>
    </>
  );
}
