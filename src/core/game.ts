import { CONFIG } from '../content/config';
import { advance, applyOffline, step, TICK_DT, type GameEvent, type OfflineReport } from './engine';
import type { GameState } from './state';

/**
 * Fixed-step driver. No DOM: the browser runtime feeds it real frame deltas,
 * tests and the simulator feed it whatever they like.
 */
export class Game {
  timeWarp = 1;
  events: GameEvent[] = [];
  private acc = 0;

  constructor(public state: GameState) {}

  private emit = (e: GameEvent) => {
    this.events.push(e);
  };

  /** Feed real elapsed seconds. Runs whole 10 Hz ticks; very large batches (time-warp) are chunked. */
  update(realDt: number): void {
    if (!(realDt > 0)) return;
    this.acc += Math.min(realDt, CONFIG.maxFrameDt) * this.timeWarp;
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
