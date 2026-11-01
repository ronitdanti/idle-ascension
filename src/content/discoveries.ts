import type { TechEffect } from './techniques';

/**
 * Archive Discoveries: rare scrolls found as you earn Insight. Reading one reveals a lore snippet
 * and grants a one-off reward. Found when lifetime Insight earned reaches `at`; the player reads it.
 */
export interface DiscoveryDef {
  id: string;
  title: string;
  /** Lifetime Insight earned needed to find it. */
  at: number;
  /** 2 to 4 short lines, present tense. */
  text: string;
  reward: {
    /** Grants this many seconds of the current Insight income as a lump. */
    insightSeconds?: number;
    /** Permanent effects, folded like technique effects. */
    effects?: TechEffect[];
  };
  /** Short reward text for the UI. */
  rewardText: string;
}

export const DISCOVERIES: DiscoveryDef[] = [
  {
    id: 'first-page',
    title: 'The Dusty First Page',
    at: 15,
    text: 'Someone drew a tiny stick figure falling off a mountain. The caption reads: "Again." You feel seen.',
    reward: { insightSeconds: 600 },
    rewardText: '10 minutes of Insight',
  },
  {
    id: 'calm-tea',
    title: 'Recipe for Calm Tea',
    at: 60,
    text: 'The margin note says: "Do not meditate before lunch. Do not meditate after lunch. Meditate during lunch." The recipe itself is just hot water.',
    reward: { effects: [{ kind: 'global', bonus: 0.01 }] },
    rewardText: '+1% all Ki',
  },
  {
    id: 'unsent-letter',
    title: 'A Letter, Never Sent',
    at: 200,
    text: 'Addressed to you, sealed in wax. It begins: "I have been practicing my speech for three years." There are eleven pages.',
    reward: { effects: [{ kind: 'renownGain', bonus: 0.1 }] },
    rewardText: '+10% Renown',
  },
  {
    id: 'weighted-scroll',
    title: 'The Scroll That Weighs a Ton',
    at: 600,
    text: 'It really does. Two disciples carry it in, complaining. Inside: a single instruction, "Lift."',
    reward: { effects: [{ kind: 'allDrills', bonus: 0.05 }] },
    rewardText: '+5% every drill',
  },
  {
    id: 'master-snack',
    title: "The Master's Snack Ledger",
    at: 1800,
    text: 'Every page is a tally of rice balls. The last entry, in shaky ink: "Ate the technique manual. Regret nothing."',
    reward: { insightSeconds: 1800 },
    rewardText: '30 minutes of Insight',
  },
  {
    id: 'star-map',
    title: 'Map of a Sky That Is Not Ours',
    at: 5000,
    text: 'The constellations are wrong, and they know it. One star is labelled "you, eventually".',
    reward: { effects: [{ kind: 'insightGain', bonus: 0.1 }] },
    rewardText: '+10% Insight',
  },
  {
    id: 'rival-diary',
    title: "A Rival's Training Diary",
    at: 1.5e4,
    text: '"Day 41: Trained for six hours. Day 42: Trained for seven hours so I stay ahead of whoever is reading this."',
    reward: { effects: [{ kind: 'fluxGain', bonus: 0.1 }] },
    rewardText: '+10% Ki Flux charge',
  },
  {
    id: 'hollow-gong',
    title: 'The Hollow Gong Hymn',
    at: 5e4,
    text: 'Written for an instrument nobody has built. When you read it aloud, a distant gong answers once, politely.',
    reward: { effects: [{ kind: 'global', bonus: 0.03 }] },
    rewardText: '+3% all Ki',
  },
  {
    id: 'nine-hundred-bows',
    title: 'Nine Hundred Bows',
    at: 1.5e5,
    text: 'A manual for greeting a teacher. Chapter one is eleven bows long. Chapter nine is the same bow, but angrier.',
    reward: { effects: [{ kind: 'renownGain', bonus: 0.2 }] },
    rewardText: '+20% Renown',
  },
  {
    id: 'mountain-contract',
    title: 'Contract With a Mountain',
    at: 5e5,
    text: 'Signed in stone. The mountain agrees to stay put, and you agree not to ask what it did before.',
    reward: { effects: [{ kind: 'allDrills', bonus: 0.1 }] },
    rewardText: '+10% every drill',
  },
  {
    id: 'forgotten-form',
    title: 'The Form Nobody Finished',
    at: 2e6,
    text: 'The last move is drawn as a blank circle. The note says: "You will know." You do not, but you feel hopeful.',
    reward: { effects: [{ kind: 'global', bonus: 0.05 }] },
    rewardText: '+5% all Ki',
  },
  {
    id: 'sky-archive',
    title: 'Index of the Sky Archive',
    at: 1e7,
    text: 'A catalogue of scrolls kept somewhere above the clouds. Every entry is marked "borrowed". The return date is smudged.',
    reward: { insightSeconds: 7200 },
    rewardText: '2 hours of Insight',
  },
];

export const discoveryById = (id: string): DiscoveryDef => {
  const d = DISCOVERIES.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown discovery ${id}`);
  return d;
};
