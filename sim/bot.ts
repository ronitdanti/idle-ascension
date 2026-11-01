/**
 * Shared bot behaviour for the simulator: how a player spends Ki, Renown and Insight.
 * Uses only the pure core, so it exercises the same rules the game does.
 */
import { buyTech, discoveriesReady, readDiscovery, techBuyable } from '../src/core/archive';
import { TECHNIQUES } from '../src/content/techniques';
import {
  assign,
  assigned,
  canLevelUp,
  canTrain,
  freeSlots,
  levelUp,
  levelUpCost,
  recruit,
  recruitCost,
  roleCount,
  trainUp,
  trainingCost,
} from '../src/core/dojo';
import type { GameState } from '../src/core/state';
import { bestOffer, buy, kiPerSec } from '../src/core/training';

/** Share of the roster the bot puts on Scribes once the Archive is open. */
const SCRIBE_SHARE = 0.4;

/** Keep roles at the policy: Scribes get a share once the Archive is open, everyone else spars. */
function rebalance(s: GameState): void {
  const total = s.dojo.disciples;
  if (total <= 0) return;
  const wantScribes = s.unlocked.archive ? Math.ceil(total * SCRIBE_SHARE) : 0;
  const haveScribes = roleCount(s, 'scribe');
  if (haveScribes > wantScribes) assign(s, 'scribe', wantScribes - haveScribes);
  if (haveScribes < wantScribes) assign(s, 'scribe', wantScribes - haveScribes);
  assign(s, 'sparring', total - assigned(s)); // everyone left over spars
}

/** Gain in Ki/s if one more disciple spars, found by trying it and putting it back. */
function recruitGain(s: GameState): number {
  const before = kiPerSec(s).toNumber();
  s.dojo.disciples += 1;
  s.dojo.roles.sparring = (s.dojo.roles.sparring ?? 0) + 1;
  const after = kiPerSec(s).toNumber();
  s.dojo.disciples -= 1;
  s.dojo.roles.sparring -= 1;
  if (s.dojo.roles.sparring <= 0) delete s.dojo.roles.sparring;
  return after - before;
}

function trainGain(s: GameState): number {
  const before = kiPerSec(s).toNumber();
  s.dojo.training += 1;
  const after = kiPerSec(s).toNumber();
  s.dojo.training -= 1;
  return after - before;
}

/** Dojo actions for one moment in time. Returns purchases made. */
function dojoActions(s: GameState): number {
  if (!s.unlocked.dojo) return 0;
  let n = 0;
  rebalance(s);

  // Renown: a bigger Dojo when the roster is full, Training Level otherwise.
  for (let i = 0; i < 50; i++) {
    const full = freeSlots(s) === 0;
    const lvl = levelUpCost(s);
    if (full && canLevelUp(s) && lvl.ki.lte(s.ki.mul(0.5))) {
      levelUp(s);
      n++;
    } else if (canTrain(s) && (!full || s.renown.gte(lvl.renown.add(trainingCost(s))))) {
      if (trainGain(s) <= 0 && roleCount(s, 'scribe') === 0) break;
      trainUp(s);
      n++;
    } else break;
  }

  // Recruit when the next disciple pays for itself about as fast as the best drill would.
  for (let i = 0; i < 200 && freeSlots(s) > 0; i++) {
    const cost = recruitCost(s, 1);
    if (s.ki.lt(cost)) break;
    const gain = recruitGain(s);
    const drill = bestOffer(s);
    const payback = gain > 0 ? cost.toNumber() / gain : Infinity;
    // Scribes and Renown are worth something too: count a disciple as worth double its Ki.
    if (drill && payback / 2 > drill.payback && cost.gt(s.ki.mul(0.1))) break;
    if (recruit(s, 1) === 0) break;
    rebalance(s);
    n++;
  }
  return n;
}

/** Insight actions: read scrolls, then buy the cheapest technique available. */
function archiveActions(s: GameState): number {
  if (!s.unlocked.archive) return 0;
  let n = 0;
  for (const d of discoveriesReady(s)) if (readDiscovery(s, d.id)) n++;
  for (let i = 0; i < 100; i++) {
    const pick = TECHNIQUES.filter((t) => techBuyable(s, t)).sort((a, b) => a.cost - b.cost)[0];
    if (!pick || !buyTech(s, pick.id)) break;
    n++;
  }
  return n;
}

/** Everything a greedy player does when they have the game open. Returns purchases made. */
export function spendAll(s: GameState): number {
  let n = archiveActions(s) + dojoActions(s);
  for (let i = 0; i < 5000; i++) {
    const best = bestOffer(s);
    if (!best || s.ki.lt(best.cost)) break;
    buy(s, best.purchase);
    n++;
  }
  return n + archiveActions(s);
}
