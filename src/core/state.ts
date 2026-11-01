import { D, ZERO, type Decimal } from './bignum';

export type Notation = 'scientific' | 'engineering' | 'standard';

export type BuyAmount = 1 | 10 | 100 | 'max';

/** How Auto-Training picks what to buy. Which modes are available depends on the technique level. */
export type AutoMode = 'cheapest' | 'value' | 'deepest' | 'even';

export interface Settings {
  notation: Notation;
  /** 0.85 to 1.4 */
  textScale: number;
  reduceMotion: boolean;
  haptics: boolean;
  debug: boolean;
  buyAmount: BuyAmount;
}

export interface DojoState {
  disciples: number;
  /** Dojo level, from 1. Sets how many disciples fit. */
  level: number;
  /** Training Level, from 0. Raises role output. */
  training: number;
  /** Disciples assigned per role id. The rest are idle. */
  roles: Record<string, number>;
}

export interface AutoState {
  on: boolean;
  mode: AutoMode;
  /** Also buy affordable upgrades. Needs the Tidy Scrolls technique. */
  upgrades: boolean;
  /** Game-seconds since the last pass. */
  acc: number;
}

export interface GameState {
  /** Ki currently held. */
  ki: Decimal;
  /** Ki produced this run (resets on Rebirth, later). */
  runKi: Decimal;
  /** Ki produced ever. Monotonic. Drives unlocks. */
  totalKi: Decimal;
  /** Ki Flux: banked bonus game-seconds, charged by time away and spent by Speed Up. */
  fluxSec: number;
  /** Insight held. */
  insight: Decimal;
  /** Insight earned ever. Drives Archive Discoveries. */
  insightEarned: Decimal;
  /** Insight currently spent on techniques. A respec refunds exactly this. */
  insightSpent: Decimal;
  /** Renown held (Dojo soft currency). */
  renown: Decimal;
  dojo: DojoState;
  /** Owned technique ids. */
  techniques: Record<string, boolean>;
  /** Discovery ids the player has read. */
  discoveries: Record<string, boolean>;
  auto: AutoState;
  /** Unlocked zone ids. Persisted so each unlock is announced exactly once. */
  unlocked: Record<string, boolean>;
  /** Units owned per drill id. */
  drills: Record<string, number>;
  /** Bought upgrade ids. */
  upgrades: Record<string, boolean>;
  /** Named one-shot flags (e.g. spoilsCollected). */
  flags: Record<string, boolean>;
  stats: { playTimeSec: number; offlineSec: number; sessions: number };
  settings: Settings;
  /** Epoch ms the game was last saved or backgrounded. Used to measure absence. */
  lastSeen: number;
  createdAt: number;
}

export function defaultSettings(): Settings {
  return { notation: 'scientific', textScale: 1, reduceMotion: false, haptics: true, debug: false, buyAmount: 1 };
}

export const defaultDojo = (): DojoState => ({ disciples: 0, level: 1, training: 0, roles: {} });
export const defaultAuto = (): AutoState => ({ on: false, mode: 'cheapest', upgrades: false, acc: 0 });

export function newState(now: number): GameState {
  return {
    ki: D(10),
    runKi: D(10),
    totalKi: D(10),
    fluxSec: 0,
    insight: ZERO,
    insightEarned: ZERO,
    insightSpent: ZERO,
    renown: ZERO,
    dojo: defaultDojo(),
    techniques: {},
    discoveries: {},
    auto: defaultAuto(),
    unlocked: { training: true },
    drills: {},
    upgrades: {},
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

/** Every Insight gain goes through here so Insight and lifetime Insight stay together. */
export function addInsight(s: GameState, amount: Decimal): void {
  if (amount.lte(ZERO)) return;
  s.insight = s.insight.add(amount);
  s.insightEarned = s.insightEarned.add(amount);
}
