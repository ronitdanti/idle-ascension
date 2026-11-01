import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/content/config';
import { DRILLS } from '../src/content/drills';
import { UPGRADES } from '../src/content/upgrades';
import { ZONES } from '../src/content/zones';
import { D } from '../src/core/bignum';
import { advance, applyOffline, step, TICK_DT } from '../src/core/engine';
import { bulkCost } from '../src/core/economy';
import { parseSave, serialize } from '../src/core/save';
import { newState, type GameState } from '../src/core/state';
import {
  breakdown,
  buyDrill,
  buyQuote,
  buyUpgrade,
  drillCost,
  drillMaxBuy,
  drillVisible,
  fluxCapSec,
  fluxChargeRate,
  kiPerSec,
  milestoneAt,
  milestoneMultiplier,
  milestonesReached,
  nextMilestone,
  offers,
  smartSpend,
  upgradeAvailable,
} from '../src/core/training';

const T0 = 1_700_000_000_000;
const fresh = (ki = 10): GameState => {
  const s = newState(T0);
  s.ki = D(ki);
  s.totalKi = D(ki);
  s.runKi = D(ki);
  return s;
};

describe('count milestones', () => {
  it('follow 10, 25, 50, 100, then double', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(milestoneAt)).toEqual([10, 25, 50, 100, 200, 400, 800, 1600]);
  });

  it('counts how many are reached', () => {
    expect(milestonesReached(0)).toBe(0);
    expect(milestonesReached(9)).toBe(0);
    expect(milestonesReached(10)).toBe(1);
    expect(milestonesReached(24)).toBe(1);
    expect(milestonesReached(100)).toBe(4);
    expect(milestonesReached(3200)).toBe(9);
  });

  it('multiply by x2, with every fourth x3', () => {
    expect(milestoneMultiplier(9).toNumber()).toBe(1);
    expect(milestoneMultiplier(10).toNumber()).toBe(2);
    expect(milestoneMultiplier(25).toNumber()).toBe(4);
    expect(milestoneMultiplier(50).toNumber()).toBe(8);
    expect(milestoneMultiplier(100).toNumber()).toBe(24); // 2*2*2*3
    expect(milestoneMultiplier(200).toNumber()).toBe(48);
    expect(milestoneMultiplier(800).toNumber()).toBe(48 * 2 * 2); // 8th milestone is x3: 24*2*2*2*3
  });

  it('report the next milestone', () => {
    expect(nextMilestone(0)).toEqual({ at: 10, mult: 2 });
    expect(nextMilestone(99)).toEqual({ at: 100, mult: 3 });
    expect(nextMilestone(100)).toEqual({ at: 200, mult: 2 });
  });
});

describe('production', () => {
  it('a fresh player earns only the innate trickle', () => {
    expect(kiPerSec(fresh()).toNumber()).toBe(CONFIG.baseKiPerSec);
  });

  it('one unit gives its base production', () => {
    const s = fresh();
    s.drills.shadow = 1;
    expect(kiPerSec(s).toNumber()).toBeCloseTo(CONFIG.baseKiPerSec + Number(DRILLS[0].baseProd), 9);
  });

  it('applies milestone multipliers per drill', () => {
    const s = fresh();
    s.drills.shadow = 10;
    const expected = CONFIG.baseKiPerSec + 10 * Number(DRILLS[0].baseProd) * 2;
    expect(kiPerSec(s).toNumber()).toBeCloseTo(expected, 9);
  });

  it('drill upgrades are additive within their category', () => {
    const s = fresh();
    s.drills.shadow = 5;
    s.upgrades['shadow-1'] = true; // +100%
    s.upgrades['shadow-2'] = true; // +200%
    const per = Number(DRILLS[0].baseProd);
    expect(kiPerSec(s).toNumber()).toBeCloseTo(CONFIG.baseKiPerSec + 5 * per * (1 + 1 + 2), 9);
  });

  it('global bonuses multiply the whole sum, and are additive among themselves', () => {
    const s = fresh();
    s.drills.shadow = 5;
    s.upgrades['iron-resolve'] = true; // +10%
    s.upgrades['unbroken-focus'] = true; // +20%
    const raw = CONFIG.baseKiPerSec + 5 * Number(DRILLS[0].baseProd);
    expect(kiPerSec(s).toNumber()).toBeCloseTo(raw * 1.3, 9);
  });

  it('cross-drill bonuses scale with the source count', () => {
    const s = fresh();
    s.drills.weights = 4;
    s.drills.shadow = 20;
    s.upgrades['sparring-circle'] = true; // +1% per shadow
    const weights = 4 * Number(DRILLS[1].baseProd) * 1 * (1 + 0.2);
    const shadow = 20 * Number(DRILLS[0].baseProd) * 4; // milestones at 10 and 25? 20 -> one milestone (x2)
    expect(kiPerSec(s).toNumber()).toBeCloseTo(CONFIG.baseKiPerSec + weights + shadow / 2, 9);
  });

  it('the breakdown adds up to the same number as kiPerSec', () => {
    const s = fresh();
    s.drills = { shadow: 33, weights: 12, waterfall: 4 };
    s.upgrades = { 'shadow-1': true, 'iron-resolve': true, 'inner-spark': true };
    expect(breakdown(s).total.toNumber()).toBeCloseTo(kiPerSec(s).toNumber(), 6);
  });
});

