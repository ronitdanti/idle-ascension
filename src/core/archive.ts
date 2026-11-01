import { DISCOVERIES, discoveryById, type DiscoveryDef } from '../content/discoveries';
import { TECHNIQUES, TECH_BY_ID, type TechDef } from '../content/techniques';
import { D, ZERO, type Decimal } from './bignum';
import { insightPerSec } from './dojo';
import { addInsight, type GameState } from './state';

/* ---------- Technique Tree ---------- */

export const techOwned = (s: GameState, id: string): boolean => !!s.techniques[id];

/** Every prerequisite is owned. */
export const techUnlocked = (s: GameState, t: TechDef): boolean => t.requires.every((r) => techOwned(s, r));

export const techAffordable = (s: GameState, t: TechDef): boolean => s.insight.gte(t.cost);

export const techBuyable = (s: GameState, t: TechDef): boolean =>
  !!s.unlocked.archive && !techOwned(s, t.id) && techUnlocked(s, t) && techAffordable(s, t);

export function buyTech(s: GameState, id: string): boolean {
  const t = TECH_BY_ID.get(id);
  if (!t || !techBuyable(s, t)) return false;
  s.insight = s.insight.sub(t.cost).max(ZERO);
  s.insightSpent = s.insightSpent.add(t.cost);
  s.techniques[id] = true;
  return true;
}

/** Owned techniques that need `id`. A technique can only be refunded alone when this is empty. */
export const ownedDependents = (s: GameState, id: string): TechDef[] =>
  TECHNIQUES.filter((t) => techOwned(s, t.id) && t.requires.includes(id));

export const canRefund = (s: GameState, id: string): boolean => techOwned(s, id) && ownedDependents(s, id).length === 0;

/** Refund one technique at 100%. Only leaves can go, so nothing owned ever loses a prerequisite. */
export function refundTech(s: GameState, id: string): boolean {
  const t = TECH_BY_ID.get(id);
  if (!t || !canRefund(s, id)) return false;
  const back = D(t.cost).min(s.insightSpent);
  s.insight = s.insight.add(back);
  s.insightSpent = s.insightSpent.sub(back).max(ZERO);
  delete s.techniques[id];
  return true;
}

/**
 * Free respec: every technique is released and everything spent comes back, exactly.
 * Refunds what was recorded as spent, so a later change to node costs can never mint or lose Insight.
 */
export function respec(s: GameState): Decimal {
  const back = s.insightSpent;
  s.insight = s.insight.add(back);
  s.insightSpent = ZERO;
  s.techniques = {};
  return back;
}

export const techCount = (s: GameState): number => Object.keys(s.techniques).filter((id) => s.techniques[id] && TECH_BY_ID.has(id)).length;

/** Techniques the player can buy right now (drives the badge on the Archive entry). */
export const buyableTechCount = (s: GameState): number => TECHNIQUES.filter((t) => techBuyable(s, t)).length;

/* ---------- Discoveries ---------- */

export const discoveryFound = (s: GameState, d: DiscoveryDef): boolean => s.insightEarned.gte(d.at);

export const discoveryRead = (s: GameState, id: string): boolean => !!s.discoveries[id];

/** Found but not yet read. */
export const discoveriesReady = (s: GameState): DiscoveryDef[] => DISCOVERIES.filter((d) => discoveryFound(s, d) && !discoveryRead(s, d.id));

/** Read a found scroll: reveals the lore (in the UI) and grants the one-off reward. */
export function readDiscovery(s: GameState, id: string): boolean {
  const d = discoveryById(id);
  if (!discoveryFound(s, d) || discoveryRead(s, id)) return false;
  s.discoveries[id] = true;
  if (d.reward.insightSeconds) addInsight(s, insightPerSec(s).mul(d.reward.insightSeconds));
  return true;
}
