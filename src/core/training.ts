import { CONFIG } from '../content/config';
import { DRILLS, MILESTONES, drillById, type DrillDef } from '../content/drills';
import { UPGRADES, upgradeById, type UpgradeDef } from '../content/upgrades';
import { D, ZERO, type Decimal } from './bignum';
import { bulkCost, maxAffordable } from './economy';
import type { GameState } from './state';

/* ---------- count milestones ---------- */

/** Unit count of the k-th (0-based) milestone: 10, 25, 50, 100, 200, 400, ... */
export function milestoneAt(k: number): number {
  const { steps } = MILESTONES;
  if (k < steps.length) return steps[k];
  return steps[steps.length - 1] * 2 ** (k - steps.length + 1);
}

export function milestonesReached(owned: number): number {
  let k = 0;
  while (milestoneAt(k) <= owned) k++;
  return k;
}

/** Multiplier of the k-th (0-based) milestone: x2, or x3 for every 4th. */
export function milestoneStepMult(k: number): number {
  return (k + 1) % MILESTONES.tripleEvery === 0 ? MILESTONES.tripleMult : MILESTONES.mult;
}

export function milestoneMultiplier(owned: number): Decimal {
  let m = D(1);
  const n = milestonesReached(owned);
  for (let k = 0; k < n; k++) m = m.mul(milestoneStepMult(k));
  return m;
}

export function nextMilestone(owned: number): { at: number; mult: number } {
  const k = milestonesReached(owned);
  return { at: milestoneAt(k), mult: milestoneStepMult(k) };
}

/* ---------- upgrade effects ---------- */

export const owned = (s: GameState, drillId: string): number => s.drills[drillId] ?? 0;

interface Effects {
  drillBonus: Record<string, number>;
  allDrills: number;
  global: number;
  innate: number;
  costReduction: number;
  fluxCap: number;
  fluxGain: number;
  cross: Array<{ source: string; target: string; perOwned: number }>;
}

/** Sum every bought upgrade into one table. Bonuses are additive within their category. */
export function effects(s: GameState): Effects {
  const fx: Effects = { drillBonus: {}, allDrills: 0, global: 0, innate: 0, costReduction: 0, fluxCap: 0, fluxGain: 0, cross: [] };
  for (const u of UPGRADES) {
    if (!s.upgrades[u.id]) continue;
    const e = u.effect;
    switch (e.kind) {
      case 'drillBonus':
        fx.drillBonus[e.drill] = (fx.drillBonus[e.drill] ?? 0) + e.bonus;
        break;
      case 'allDrillsBonus':
        fx.allDrills += e.bonus;
        break;
      case 'crossBonus':
        fx.cross.push({ source: e.source, target: e.target, perOwned: e.perOwned });
        break;
      case 'globalBonus':
        fx.global += e.bonus;
        break;
      case 'innateKi':
        fx.innate += e.amount;
        break;
      case 'costReduction':
        fx.costReduction += e.amount;
        break;
      case 'fluxCap':
        fx.fluxCap += e.seconds;
        break;
      case 'fluxGain':
        fx.fluxGain += e.bonus;
        break;
    }
  }
  fx.costReduction = Math.min(0.75, fx.costReduction);
  return fx;
}

/** Drill milestone side effects (Gravity Chamber: Flux charge, Time Dilation Room: Flux cap). */
function drillMilestoneEffects(s: GameState): { fluxGain: number; fluxCap: number } {
  let fluxGain = 0;
  let fluxCap = 0;
  for (const d of DRILLS) {
    const e = d.milestoneEffect;
    if (!e) continue;
    const n = milestonesReached(owned(s, d.id));
    if (e.kind === 'fluxGain') fluxGain += e.perMilestone * n;
    else fluxCap += e.perMilestone * n;
  }
  return { fluxGain, fluxCap };
}

export function fluxCapSec(s: GameState): number {
  return CONFIG.fluxCapSec + effects(s).fluxCap + drillMilestoneEffects(s).fluxCap;
}

