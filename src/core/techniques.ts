import { CONFIG } from '../content/config';
import { DISCOVERIES, discoveryById } from '../content/discoveries';
import { TECH_BY_ID, type Branch, type TechEffect } from '../content/techniques';
import type { GameState } from './state';

/** Everything owned techniques and read discoveries do, folded into one table. */
export interface TechFx {
  drillBonus: Record<string, number>;
  allDrills: number;
  /** Technique category: additive within, multiplies all Ki. */
  global: number;
  cross: Array<{ source: string; target: string; perOwned: number }>;
  insightGain: number;
  renownGain: number;
  recruitDiscount: number;
  capacity: number;
  sparring: number;
  fluxCap: number;
  fluxGain: number;
  offlineCap: number;
  speedLevels: number[];
  autoLevel: number;
  autoUpgrades: boolean;
}

function emptyFx(): TechFx {
  return {
    drillBonus: {},
    allDrills: 0,
    global: 0,
    cross: [],
    insightGain: 0,
    renownGain: 0,
    recruitDiscount: 0,
    capacity: 0,
    sparring: 0,
    fluxCap: 0,
    fluxGain: 0,
    offlineCap: 0,
    speedLevels: [...CONFIG.speedLevels],
    autoLevel: 0,
    autoUpgrades: false,
  };
}

/** Owned effects in a stable order: techniques, then read discoveries. Unknown ids (removed content) are skipped. */
function ownedEffects(s: GameState): { effects: TechEffect[]; branchCount: Record<Branch, number> } {
  const effects: TechEffect[] = [];
  const branchCount: Record<Branch, number> = { body: 0, breath: 0, spirit: 0, mind: 0, legacy: 0 };
  for (const id of Object.keys(s.techniques)) {
    const t = s.techniques[id] ? TECH_BY_ID.get(id) : undefined;
    if (!t) continue;
    branchCount[t.branch] += 1;
    for (const e of t.effects) effects.push(e);
  }
  for (const d of DISCOVERIES) {
    if (!s.discoveries[d.id]) continue;
    for (const e of discoveryById(d.id).reward.effects ?? []) effects.push(e);
  }
  return { effects, branchCount };
}

/** Number of Sparring Partners, read straight from state so this module needs no Dojo import. */
const partners = (s: GameState): number => s.dojo.roles.sparring ?? 0;

export function techEffects(s: GameState): TechFx {
  const fx = emptyFx();
  const { effects, branchCount } = ownedEffects(s);
  const np = partners(s);
  for (const e of effects) {
    switch (e.kind) {
      case 'drillBonus':
        fx.drillBonus[e.drill] = (fx.drillBonus[e.drill] ?? 0) + e.bonus;
        break;
      case 'allDrills':
        fx.allDrills += e.bonus;
        break;
      case 'global':
        fx.global += e.bonus;
        break;
      case 'crossDrill':
        fx.cross.push({ source: e.source, target: e.target, perOwned: e.perOwned });
        break;
      case 'perPartner':
        if (e.drill === 'all') fx.allDrills += e.per * np;
        else fx.drillBonus[e.drill] = (fx.drillBonus[e.drill] ?? 0) + e.per * np;
        break;
      case 'perBranch':
        fx.global += e.per * branchCount[e.branch];
        break;
      case 'insightGain':
        fx.insightGain += e.bonus;
        break;
      case 'renownGain':
        fx.renownGain += e.bonus;
        break;
      case 'recruitDiscount':
        fx.recruitDiscount += e.amount;
        break;
      case 'capacity':
        fx.capacity += e.amount;
        break;
      case 'sparring':
        fx.sparring += e.bonus;
        break;
      case 'fluxCap':
        fx.fluxCap += e.seconds;
        break;
      case 'fluxGain':
        fx.fluxGain += e.bonus;
        break;
      case 'offlineCap':
        fx.offlineCap += e.seconds;
        break;
      case 'speedLevel':
        if (!fx.speedLevels.includes(e.level)) fx.speedLevels.push(e.level);
        break;
      case 'autoTrain':
        fx.autoLevel = Math.max(fx.autoLevel, e.level);
        break;
      case 'autoUpgrades':
        fx.autoUpgrades = true;
        break;
    }
  }
  fx.recruitDiscount = Math.min(CONFIG.maxRecruitDiscount, fx.recruitDiscount);
  fx.speedLevels.sort((a, b) => a - b);
  return fx;
}

/** Speed Up levels the player can pick: the base ones plus any a technique added. */
export const speedLevels = (s: GameState): number[] => techEffects(s).speedLevels;

/** Plain-English line for one effect. Generated, so the data never repeats itself. */
export function effectText(e: TechEffect, drillName: (id: string) => string): string {
  const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
  const time = (sec: number) => (sec >= 3600 ? `${sec / 3600} h` : `${sec / 60} min`);
  switch (e.kind) {
    case 'drillBonus':
      return `+${pct(e.bonus)} ${drillName(e.drill)}`;
    case 'allDrills':
      return `+${pct(e.bonus)} every drill`;
    case 'global':
      return `+${pct(e.bonus)} all Ki`;
    case 'crossDrill':
      return `Each ${drillName(e.source)} adds +${pct(e.perOwned)} to ${drillName(e.target)}`;
    case 'perPartner':
      return `Each Sparring Partner adds +${pct(e.per)} to ${e.drill === 'all' ? 'every drill' : drillName(e.drill)}`;
    case 'perBranch':
      return `+${pct(e.per)} all Ki per ${e.branch[0].toUpperCase()}${e.branch.slice(1)} technique owned`;
    case 'insightGain':
      return `+${pct(e.bonus)} Insight`;
    case 'renownGain':
      return `+${pct(e.bonus)} Renown`;
    case 'recruitDiscount':
      return `Recruiting costs ${pct(e.amount)} less`;
    case 'capacity':
      return `+${e.amount} disciple slots`;
    case 'sparring':
      return `Sparring Partners hit ${pct(e.bonus)} harder`;
    case 'fluxCap':
      return `Ki Flux holds ${time(e.seconds)} more`;
    case 'fluxGain':
      return `Time away charges Ki Flux ${pct(e.bonus)} faster`;
    case 'offlineCap':
      return `Offline progress cap +${time(e.seconds)}`;
    case 'speedLevel':
      return `Unlocks Speed Up x${e.level}`;
    case 'autoTrain':
      return e.level === 1
        ? 'Unlocks Auto-Training (cheapest first, every 10 s)'
        : e.level === 2
          ? 'Auto-Training runs every 5 s and gains Best value mode'
          : 'Auto-Training runs every 2 s and gains Highest tier and Even modes';
    case 'autoUpgrades':
      return 'Auto-Training can also buy upgrades';
  }
}