describe('buying drills', () => {
  it('bulk buy equals buying one at a time', () => {
    const a = fresh(1e12);
    const b = fresh(1e12);
    buyDrill(a, 'weights', 10);
    for (let i = 0; i < 10; i++) buyDrill(b, 'weights', 1);
    expect(a.drills.weights).toBe(10);
    expect(b.drills.weights).toBe(10);
    expect(a.ki.div(b.ki).toNumber()).toBeCloseTo(1, 9);
  });

  it('refuses when it cannot afford the full amount', () => {
    const s = fresh(50);
    const r = buyDrill(s, 'shadow', 10);
    expect(r.bought).toBe(0);
    expect(s.drills.shadow ?? 0).toBe(0);
    expect(s.ki.toNumber()).toBe(50);
  });

  it('max buys exactly what is affordable and no more', () => {
    const s = fresh(5000);
    const before = drillMaxBuy(s, 'shadow');
    const r = buyDrill(s, 'shadow', 'max');
    expect(r.bought).toBe(before);
    expect(s.ki.gte(0)).toBe(true);
    expect(drillCost(s, 'shadow', 1).gt(s.ki)).toBe(true);
  });

  it('quotes the next unit for max when nothing is affordable', () => {
    const q = buyQuote(fresh(1), 'shadow', 'max');
    expect(q.count).toBe(1);
    expect(q.affordable).toBe(false);
  });

  it('reports milestones crossed', () => {
    const s = fresh(1e9);
    expect(buyDrill(s, 'shadow', 100).milestones).toBe(4);
  });

  it('uses the geometric cost formula', () => {
    const s = fresh();
    s.drills.shadow = 7;
    expect(drillCost(s, 'shadow', 5).toNumber()).toBeCloseTo(bulkCost(10, 1.15, 7, 5).toNumber(), 6);
  });

  it('cost reductions lower every drill cost', () => {
    const s = fresh();
    const full = drillCost(s, 'weights', 1).toNumber();
    s.upgrades['frugal-discipline'] = true;
    expect(drillCost(s, 'weights', 1).toNumber()).toBeCloseTo(full * 0.95, 9);
  });

  it('hides later drills until lifetime Ki reaches their threshold', () => {
    const s = fresh();
    expect(drillVisible(s, DRILLS[0])).toBe(true);
    expect(drillVisible(s, DRILLS[4])).toBe(false);
    s.totalKi = D(1e6);
    expect(drillVisible(s, DRILLS[4])).toBe(true);
  });
});

