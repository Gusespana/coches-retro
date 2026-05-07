/**
 * PHYSICS — STABLE ENGINE COMPONENT
 * ==================================
 * Simple arcade car physics. NOT realistic — we want fun, not simulation.
 * All numeric tunables come from the DNA, never hardcoded.
 *
 * The car is a point with a heading, a forward speed, and a small lateral
 * (drift) velocity. The drift component lets us get that arcade slide feel
 * without a full rigid-body simulator.
 */

import type { GameDNA } from "@/lib/dna-schema";

export interface CarState {
  x: number;
  y: number;
  heading: number;       // radians
  speed: number;         // forward speed
  lateralVel: number;    // sideways slide
  isDrifting: boolean;
  boostMsRemaining: number;
}

export interface CarInput {
  throttle: boolean;     // pressing forward (or auto in mobile)
  brake: boolean;
  steer: number;         // -1 (left) .. 0 .. 1 (right)
  boost: boolean;
}

export function createCar(x: number, y: number, heading: number): CarState {
  return {
    x,
    y,
    heading,
    speed: 0,
    lateralVel: 0,
    isDrifting: false,
    boostMsRemaining: 0,
  };
}

/**
 * Advance the car by one frame.
 * dtMs is the elapsed milliseconds; we use it to scale the boost timer
 * but the rest of the physics is frame-rate-locked at 60fps for simplicity.
 */
export function stepCar(
  car: CarState,
  input: CarInput,
  dna: GameDNA,
  dtMs: number,
  onTrack: boolean
): void {
  const offTrackDrag = onTrack ? 1.0 : 0.94;

  // Throttle / brake
  const boostActive = car.boostMsRemaining > 0;
  const speedCap =
    dna.car.maxSpeed * (boostActive ? dna.boosts.powerMultiplier : 1);

  if (input.throttle && !input.brake) {
    car.speed += dna.car.acceleration;
  } else if (input.brake) {
    car.speed -= dna.car.braking;
  } else {
    car.speed *= 0.98; // engine drag
  }

  car.speed = Math.max(0, Math.min(speedCap, car.speed));
  car.speed *= offTrackDrag;

  // Steering — turning effectiveness scales with speed
  const speedFactor = Math.min(1, car.speed / dna.car.maxSpeed);
  const turnAmount = input.steer * dna.car.turnRate * speedFactor;
  car.heading += turnAmount;

  // Drift: at high speed and hard steering, lateral velocity builds up
  const isHardTurn = Math.abs(input.steer) > 0.5;
  const isAboveDriftSpeed = car.speed > dna.car.drift.threshold;
  car.isDrifting = isHardTurn && isAboveDriftSpeed;

  if (car.isDrifting) {
    car.lateralVel += turnAmount * car.speed * 0.4;
  }
  car.lateralVel *= dna.car.drift.factor;

  // Apply movement
  const fx = Math.cos(car.heading);
  const fy = Math.sin(car.heading);
  // perpendicular vector for lateral slide
  const px = -fy;
  const py = fx;

  car.x += fx * car.speed + px * car.lateralVel;
  car.y += fy * car.speed + py * car.lateralVel;

  // Boost timer
  if (car.boostMsRemaining > 0) {
    car.boostMsRemaining = Math.max(0, car.boostMsRemaining - dtMs);
  }
}

/**
 * Apply a crash — speed loss governed by DNA's crashForgiveness.
 * Higher forgiveness = less speed lost on crash (more arcade-y, more fun for new players).
 */
export function applyCrash(car: CarState, dna: GameDNA): void {
  car.speed *= dna.fun.crashForgiveness;
  car.lateralVel *= 0.3;
}

export function activateBoost(car: CarState, dna: GameDNA): void {
  car.boostMsRemaining = dna.boosts.durationMs;
}
