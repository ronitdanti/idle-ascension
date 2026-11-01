/**
 * Headless balance simulator.
 *
 *   npm run sim                 both bots, prints the SPEC section 14 table
 *   npm run sim -- --strict     exit 1 if a measurable milestone drifts more than 25%
 *   npm run sim -- --days 14    shorten the casual run
 *
 * Runs the pure core in Node: no DOM, no timers, deterministic.
 *
 * Bots:
 *  - active: plays continuously, always buys the best-payback purchase it can afford (saves up for
 *    it otherwise). Measures first-session milestones in minutes of play.
 *  - casual: SPEC section 14's player, 4 five-minute check-ins plus one 20-minute session a day.
 *    Between visits the game runs offline (and charges Ki Flux); during visits it buys greedily
 *    and spends all Flux on x3 Speed Up. Measures day-scale milestones in wall-clock time.
 */
import { advance, applyOffline } from '../src/core/engine';
import { Game } from '../src/core/game';
import { formatDuration, formatNum } from '../src/core/format';
import { newState, type GameState } from '../src/core/state';
import { buy, kiPerSec, offers } from '../src/core/training';
import { MILESTONES, type Milestone } from './milestones';

const DRIFT_LIMIT = 0.25;
const args = process.argv.slice(2);
const strict = args.includes('--strict');
const dayArg = args.indexOf('--days');
const CASUAL_DAYS = dayArg >= 0 ? Number(args[dayArg + 1]) : 56;
const ACTIVE_LIMIT = 3 * 3600;

/**
 * The bot's pick: the purchase with the lowest (time to afford it + payback time). Pure payback
 * ordering makes a bot stall saving for something expensive while cheap good buys sit unused.
 */
function pickBest(s: GameState) {
  const rate = kiPerSec(s).toNumber();
  let best: { offer: ReturnType<typeof offers>[number]; score: number } | undefined;
  for (const o of offers(s)) {
    const wait = Math.max(0, o.cost.sub(s.ki).toNumber()) / rate;
    const score = wait + o.payback;
    if (!best || score < best.score) best = { offer: o, score };
  }
  return best?.offer;
}

/** Buy the pick while it is affordable. Returns purchases made. */
function spendGreedy(s: GameState): number {
  let n = 0;
  for (; n < 5000; n++) {
    const best = pickBest(s);
    if (!best || s.ki.lt(best.cost)) break;
    buy(s, best.purchase);
  }
  return n;
}

type Hits = Map<string, number>;

function record(s: GameState, hits: Hits, at: number, bot: Milestone['bot']) {
  for (const m of MILESTONES) {
    if (m.bot === bot && m.reached && !hits.has(m.id) && m.reached(s)) hits.set(m.id, at);
  }
}

const pending = (bot: Milestone['bot'], hits: Hits) => MILESTONES.some((m) => m.bot === bot && m.reached && !hits.has(m.id));

function runActive() {
  const s = newState(0);
  const hits: Hits = new Map();
  let t = 0;
  let purchases = 0;
  while (t < ACTIVE_LIMIT && pending('active', hits)) {
    purchases += spendGreedy(s);
    const best = pickBest(s);
    const rate = kiPerSec(s).toNumber();
    const need = best ? best.cost.sub(s.ki).toNumber() / rate : 60;
    const wait = Math.min(60, Math.max(1, need));
    advance(s, wait, { offline: false }, wait);
    t += wait;
    record(s, hits, t, 'active');
  }
  return { s, hits, t, purchases };
}

/** Visit windows in a day: [start hour, minutes]. */
const WINDOWS: Array<[number, number]> = [
  [8, 5],
  [12, 5],
  [17, 5],
  [20, 20],
  [22, 5],
];
const SPEED = 3;

function runCasual(days: number) {
  const s = newState(0);
  const g = new Game(s);
  const hits: Hits = new Map();
  let purchases = 0;
  let fluxSpent = 0;
  let fluxCharged = 0;
  const TICK = 5;
  outer: for (let day = 0; day < days; day++) {
    for (const [hour, minutes] of WINDOWS) {
      const start = (day * 24 + hour) * 3600_000;
      const fluxBefore = s.fluxSec;
      applyOffline(s, start); // time since the last visit runs offline and charges Flux
      fluxCharged += s.fluxSec - fluxBefore;
      record(s, hits, start / 1000, 'casual');
      for (let sec = 0; sec < minutes * 60; sec += TICK) {
        purchases += spendGreedy(s);
        g.setSpeed(s.fluxSec > 0 ? SPEED : 1);
        const before = s.fluxSec;
        advance(s, g.spendFlux(TICK), { offline: false }, TICK);
        fluxSpent += Math.max(0, before - s.fluxSec);
        record(s, hits, start / 1000 + sec + TICK, 'casual');
      }
      s.lastSeen = start + minutes * 60_000;
      if (!pending('casual', hits)) break outer;
    }
  }
  return { s, hits, purchases, fluxSpent, fluxCharged };
}

function table(title: string, bot: Milestone['bot'], hits: Hits, horizon: number) {
  console.log(`\n${title}`);
  console.log('Milestone'.padEnd(34) + 'Target'.padEnd(11) + 'Sim'.padEnd(11) + 'Drift'.padEnd(9) + 'Status');
  let bad = 0;
  for (const m of MILESTONES.filter((x) => x.bot === bot)) {
    const name = m.label.padEnd(34);
    const target = formatDuration(m.target).padEnd(11);
    if (!m.reached) {
      console.log(name + target + '-'.padEnd(11) + '-'.padEnd(9) + `not built yet (${m.needs})`);
      continue;
    }
    const at = hits.get(m.id);
    if (at === undefined) {
      console.log(name + target + 'not yet'.padEnd(11) + '-'.padEnd(9) + `not reached in ${formatDuration(horizon)}` + (m.note ? `  (${m.note})` : ''));
      continue;
    }
    const drift = (at - m.target) / m.target;
    const flag = Math.abs(drift) > DRIFT_LIMIT;
    const pct = `${drift >= 0 ? '+' : ''}${(drift * 100).toFixed(0)}%`;
    console.log(name + target + formatDuration(at).padEnd(11) + pct.padEnd(9) + (flag ? 'DRIFT' : 'ok') + (m.note && flag ? `  (${m.note})` : ''));
    if (flag && !m.note) bad++;
  }
  return bad;
}

const t0 = Date.now();
const active = runActive();
console.log(`\nKi Ascension balance sim`);
console.log(`Active bot: ${formatDuration(active.t)} of play, ${active.purchases} purchases, ${formatNum(active.s.totalKi)} lifetime Ki, ${formatNum(kiPerSec(active.s))} Ki/s`);
let failures = table('Active player (continuous play, minutes)', 'active', active.hits, active.t);

const casual = runCasual(CASUAL_DAYS);
console.log(
  `\nCasual bot: ${CASUAL_DAYS} days max, ${casual.purchases} purchases, ${formatNum(casual.s.totalKi)} lifetime Ki, Flux charged ${formatDuration(casual.fluxCharged)} and spent ${formatDuration(casual.fluxSpent)}`,
);
failures += table('Casual player (SPEC schedule, wall clock)', 'casual', casual.hits, CASUAL_DAYS * 86400);

console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s. Drifts marked with a SPEC note are known conflicts, not tuning failures.\n`);
if (strict && failures > 0) process.exit(1);
