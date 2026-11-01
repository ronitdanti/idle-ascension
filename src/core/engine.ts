import { D, ZERO, type Decimal } from './bignum';
import { CONFIG } from '../content/config';
import { ZONES, type UnlockRule } from '../content/zones';
import { addKi, offlineCapSec, restedCapSec, type GameState } from './state';

export const TICK_DT = 1 / CONFIG.tickHz;

export type GameEvent = { type: 'unlock'; zone: string };

export interface StepCtx {
  /** True when simulating absence: no Rested bonus is used or spent. */
  offline: boolean;
  emit?: (e: GameEvent) => void;
}

/** A system advances part of the game by dt seconds. New content adds systems; the engine never changes. */
export interface System {
  id: string;
  step(s: GameState, dt: number, ctx: StepCtx): void;
}

/** Ki per second before any Rested bonus. */
export function baseKiPerSec(_s: GameState): Decimal {
  return D(CONFIG.baseKiPerSec);
}

/** Display rate for the UI: includes Rested only while it is active. */
export function currentKiPerSec(s: GameState): Decimal {
  const base = baseKiPerSec(s);
  return s.restedSec > 0 ? base.mul(CONFIG.restedMultiplier) : base;
}

const kiSystem: System = {
  id: 'ki',
  step(s, dt, ctx) {
    const base = baseKiPerSec(s);
    let gain = base.mul(dt);
    if (!ctx.offline && s.restedSec > 0) {
      // Exact for any dt: only the rested portion of this step gets the bonus.
      const portion = Math.min(dt, s.restedSec);
      gain = gain.add(base.mul(portion * (CONFIG.restedMultiplier - 1)));
      s.restedSec -= portion;
    }
    addKi(s, gain);
  },
};

export const SYSTEMS: System[] = [kiSystem];

export function unlockMet(s: GameState, rule: UnlockRule): boolean {
  switch (rule.kind) {
    case 'start':
      return true;
    case 'totalKi':
      return s.totalKi.gte(rule.at);
    case 'flag':
      return !!s.flags[rule.flag];
  }
}

export function checkUnlocks(s: GameState, ctx: StepCtx): void {
  for (const z of ZONES) {
    if (!s.unlocked[z.id] && unlockMet(s, z.unlock)) {
      s.unlocked[z.id] = true;
      ctx.emit?.({ type: 'unlock', zone: z.id });
    }
  }
}

export function step(s: GameState, dt: number, ctx: StepCtx): void {
  for (const sys of SYSTEMS) sys.step(s, dt, ctx);
  if (!ctx.offline) s.stats.playTimeSec += dt;
  checkUnlocks(s, ctx);
}

/** Chunk length grows with elapsed time so hours of absence cost hundreds of steps, not hundreds of thousands. */
export function defaultChunk(seconds: number): number {
  return Math.min(60, Math.max(TICK_DT, seconds / 500));
}

/** Advance `seconds` of game time in chunks. `chunk` overrides the default (the simulator passes larger ones). */
export function advance(s: GameState, seconds: number, ctx: StepCtx, chunk?: number): void {
  if (!(seconds > 0) || !Number.isFinite(seconds)) return;
  const size = chunk ?? defaultChunk(seconds);
  let left = seconds;
  while (left > 1e-9) {
    const dt = Math.min(size, left);
    step(s, dt, ctx);
    left -= dt;
  }
}

export interface OfflineReport {
  /** Real seconds since last seen (never negative). */
  awaySec: number;
  /** Seconds actually simulated after the offline cap. */
  countedSec: number;
  capped: boolean;
  kiGained: Decimal;
  restedGainedSec: number;
  unlocks: string[];
}

/**
 * Apply absence. Clamps negative elapsed time to zero (clock safety), caps at the offline cap,
 * and banks Rested time. Returns null when nothing meaningful elapsed.
 */
export function applyOffline(s: GameState, nowMs: number): OfflineReport | null {
  const raw = (nowMs - s.lastSeen) / 1000;
  const awaySec = Number.isFinite(raw) && raw > 0 ? raw : 0;
  // Never move lastSeen backwards: a clock set to the past must not create free time later.
  s.lastSeen = Math.max(s.lastSeen, nowMs);
  if (awaySec <= 0) return null;

  const countedSec = Math.min(awaySec, offlineCapSec(s));
  const before = s.ki;
  const unlocks: string[] = [];
  advance(s, countedSec, { offline: true, emit: (e) => unlocks.push(e.zone) });
  s.stats.offlineSec += countedSec;

  const restedBefore = s.restedSec;
  s.restedSec = Math.min(restedCapSec(s), s.restedSec + countedSec);
  return {
    awaySec,
    countedSec,
    capped: awaySec > countedSec,
    kiGained: s.ki.sub(before).max(ZERO),
    restedGainedSec: s.restedSec - restedBefore,
    unlocks,
  };
}

/** Manual gather (tap). */
export function gather(s: GameState): Decimal {
  const amount = D(CONFIG.tapKi);
  addKi(s, amount);
  s.stats.taps += 1;
  return amount;
}
