import { describe, expect, it } from 'vitest';
import { formatDuration, formatNum, standardSuffix } from '../src/core/format';

describe('formatNum', () => {
  it('prints small values plainly', () => {
    expect(formatNum(0)).toBe('0');
    expect(formatNum(7)).toBe('7');
    expect(formatNum(999)).toBe('999');
    expect(formatNum(12.5, 'scientific', 1)).toBe('12.5');
    expect(formatNum(12, 'scientific', 1)).toBe('12');
  });

  it('adds separators below one million', () => {
    expect(formatNum(12345)).toBe('12,345');
  });

  it('scientific', () => {
    expect(formatNum(1.234e6)).toBe('1.23e6');
    expect(formatNum('1.5e45')).toBe('1.50e45');
    expect(formatNum('9.999e20')).toBe('1.00e21');
    expect(formatNum('1e500')).toBe('1.00e500');
  });

  it('engineering', () => {
    expect(formatNum(1.234e7, 'engineering')).toBe('12.3e6');
    expect(formatNum('9.999e8', 'engineering')).toBe('1.00e9');
  });

  it('standard', () => {
    expect(formatNum(1.5e6, 'standard')).toBe('1.50M');
    expect(formatNum(2.5e9, 'standard')).toBe('2.50B');
    expect(formatNum('9.9999e5', 'standard')).toBe('999,990');
    expect(formatNum('1e36', 'standard')).toBe('1.00aa');
    expect(formatNum('1e39', 'standard')).toBe('1.00ab');
  });

  it('standard falls back to scientific past the suffix table', () => {
    expect(formatNum('1e4000', 'standard')).toBe('1.00e4000');
  });

  it('handles negatives', () => {
    expect(formatNum(-1500)).toBe('-1,500');
  });
});

describe('standardSuffix', () => {
  it('walks into letter pairs', () => {
    expect(standardSuffix(0)).toBe('');
    expect(standardSuffix(11)).toBe('Dc');
    expect(standardSuffix(12)).toBe('aa');
    expect(standardSuffix(38)).toBe('ba');
  });
});

describe('formatDuration', () => {
  it('formats ranges', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(192)).toBe('3m 12s');
    expect(formatDuration(5 * 3600 + 20 * 60)).toBe('5h 20m');
    expect(formatDuration(2 * 86400 + 4 * 3600)).toBe('2d 4h');
    expect(formatDuration(-5)).toBe('0s');
  });
});
