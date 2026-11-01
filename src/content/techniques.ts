/**
 * The Technique Tree. Pure data: the engine folds these effects in `core/techniques.ts`.
 *
 * Milestone 3 ships 63 nodes. The rest of SPEC's ~80 arrive with the systems they need
 * (Aura nodes with the Spirit Realm, Essence nodes with Rebirth); see DECISIONS.md.
 */
export type Branch = 'body' | 'breath' | 'spirit' | 'mind' | 'legacy';

export const BRANCHES: Array<{ id: Branch; name: string; glyph: string; accent: string; blurb: string }> = [
  { id: 'body', name: 'Body', glyph: '体', accent: 'var(--ember)', blurb: 'Drill multipliers. Stronger legs, harder fists.' },
  { id: 'breath', name: 'Breath', glyph: '息', accent: 'var(--volt)', blurb: 'Offline cap, Ki Flux and Speed Up.' },
  { id: 'spirit', name: 'Spirit', glyph: '霊', accent: 'var(--violet)', blurb: 'Raw Ki and Insight. Aura nodes arrive with the Spirit Realm.' },
  { id: 'mind', name: 'Mind', glyph: '心', accent: 'var(--gold)', blurb: 'Automation and a bigger, cheaper Dojo.' },
  { id: 'legacy', name: 'Legacy', glyph: '承', accent: 'var(--jade)', blurb: 'What the old masters left. Prestige nodes arrive with Rebirth.' },
];

export type TechEffect =
  | { kind: 'drillBonus'; drill: string; bonus: number } // +bonus (1 = +100%) to one drill
  | { kind: 'allDrills'; bonus: number } // +bonus to every drill
  | { kind: 'global'; bonus: number } // +bonus to all Ki (Technique category)
  | { kind: 'crossDrill'; source: string; target: string; perOwned: number } // target +perOwned per source unit
  | { kind: 'perPartner'; drill: string; per: number } // target ('all' or a drill id) +per for each Sparring Partner
  | { kind: 'perBranch'; branch: Branch; per: number } // all Ki +per for each owned node in the branch
  | { kind: 'insightGain'; bonus: number }
  | { kind: 'renownGain'; bonus: number }
  | { kind: 'recruitDiscount'; amount: number } // -fraction of recruit cost (capped in the engine)
  | { kind: 'capacity'; amount: number } // extra disciple slots
  | { kind: 'sparring'; bonus: number } // Sparring Partners hit harder
  | { kind: 'fluxCap'; seconds: number }
  | { kind: 'fluxGain'; bonus: number }
  | { kind: 'offlineCap'; seconds: number }
  | { kind: 'speedLevel'; level: number } // adds a Speed Up level
  | { kind: 'autoTrain'; level: 1 | 2 | 3 }
  | { kind: 'autoUpgrades' };

export interface TechDef {
  id: string;
  name: string;
  branch: Branch;
  /** 0 = first row. Drives the Insight cost and the row the node sits in. */
  tier: number;
  requires: string[];
  effects: TechEffect[];
  cost: number;
  /** Optional flavor line. The effect text is generated from `effects`. */
  flavor?: string;
}

/**
 * Insight cost by tier. Tiers 0 to 3 grow 3.5x per tier (6, 21, 74, 257) so the early tree pays out
 * quickly; from tier 4 each tier is 6x the last (1.5k, 9.3k, 55k, 333k, 2M) so the top of the tree
 * is a weeks-long goal. Total for the whole tree is about 4.1M.
 */
export const techCost = (tier: number): number => Math.round(6 * 3.5 ** Math.min(tier, 3) * 6 ** Math.max(0, tier - 3));

const t = (
  branch: Branch,
  tier: number,
  id: string,
  name: string,
  requires: string[],
  effects: TechEffect[],
  flavor?: string,
): TechDef => ({ id, name, branch, tier, requires, effects, cost: techCost(tier), flavor });

