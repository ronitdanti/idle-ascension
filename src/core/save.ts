import { D, ZERO, type Decimal } from './bignum';
import { defaultSettings, newState, type GameState, type Notation, type Settings } from './state';

/** Bump when the save shape changes, and add a migration for the old version. */
export const SAVE_VERSION = 1;

export type SaveErrorCode = 'corrupt' | 'tooNew' | 'checksum';

export class SaveError extends Error {
  constructor(
    public code: SaveErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** Plain-JSON shape. Big numbers are strings so they survive JSON at any magnitude. */
export interface SaveData {
  v: number;
  ki: string;
  runKi: string;
  totalKi: string;
  restedSec: number;
  unlocked: Record<string, boolean>;
  flags: Record<string, boolean>;
  stats: GameState['stats'];
  settings: Settings;
  lastSeen: number;
  createdAt: number;
}

/** migrations[n] upgrades a version-n save to version n+1. */
export type Migrations = Record<number, (data: any) => any>;
export const MIGRATIONS: Migrations = {};

export function migrate(raw: any, migrations: Migrations = MIGRATIONS, target = SAVE_VERSION): any {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new SaveError('corrupt', 'Save is not an object.');
  let v = raw.v;
  if (!Number.isInteger(v) || v < 0) throw new SaveError('corrupt', 'Save has no version.');
  if (v > target) throw new SaveError('tooNew', `Save is version ${v}; this build understands up to ${target}.`);
  let data = raw;
  while (v < target) {
    const fn = migrations[v];
    if (!fn) throw new SaveError('corrupt', `No migration from version ${v}.`);
    data = fn(data);
    v += 1;
    data.v = v;
  }
  return data;
}

// ---- coercion helpers: missing or odd fields fall back to defaults instead of losing the save ----

function num(x: unknown, def: number, min = -Infinity, max = Infinity): number {
  return typeof x === 'number' && Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : def;
}

function bool(x: unknown, def: boolean): boolean {
  return typeof x === 'boolean' ? x : def;
}

function dec(x: unknown, def: Decimal): Decimal {
  if (typeof x !== 'string' && typeof x !== 'number') return def;
  const d = D(x);
  if (Number.isNaN(d.m) || Number.isNaN(d.e) || !Number.isFinite(d.e)) return def;
  return d.lt(ZERO) ? ZERO : d;
}

function boolMap(x: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (x && typeof x === 'object') {
    for (const [k, v] of Object.entries(x)) if (v === true) out[k] = true;
  }
  return out;
}

const NOTATIONS: Notation[] = ['scientific', 'engineering', 'standard'];

export function serialize(s: GameState): SaveData {
  return {
    v: SAVE_VERSION,
    ki: s.ki.toString(),
    runKi: s.runKi.toString(),
    totalKi: s.totalKi.toString(),
    restedSec: s.restedSec,
    unlocked: { ...s.unlocked },
    flags: { ...s.flags },
    stats: { ...s.stats },
    settings: { ...s.settings },
    lastSeen: s.lastSeen,
    createdAt: s.createdAt,
  };
}

/** Migrate then coerce a parsed save into live state. Throws SaveError if it cannot be trusted. */
export function parseSave(raw: unknown, migrations: Migrations = MIGRATIONS): GameState {
  const data = migrate(raw, migrations);
  const base = newState(Date.now());
  const d = defaultSettings();
  const st = data.settings ?? {};
  const stats = data.stats ?? {};
  const ki = dec(data.ki, base.ki);
  const totalKi = dec(data.totalKi, ki).max(ki);
  const unlocked = boolMap(data.unlocked);
  unlocked.training = true;
  return {
    ki,
    runKi: dec(data.runKi, totalKi).max(ki),
    totalKi,
    restedSec: num(data.restedSec, 0, 0),
    unlocked,
    flags: boolMap(data.flags),
    stats: {
      playTimeSec: num(stats.playTimeSec, 0, 0),
      offlineSec: num(stats.offlineSec, 0, 0),
      sessions: num(stats.sessions, 1, 1),
    },
    settings: {
      notation: NOTATIONS.includes(st.notation) ? st.notation : d.notation,
      textScale: num(st.textScale, d.textScale, 0.85, 1.4),
      reduceMotion: bool(st.reduceMotion, d.reduceMotion),
      haptics: bool(st.haptics, d.haptics),
      debug: bool(st.debug, d.debug),
    },
    lastSeen: num(data.lastSeen, base.lastSeen, 0),
    createdAt: num(data.createdAt, base.createdAt, 0),
  };
}

export const toJson = (s: GameState): string => JSON.stringify(serialize(s));

export function fromJson(text: string): GameState {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SaveError('corrupt', 'Save is not valid JSON.');
  }
  return parseSave(raw);
}

// ---- export / import strings: KIA1.<base64 utf8 json>.<fnv1a checksum> ----

const PREFIX = 'KIA1';

function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fromBase64(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeExport(s: GameState): string {
  const payload = toBase64(toJson(s));
  return `${PREFIX}.${payload}.${fnv1a(payload)}`;
}

/** Accepts an export string or raw save JSON (for recovered backups). */
export function decodeExport(input: string): GameState {
  const text = input.trim().replace(/\s+/g, '');
  if (text.startsWith('{')) return fromJson(input.trim());
  const parts = text.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) throw new SaveError('corrupt', 'That is not a Ki Ascension save.');
  const [, payload, sum] = parts;
  if (fnv1a(payload) !== sum) throw new SaveError('checksum', 'Save text is damaged or was cut off when copying.');
  try {
    return fromJson(fromBase64(payload));
  } catch (e) {
    if (e instanceof SaveError) throw e;
    throw new SaveError('corrupt', 'Save text could not be decoded.');
  }
}
