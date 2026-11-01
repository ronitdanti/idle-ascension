import type { DecimalSource } from '../core/bignum';
import { DRILLS } from './drills';

/** What an upgrade does once bought. Bonuses are additive within their category (SPEC section 4). */
export type UpgradeEffect =
  | { kind: 'drillBonus'; drill: string; bonus: number } // +bonus (1 = +100%) to one drill
  | { kind: 'allDrillsBonus'; bonus: number } // +bonus to every drill
  | { kind: 'crossBonus'; source: string; target: string; perOwned: number } // target +perOwned per source unit
  | { kind: 'globalBonus'; bonus: number } // +bonus to all Ki (Global-Ki category)
  | { kind: 'innateKi'; amount: number } // +flat Ki/s
  | { kind: 'costReduction'; amount: number } // -fraction of all drill costs
  | { kind: 'fluxCap'; seconds: number }
  | { kind: 'fluxGain'; bonus: number };

export type UpgradeReveal =
  | { kind: 'drillOwned'; drill: string; owned: number }
  | { kind: 'totalKi'; at: DecimalSource };

export interface UpgradeDef {
  id: string;
  name: string;
  blurb: string;
  cost: DecimalSource;
  reveal: UpgradeReveal;
  effect: UpgradeEffect;
}

/** Per-drill upgrade ladder: revealed at these owned counts, priced as multiples of the drill's first cost. */
const LADDER = [
  { owned: 3, costMult: 5, bonus: 1 },
  { owned: 15, costMult: 200, bonus: 2 },
  { owned: 60, costMult: 5e5, bonus: 4 },
] as const;

/** Names for the ladder: [rung 1, rung 2, rung 3] per drill. */
const LADDER_NAMES: Record<string, [string, string, string]> = {
  shadow: ['Sharper Shadows', 'Shadow Clone Etiquette', 'The Shadow Concedes'],
  weights: ['Iron Sleeves', 'Anvil Pajamas', 'Mountain-Weight Mantle'],
  waterfall: ['Cold Resolve', 'Silent Cascade', 'One With the Falls'],
  breath: ['Slow Exhale', 'Diaphragm of Steel', 'Breath of the Elders'],
  mountain: ['Rockfall Reflexes', 'Avalanche Footwork', 'Summit Spirit'],
  meridian: ['Gentle Pressure', 'Cross-Channel Flow', 'Open Every Gate'],
  gravity: ['Heavier Floors', 'Crushing Calm', 'Singularity Stance'],
  dilation: ['Longer Afternoons', 'Slow-Motion Stamina', 'Eternal Tuesday'],
  spirit: ['Clearer Broth', 'Concentrated Will', 'Pure Distillate'],
  reality: ['Creaking Walls', 'Cracks in the Sky', 'The Universe Blinks'],
};

const ladder: UpgradeDef[] = DRILLS.flatMap((d) =>
  LADDER.map((rung, i) => ({
    id: `${d.id}-${i + 1}`,
    name: LADDER_NAMES[d.id][i],
    blurb: `+${rung.bonus * 100}% ${d.name}.`,
    cost: Number(d.baseCost) * rung.costMult,
    reveal: { kind: 'drillOwned', drill: d.id, owned: rung.owned } as const,
    effect: { kind: 'drillBonus', drill: d.id, bonus: rung.bonus } as const,
  })),
);

/** Hand-written upgrades that touch more than one thing. */
const special: UpgradeDef[] = [
  { id: 'inner-spark', name: 'Inner Spark', blurb: '+1 Ki/s, always.', cost: 25, reveal: { kind: 'totalKi', at: 15 }, effect: { kind: 'innateKi', amount: 1 } },
  { id: 'steady-flame', name: 'Steady Flame', blurb: '+8 Ki/s, always.', cost: 2500, reveal: { kind: 'totalKi', at: 800 }, effect: { kind: 'innateKi', amount: 8 } },
  { id: 'iron-resolve', name: 'Iron Resolve', blurb: '+10% all Ki.', cost: 600, reveal: { kind: 'totalKi', at: 250 }, effect: { kind: 'globalBonus', bonus: 0.1 } },
  { id: 'unbroken-focus', name: 'Unbroken Focus', blurb: '+20% all Ki.', cost: 8e4, reveal: { kind: 'totalKi', at: 3e4 }, effect: { kind: 'globalBonus', bonus: 0.2 } },
  { id: 'warrior-heart', name: "Warrior's Heart", blurb: '+30% all Ki.', cost: 2e7, reveal: { kind: 'totalKi', at: 8e6 }, effect: { kind: 'globalBonus', bonus: 0.3 } },
  { id: 'indomitable', name: 'Indomitable', blurb: '+50% all Ki.', cost: 5e10, reveal: { kind: 'totalKi', at: 2e10 }, effect: { kind: 'globalBonus', bonus: 0.5 } },
  { id: 'good-form', name: 'Good Form', blurb: '+25% to every drill.', cost: 4000, reveal: { kind: 'totalKi', at: 1500 }, effect: { kind: 'allDrillsBonus', bonus: 0.25 } },
  { id: 'daily-routine', name: 'Daily Routine', blurb: '+75% to every drill.', cost: 6e6, reveal: { kind: 'totalKi', at: 2e6 }, effect: { kind: 'allDrillsBonus', bonus: 0.75 } },
  {
    id: 'sparring-circle',
    name: 'Sparring Circle',
    blurb: 'Each Shadow Boxing adds +1% to Weighted Training.',
    cost: 3000,
    reveal: { kind: 'drillOwned', drill: 'weights', owned: 5 },
    effect: { kind: 'crossBonus', source: 'shadow', target: 'weights', perOwned: 0.01 },
  },
  {
    id: 'flow-state',
    name: 'Flow State',
    blurb: 'Each Breath Control adds +1% to Mountain Sparring.',
    cost: 4e6,
    reveal: { kind: 'drillOwned', drill: 'mountain', owned: 5 },
    effect: { kind: 'crossBonus', source: 'breath', target: 'mountain', perOwned: 0.01 },
  },
  { id: 'frugal-discipline', name: 'Frugal Discipline', blurb: 'Drills cost 5% less.', cost: 5000, reveal: { kind: 'totalKi', at: 2000 }, effect: { kind: 'costReduction', amount: 0.05 } },
  { id: 'bulk-orders', name: 'Bulk Orders', blurb: 'Drills cost another 5% less.', cost: 5e7, reveal: { kind: 'totalKi', at: 2e7 }, effect: { kind: 'costReduction', amount: 0.05 } },
  { id: 'deep-rest', name: 'Deep Rest', blurb: 'Ki Flux holds 30 more minutes.', cost: 1.5e5, reveal: { kind: 'totalKi', at: 6e4 }, effect: { kind: 'fluxCap', seconds: 1800 } },
  { id: 'quiet-mind', name: 'Quiet Mind', blurb: 'Time away charges Ki Flux 20% faster.', cost: 4e5, reveal: { kind: 'totalKi', at: 1.5e5 }, effect: { kind: 'fluxGain', bonus: 0.2 } },
];

export const UPGRADES: UpgradeDef[] = [...ladder, ...special];

export const upgradeById = (id: string): UpgradeDef => {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) throw new Error(`Unknown upgrade ${id}`);
  return u;
};