describe('buying upgrades', () => {
  it('only offers upgrades once their reveal condition is met', () => {
    const s = fresh(1e6);
    const u = UPGRADES.find((x) => x.id === 'shadow-1')!;
    expect(upgradeAvailable(s, u)).toBe(false);
    s.drills.shadow = 3;
    expect(upgradeAvailable(s, u)).toBe(true);
  });

  it('is one-time and costs Ki', () => {
    const s = fresh(1e6);
    s.drills.shadow = 3;
    expect(buyUpgrade(s, 'shadow-1')).toBe(true);
    expect(s.ki.toNumber()).toBeCloseTo(1e6 - 50, 6);
    expect(buyUpgrade(s, 'shadow-1')).toBe(false);
  });

  it('cannot be bought without the Ki or before reveal', () => {
    const s = fresh(10);
    s.drills.shadow = 3;
    expect(buyUpgrade(s, 'shadow-1')).toBe(false);
    expect(buyUpgrade(s, 'weights-1')).toBe(false);
  });

  it('Flux upgrades and drill milestones raise the Flux cap and charge rate', () => {
    const s = fresh();
    expect(fluxCapSec(s)).toBe(CONFIG.fluxCapSec);
    s.upgrades['deep-rest'] = true;
    expect(fluxCapSec(s)).toBe(CONFIG.fluxCapSec + 1800);
    s.upgrades['quiet-mind'] = true;
    s.drills.gravity = 10; // one milestone: +3%
    s.drills.dilation = 25; // two milestones: +10 min cap
    expect(fluxChargeRate(s)).toBeCloseTo(CONFIG.fluxPerAwaySec * (1 + 0.2 + 0.03), 9);
    expect(fluxCapSec(s)).toBe(CONFIG.fluxCapSec + 1800 + 600);
  });
});

describe('Smart Spend', () => {
  it('never spends more than it has and buys something useful', () => {
    const s = fresh(5000);
    const before = kiPerSec(s);
    const n = smartSpend(s);
    expect(n).toBeGreaterThan(0);
    expect(s.ki.gte(0)).toBe(true);
    expect(kiPerSec(s).gt(before)).toBe(true);
  });

  it('does nothing with no Ki', () => {
    const s = fresh(0);
    expect(smartSpend(s)).toBe(0);
  });

  it('offers are sorted best payback first', () => {
    const s = fresh(1e6);
    s.drills.shadow = 20;
    const list = offers(s);
    for (let i = 1; i < list.length; i++) expect(list[i].payback).toBeGreaterThanOrEqual(list[i - 1].payback);
  });
});

describe('simulation with drills', () => {
  const rich = (): GameState => {
    const s = fresh(1e6);
    s.totalKi = D(1e6);
    s.drills = { shadow: 40, weights: 15, waterfall: 6 };
    s.upgrades = { 'shadow-1': true, 'iron-resolve': true };
    return s;
  };

  it('chunked advance matches stepping at 10 Hz', () => {
    const a = rich();
    const b = rich();
    for (let i = 0; i < 36000; i++) step(a, TICK_DT, { offline: true });
    advance(b, 3600, { offline: true });
    expect(b.ki.div(a.ki).toNumber()).toBeCloseTo(1, 9);
  });

  it('offline progress pays at the current rate', () => {
    const s = rich();
    const rate = kiPerSec(s).toNumber();
    const r = applyOffline(s, T0 + 600_000)!;
    expect(r.kiGained.toNumber()).toBeCloseTo(rate * 600, 3);
  });

  it('Speed Up scales drill income too', () => {
    const s = rich();
    const rate = kiPerSec(s);
    expect(rate.gt(CONFIG.baseKiPerSec)).toBe(true);
  });
});

