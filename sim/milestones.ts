import type { GameState } from '../src/core/state';

const MIN = 60;
const HOUR = 3600;
const DAY = 86400;

export interface Milestone {
  id: string;
  label: string;
  /** Target in seconds, the midpoint of the SPEC section 14 range. */
  target: number;
  /** Which bot's clock the target is measured on: continuous play minutes, or casual wall-clock days. */
  bot: 'active' | 'casual';
  /** Which build milestone makes this measurable. Predicate is null until that content exists. */
  needs: string;
  reached: ((s: GameState) => boolean) | null;
  note?: string;
}

/** SPEC section 14 pacing targets. Fill in `reached` as each system is built. */
export const MILESTONES: Milestone[] = [
  { id: 'dojo', label: 'Dojo unlocked', target: 5 * MIN, bot: 'active', needs: 'M2', reached: (s) => !!s.unlocked.dojo },
  { id: 'archive', label: 'Archive unlocked', target: 20 * MIN, bot: 'active', needs: 'M2', reached: (s) => !!s.unlocked.archive },
  {
    id: 'rebirth',
    label: 'Rebirth available (run Ki 1e8)',
    target: 45 * MIN,
    bot: 'active',
    needs: 'M2',
    reached: (s) => s.runKi.gte(1e8),
    note: 'Ki threshold only; the Rebirth system itself is Milestone 4',
  },
  {
    id: 'frontier',
    label: 'Wild Frontier unlocked',
    target: 1.5 * HOUR,
    bot: 'active',
    needs: 'M2',
    reached: (s) => !!s.unlocked.frontier,
    note: 'SPEC conflict: 2e6 total Ki comes before Rebirth at 1e8 run Ki, so it cannot also come after 45 min',
  },
  { id: 'forge', label: 'Forge unlocked', target: 2.5 * HOUR, bot: 'active', needs: 'M5', reached: null },
  { id: 'tournament', label: 'Tournament Arc unlocked', target: 1.5 * DAY, bot: 'casual', needs: 'M2', reached: (s) => !!s.unlocked.tournament, note: 'Day-scale pacing depends on Rebirth and Ascension multipliers (Milestones 4 and 8); drills alone cannot be tuned to it', },
  { id: 'spirit', label: 'Spirit Realm unlocked', target: 4 * DAY, bot: 'casual', needs: 'M2', reached: (s) => !!s.unlocked.spirit, note: 'Day-scale pacing depends on Rebirth and Ascension multipliers (Milestones 4 and 8); drills alone cannot be tuned to it', },
  { id: 'ascension', label: 'First Ascension', target: 5 * DAY, bot: 'casual', needs: 'M8', reached: null },
  { id: 'court', label: 'Heavenly Court unlocked', target: 3.5 * 7 * DAY, bot: 'casual', needs: 'M2', reached: (s) => !!s.unlocked.court, note: 'Day-scale pacing depends on Rebirth and Ascension multipliers (Milestones 4 and 8); drills alone cannot be tuned to it', },
  { id: 'transcend', label: 'First Transcendence', target: 7 * 7 * DAY, bot: 'casual', needs: 'M9', reached: null },
];
