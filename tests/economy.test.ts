import { describe, expect, it } from 'vitest';
import { D } from '../src/core/bignum';
import { bulkCost, maxAffordable, unitCost } from '../src/core/economy';

describe('bulkCost', () => {
  it('matches summing unit costs', () => {
    for (const growth of [1.15, 1.22, 1.3, 1.35]) {
      for (const owned of [0, 7, 40]) {
        let sum = D(0);
        for (let i = 0; i < 25; i++) sum = sum.add(unitCost(10, growth, owned + i));
        const closed = bulkCost(10, growth, owned, 25);
        expect(closed.div(sum).toNumber()).toBeCloseTo(1, 9);
      }
    }
  });

  it('is zero for zero units', () => {
    expect(bulkCost(10, 1.15, 5, 0).toNumber()).toBe(0);
  });

  it('works with counts far past double range', () => {
    const c = bulkCost(10, 1.3, 5000, 100);
    expect(c.gt('1e500')).toBe(true);
    expect(Number.isNaN(c.m)).toBe(false);
  });
});

describe('maxAffordable', () => {
  it('buys exactly what the budget allows', () => {
    for (const growth of [1.15, 1.3]) {
      for (const owned of [0, 12, 200]) {
        for (const budget of ['5', '1e3', '1e9', '1e40']) {
          const n = maxAffordable(10, growth, owned, budget);
          if (n > 0) expect(bulkCost(10, growth, owned, n).lte(budget)).toBe(true);
          expect(bulkCost(10, growth, owned, n + 1).gt(budget)).toBe(true);
        }
      }
    }
  });

  it('returns 0 when the first unit is unaffordable', () => {
    expect(maxAffordable(10, 1.15, 0, 9)).toBe(0);
  });

  it('respects the cap', () => {
    expect(maxAffordable(10, 1.15, 0, '1e50', 10)).toBe(10);
  });

  it('handles a budget with no practical limit', () => {
    const n = maxAffordable(10, 1.3, 0, '1e300');
    expect(n).toBeGreaterThan(900);
    expect(bulkCost(10, 1.3, 0, n).lte('1e300')).toBe(true);
  });
});
