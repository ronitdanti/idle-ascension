import { describe, expect, it } from 'vitest';
import { DISCOVERIES } from '../src/content/discoveries';
import { DOJO } from '../src/content/dojo';
import { TECHNIQUES, TECH_BY_ID } from '../src/content/techniques';
import { D } from '../src/core/bignum';
import {
  buyTech,
  buyableTechCount,
  canRefund,
  discoveriesReady,
  readDiscovery,
  refundTech,
  respec,
  techBuyable,
  techCount,
} from '../src/core/archive';
import { assign, insightPerSec } from '../src/core/dojo';
import { newState, type GameState } from '../src/core/state';
import { kiPerSec } from '../src/core/training';

const T0 = 1_700_000_000_000;
const archive = (insight = 100): GameState => {
  const s = newState(T0);
  s.unlocked.dojo = true;
  s.unlocked.archive = true;
  s.insight = D(insight);
  return s;
};

describe('Technique Tree purchases', () => {
  it('needs the Archive, the prerequisites and the Insight', () => {
    const s = newState(T0);
    s.insight = D(1000);
    expect(buyTech(s, 'iron-fist')).toBe(false); // Archive not open
    s.unlocked.archive = true;
    expect(buyTech(s, 'ox-shoulders')).toBe(false); // needs Iron Fist
    expect(buyTech(s, 'iron-fist')).toBe(true);
    expect(buyTech(s, 'iron-fist')).toBe(false); // already owned
    expect(buyTech(s, 'ox-shoulders')).toBe(true);
    s.insight = D(0);
    expect(buyTech(s, 'stone-posture')).toBe(false); // cannot afford
    expect(buyTech(s, 'no-such-node')).toBe(false);
  });

  it('spends exactly the cost and records it', () => {
    const s = archive(100);
    const cost = TECH_BY_ID.get('iron-fist')!.cost;
    buyTech(s, 'iron-fist');
    expect(s.insight.toNumber()).toBe(100 - cost);
    expect(s.insightSpent.toNumber()).toBe(cost);
    expect(techCount(s)).toBe(1);
  });

  it('a bought technique changes Ki per second', () => {
    const s = archive(100);
    s.drills.shadow = 10;
    const before = kiPerSec(s).toNumber();
    buyTech(s, 'iron-fist');
    expect(kiPerSec(s).toNumber()).toBeGreaterThan(before);
  });

  it('counts what can be bought now', () => {
    const s = archive(10);
    expect(buyableTechCount(s)).toBeGreaterThan(0);
    for (const t of TECHNIQUES) if (techBuyable(s, t)) expect(t.requires).toHaveLength(0);
  });
});

describe('free respec', () => {
  it('refunds 100% of everything spent and clears the tree', () => {
    const s = archive(1e6);
    const start = s.insight.toNumber();
    for (const id of ['iron-fist', 'ox-shoulders', 'stone-posture', 'first-breath', 'quiet-center']) expect(buyTech(s, id)).toBe(true);
    expect(s.insight.toNumber()).toBeLessThan(start);
    const back = respec(s);
    expect(back.toNumber()).toBeGreaterThan(0);
    expect(s.insight.toNumber()).toBe(start);
    expect(s.insightSpent.toNumber()).toBe(0);
    expect(techCount(s)).toBe(0);
  });

  it('refunds the recorded amount even if node costs change later', () => {
    const s = archive(1000);
    buyTech(s, 'iron-fist');
    const held = s.insight.toNumber();
    s.insightSpent = D(999); // as if the node had cost 999 when it was bought
    respec(s);
    expect(s.insight.toNumber()).toBe(held + 999);
  });

  it('refunding twice does nothing extra', () => {
    const s = archive(1000);
    buyTech(s, 'iron-fist');
    respec(s);
    const after = s.insight.toNumber();
    respec(s);
    expect(s.insight.toNumber()).toBe(after);
  });

  it('single refunds only work on leaves, so nothing loses a prerequisite', () => {
    const s = archive(1e6);
    buyTech(s, 'iron-fist');
    buyTech(s, 'ox-shoulders');
    expect(canRefund(s, 'iron-fist')).toBe(false);
    expect(refundTech(s, 'iron-fist')).toBe(false);
    const before = s.insight.toNumber();
    expect(refundTech(s, 'ox-shoulders')).toBe(true);
    expect(s.insight.toNumber()).toBe(before + TECH_BY_ID.get('ox-shoulders')!.cost);
    expect(refundTech(s, 'iron-fist')).toBe(true);
    expect(s.insightSpent.toNumber()).toBe(0);
  });

  it('is exact over many random buy and refund sequences', () => {
    const s = archive(1e9);
    const start = s.insight.toNumber();
    let seed = 7;
    const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    for (let i = 0; i < 400; i++) {
      const t = TECHNIQUES[Math.floor(rnd() * TECHNIQUES.length)];
      if (rnd() < 0.7) buyTech(s, t.id);
      else refundTech(s, t.id);
    }
    respec(s);
    expect(s.insight.toNumber()).toBe(start);
  });
});

describe('Archive Discoveries', () => {
  it('are found as lifetime Insight grows and read once', () => {
    const s = archive(0);
    expect(discoveriesReady(s)).toHaveLength(0);
    s.insightEarned = D(DISCOVERIES[0].at);
    expect(discoveriesReady(s).map((d) => d.id)).toEqual([DISCOVERIES[0].id]);
    expect(readDiscovery(s, DISCOVERIES[0].id)).toBe(true);
    expect(readDiscovery(s, DISCOVERIES[0].id)).toBe(false);
    expect(discoveriesReady(s)).toHaveLength(0);
  });

  it('cannot be read before they are found', () => {
    const s = archive(0);
    expect(readDiscovery(s, DISCOVERIES[3].id)).toBe(false);
  });

  it('Insight lumps are worth the stated number of seconds of income', () => {
    const s = archive(0);
    s.dojo.disciples = 2;
    assign(s, 'scribe', 2);
    s.insightEarned = D(DISCOVERIES[0].at);
    const rate = insightPerSec(s).toNumber();
    expect(rate).toBeCloseTo(DOJO.insightTrickle + 2 * DOJO.scribeInsightPerSec, 9);
    readDiscovery(s, 'first-page');
    expect(s.insight.toNumber()).toBeCloseTo(rate * 600, 6);
  });

  it('permanent rewards act like technique effects', () => {
    const s = archive(0);
    s.drills.shadow = 10;
    const before = kiPerSec(s).toNumber();
    s.insightEarned = D(1e3);
    readDiscovery(s, 'calm-tea');
    expect(kiPerSec(s).toNumber()).toBeCloseTo(before * 1.01, 9);
  });
});