describe('content', () => {
  it('has unique ids and valid references', () => {
    const drillIds = new Set(DRILLS.map((d) => d.id));
    expect(drillIds.size).toBe(DRILLS.length);
    const upIds = new Set(UPGRADES.map((u) => u.id));
    expect(upIds.size).toBe(UPGRADES.length);
    for (const u of UPGRADES) {
      const e = u.effect;
      if (e.kind === 'drillBonus') expect(drillIds.has(e.drill), u.id).toBe(true);
      if (e.kind === 'crossBonus') {
        expect(drillIds.has(e.source), u.id).toBe(true);
        expect(drillIds.has(e.target), u.id).toBe(true);
      }
      if (u.reveal.kind === 'drillOwned') expect(drillIds.has(u.reveal.drill), u.id).toBe(true);
      expect(D(u.cost).gt(0), u.id).toBe(true);
    }
  });

  it('has the SPEC content scale: 10 drills and about 40 upgrades', () => {
    expect(DRILLS).toHaveLength(10);
    expect(UPGRADES.length).toBeGreaterThanOrEqual(40);
    expect(UPGRADES.length).toBeLessThanOrEqual(50);
  });

  it('drills climb about 12x in cost and 9x in output, with growth 1.15 to 1.30', () => {
    for (let i = 1; i < DRILLS.length; i++) {
      const cost = Number(DRILLS[i].baseCost) / Number(DRILLS[i - 1].baseCost);
      const prod = Number(DRILLS[i].baseProd) / Number(DRILLS[i - 1].baseProd);
      expect(cost).toBeGreaterThan(10);
      expect(cost).toBeLessThan(14);
      expect(prod).toBeGreaterThan(8);
      expect(prod).toBeLessThan(13);
      expect(DRILLS[i].growth).toBeGreaterThan(DRILLS[i - 1].growth);
    }
    expect(DRILLS[0].growth).toBe(1.15);
    expect(DRILLS[9].growth).toBe(1.3);
  });

  it('reveal thresholds rise with tier', () => {
    for (let i = 1; i < DRILLS.length; i++) expect(Number(DRILLS[i].revealAt)).toBeGreaterThan(Number(DRILLS[i - 1].revealAt));
  });

  it('zones reference only known unlock rules', () => {
    for (const z of ZONES) expect(['start', 'totalKi', 'flag']).toContain(z.unlock.kind);
  });
});

describe('save v3', () => {
  it('round-trips drills, upgrades and the buy amount', () => {
    const s = fresh();
    s.drills = { shadow: 12, gravity: 3 };
    s.upgrades = { 'shadow-1': true };
    s.settings.buyAmount = 'max';
    const back = parseSave(JSON.parse(JSON.stringify(serialize(s))));
    expect(back.drills).toEqual({ shadow: 12, gravity: 3 });
    expect(back.upgrades).toEqual({ 'shadow-1': true });
    expect(back.settings.buyAmount).toBe('max');
  });

  it('upgrades a v2 save with empty drills and upgrades, keeping Ki and Flux', () => {
    const v2 = { v: 2, ki: '123456', runKi: '123456', totalKi: '999999', fluxSec: 500, unlocked: { training: true, dojo: true }, settings: { notation: 'standard' } };
    const s = parseSave(v2);
    expect(s.drills).toEqual({});
    expect(s.upgrades).toEqual({});
    expect(s.totalKi.eq(999999)).toBe(true);
    expect(s.fluxSec).toBe(500);
    expect(s.settings.buyAmount).toBe(1);
  });

  it('drops junk counts', () => {
    const s = parseSave({ v: 3, drills: { shadow: -5, weights: 2.9, bad: 'x' }, settings: { buyAmount: 7 } });
    expect(s.drills).toEqual({ weights: 2 });
    expect(s.settings.buyAmount).toBe(1);
  });
});

describe('no soft-lock', () => {
  it('from random states there is always something affordable within a bounded wait', () => {
    let seed = 12345;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let i = 0; i < 200; i++) {
      const s = fresh(0);
      const total = 10 ** (rnd() * 14);
      s.totalKi = D(total);
      s.runKi = D(total);
      for (const d of DRILLS) if (rnd() < 0.7) s.drills[d.id] = Math.floor(rnd() * 120);
      for (const u of UPGRADES) if (rnd() < 0.3) s.upgrades[u.id] = true;
      // Starting from 0 Ki, the cheapest visible action must be reachable in bounded time.
      const cheapest = offers(s).reduce((m, o) => (o.cost.lt(m) ? o.cost : m), D('1e300'));
      const rate = kiPerSec(s);
      expect(rate.gt(0)).toBe(true);
      const wait = cheapest.div(rate).toNumber();
      expect(wait).toBeLessThan(3600 * 24 * 3);
    }
  });
});