export const TECHNIQUES: TechDef[] = [
  // ---------- Body: drill multipliers ----------
  t('body', 0, 'iron-fist', 'Iron Fist', [], [{ kind: 'drillBonus', drill: 'shadow', bonus: 0.5 }], 'The shadow finally flinches.'),
  t('body', 1, 'ox-shoulders', 'Ox Shoulders', ['iron-fist'], [{ kind: 'drillBonus', drill: 'weights', bonus: 0.5 }]),
  t('body', 1, 'stone-posture', 'Stone Posture', ['iron-fist'], [{ kind: 'allDrills', bonus: 0.1 }]),
  t('body', 2, 'cold-discipline', 'Cold Discipline', ['ox-shoulders'], [{ kind: 'drillBonus', drill: 'waterfall', bonus: 0.6 }]),
  t('body', 2, 'rooted-legs', 'Rooted Legs', ['stone-posture'], [{ kind: 'global', bonus: 0.04 }]),
  t('body', 3, 'bamboo-reflex', 'Bamboo Reflex', ['cold-discipline'], [{ kind: 'drillBonus', drill: 'breath', bonus: 0.6 }]),
  t('body', 3, 'falling-boulder', 'Falling Boulder', ['rooted-legs'], [{ kind: 'drillBonus', drill: 'mountain', bonus: 0.7 }]),
  t('body', 3, 'sparring-fever', 'Sparring Fever', ['stone-posture'], [{ kind: 'perPartner', drill: 'all', per: 0.002 }], 'Partners are contagious.'),
  t('body', 4, 'open-palm', 'Open Palm', ['bamboo-reflex'], [{ kind: 'drillBonus', drill: 'meridian', bonus: 0.8 }]),
  t('body', 4, 'heavy-heart', 'Heavy Heart', ['falling-boulder'], [{ kind: 'drillBonus', drill: 'gravity', bonus: 0.8 }]),
  t('body', 5, 'echoing-blows', 'Echoing Blows', ['open-palm', 'heavy-heart'], [{ kind: 'crossDrill', source: 'mountain', target: 'meridian', perOwned: 0.005 }]),
  t('body', 5, 'frozen-second', 'Frozen Second', ['heavy-heart'], [{ kind: 'drillBonus', drill: 'dilation', bonus: 0.9 }]),
  t('body', 6, 'broth-of-ages', 'Broth of Ages', ['frozen-second'], [{ kind: 'drillBonus', drill: 'spirit', bonus: 1 }]),
  t('body', 7, 'unbreakable-body', 'Unbreakable Body', ['echoing-blows', 'broth-of-ages'], [{ kind: 'allDrills', bonus: 0.4 }]),
  t('body', 8, 'strain-the-sky', 'Strain the Sky', ['unbreakable-body'], [{ kind: 'drillBonus', drill: 'reality', bonus: 1.2 }]),

  // ---------- Breath: offline cap, Ki Flux, Speed Up ----------
  t('breath', 0, 'first-breath', 'First Breath', [], [{ kind: 'fluxCap', seconds: 900 }], 'In. Out. Look at you, alive.'),
  t('breath', 1, 'slow-count', 'Slow Count', ['first-breath'], [{ kind: 'fluxGain', bonus: 0.15 }]),
  t('breath', 1, 'long-nap', 'Long Nap', ['first-breath'], [{ kind: 'offlineCap', seconds: 3600 }]),
  t('breath', 2, 'deep-well', 'Deep Well', ['slow-count'], [{ kind: 'fluxCap', seconds: 1800 }]),
  t('breath', 2, 'night-watch', 'Night Watch', ['long-nap'], [{ kind: 'offlineCap', seconds: 7200 }]),
  t('breath', 3, 'wider-channel', 'Wider Channel', ['deep-well'], [{ kind: 'speedLevel', level: 8 }], 'The river learns to hurry.'),
  t('breath', 3, 'patient-water', 'Patient Water', ['night-watch'], [{ kind: 'fluxGain', bonus: 0.2 }]),
  t('breath', 4, 'moon-drinker', 'Moon Drinker', ['patient-water'], [{ kind: 'offlineCap', seconds: 10800 }]),
  t('breath', 4, 'reservoir-calm', 'Reservoir Calm', ['wider-channel'], [{ kind: 'fluxCap', seconds: 3600 }]),
  t('breath', 5, 'tidal-rhythm', 'Tidal Rhythm', ['reservoir-calm', 'patient-water'], [{ kind: 'fluxGain', bonus: 0.3 }]),
  t('breath', 5, 'breath-of-ages', 'Breath of Ages', ['moon-drinker'], [{ kind: 'offlineCap', seconds: 21600 }]),
  t('breath', 6, 'endless-exhale', 'Endless Exhale', ['breath-of-ages', 'tidal-rhythm'], [{ kind: 'offlineCap', seconds: 43200 }]),
  t('breath', 7, 'mountain-heartbeat', 'Mountain Heartbeat', ['endless-exhale'], [{ kind: 'speedLevel', level: 12 }, { kind: 'fluxCap', seconds: 7200 }]),

  // ---------- Spirit: raw Ki and Insight (Aura nodes come with the Spirit Realm) ----------
  t('spirit', 0, 'quiet-center', 'Quiet Center', [], [{ kind: 'global', bonus: 0.03 }]),
  t('spirit', 1, 'calm-eyes', 'Calm Eyes', ['quiet-center'], [{ kind: 'insightGain', bonus: 0.1 }]),
  t('spirit', 1, 'warm-glow', 'Warm Glow', ['quiet-center'], [{ kind: 'global', bonus: 0.04 }]),
  t('spirit', 2, 'lantern-mind', 'Lantern Mind', ['calm-eyes'], [{ kind: 'insightGain', bonus: 0.15 }]),
  t('spirit', 2, 'ember-vow', 'Ember Vow', ['warm-glow'], [{ kind: 'global', bonus: 0.05 }]),
  t('spirit', 3, 'wandering-light', 'Wandering Light', ['lantern-mind'], [{ kind: 'renownGain', bonus: 0.15 }]),
  t('spirit', 3, 'kindled-will', 'Kindled Will', ['ember-vow'], [{ kind: 'global', bonus: 0.06 }]),
  t('spirit', 4, 'resonance', 'Resonance', ['wandering-light', 'kindled-will'], [{ kind: 'perBranch', branch: 'spirit', per: 0.01 }], 'Each Spirit technique rings the others.'),
  t('spirit', 4, 'silver-thread', 'Silver Thread', ['kindled-will'], [{ kind: 'insightGain', bonus: 0.25 }]),
  t('spirit', 5, 'radiant-calm', 'Radiant Calm', ['resonance'], [{ kind: 'global', bonus: 0.08 }]),
  t('spirit', 5, 'veil-lifter', 'Veil Lifter', ['silver-thread'], [{ kind: 'global', bonus: 0.08 }]),
  t('spirit', 6, 'second-sun', 'Second Sun', ['radiant-calm', 'veil-lifter'], [{ kind: 'global', bonus: 0.12 }]),
  t('spirit', 7, 'halo-seed', 'Halo Seed', ['second-sun'], [{ kind: 'global', bonus: 0.15 }]),

  // ---------- Mind: automation, a bigger and cheaper Dojo ----------
  t('mind', 0, 'patient-hands', 'Patient Hands', [], [{ kind: 'recruitDiscount', amount: 0.05 }]),
  t('mind', 1, 'routine-training', 'Routine Training', ['patient-hands'], [{ kind: 'autoTrain', level: 1 }], 'Someone finally wrote the schedule down.'),
  t('mind', 1, 'ledger-habit', 'Ledger Habit', ['patient-hands'], [{ kind: 'capacity', amount: 2 }]),
  t('mind', 2, 'steady-schedule', 'Steady Schedule', ['routine-training'], [{ kind: 'autoTrain', level: 2 }]),
  t('mind', 2, 'well-run-hall', 'Well-Run Hall', ['ledger-habit'], [{ kind: 'recruitDiscount', amount: 0.1 }]),
  t('mind', 3, 'tidy-scrolls', 'Tidy Scrolls', ['steady-schedule'], [{ kind: 'autoUpgrades' }]),
  t('mind', 3, 'open-doors', 'Open Doors', ['well-run-hall'], [{ kind: 'capacity', amount: 3 }]),
  t('mind', 4, 'clockwork-discipline', 'Clockwork Discipline', ['tidy-scrolls'], [{ kind: 'autoTrain', level: 3 }]),
  t('mind', 4, 'famous-teacher', 'Famous Teacher', ['open-doors'], [{ kind: 'renownGain', bonus: 0.25 }]),
  t('mind', 4, 'delegated-duties', 'Delegated Duties', ['well-run-hall'], [{ kind: 'sparring', bonus: 0.25 }]),
  t('mind', 5, 'quiet-halls', 'Quiet Halls', ['famous-teacher', 'delegated-duties'], [{ kind: 'capacity', amount: 4 }]),
  t('mind', 6, 'master-roster', 'Master Roster', ['quiet-halls'], [{ kind: 'sparring', bonus: 0.4 }]),
  t('mind', 6, 'perfect-routine', 'Perfect Routine', ['clockwork-discipline'], [{ kind: 'recruitDiscount', amount: 0.15 }]),
  t('mind', 7, 'hall-of-hundreds', 'Hall of Hundreds', ['master-roster'], [{ kind: 'capacity', amount: 8 }]),

  // ---------- Legacy: what the masters left (prestige nodes arrive with Rebirth) ----------
  t('legacy', 1, 'ancestors-whisper', "Ancestors' Whisper", [], [{ kind: 'global', bonus: 0.03 }]),
  t('legacy', 2, 'family-recipe', 'Family Recipe', ['ancestors-whisper'], [{ kind: 'insightGain', bonus: 0.15 }]),
  t('legacy', 3, 'worn-banner', 'Worn Banner', ['ancestors-whisper'], [{ kind: 'renownGain', bonus: 0.2 }]),
  t('legacy', 3, 'heirloom-weights', 'Heirloom Weights', ['ancestors-whisper'], [{ kind: 'allDrills', bonus: 0.12 }]),
  t('legacy', 4, 'lineage-scroll', 'Lineage Scroll', ['family-recipe', 'worn-banner'], [{ kind: 'perBranch', branch: 'legacy', per: 0.015 }]),
  t('legacy', 5, 'patriarchs-ledger', "Patriarch's Ledger", ['heirloom-weights'], [{ kind: 'global', bonus: 0.1 }]),
  t('legacy', 6, 'unbroken-line', 'Unbroken Line', ['lineage-scroll', 'patriarchs-ledger'], [{ kind: 'global', bonus: 0.15 }]),
  t('legacy', 7, 'first-masters-seal', "First Master's Seal", ['unbroken-line'], [{ kind: 'allDrills', bonus: 0.3 }]),
];

export const TECH_BY_ID: ReadonlyMap<string, TechDef> = new Map(TECHNIQUES.map((x) => [x.id, x]));

export const techById = (id: string): TechDef => {
  const x = TECH_BY_ID.get(id);
  if (!x) throw new Error(`Unknown technique ${id}`);
  return x;
};

export const techsInBranch = (b: Branch): TechDef[] => TECHNIQUES.filter((x) => x.branch === b);
