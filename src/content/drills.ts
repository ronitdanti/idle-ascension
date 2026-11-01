import type { DecimalSource } from '../core/bignum';

/** A bonus a drill grants for every count milestone it has reached. */
export type MilestoneEffect =
  | { kind: 'fluxGain'; perMilestone: number } // +fraction to Ki Flux charge rate
  | { kind: 'fluxCap'; perMilestone: number }; // +seconds to the Ki Flux cap

export interface DrillDef {
  id: string;
  name: string;
  blurb: string;
  /** Cost of the first unit, before cost reductions. */
  baseCost: DecimalSource;
  /** Cost multiplier per unit owned. */
  growth: number;
  /** Ki per second for one unit, before any multiplier. */
  baseProd: DecimalSource;
  /** The drill appears once lifetime Ki reaches this. */
  revealAt: DecimalSource;
  /** Extra effect on top of the x2/x3 production milestones. */
  milestoneEffect?: MilestoneEffect;
  /** Hue used for the row accent. */
  accent: string;
}

/**
 * Ten tiers. Each costs about 12x the last and produces about 9x the last, with the cost
 * growth per unit climbing from 1.15 to 1.30 (SPEC 5.1).
 */
export const DRILLS: DrillDef[] = [
  { id: 'shadow', name: 'Shadow Boxing', blurb: 'You versus your own shadow. The shadow cheats.', baseCost: 10, growth: 1.15, baseProd: 0.05, revealAt: 0, accent: 'var(--ember)' },
  { id: 'weights', name: 'Weighted Training', blurb: 'Heavier gi. Heavier everything.', baseCost: 120, growth: 1.167, baseProd: 0.55, revealAt: 30, accent: 'var(--ember-hot)' },
  { id: 'waterfall', name: 'Waterfall Meditation', blurb: 'Sit still while the mountain shouts at you.', baseCost: 1440, growth: 1.183, baseProd: 6.4, revealAt: 60, accent: 'var(--volt)' },
  { id: 'breath', name: 'Breath Control', blurb: 'In for four. Hold for four. Do not laugh.', baseCost: 17280, growth: 1.2, baseProd: 80, revealAt: 100, accent: 'var(--jade)' },
  { id: 'mountain', name: 'Mountain Sparring', blurb: 'The mountain does not hold back. Neither do you.', baseCost: 207360, growth: 1.217, baseProd: 850, revealAt: 1e4, accent: 'var(--gold)' },
  { id: 'meridian', name: 'Meridian Opening', blurb: 'Pressure points, politely rearranged.', baseCost: 2.4883e6, growth: 1.233, baseProd: 8200, revealAt: 1.2e5, accent: 'var(--violet)' },
  {
    id: 'gravity',
    name: 'Gravity Chamber',
    blurb: 'Ten times the weight. Your sandwich suffers most.',
    baseCost: 2.986e7,
    growth: 1.25,
    baseProd: 76000,
    revealAt: 1.5e6,
    milestoneEffect: { kind: 'fluxGain', perMilestone: 0.03 },
    accent: 'var(--crimson)',
  },
  {
    id: 'dilation',
    name: 'Time Dilation Room',
    blurb: 'A year of training in a day. The snacks are not included.',
    baseCost: 3.583e8,
    growth: 1.267,
    baseProd: 690000,
    revealAt: 1.8e7,
    milestoneEffect: { kind: 'fluxCap', perMilestone: 300 },
    accent: 'var(--volt)',
  },
  { id: 'spirit', name: 'Spirit Refinement', blurb: 'Boil the soul down to its strongest broth.', baseCost: 4.3e9, growth: 1.283, baseProd: 6.2e6, revealAt: 2.1e8, accent: 'var(--violet)' },
  { id: 'reality', name: 'Reality Strain', blurb: 'The air files a complaint. You keep going.', baseCost: 5.16e10, growth: 1.3, baseProd: 5.6e7, revealAt: 2.6e9, accent: 'var(--crimson)' },
];

export const drillById = (id: string): DrillDef => {
  const d = DRILLS.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown drill ${id}`);
  return d;
};

/**
 * Count milestones: a unit-count threshold that multiplies that drill's output.
 * Thresholds are `steps` first, then `afterLast` doubling forever (10, 25, 50, 100, 200, 400, ...).
 * Every `tripleEvery`-th milestone gives x3 instead of x2.
 */
export const MILESTONES = {
  steps: [10, 25, 50, 100],
  doubleAfterLast: true,
  tripleEvery: 4,
  mult: 2,
  tripleMult: 3,
} as const;
