import { TECHNIQUES } from '../src/content/techniques';
import { techCount } from '../src/core/archive';
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
    note: 'SPEC conflict: SPEC wants 1 to 2 h, but Tournament (1e9) and Spirit (1e12) are Ki thresholds the drill economy passes within the first hour. Set to 5e8, just after the Rebirth threshold; see DECISIONS.md',
  },
  { id: 'forge', label: 'Forge unlocked', target: 2.5 * HOUR, bot: 'active', needs: 'M5', reached: null },
  { id: 'tournament', label: 'Tournament Arc unlocked', target: 1.5 * DAY, bot: 'casual', needs: 'M2', reached: (s) => !!s.unlocked.tournament, note: 'Day-scale pacing depends on Rebirth and Ascension multipliers (Milestones 4 and 8); drills alone cannot be tuned to it', },
  { id: 'spirit', label: 'Spirit Realm unlocked', target: 4 * DAY, bot: 'casual', needs: 'M2', reached: (s) => !!s.unlocked.spirit, note: 'Day-scale pacing depends on Rebirth and Ascension multipliers (Milestones 4 and 8); drills alone cannot be tuned to it', },
  { id: 'ascension', label: 'First Ascension', target: 5 * DAY, bot: 'casual', needs: 'M8', reached: null },
  { id: 'court', label: 'Heavenly Court unlocked', target: 3.5 * 7 * DAY, bot: 'casual', needs: 'M2', reached: (s) => !!s.unlocked.court, note: 'Day-scale pacing depends on Rebirth and Ascension multipliers (Milestones 4 and 8); drills alone cannot be tuned to it', },
  { id: 'transcend', label: 'First Transcendence', target: 7 * 7 * DAY, bot: 'casual', needs: 'M9', reached: null },
];

/** Informational events (no SPEC target): used to judge how long the Dojo and Archive keep a player busy. */
export interface InfoEvent {
  id: string;
  label: string;
  reached: (s: GameState) => boolean;
}

const tiersOwned = (s: GameState, maxTier: number) => TECHNIQUES.filter((t) => t.tier <= maxTier).every((t) => s.techniques[t.id]);

export const INFO: InfoEvent[] = [
  { id: 'recruit', label: 'First disciple recruited', reached: (s) => s.dojo.disciples >= 1 },
  { id: 'dojo2', label: 'Dojo level 2', reached: (s) => s.dojo.level >= 2 },
  { id: 'tech1', label: 'First technique learned', reached: (s) => techCount(s) >= 1 },
  { id: 'cook', label: 'Dojo level 3 (Cooks open)', reached: (s) => s.dojo.level >= 3 },
  { id: 'auto', label: 'Auto-Training unlocked', reached: (s) => !!s.techniques['routine-training'] },
  { id: 'tech10', label: '10 techniques', reached: (s) => techCount(s) >= 10 },
  { id: 'dojo5', label: 'Dojo level 5', reached: (s) => s.dojo.level >= 5 },
  { id: 'tier2', label: 'Every tier 0 to 2 technique', reached: (s) => tiersOwned(s, 2) },
  { id: 'tech25', label: '25 techniques', reached: (s) => techCount(s) >= 25 },
  { id: 'dojo8', label: 'Dojo level 8', reached: (s) => s.dojo.level >= 8 },
  { id: 'tier3', label: 'Every tier 0 to 3 technique', reached: (s) => tiersOwned(s, 3) },
  { id: 'tier5', label: 'Every tier 0 to 5 technique', reached: (s) => tiersOwned(s, 5) },
  { id: 'tree', label: 'The whole technique tree', reached: (s) => tiersOwned(s, 99) },
];
