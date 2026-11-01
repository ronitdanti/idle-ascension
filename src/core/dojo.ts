import { CONFIG } from '../content/config';
import { DOJO, ROLES, roleById, type RoleDef } from '../content/dojo';
import { D, ZERO, type Decimal } from './bignum';
import { bulkCost, maxAffordable } from './economy';
import type { BuyAmount, GameState } from './state';
import { techEffects } from './techniques';

/* ---------- roster ---------- */

export const assigned = (s: GameState): number => Object.values(s.dojo.roles).reduce((a, b) => a + b, 0);

export const idleDisciples = (s: GameState): number => Math.max(0, s.dojo.disciples - assigned(s));

export const roleCount = (s: GameState, id: string): number => s.dojo.roles[id] ?? 0;

export function roleUnlocked(s: GameState, r: RoleDef): boolean {
  switch (r.unlock.kind) {
    case 'zone':
      return !!s.unlocked[r.unlock.zone];
    case 'dojoLevel':
      return s.dojo.level >= r.unlock.level;
  }
}

/** A role can be assigned only when its unlock is met and the system it feeds exists. */
export const roleAvailable = (s: GameState, r: RoleDef): boolean => r.built && roleUnlocked(s, r);

/**
 * Move disciples into (positive) or out of (negative) a role. Returns how many actually moved.
 * Never assigns more than are idle, never goes below zero.
 */
export function assign(s: GameState, roleId: string, delta: number): number {
  const r = roleById(roleId);
  if (!roleAvailable(s, r) || !Number.isFinite(delta)) return 0;
  const have = roleCount(s, roleId);
  const move = delta >= 0 ? Math.min(Math.floor(delta), idleDisciples(s)) : -Math.min(Math.floor(-delta), have);
  if (move === 0) return 0;
  const next = have + move;
  if (next > 0) s.dojo.roles[roleId] = next;
  else delete s.dojo.roles[roleId];
  return move;
}

/* ---------- capacity and recruiting ---------- */

export function capacity(s: GameState): number {
  return DOJO.capacity.base + DOJO.capacity.perLevel * (s.dojo.level - 1) + techEffects(s).capacity;
}

export const freeSlots = (s: GameState): number => Math.max(0, capacity(s) - s.dojo.disciples);

const recruitBase = (s: GameState): Decimal => D(DOJO.recruit.baseCost).mul(1 - techEffects(s).recruitDiscount);

export const recruitCost = (s: GameState, count: number): Decimal => bulkCost(recruitBase(s), DOJO.recruit.growth, s.dojo.disciples, count);

/** Most disciples that fit and are affordable right now. */
export function maxRecruit(s: GameState): number {
  return maxAffordable(recruitBase(s), DOJO.recruit.growth, s.dojo.disciples, s.ki, freeSlots(s));
}

/**
 * What a recruit press means: how many, what they cost. A fixed amount is trimmed to the free room
 * (x10 with 3 slots free recruits 3). 'max' with nothing affordable shows the next one.
 */
export function recruitQuote(s: GameState, amount: BuyAmount): { count: number; cost: Decimal; affordable: boolean; full: boolean } {
  const free = freeSlots(s);
  if (free <= 0) return { count: 0, cost: ZERO, affordable: false, full: true };
  const count = amount === 'max' ? Math.max(1, maxRecruit(s)) : Math.min(amount, free);
  const cost = recruitCost(s, count);
  return { count, cost, affordable: s.ki.gte(cost), full: false };
}

export function recruit(s: GameState, amount: BuyAmount): number {
  const q = recruitQuote(s, amount);
  if (!q.affordable || q.count <= 0) return 0;
  s.ki = s.ki.sub(q.cost).max(ZERO);
  s.dojo.disciples += q.count;
  return q.count;
}

/* ---------- Dojo level and Training Level ---------- */

export function levelUpCost(s: GameState): { ki: Decimal; renown: Decimal } {
  const L = s.dojo.level - 1;
  return {
    ki: D(DOJO.level.kiBase).mul(D(DOJO.level.kiGrowth).pow(L)),
    renown: D(DOJO.level.renownBase).mul(D(DOJO.level.renownGrowth).pow(L)),
  };
}

export function canLevelUp(s: GameState): boolean {
  const c = levelUpCost(s);
  return s.ki.gte(c.ki) && s.renown.gte(c.renown);
}

export function levelUp(s: GameState): boolean {
  if (!canLevelUp(s)) return false;
  const c = levelUpCost(s);
  s.ki = s.ki.sub(c.ki).max(ZERO);
  s.renown = s.renown.sub(c.renown).max(ZERO);
  s.dojo.level += 1;
  return true;
}

export const trainingCost = (s: GameState): Decimal =>
  D(DOJO.training.renownBase).mul(D(DOJO.training.renownGrowth).pow(s.dojo.training));

export const canTrain = (s: GameState): boolean => s.renown.gte(trainingCost(s));

export function trainUp(s: GameState): boolean {
  if (!canTrain(s)) return false;
  s.renown = s.renown.sub(trainingCost(s)).max(ZERO);
  s.dojo.training += 1;
  return true;
}

/** Multiplier on role output from the Training Level. */
export const trainingMult = (s: GameState): number => 1 + DOJO.training.bonusPerLevel * s.dojo.training;

/* ---------- role output ---------- */

/** Renown per second: every assigned disciple earns it, whatever their role. */
export function renownPerSec(s: GameState): Decimal {
  const n = assigned(s);
  if (n <= 0) return ZERO;
  return D(n * DOJO.renownPerAssignedSec * (1 + techEffects(s).renownGain));
}

/** The Dojo category: Sparring Partners add this fraction on top of all Ki. */
export function sparringBonus(s: GameState): number {
  const n = roleCount(s, 'sparring');
  if (n <= 0) return 0;
  return n * DOJO.sparringPerPartner * trainingMult(s) * (1 + techEffects(s).sparring);
}

/** Insight per second: a small trickle plus Scribes, both lifted by Insight gain techniques. */
export function insightPerSec(s: GameState): Decimal {
  if (!s.unlocked.archive) return ZERO;
  const scribes = roleCount(s, 'scribe');
  const base = DOJO.insightTrickle + scribes * DOJO.scribeInsightPerSec * trainingMult(s);
  return D(base * (1 + techEffects(s).insightGain));
}

/** Insight per second contributed by Scribes alone (the rest is the base trickle). */
export function scribeInsightPerSec(s: GameState): number {
  return roleCount(s, 'scribe') * DOJO.scribeInsightPerSec * trainingMult(s) * (1 + techEffects(s).insightGain);
}

/** Seconds of offline progress that count. Cooks and Breath techniques raise it, never past the hard max. */
export function offlineCapSec(s: GameState): number {
  const cooks = roleCount(s, 'cook');
  const extra = techEffects(s).offlineCap + cooks * DOJO.cook.offlineCapSec;
  return Math.min(CONFIG.offlineCapMaxSec, CONFIG.offlineCapSec + extra);
}

/** Extra Ki Flux cap from Cooks. */
export const cookFluxCapSec = (s: GameState): number => roleCount(s, 'cook') * DOJO.cook.fluxCapSec;

/** Roles the player can see in the Dojo list, in display order. */
export const visibleRoles = (): RoleDef[] => ROLES;

/** True if there is something worth looking at in the Dojo (drives the tab badge). */
export function dojoReady(s: GameState): boolean {
  if (!s.unlocked.dojo) return false;
  if (idleDisciples(s) > 0) return true;
  const q = recruitQuote(s, 1);
  return q.affordable;
}
