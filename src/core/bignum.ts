// Single import point for the big-number library so it can be swapped in one place.
import Decimal from 'break_infinity.js';
import type { DecimalSource } from 'break_infinity.js';

export { Decimal };
export type { DecimalSource };

export const D = (v: DecimalSource): Decimal => Decimal.fromValue(v);
export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);