/** Flux charged per second away. */
export function fluxChargeRate(s: GameState): number {
  return CONFIG.fluxPerAwaySec * (1 + effects(s).fluxGain + drillMilestoneEffects(s).fluxGain);
}

/* ---------- production ---------- */

export interface DrillLine {
  id: string;
  name: string;
  owned: number;
  baseProd: Decimal;
  milestones: number;
  milestoneMult: Decimal;
  /** Additive drill-local bonus (upgrades, cross effects), as a fraction: 1 = +100%. */
  localBonus: number;
  perSec: Decimal;
}

export interface Breakdown {
  drills: DrillLine[];
  innate: Decimal;
  /** Multiplier categories applied to the whole sum. Each is multiplicative with the others. */
  categories: Array<{ id: string; label: string; mult: Decimal }>;
  subtotal: Decimal;
  total: Decimal;
}

function drillLine(s: GameState, d: DrillDef, fx: Effects): DrillLine {
  const n = owned(s, d.id);
  let local = (fx.drillBonus[d.id] ?? 0) + fx.allDrills;
  for (const c of fx.cross) if (c.target === d.id) local += c.perOwned * owned(s, c.source);
  const mm = milestoneMultiplier(n);
  return {
    id: d.id,
    name: d.name,
    owned: n,
    baseProd: D(d.baseProd),
    milestones: milestonesReached(n),
    milestoneMult: mm,
    localBonus: local,
    perSec: n > 0 ? D(d.baseProd).mul(n).mul(mm).mul(1 + local) : ZERO,
  };
}

export function breakdown(s: GameState): Breakdown {
  const fx = effects(s);
  const drills = DRILLS.map((d) => drillLine(s, d, fx));
  const innate = D(CONFIG.baseKiPerSec + fx.innate);
  const subtotal = drills.reduce((acc, l) => acc.add(l.perSec), innate);
  // Later milestones add categories here (Technique, Gear, Rival, Form, Rank, Prestige).
  const categories = [{ id: 'global', label: 'Global Ki upgrades', mult: D(1 + fx.global) }];
  const total = categories.reduce((acc, c) => acc.mul(c.mult), subtotal);
  return { drills, innate, categories, subtotal, total };
}

/** Ki per second at normal speed. */
export function kiPerSec(s: GameState): Decimal {
  const fx = effects(s);
  let sum = D(CONFIG.baseKiPerSec + fx.innate);
  for (const d of DRILLS) {
    const n = owned(s, d.id);
    if (n > 0) sum = sum.add(drillLine(s, d, fx).perSec);
  }
  return sum.mul(1 + fx.global);
}

/* ---------- drills: visibility, cost, buying ---------- */

export const drillVisible = (s: GameState, d: DrillDef): boolean => s.totalKi.gte(d.revealAt) || owned(s, d.id) > 0;

function discountedBase(s: GameState, d: DrillDef): Decimal {
  return D(d.baseCost).mul(1 - effects(s).costReduction);
}

export function drillCost(s: GameState, id: string, count: number): Decimal {
  const d = drillById(id);
  return bulkCost(discountedBase(s, d), d.growth, owned(s, id), count);
}

export function drillMaxBuy(s: GameState, id: string): number {
  const d = drillById(id);
  return maxAffordable(discountedBase(s, d), d.growth, owned(s, id), s.ki);
}

export type BuyAmount = 1 | 10 | 100 | 'max';

/** What a "buy" press means right now: how many units and what they cost. 'max' with nothing affordable shows the next one. */
export function buyQuote(s: GameState, id: string, amount: BuyAmount): { count: number; cost: Decimal; affordable: boolean } {
  const count = amount === 'max' ? Math.max(1, drillMaxBuy(s, id)) : amount;
  const cost = drillCost(s, id, count);
  return { count, cost, affordable: s.ki.gte(cost) };
}

export interface BuyResult {
  bought: number;
  /** Count milestones crossed by this purchase. */
  milestones: number;
}

