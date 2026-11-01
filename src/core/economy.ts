import { D, type Decimal, type DecimalSource } from './bignum';

/**
 * Generator pricing: cost(n) = base * growth^n, where n is the number already owned.
 * Bulk costs use the geometric series, never a loop, so they stay O(1) at any count.
 */
export function unitCost(base: DecimalSource, growth: number, owned: number): Decimal {
  return D(base).mul(D(growth).pow(owned));
}

/** Total cost of buying `count` more when `owned` are already held. */
export function bulkCost(base: DecimalSource, growth: number, owned: number, count: number): Decimal {
  if (count <= 0) return D(0);
  const first = unitCost(base, growth, owned);
  return first.mul(D(growth).pow(count).sub(1)).div(growth - 1);
}

/** The most units affordable with `budget`, never more than `cap` if given. */
export function maxAffordable(
  base: DecimalSource,
  growth: number,
  owned: number,
  budget: DecimalSource,
  cap = Infinity,
): number {
  const first = unitCost(base, growth, owned);
  const b = D(budget);
  if (b.lt(first)) return 0;
  // Solve first * (g^n - 1) / (g - 1) <= budget for n.
  const inner = b.mul(growth - 1).div(first).add(1);
  let n = Math.floor(inner.log10() / Math.log10(growth));
  if (!Number.isFinite(n)) return 0;
  n = Math.min(n, cap);
  // Correct floating point drift at the boundary.
  while (n > 0 && bulkCost(base, growth, owned, n).gt(b)) n--;
  while (n < cap && bulkCost(base, growth, owned, n + 1).lte(b)) n++;
  return Math.max(0, n);
}
