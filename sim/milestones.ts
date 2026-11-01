import type { GameState } from '../src/core/state';

const MIN = 60;
const HOUR = 3600;
const DAY = 86400;

export interface Milestone {
  id: string;
  label: string;
  /** Target time in seconds, the midpoint of the SPEC section 14 range. */
  target: number;
  /** Which build milestone makes this measurable. Predicate is null until that content exists. */
  needs: string;
  reached: ((s: GameState) => boolean) | null;
}

/** SPEC section 14 pacing targets. Fill in `reached` as each system is built. */
export const MILESTONES: Milestone[] = [
  { id: 'dojo', label: 'Dojo unlocked', target: 5 * MIN, needs: 'M2', reached: (s) => !!s.unlocked.dojo },
  { id: 'archive', label: 'Archive unlocked', target: 20 * MIN, needs: 'M2', reached: (s) => !!s.unlocked.archive },
  { id: 'rebirth', label: 'First Rebirth', target: 45 * MIN, needs: 'M4', reached: null },
  { id: 'frontier', label: 'Wild Frontier unlocked', target: 1.5 * HOUR, needs: 'M2', reached: (s) => !!s.unlocked.frontier },
  { id: 'forge', label: 'Forge unlocked', target: 2.5 * HOUR, needs: 'M5', reached: null },
  { id: 'tournament', label: 'Tournament Arc unlocked', target: 1.5 * DAY, needs: 'M2', reached: (s) => !!s.unlocked.tournament },
  { id: 'spirit', label: 'Spirit Realm unlocked', target: 4 * DAY, needs: 'M2', reached: (s) => !!s.unlocked.spirit },
  { id: 'ascension', label: 'First Ascension', target: 5 * DAY, needs: 'M8', reached: null },
  { id: 'court', label: 'Heavenly Court unlocked', target: 3.5 * 7 * DAY, needs: 'M2', reached: (s) => !!s.unlocked.court },
  { id: 'transcend', label: 'First Transcendence', target: 7 * 7 * DAY, needs: 'M9', reached: null },
];
