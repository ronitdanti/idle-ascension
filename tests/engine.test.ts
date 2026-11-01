import { describe, expect, it } from 'vitest';
import { D } from '../src/core/bignum';
import { CONFIG } from '../src/content/config';
import { advance, applyOffline, gather, step, TICK_DT } from '../src/core/engine';
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

  it('rested bonus is identical whether stepped or chunked, and is spent', () => {
    const a = fresh();
    const b = fresh();
    a.restedSec = 100;
    b.restedSec = 100;
    stepTicks(a, 300, false);
    advance(b, 300, { offline: false });
    expect(b.ki.div(a.ki).toNumber()).toBeCloseTo(1, 9);
    expect(a.restedSec).toBeCloseTo(0, 6);
    expect(b.restedSec).toBeCloseTo(0, 6);
    // 100s doubled + 200s normal = 400 Ki of trickle, plus the 10 starting Ki.
    expect(a.ki.toNumber()).toBeCloseTo(10 + 400 * CONFIG.baseKiPerSec, 4);
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
  it('grants Ki for time away and banks Rested time', () => {
    const s = fresh();
    const r = applyOffline(s, T0 + 3600_000)!;
    expect(r.awaySec).toBe(3600);
    expect(r.countedSec).toBe(3600);
    expect(r.capped).toBe(false);
    expect(r.kiGained.toNumber()).toBeCloseTo(3600 * CONFIG.baseKiPerSec, 3);
    expect(s.restedSec).toBe(3600);
    expect(s.lastSeen).toBe(T0 + 3600_000);
    expect(s.stats.offlineSec).toBe(3600);
  });

  it('does not use the Rested bonus while away', () => {
    const s = fresh();
    s.restedSec = 1000;
    const r = applyOffline(s, T0 + 100_000)!;
    expect(r.kiGained.toNumber()).toBeCloseTo(100 * CONFIG.baseKiPerSec, 3);
  });

  it('clamps to the offline cap and reports it', () => {
    const s = fresh();
    const r = applyOffline(s, T0 + 100 * 3600_000)!;
    expect(r.capped).toBe(true);
    expect(r.countedSec).toBe(CONFIG.offlineCapSec);
    expect(s.restedSec).toBe(CONFIG.restedCapSec);
  });

  it('never subtracts anything when the clock goes backwards', () => {
    const s = fresh();
    s.ki = D(500);
    s.totalKi = D(500);
    const r = applyOffline(s, T0 - 5 * 3600_000);
    expect(r).toBeNull();
    expect(s.ki.toNumber()).toBe(500);
    expect(s.restedSec).toBe(0);
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

describe('unlocks and gather', () => {
  it('unlocks once, from lifetime Ki, and emits one event', () => {
    const g = new Game(fresh());
    g.state.totalKi = D(999.95);
    g.update(0.2);
    g.update(0.2);
    const events = g.drainEvents();
    expect(events.filter((e) => e.zone === 'dojo')).toHaveLength(1);
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

  it('gather adds to Ki, run Ki and lifetime Ki together', () => {
    const s = fresh();
    gather(s);
    expect(s.ki.toNumber()).toBe(11);
    expect(s.runKi.toNumber()).toBe(11);
    expect(s.totalKi.toNumber()).toBe(11);
    expect(s.stats.taps).toBe(1);
  });
});
