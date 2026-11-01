import { describe, expect, it } from 'vitest';
import { D } from '../src/core/bignum';
import {
  decodeExport,
  encodeExport,
  fromJson,
  migrate,
  parseSave,
  SAVE_VERSION,
  SaveError,
  serialize,
  toJson,
} from '../src/core/save';
import { newState } from '../src/core/state';

const T0 = 1_700_000_000_000;

function richState() {
  const s = newState(T0);
  s.ki = D('1.234e500');
  s.runKi = D('2e500');
  s.totalKi = D('3.5e777');
  s.restedSec = 1234.5;
  s.unlocked = { training: true, dojo: true };
  s.flags = { spoilsCollected: true };
  s.stats = { playTimeSec: 4000, offlineSec: 9000, sessions: 7 };
  s.settings = { notation: 'standard', textScale: 1.2, reduceMotion: true, haptics: false, debug: true };
  s.lastSeen = T0 + 5000;
  return s;
}

describe('save round trip', () => {
  it('preserves every field including huge numbers', () => {
    const s = richState();
    const back = fromJson(toJson(s));
    expect(back.ki.eq(s.ki)).toBe(true);
    expect(back.totalKi.eq(s.totalKi)).toBe(true);
    expect(back.runKi.eq(s.runKi)).toBe(true);
    expect(serialize(back)).toEqual(serialize(s));
  });

  it('survives the export string', () => {
    const s = richState();
    const text = encodeExport(s);
    expect(text.startsWith('KIA1.')).toBe(true);
    expect(serialize(decodeExport(text))).toEqual(serialize(s));
  });

  it('tolerates whitespace and line breaks in pasted exports', () => {
    const s = richState();
    const text = encodeExport(s);
    const wrapped = text.replace(/(.{40})/g, '$1\n  ');
    expect(serialize(decodeExport(wrapped))).toEqual(serialize(s));
  });

  it('accepts raw save JSON for manual recovery', () => {
    const s = richState();
    expect(serialize(decodeExport(toJson(s)))).toEqual(serialize(s));
  });
});

describe('save safety', () => {
  it('detects a damaged export string', () => {
    const text = encodeExport(richState());
    const bad = text.slice(0, 20) + 'X' + text.slice(21);
    expect(() => decodeExport(bad)).toThrowError(SaveError);
    try {
      decodeExport(bad);
    } catch (e) {
      expect((e as SaveError).code).toBe('checksum');
    }
  });

  it('rejects junk', () => {
    for (const junk of ['', 'hello', '{}', '[]', 'KIA1.abc', '{"v":"x"}', 'null']) {
      expect(() => decodeExport(junk), junk).toThrowError(SaveError);
    }
  });

  it('refuses saves from a newer build instead of touching them', () => {
    const data = { ...serialize(newState(T0)), v: SAVE_VERSION + 1 };
    try {
      parseSave(data);
      expect.unreachable();
    } catch (e) {
      expect((e as SaveError).code).toBe('tooNew');
    }
  });

  it('fills missing fields with defaults instead of losing the save', () => {
    const s = parseSave({ v: SAVE_VERSION, totalKi: '5e9', ki: '100' });
    expect(s.totalKi.eq('5e9')).toBe(true);
    expect(s.unlocked.training).toBe(true);
    expect(s.settings.notation).toBe('scientific');
    expect(s.stats.sessions).toBe(1);
  });

  it('sanitizes bad values', () => {
    const s = parseSave({
      v: SAVE_VERSION,
      ki: 'nonsense',
      totalKi: '-5',
      restedSec: -10,
      settings: { textScale: 99, notation: 'bogus' },
    });
    expect(s.ki.gte(0)).toBe(true);
    expect(s.totalKi.gte(s.ki)).toBe(true);
    expect(s.restedSec).toBe(0);
    expect(s.settings.textScale).toBe(1.4);
    expect(s.settings.notation).toBe('scientific');
  });

  it('keeps lifetime Ki at least as large as Ki held', () => {
    const s = parseSave({ v: SAVE_VERSION, ki: '1e10', totalKi: '5' });
    expect(s.totalKi.gte(s.ki)).toBe(true);
  });
});

describe('migrations', () => {
  it('runs a chain in order and stamps the version', () => {
    const table = {
      0: (d: any) => ({ ...d, a: 1 }),
      1: (d: any) => ({ ...d, b: d.a + 1 }),
      2: (d: any) => ({ ...d, c: d.b + 1 }),
    };
    const out = migrate({ v: 0 }, table, 3);
    expect(out).toMatchObject({ v: 3, a: 1, b: 2, c: 3 });
  });

  it('fails loudly when a step is missing', () => {
    expect(() => migrate({ v: 0 }, {}, 1)).toThrowError(SaveError);
  });

  it('current-version saves pass through untouched', () => {
    const data = serialize(newState(T0));
    expect(migrate(data)).toBe(data);
  });
});
