import { D, type DecimalSource } from './bignum';
import type { Notation } from './state';

const STANDARD = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

/** Suffix for 1000^tier. Names run to Dc (1e33), then aa, ab, ac ... zz. */
export function standardSuffix(tier: number): string | null {
  if (tier < STANDARD.length) return STANDARD[tier];
  const i = tier - STANDARD.length;
  if (i >= 26 * 26) return null;
  return ALPHA[Math.floor(i / 26)] + ALPHA[i % 26];
}

const dpFor = (n: number) => (n >= 100 ? 0 : n >= 10 ? 1 : 2);

/** Round to 3 significant digits: 123, 12.3, 1.23 (may reach 1000, which the caller carries). */
function sig3(n: number): number {
  return Number(n.toFixed(dpFor(n)));
}

function trimmed(n: number): string {
  return n.toFixed(dpFor(n));
}

/**
 * Format a game number. Small values are plain; large ones follow the chosen notation.
 * `decimals` caps decimal places for values under 1000 (use 0 for counts, 1 or 2 for rates).
 */
export function formatNum(value: DecimalSource, notation: Notation = 'scientific', decimals = 0): string {
  const d = D(value);
  if (Number.isNaN(d.m)) return '0';
  if (d.lt(0)) return '-' + formatNum(d.abs(), notation, decimals);
  if (d.lt(1000)) {
    const n = d.toNumber();
    if (decimals <= 0 || Number.isInteger(n)) return Math.floor(n + 1e-9).toString();
    return n.toFixed(decimals).replace(/\.?0+$/, '');
  }
  if (d.lt(1e6) && notation !== 'engineering') {
    return Math.floor(d.toNumber()).toLocaleString('en-US');
  }

  let e = d.e;
  const m = d.m; // 1 <= m < 10

  if (notation === 'scientific') {
    let r = Math.round(m * 100) / 100;
    if (r >= 10) {
      r = 1;
      e += 1;
    }
    return `${r.toFixed(2)}e${e}`;
  }

  // engineering and standard group by powers of 1000
  let tier = Math.floor(e / 3);
  let mant = sig3(m * 10 ** (e - tier * 3));
  if (mant >= 1000) {
    mant = 1;
    tier += 1;
  }
  if (notation === 'engineering') return `${trimmed(mant)}e${tier * 3}`;
  const suffix = standardSuffix(tier);
  if (suffix === null) return formatNum(d, 'scientific');
  return `${trimmed(mant)}${suffix}`;
}

/** 45s, 3m 12s, 5h 20m, 2d 4h. */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const days = Math.floor(h / 24);
  return `${days}d ${h % 24}h`;
}
