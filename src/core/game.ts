import { CONFIG } from '../content/config';
import { advance, applyOffline, baseKiPerSec, step, TICK_DT, type GameEvent, type OfflineReport } from './engine';
import type { GameState } from './state';
import type { Decimal } from './bignum';

/**
 * Fixed-step driver. No DOM: the browser runtime feeds it real frame deltas,
 * tests and the simulator feed it whatever they like.
 */
export class Game {
  /** Debug time-warp multiplier. Separate from Speed Up and costs nothing. */
  timeWarp = 1;
  /** Selected Speed Up level (1 = off). Runtime only: every session starts at x1. */
  speed = 1;
  events: GameEvent[] = [];
  private acc = 0;

  constructor(public state: GameState) {}

  private emit = (e: GameEvent) => {
    this.events.push(e);
  };

  /** The speed actually in effect: the selected level, but only while Flux remains. */
  get activeSpeed(): number {
    return this.speed > 1 && this.state.fluxSec > 0 ? this.speed : 1;
  }

  /** Ki per real second right now, including Speed Up. */
  get kiPerSec(): Decimal {
    return baseKiPerSec(this.state).mul(this.activeSpeed);
  }

  setSpeed(level: number): void {
    this.speed = level > 1 && (CONFIG.speedLevels as readonly number[]).includes(level) && this.state.fluxSec > 0 ? level : 1;
  }

  /**
   * Charged Meditation: turn `dt` real seconds into game seconds. At xN each real second burns
   * (N - 1) Flux. If Flux runs out mid-frame the rest of the frame runs at normal speed and
   * Speed Up switches itself off. Exact for any dt.
   */
  spendFlux(dt: number): number {
    const m = this.speed;
    const flux = this.state.fluxSec;
    if (m <= 1 || flux <= 0) return dt;
    const boosted = Math.min(dt, flux / (m - 1));
    this.state.fluxSec = flux - boosted * (m - 1);
    if (this.state.fluxSec < 1e-9) {
      this.state.fluxSec = 0;
      this.speed = 1;
      this.emit({ type: 'fluxEmpty' });
    }
    return boosted * m + (dt - boosted);
  }

  /** Feed real elapsed seconds. Runs whole 10 Hz ticks; very large batches (time-warp) are chunked. */
  update(realDt: number): void {
    if (!(realDt > 0)) return;
    this.acc += this.spendFlux(Math.min(realDt, CONFIG.maxFrameDt)) * this.timeWarp;
    const steps = Math.floor(this.acc / TICK_DT + 1e-9);
    if (steps <= 0) return;
    this.acc -= steps * TICK_DT;
    const ctx = { offline: false, emit: this.emit };
    if (steps <= 50) {
      for (let i = 0; i < steps; i++) step(this.state, TICK_DT, ctx);
    } else {
      advance(this.state, steps * TICK_DT, ctx);
    }
  }

  /** Apply time away (app start or returning to the tab). */
  returnFromAway(nowMs: number): OfflineReport | null {
    const report = applyOffline(this.state, nowMs);
    for (const z of report?.unlocks ?? []) this.events.push({ type: 'unlock', zone: z });
    return report;
  }

  drainEvents(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }
}