export function buyDrill(s: GameState, id: string, amount: BuyAmount): BuyResult {
  const q = buyQuote(s, id, amount);
  if (!q.affordable) return { bought: 0, milestones: 0 };
  const before = owned(s, id);
  s.ki = s.ki.sub(q.cost).max(ZERO);
  s.drills[id] = before + q.count;
  return { bought: q.count, milestones: milestonesReached(before + q.count) - milestonesReached(before) };
}

/* ---------- upgrades ---------- */

export function upgradeRevealed(s: GameState, u: UpgradeDef): boolean {
  const r = u.reveal;
  return r.kind === 'totalKi' ? s.totalKi.gte(r.at) : owned(s, r.drill) >= r.owned;
}

export const upgradeAvailable = (s: GameState, u: UpgradeDef): boolean => !s.upgrades[u.id] && upgradeRevealed(s, u);

export const upgradeAffordable = (s: GameState, u: UpgradeDef): boolean => s.ki.gte(u.cost);

export function buyUpgrade(s: GameState, id: string): boolean {
  const u = upgradeById(id);
  if (!upgradeAvailable(s, u) || !upgradeAffordable(s, u)) return false;
  s.ki = s.ki.sub(u.cost).max(ZERO);
  s.upgrades[id] = true;
  return true;
}

/** Number of revealed, unbought upgrades the player can afford right now (drives the tab badge). */
export function affordableUpgradeCount(s: GameState): number {
  return UPGRADES.filter((u) => upgradeAvailable(s, u) && upgradeAffordable(s, u)).length;
}

/* ---------- value of a purchase, and Smart Spend ---------- */

export type Purchase = { kind: 'drill'; id: string } | { kind: 'upgrade'; id: string };

export interface Offer {
  purchase: Purchase;
  cost: Decimal;
  /** Extra Ki/s the purchase gives (cost reductions are valued as extra income). */
  gain: Decimal;
  /** Seconds for the purchase to pay for itself. Lower is better. */
  payback: number;
}

function withPurchase<T>(s: GameState, p: Purchase, fn: () => T): T {
  if (p.kind === 'drill') {
    s.drills[p.id] = owned(s, p.id) + 1;
    try {
      return fn();
    } finally {
      s.drills[p.id] -= 1;
    }
  }
  s.upgrades[p.id] = true;
  try {
    return fn();
  } finally {
    delete s.upgrades[p.id];
  }
}

/** Every purchase that would raise income, with its cost and payback time. Purchases with no Ki effect (Flux upgrades) are left to the player. */
export function offers(s: GameState): Offer[] {
  const base = kiPerSec(s);
  const out: Offer[] = [];
  const consider = (purchase: Purchase, cost: Decimal, special?: number) => {
    const gain = special !== undefined ? base.mul(special) : withPurchase(s, purchase, () => kiPerSec(s)).sub(base);
    if (gain.lte(ZERO)) return;
    out.push({ purchase, cost, gain, payback: cost.div(gain).toNumber() });
  };
  for (const d of DRILLS) {
    if (drillVisible(s, d)) consider({ kind: 'drill', id: d.id }, drillCost(s, d.id, 1));
  }
  for (const u of UPGRADES) {
    if (!upgradeAvailable(s, u)) continue;
    // Cost reductions make every later drill cheaper; value them as a share of income.
    consider({ kind: 'upgrade', id: u.id }, D(u.cost), u.effect.kind === 'costReduction' ? u.effect.amount : undefined);
  }
  return out.sort((a, b) => a.payback - b.payback);
}

export function buy(s: GameState, p: Purchase): boolean {
  return p.kind === 'drill' ? buyDrill(s, p.id, 1).bought > 0 : buyUpgrade(s, p.id);
}

/**
 * Smart Spend: repeatedly buy the best-payback purchase the player can afford, until none is left.
 * Returns how many purchases were made.
 */
export function smartSpend(s: GameState, maxSteps = 300): number {
  let count = 0;
  while (count < maxSteps) {
    const pick = offers(s).find((o) => s.ki.gte(o.cost));
    if (!pick || !buy(s, pick.purchase)) break;
    count++;
  }
  return count;
}
