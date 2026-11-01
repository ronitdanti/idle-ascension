import { D, ZERO, type Decimal } from './bignum';
import { CONFIG } from '../content/config';

export type Notation = 'scientific' | 'engineering' | 'standard';

export interface Settings {
  notation: Notation;
  /** 0.85 to 1.4 */
  textScale: number;
  reduceMotion: boolean;
  haptics: boolean;
  debug: boolean;
}

export interface GameState {
  /** Ki currently held. */
  ki: Decimal;
  /** Ki produced this run (resets on Rebirth, later). */
  runKi: Decimal;
  /** Ki produced ever. Monotonic. Drives unlocks. */
  totalKi: Decimal;
  /** Seconds of x2 Ki remaining for active play. */
  restedSec: number;
  /** Unlocked zone ids. Persisted so each unlock is announced exactly once. */
  unlocked: Record<string, boolean>;
  /** Named one-shot flags (e.g. spoilsCollected). */
  flags: Record<string, boolean>;
  stats: { playTimeSec: number; offlineSec: number; sessions: number };
  settings: Settings;
  /** Epoch ms the game was last saved or backgrounded. Used to measure absence. */
  lastSeen: number;
  createdAt: number;
}

export function defaultSettings(): Settings {
  return { notation: 'scientific', textScale: 1, reduceMotion: false, haptics: true, debug: false };
}

export function newState(now: number): GameState {
  return {
    ki: D(10),
    runKi: D(10),
    totalKi: D(10),
    restedSec: 0,
    unlocked: { training: true },
    flags: {},
    stats: { playTimeSec: 0, offlineSec: 0, sessions: 1 },
    settings: defaultSettings(),
    lastSeen: now,
    createdAt: now,
  };
}

/** Every Ki gain goes through here so Ki, run Ki and lifetime Ki never drift apart. */
export function addKi(s: GameState, amount: Decimal): void {
  if (amount.lte(ZERO)) return;
  s.ki = s.ki.add(amount);
  s.runKi = s.runKi.add(amount);
  s.totalKi = s.totalKi.add(amount);
}

export function offlineCapSec(_s: GameState): number {
  return CONFIG.offlineCapSec;
}

export function restedCapSec(_s: GameState): number {
  return CONFIG.restedCapSec;
}
