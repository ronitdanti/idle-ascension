import { describe, expect, it } from 'vitest';
import { D } from '../src/core/bignum';
import { CONFIG } from '../src/content/config';
import { advance, applyOffline, step, TICK_DT } from '../src/core/engine';
import { Game } from '../src/core/game';
import { newState, type GameState } from '../src/core/state';

const T0 = 1_700_000_000_000;
const fresh = (): GameState => newState(T0);

function stepTicks(s: GameState, seconds: number, offline: boolean) {
  const n = Math.round(seconds / TICK_DT);
  for (let i = 0; i < n; i++) step(s, TICK_DT, { offline });
}

describe('simulation parity', () => {
  it('chunked offline advance matches stepping at 10 Hz', () => {
    const a = fresh();
    const b = fresh();
    stepTicks(a, 3600, true);
    advance(b, 3600, { offline: true });
    expect(b.ki.div(a.ki).toNumber()).toBeCloseTo(1, 9);
    expect(b.totalKi.div(a.totalKi).toNumber()).toBeCloseTo(1, 9);
  });

  it('advance handles tiny and zero spans', () => {
    const s = fresh();
    advance(s, 0, { offline: true });
    advance(s, -5, { offline: true });
    advance(s, NaN, { offline: true });
    expect(s.ki.toNumber()).toBe(10);
  });
});

describe('Game fixed-step driver', () => {
  it('turns real frames into whole ticks without drifting', () => {
    const g = new Game(fresh());
    for (let i = 0; i < 600; i++) g.update(1 / 60); // 10 real seconds at 60 fps
    expect(g.state.ki.toNumber()).toBeCloseTo(10 + 10 * CONFIG.baseKiPerSec, 0);
  });

  describe('Speed Up (Charged Meditation)', () => {
    const run = (g: Game, realSec: number) => {
      for (let i = 0; i < Math.round(realSec * 60); i++) g.update(1 / 60);
    };

    it('x3 triples progress and burns 2 Flux per real second', () => {
      const g = new Game(fresh());
      g.state.fluxSec = 100;
      g.setSpeed(3);
      run(g, 10);
      expect(g.state.ki.toNumber()).toBeCloseTo(10 + 30 * CONFIG.baseKiPerSec, 0);
      expect(g.state.fluxSec).toBeCloseTo(80, 3);
    });

    it('runs out mid-frame, falls back to x1 and tells the player', () => {
      const g = new Game(fresh());
      g.state.fluxSec = 4; // lasts 2 real seconds at x3
      g.setSpeed(3);
      run(g, 10);
      // 2s at x3 = 6 game-seconds, then 8s at x1 = 8 game-seconds
      expect(g.state.ki.toNumber()).toBeCloseTo(10 + 14 * CONFIG.baseKiPerSec, 0);
      expect(g.state.fluxSec).toBe(0);
      expect(g.speed).toBe(1);
      expect(g.drainEvents().filter((e) => e.type === 'fluxEmpty')).toHaveLength(1);
    });

    it('cannot be selected without Flux, or at an unknown level', () => {
      const g = new Game(fresh());
      g.setSpeed(5);
      expect(g.activeSpeed).toBe(1);
      g.state.fluxSec = 50;
      g.setSpeed(7);
      expect(g.activeSpeed).toBe(1);
      g.setSpeed(2);
      expect(g.activeSpeed).toBe(2);
    });

    it('spending all Flux never yields more bonus time than Flux spent', () => {
      for (const level of [2, 3, 5]) {
        const g = new Game(fresh());
        g.state.fluxSec = 600;
        g.setSpeed(level);
        let gameSec = 0;
        for (let i = 0; i < 60 * 1200; i++) {
          gameSec += g.spendFlux(1 / 60);
        }
        // 1200 real seconds elapsed; extra game time gained must equal Flux burned (600).
        expect(gameSec - 1200).toBeCloseTo(600, 1);
      }
    });

    it('does not change Ki per second when idle at x1', () => {
      const g = new Game(fresh());
      expect(g.kiPerSec.toNumber()).toBe(CONFIG.baseKiPerSec);
      g.state.fluxSec = 10;
      g.setSpeed(5);
      expect(g.kiPerSec.toNumber()).toBe(CONFIG.baseKiPerSec * 5);
    });
  });

  it('time-warp multiplies progress', () => {
    const g = new Game(fresh());
    g.timeWarp = 100;
    for (let i = 0; i < 60; i++) g.update(1 / 60);
    expect(g.state.ki.toNumber()).toBeGreaterThan(90);
  });

  it('caps a single huge frame', () => {
    const g = new Game(fresh());
    g.update(10_000);
    expect(g.state.ki.toNumber()).toBeLessThan(10 + CONFIG.maxFrameDt * CONFIG.baseKiPerSec + 1);
  });
});

