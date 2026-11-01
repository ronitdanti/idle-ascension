import { CONFIG } from '../content/config';
import { DRILLS } from '../content/drills';
import { UPGRADES } from '../content/upgrades';
import { D } from './bignum';
import type { AutoMode, GameState } from './state';
import { techEffects } from './techniques';
import { bestOffer, buy, buyDrill, buyUpgrade, drillCost, drillMaxBuy, drillVisible, owned, upgradeAffordable, upgradeAvailable } from './training';

/** Highest Auto-Training level owned (0 = not unlocked). */
export const autoLevel = (s: GameState): number => techEffects(s).autoLevel;

export const autoIntervalSec = (level: number): number => (CONFIG.auto.intervalSec as Record<number, number>)[level] ?? Infinity;

export const autoModes = (s: GameState): AutoMode[] => {
  const lvl = autoLevel(s);
  return lvl > 0 ? [...((CONFIG.auto.modes as unknown as Record<number, AutoMode[]>)[lvl] ?? [])] : [];
};

/** The mode that really runs: the chosen one if it is available, else the first available. */
export function effectiveMode(s: GameState): AutoMode | null {
  const modes = autoModes(s);
  if (modes.length === 0) return null;
  return modes.includes(s.auto.mode) ? s.auto.mode : modes[0];
}

export const autoCanUpgrade = (s: GameState): boolean => techEffects(s).autoUpgrades;

const MAX_PURCHASES_PER_PASS = 200;

/** Upgrades that raise Ki are worth buying blind. Ki Flux ones are left to the player, like Smart Spend. */
function buyAffordableUpgrades(s: GameState): void {
  const list = UPGRADES.filter((u) => upgradeAvailable(s, u) && upgradeAffordable(s, u) && u.effect.kind !== 'fluxCap' && u.effect.kind !== 'fluxGain').sort((a, b) =>
    D(a.cost).cmp(b.cost),
  );
  for (const u of list) buyUpgrade(s, u.id);
}

/** One buying pass in the chosen mode. Spends what it can and returns the number of purchases. */
export function autoPass(s: GameState): number {
  const mode = effectiveMode(s);
  if (!mode) return 0;
  const withUpgrades = s.auto.upgrades && autoCanUpgrade(s);
  let n = 0;
  const visible = DRILLS.filter((d) => drillVisible(s, d));

  if (mode === 'value') {
    // Lowest (time to afford + payback) first, drills only unless upgrades are on. It waits for a
    // better buy instead of spending on whatever is cheap now, so it behaves the same offline.
    for (; n < MAX_PURCHASES_PER_PASS; n++) {
      const pick = bestOffer(s, (o) => withUpgrades || o.purchase.kind === 'drill');
      if (!pick || s.ki.lt(pick.cost) || (pick.purchase.kind === 'upgrade' && isFlux(pick.purchase.id)) || !buy(s, pick.purchase)) break;
    }
    return n;
  }

  if (withUpgrades) buyAffordableUpgrades(s);

  if (mode === 'cheapest') {
    for (; n < MAX_PURCHASES_PER_PASS; n++) {
      let best: { id: string; cost: ReturnType<typeof drillCost> } | undefined;
      for (const d of visible) {
        const cost = drillCost(s, d.id, 1);
        if (!best || cost.lt(best.cost)) best = { id: d.id, cost };
      }
      if (!best || s.ki.lt(best.cost) || buyDrill(s, best.id, 1).bought === 0) break;
    }
  } else if (mode === 'deepest') {
    // Highest tier first: as many as affordable, then the next tier down.
    for (let i = visible.length - 1; i >= 0; i--) {
      if (drillMaxBuy(s, visible[i].id) > 0) n += buyDrill(s, visible[i].id, 'max').bought;
    }
  } else {
    // Even: always the affordable drill with the fewest units, so no tier is left behind.
    for (; n < MAX_PURCHASES_PER_PASS; n++) {
      let best: { id: string; have: number } | undefined;
      for (const d of visible) {
        if (s.ki.lt(drillCost(s, d.id, 1))) continue;
        const have = owned(s, d.id);
        if (!best || have < best.have) best = { id: d.id, have };
      }
      if (!best || buyDrill(s, best.id, 1).bought === 0) break;
    }
  }
  return n;
}

function isFlux(upgradeId: string): boolean {
  const u = UPGRADES.find((x) => x.id === upgradeId);
  return !!u && (u.effect.kind === 'fluxCap' || u.effect.kind === 'fluxGain');
}

/**
 * Advance the Auto-Training timer. One pass per step at most, whatever the step length, so it is
 * cheap for the long chunks used by offline progress and Speed Up.
 */
export function autoStep(s: GameState, dt: number): void {
  const lvl = autoLevel(s);
  if (lvl <= 0 || !s.auto.on) {
    s.auto.acc = 0;
    return;
  }
  const interval = autoIntervalSec(lvl);
  s.auto.acc += dt;
  if (s.auto.acc + 1e-9 < interval) return;
  s.auto.acc = interval > 0 ? s.auto.acc % interval : 0;
  autoPass(s);
}
