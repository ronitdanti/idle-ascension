/**
 * Headless balance simulator (skeleton).
 *
 *   npm run sim            casual bot, prints the SPEC section 14 table
 *   npm run sim -- --strict   exit 1 if any measurable milestone drifts more than 25%
 *
 * Runs the pure core in Node: no DOM, no timers, fully deterministic.
 * Bots will gain real decisions (buy by payback, send expeditions, spend tickets) as systems land.
 */
import { advance } from '../src/core/engine';
import { newState, type GameState } from '../src/core/state';
import { formatDuration, formatNum } from '../src/core/format';
import { MILESTONES } from './milestones';

const DRIFT_LIMIT = 0.25;
const MAX_SIM_SEC = 8 * 7 * 86400;

interface Bot {
  name: string;
  /** Real seconds between check-ins. The bot acts, then game time advances to the next one. */
  checkInEvery: number;
  act(s: GameState): void;
}

/** Placeholder bots: nothing to spend on until Training Grounds exists (Milestone 2). */
const casual: Bot = { name: 'casual', checkInEvery: 5 * 60, act: () => {} };

function run(bot: Bot) {
  const s = newState(0);
  const hit = new Map<string, number>();
  let t = 0;
  while (t < MAX_SIM_SEC && hit.size < MILESTONES.filter((m) => m.reached).length) {
    bot.act(s);
    // Production is constant for now, so large chunks are exact. Revisit once systems have feedback loops.
    advance(s, bot.checkInEvery, { offline: true }, 30);
    t += bot.checkInEvery;
    for (const m of MILESTONES) {
      if (m.reached && !hit.has(m.id) && m.reached(s)) hit.set(m.id, t);
    }
  }
  return { s, hit, t };
}

const strict = process.argv.includes('--strict');
const { s, hit, t } = run(casual);

console.log(`\nKi Ascension balance sim | bot: ${casual.name} | simulated ${formatDuration(t)}`);
console.log(`Final Ki ${formatNum(s.ki)}  |  lifetime ${formatNum(s.totalKi)}\n`);
console.log('Milestone'.padEnd(28) + 'Target'.padEnd(12) + 'Sim'.padEnd(12) + 'Drift'.padEnd(10) + 'Status');

let failures = 0;
for (const m of MILESTONES) {
  const name = m.label.padEnd(28);
  const target = formatDuration(m.target).padEnd(12);
  if (!m.reached) {
    console.log(name + target + '-'.padEnd(12) + '-'.padEnd(10) + `not built yet (${m.needs})`);
    continue;
  }
  const at = hit.get(m.id);
  if (at === undefined) {
    console.log(name + target + 'never'.padEnd(12) + '-'.padEnd(10) + `out of range, expected until ${m.needs}`);
    continue;
  }
  const drift = (at - m.target) / m.target;
  const bad = Math.abs(drift) > DRIFT_LIMIT;
  const pct = `${drift >= 0 ? '+' : ''}${(drift * 100).toFixed(0)}%`;
  // Until Training Grounds (M2) exists, the only income is the placeholder trickle, so drift is expected.
  console.log(name + target + formatDuration(at).padEnd(12) + pct.padEnd(10) + (bad ? `DRIFT (placeholder economy, tune in ${m.needs})` : 'ok'));
  if (bad) failures++;
}

console.log('\nNote: Milestone 1 has only a placeholder Ki trickle. Drift here is expected and is not a tuning signal.\n');
if (strict && failures > 0) process.exit(1);