describe('offline progress', () => {
  it('grants Ki for time away and charges Ki Flux', () => {
    const s = fresh();
    const r = applyOffline(s, T0 + 3600_000)!;
    expect(r.awaySec).toBe(3600);
    expect(r.countedSec).toBe(3600);
    expect(r.capped).toBe(false);
    expect(r.kiGained.toNumber()).toBeCloseTo(3600 * CONFIG.baseKiPerSec, 3);
    expect(s.fluxSec).toBe(3600 * CONFIG.fluxPerAwaySec);
    expect(r.fluxGainedSec).toBe(3600 * CONFIG.fluxPerAwaySec);
    expect(s.lastSeen).toBe(T0 + 3600_000);
    expect(s.stats.offlineSec).toBe(3600);
  });

  it('Flux never boosts the offline pass itself', () => {
    const s = fresh();
    s.fluxSec = 1000;
    const r = applyOffline(s, T0 + 100_000)!;
    expect(r.kiGained.toNumber()).toBeCloseTo(100 * CONFIG.baseKiPerSec, 3);
  });

  it('stacks Flux across absences up to the cap and never lowers it', () => {
    const s = fresh();
    applyOffline(s, T0 + 6 * 3600_000);
    applyOffline(s, T0 + 12 * 3600_000);
    applyOffline(s, T0 + 24 * 3600_000);
    expect(s.fluxSec).toBe(CONFIG.fluxCapSec);
    s.fluxSec = CONFIG.fluxCapSec + 500; // e.g. a later upgrade lowered the cap
    applyOffline(s, T0 + 25 * 3600_000);
    expect(s.fluxSec).toBe(CONFIG.fluxCapSec + 500);
  });

  it('clamps to the offline cap and reports it', () => {
    const s = fresh();
    const r = applyOffline(s, T0 + 100 * 3600_000)!;
    expect(r.capped).toBe(true);
    expect(r.countedSec).toBe(CONFIG.offlineCapSec);
    expect(s.fluxSec).toBe(CONFIG.fluxCapSec);
  });

  it('never subtracts anything when the clock goes backwards', () => {
    const s = fresh();
    s.ki = D(500);
    s.totalKi = D(500);
    const r = applyOffline(s, T0 - 5 * 3600_000);
    expect(r).toBeNull();
    expect(s.ki.toNumber()).toBe(500);
    expect(s.fluxSec).toBe(0);
    expect(s.lastSeen).toBe(T0); // not dragged into the past
    // Returning to the real time afterwards does not mint free hours.
    const later = applyOffline(s, T0 + 10_000)!;
    expect(later.awaySec).toBe(10);
  });

  it('survives NaN timestamps', () => {
    const s = fresh();
    expect(applyOffline(s, NaN)).toBeNull();
    expect(s.ki.toNumber()).toBe(10);
  });

  it('reports unlocks crossed during absence', () => {
    const s = fresh();
    s.totalKi = D(990);
    s.ki = D(990);
    s.runKi = D(990);
    const r = applyOffline(s, T0 + 60_000)!;
    expect(r.unlocks).toContain('dojo');
    expect(s.unlocked.dojo).toBe(true);
  });
});

describe('unlocks', () => {
  it('unlocks once, from lifetime Ki, and emits one event', () => {
    const g = new Game(fresh());
    g.state.totalKi = D(999.95);
    g.update(0.2);
    g.update(0.2);
    const events = g.drainEvents();
    expect(events.filter((e) => e.type === 'unlock' && e.zone === 'dojo')).toHaveLength(1);
    expect(g.drainEvents()).toHaveLength(0);
  });

  it('spending Ki never relocks a zone', () => {
    const g = new Game(fresh());
    g.state.totalKi = D(5e4);
    g.update(0.2);
    expect(g.state.unlocked.archive).toBe(true);
    g.state.ki = D(0);
    g.update(0.2);
    expect(g.state.unlocked.archive).toBe(true);
  });
});
