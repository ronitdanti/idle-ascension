import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/content/config';
import { DOJO, ROLES } from '../src/content/dojo';
import { DISCOVERIES } from '../src/content/discoveries';
import { BRANCHES, TECHNIQUES, TECH_BY_ID } from '../src/content/techniques';
import { DRILLS } from '../src/content/drills';
import { D } from '../src/core/bignum';
import { bulkCost } from '../src/core/economy';
import { advance, applyOffline } from '../src/core/engine';
import { parseSave, serialize } from '../src/core/save';
import { newState, type GameState } from '../src/core/state';
import { autoPass, autoStep, effectiveMode } from '../src/core/auto';
import {
  assign,
  assigned,
  canLevelUp,
  capacity,
  idleDisciples,
  insightPerSec,
  levelUp,
  levelUpCost,
  maxRecruit,
  offlineCapSec,
  recruit,
  recruitCost,
  recruitQuote,
  renownPerSec,
  sparringBonus,
  trainingCost,
  trainingMult,
  trainUp,
} from '../src/core/dojo';
import { techEffects, speedLevels } from '../src/core/techniques';
import { breakdown, fluxCapSec, fluxChargeRate, kiPerSec, owned } from '../src/core/training';

const T0 = 1_700_000_000_000;
/** A state past the Dojo and Archive unlocks, with plenty of Ki. */
const open = (ki = 1e6): GameState => {
  const s = newState(T0);
  s.ki = D(ki);
  s.totalKi = D(ki);
  s.runKi = D(ki);
  s.unlocked.dojo = true;
  s.unlocked.archive = true;
  return s;
};
/** Decimal objects do not survive structuredClone, so copy through the save format. */
const clone = (s: GameState): GameState => parseSave(serialize(s));
const withTech = (s: GameState, ...ids: string[]) => {
  for (const id of ids) s.techniques[id] = true;
  return s;
};

describe('Dojo recruiting', () => {
  it('costs base * growth^n and bulk uses the geometric series', () => {
    const s = open();
    expect(recruitCost(s, 1).toNumber()).toBeCloseTo(DOJO.recruit.baseCost, 6);
    s.dojo.disciples = 3;
    expect(recruitCost(s, 1).toNumber()).toBeCloseTo(DOJO.recruit.baseCost * DOJO.recruit.growth ** 3, 6);
    const one = (n: number) => DOJO.recruit.baseCost * DOJO.recruit.growth ** n;
    expect(recruitCost(s, 3).toNumber()).toBeCloseTo(one(3) + one(4) + one(5), 6);
    expect(recruitCost(s, 3).toNumber()).toBeCloseTo(bulkCost(DOJO.recruit.baseCost, DOJO.recruit.growth, 3, 3).toNumber(), 6);
  });

  it('is limited by capacity, and a fixed amount is trimmed to the free room', () => {
    const s = open(1e12);
    expect(capacity(s)).toBe(DOJO.capacity.base);
    expect(recruit(s, 10)).toBe(DOJO.capacity.base);
    expect(s.dojo.disciples).toBe(DOJO.capacity.base);
    expect(recruit(s, 1)).toBe(0);
    expect(recruitQuote(s, 1).full).toBe(true);
  });

  it('cannot recruit what it cannot afford, and Max buys as many as are affordable', () => {
    const s = open(DOJO.recruit.baseCost * 2);
    expect(recruit(s, 10)).toBe(0); // 4 slots would cost more than held
    expect(maxRecruit(s)).toBe(1);
    expect(recruit(s, 'max')).toBe(1);
    expect(s.ki.toNumber()).toBeCloseTo(DOJO.recruit.baseCost, 6);
  });

  it('Patient Hands techniques make recruiting cheaper, never past the cap', () => {
    const s = withTech(open(), 'patient-hands');
    expect(recruitCost(s, 1).toNumber()).toBeCloseTo(DOJO.recruit.baseCost * 0.95, 6);
    expect(techEffects(withTech(open(), 'patient-hands', 'well-run-hall', 'perfect-routine')).recruitDiscount).toBeLessThanOrEqual(CONFIG.maxRecruitDiscount);
  });
});

describe('Dojo roles', () => {
  it('assigns only idle disciples and never goes below zero', () => {
    const s = open();
    s.dojo.disciples = 3;
    expect(assign(s, 'sparring', 2)).toBe(2);
    expect(assign(s, 'sparring', 5)).toBe(1);
    expect(assigned(s)).toBe(3);
    expect(idleDisciples(s)).toBe(0);
    expect(assign(s, 'sparring', -10)).toBe(-3);
    expect(s.dojo.roles.sparring).toBeUndefined();
  });

  it('locked and unbuilt roles cannot be assigned', () => {
    const s = open();
    s.dojo.disciples = 5;
    expect(assign(s, 'cook', 1)).toBe(0); // needs Dojo level 3
    s.dojo.level = 3;
    expect(assign(s, 'cook', 1)).toBe(1);
    s.unlocked.frontier = true;
    expect(assign(s, 'scout', 1)).toBe(0); // zone open but the system is not built
  });

  it('Sparring Partners add a Dojo category that the breakdown matches', () => {
    const s = open();
    s.dojo.disciples = 4;
    assign(s, 'sparring', 4);
    s.drills.shadow = 10;
    const bonus = DOJO.sparringPerPartner * 4;
    expect(sparringBonus(s)).toBeCloseTo(bonus, 9);
    const bd = breakdown(s);
    expect(bd.categories.find((c) => c.id === 'dojo')?.mult.toNumber()).toBeCloseTo(1 + bonus, 9);
    expect(bd.total.toNumber()).toBeCloseTo(kiPerSec(s).toNumber(), 6);
  });

  it('Training Level scales role output', () => {
    const s = open(1e9);
    s.dojo.disciples = 4;
    assign(s, 'sparring', 4);
    const before = sparringBonus(s);
    s.renown = D(1e6);
    expect(trainUp(s)).toBe(true);
    expect(trainingMult(s)).toBeCloseTo(1 + DOJO.training.bonusPerLevel, 9);
    expect(sparringBonus(s)).toBeCloseTo(before * (1 + DOJO.training.bonusPerLevel), 9);
    expect(trainingCost(s).toNumber()).toBeCloseTo(DOJO.training.renownBase * DOJO.training.renownGrowth, 6);
  });

  it('Cooks raise the Flux cap and the offline cap', () => {
    const s = open();
    s.dojo.level = 3;
    s.dojo.disciples = 5;
    const flux = fluxCapSec(s);
    const off = offlineCapSec(s);
    assign(s, 'cook', 5);
    expect(fluxCapSec(s)).toBe(flux + 5 * DOJO.cook.fluxCapSec);
    expect(offlineCapSec(s)).toBe(off + 5 * DOJO.cook.offlineCapSec);
  });

  it('the offline cap never passes the hard maximum', () => {
    const s = withTech(open(), 'long-nap', 'night-watch', 'moon-drinker', 'breath-of-ages', 'endless-exhale');
    s.dojo.level = 3;
    s.dojo.disciples = 500;
    s.dojo.roles.cook = 500;
    expect(offlineCapSec(s)).toBe(CONFIG.offlineCapMaxSec);
  });
});

describe('Dojo level and Renown', () => {
  it('needs both Ki and Renown and raises capacity', () => {
    const s = open(1e12);
    const c = levelUpCost(s);
    expect(c.ki.toNumber()).toBe(DOJO.level.kiBase);
    expect(c.renown.toNumber()).toBe(DOJO.level.renownBase);
    expect(canLevelUp(s)).toBe(false); // no Renown yet
    s.renown = D(c.renown.toNumber());
    expect(levelUp(s)).toBe(true);
    expect(s.dojo.level).toBe(2);
    expect(capacity(s)).toBe(DOJO.capacity.base + DOJO.capacity.perLevel);
    expect(s.renown.toNumber()).toBe(0);
  });

  it('Renown accrues from every assigned disciple and is exact for any step size', () => {
    const a = open();
    a.dojo.disciples = 4;
    assign(a, 'sparring', 3);
    const b = clone(a);
    expect(renownPerSec(a).toNumber()).toBeCloseTo(3 * DOJO.renownPerAssignedSec, 9);
    advance(a, 600, { offline: false }, 0.1);
    advance(b, 600, { offline: false }, 60);
    expect(a.renown.toNumber()).toBeCloseTo(b.renown.toNumber(), 6);
    expect(a.renown.toNumber()).toBeCloseTo(3 * DOJO.renownPerAssignedSec * 600, 4);
  });
});

describe('Insight', () => {
  it('is zero before the Archive opens, a trickle after, and Scribes add to it', () => {
    const s = newState(T0);
    expect(insightPerSec(s).toNumber()).toBe(0);
    s.unlocked.archive = true;
    expect(insightPerSec(s).toNumber()).toBeCloseTo(DOJO.insightTrickle, 9);
    s.unlocked.dojo = true;
    s.dojo.disciples = 2;
    assign(s, 'scribe', 2);
    expect(insightPerSec(s).toNumber()).toBeCloseTo(DOJO.insightTrickle + 2 * DOJO.scribeInsightPerSec, 9);
  });

  it('Insight gain techniques multiply it', () => {
    const s = withTech(open(), 'quiet-center', 'calm-eyes');
    expect(insightPerSec(s).toNumber()).toBeCloseTo(DOJO.insightTrickle * 1.1, 9);
  });

  it('accrues exactly for any step size and tracks lifetime Insight', () => {
    const a = open();
    a.dojo.disciples = 2;
    assign(a, 'scribe', 2);
    const b = clone(a);
    advance(a, 900, { offline: false }, 0.1);
    advance(b, 900, { offline: false }, 60);
    expect(a.insight.toNumber()).toBeCloseTo(b.insight.toNumber(), 6);
    expect(a.insightEarned.toNumber()).toBeCloseTo(a.insight.toNumber(), 9);
  });
});

describe('technique effects', () => {
  it('drill bonuses are their own category, separate from upgrades', () => {
    const s = open();
    s.drills.shadow = 10;
    const base = kiPerSec(s).toNumber();
    withTech(s, 'iron-fist');
    const line = breakdown(s).drills.find((l) => l.id === 'shadow')!;
    expect(line.techBonus).toBeCloseTo(0.5, 9);
    expect(line.localBonus).toBe(0);
    const drillPart = base - 1;
    expect(kiPerSec(s).toNumber()).toBeCloseTo(1 + drillPart * 1.5, 6);
  });

  it('global technique bonuses add together, then multiply everything', () => {
    const s = withTech(open(), 'quiet-center', 'warm-glow');
    const bd = breakdown(s);
    expect(bd.categories.find((c) => c.id === 'technique')?.mult.toNumber()).toBeCloseTo(1.07, 9);
    expect(bd.total.toNumber()).toBeCloseTo(kiPerSec(s).toNumber(), 9);
  });

  it('per-partner and per-branch effects scale with what the player holds', () => {
    const s = withTech(open(), 'sparring-fever', 'quiet-center', 'warm-glow', 'resonance');
    s.dojo.disciples = 10;
    assign(s, 'sparring', 10);
    expect(techEffects(s).allDrills).toBeCloseTo(10 * 0.002, 9);
    // Three Spirit techniques owned: +1% each on top of 3% + 4%.
    expect(techEffects(s).global).toBeCloseTo(0.03 + 0.04 + 3 * 0.01, 9);
  });

  it('cross-drill effects use the source drill count', () => {
    const s = withTech(open(), 'echoing-blows');
    s.drills.mountain = 40;
    s.drills.meridian = 5;
    expect(breakdown(s).drills.find((l) => l.id === 'meridian')!.techBonus).toBeCloseTo(40 * 0.005, 9);
  });

  it('Breath techniques raise Flux gain, Flux cap and add Speed Up levels', () => {
    const s = withTech(open(), 'first-breath', 'slow-count', 'deep-well', 'wider-channel');
    expect(fluxCapSec(s)).toBe(CONFIG.fluxCapSec + 900 + 1800);
    expect(fluxChargeRate(s)).toBeCloseTo(CONFIG.fluxPerAwaySec * 1.15, 9);
    expect(speedLevels(s)).toEqual([...CONFIG.speedLevels, 8]);
  });

  it('removed techniques in a save are ignored, not fatal', () => {
    const s = open();
    s.techniques['gone-forever'] = true;
    expect(() => kiPerSec(s)).not.toThrow();
  });
});

describe('Auto-Training', () => {
  const ready = (level: 1 | 2 | 3 = 1) => {
    const ids = level === 1 ? ['patient-hands', 'routine-training'] : level === 2 ? ['patient-hands', 'routine-training', 'steady-schedule'] : ['patient-hands', 'routine-training', 'steady-schedule', 'tidy-scrolls', 'clockwork-discipline'];
    const s = withTech(open(1000), ...ids);
    s.auto.on = true;
    return s;
  };

  it('does nothing until a technique unlocks it, or while switched off', () => {
    const s = open(1000);
    s.auto.on = true;
    advance(s, 60, { offline: false }, 1);
    expect(owned(s, 'shadow')).toBe(0);
    const t = ready();
    t.auto.on = false;
    advance(t, 60, { offline: false }, 1);
    expect(owned(t, 'shadow')).toBe(0);
  });

  it('runs a pass each interval, not every tick', () => {
    const s = ready(1);
    s.ki = D(5); // too poor to buy now
    autoStep(s, 5);
    s.ki = D(1000);
    autoStep(s, 4); // 9 s total, interval is 10
    expect(owned(s, 'shadow')).toBe(0);
    autoStep(s, 1);
    expect(owned(s, 'shadow')).toBeGreaterThan(0);
  });

  it('only offers modes the technique level allows', () => {
    const s = ready(1);
    s.auto.mode = 'deepest';
    expect(effectiveMode(s)).toBe('cheapest');
    const t = ready(3);
    t.auto.mode = 'deepest';
    expect(effectiveMode(t)).toBe('deepest');
  });

  it('cheapest mode buys the cheapest drill until Ki runs out', () => {
    const s = ready(1);
    s.ki = D(500);
    autoPass(s);
    expect(owned(s, 'shadow')).toBeGreaterThan(5);
    expect(s.ki.gte(0)).toBe(true);
  });

  it('even mode spreads purchases and value mode picks the best payback', () => {
    const s = ready(3);
    s.totalKi = D(1e5);
    s.ki = D(5000);
    s.auto.mode = 'even';
    autoPass(s);
    expect(owned(s, 'shadow')).toBeGreaterThan(0);
    expect(owned(s, 'weights')).toBeGreaterThan(0);
    const v = ready(3);
    v.ki = D(5000);
    v.auto.mode = 'value';
    autoPass(v);
    expect(owned(v, 'shadow') + owned(v, 'weights')).toBeGreaterThan(0);
  });

  it('only buys upgrades when allowed and never Flux upgrades', () => {
    const s = ready(3);
    s.totalKi = D(1e6);
    s.ki = D(1e6);
    s.drills.shadow = 3;
    s.auto.mode = 'cheapest';
    s.auto.upgrades = false;
    autoPass(s);
    expect(Object.keys(s.upgrades)).toHaveLength(0);
    s.ki = D(1e6);
    s.auto.upgrades = true;
    autoPass(s);
    expect(Object.keys(s.upgrades).length).toBeGreaterThan(0);
    expect(s.upgrades['deep-rest']).toBeUndefined();
    expect(s.upgrades['quiet-mind']).toBeUndefined();
  });

  it('offline with chunks lands close to stepping at the same interval', () => {
    const make = () => {
      const s = ready(2);
      s.auto.mode = 'value';
      s.drills.shadow = 5;
      return s;
    };
    const a = make();
    const b = make();
    advance(a, 1800, { offline: false }, 1);
    advance(b, 1800, { offline: false }, 60);
    const ra = kiPerSec(a).toNumber();
    const rb = kiPerSec(b).toNumber();
    expect(rb / ra).toBeGreaterThan(0.75);
    expect(rb / ra).toBeLessThan(1.25);
  });
});

describe('offline with the Dojo', () => {
  it('reports Insight and Renown gained while away', () => {
    const s = open();
    s.dojo.disciples = 4;
    assign(s, 'sparring', 2);
    assign(s, 'scribe', 2);
    s.lastSeen = T0;
    const r = applyOffline(s, T0 + 3600_000)!;
    expect(r.insightGained.toNumber()).toBeCloseTo((DOJO.insightTrickle + 2 * DOJO.scribeInsightPerSec) * 3600, 3);
    expect(r.renownGained.toNumber()).toBeCloseTo(4 * DOJO.renownPerAssignedSec * 3600, 3);
  });

  it('Breath techniques stretch the offline cap', () => {
    const s = withTech(open(), 'first-breath', 'long-nap');
    s.lastSeen = T0;
    const r = applyOffline(s, T0 + 30 * 3600_000)!;
    expect(r.countedSec).toBe(CONFIG.offlineCapSec + 3600);
  });
});

describe('save version 4', () => {
  it('round trips Dojo, Archive and Auto-Training state', () => {
    const s = open();
    s.insight = D('12.5');
    s.insightEarned = D(900);
    s.insightSpent = D(66);
    s.renown = D(345);
    s.dojo = { disciples: 6, level: 3, training: 2, roles: { sparring: 4, scribe: 2 } };
    s.techniques = { 'iron-fist': true };
    s.discoveries = { 'first-page': true };
    s.auto = { on: true, mode: 'value', upgrades: true, acc: 1.5 };
    expect(serialize(parseSave(serialize(s)))).toEqual(serialize(s));
  });

  it('migrates a v3 save and keeps Ki, drills and unlocks', () => {
    const v3 = { v: 3, ki: '5e9', runKi: '5e9', totalKi: '5e9', fluxSec: 100, unlocked: { training: true, dojo: true }, drills: { shadow: 12 }, upgrades: { 'shadow-1': true }, flags: {}, lastSeen: T0, createdAt: T0 };
    const s = parseSave(v3);
    expect(s.totalKi.eq('5e9')).toBe(true);
    expect(s.drills.shadow).toBe(12);
    expect(s.unlocked.dojo).toBe(true);
    expect(s.dojo).toEqual({ disciples: 0, level: 1, training: 0, roles: {} });
    expect(s.insight.toNumber()).toBe(0);
    expect(s.techniques).toEqual({});
    expect(s.auto.on).toBe(false);
  });

  it('repairs a save that assigns more disciples than exist', () => {
    const s = parseSave({ v: 4, dojo: { disciples: 3, level: 0, training: -2, roles: { sparring: 5, scribe: 4 } } });
    expect(assigned(s)).toBeLessThanOrEqual(3);
    expect(s.dojo.level).toBe(1);
    expect(s.dojo.training).toBe(0);
  });

  it('survives junk in the new fields', () => {
    const s = parseSave({ v: 4, insight: 'x', renown: -4, dojo: 'no', auto: { mode: 'bogus', on: 'yes' }, techniques: [1, 2] });
    expect(s.insight.toNumber()).toBe(0);
    expect(s.renown.toNumber()).toBe(0);
    expect(s.auto.mode).toBe('cheapest');
    expect(s.auto.on).toBe(false);
  });
});

describe('content', () => {
  const ids = TECHNIQUES.map((t) => t.id);

  it('has unique technique ids across five branches', () => {
    expect(new Set(ids).size).toBe(ids.length);
    expect(BRANCHES).toHaveLength(5);
    for (const b of BRANCHES) expect(TECHNIQUES.filter((t) => t.branch === b.id).length).toBeGreaterThan(5);
    expect(TECHNIQUES.length).toBeGreaterThanOrEqual(60);
  });

  it('every prerequisite exists, sits in an earlier tier, and the tree has no cycles', () => {
    for (const t of TECHNIQUES) {
      for (const r of t.requires) {
        const req = TECH_BY_ID.get(r);
        expect(req, `${t.id} needs ${r}`).toBeDefined();
        expect(req!.tier, `${t.id} tier`).toBeLessThan(t.tier);
      }
    }
  });

  it('every technique can be reached from a root', () => {
    const owned = new Set<string>();
    let grew = true;
    while (grew) {
      grew = false;
      for (const t of TECHNIQUES) {
        if (!owned.has(t.id) && t.requires.every((r) => owned.has(r))) {
          owned.add(t.id);
          grew = true;
        }
      }
    }
    expect(owned.size).toBe(TECHNIQUES.length);
  });

  it('effects only name drills, branches and costs that exist', () => {
    const drills = new Set(DRILLS.map((d) => d.id));
    for (const t of TECHNIQUES) {
      expect(t.cost).toBeGreaterThan(0);
      for (const e of t.effects) {
        if (e.kind === 'drillBonus') expect(drills.has(e.drill), t.id).toBe(true);
        if (e.kind === 'crossDrill') {
          expect(drills.has(e.source), t.id).toBe(true);
          expect(drills.has(e.target), t.id).toBe(true);
        }
        if (e.kind === 'perPartner' && e.drill !== 'all') expect(drills.has(e.drill), t.id).toBe(true);
        if (e.kind === 'perBranch') expect(BRANCHES.some((b) => b.id === e.branch)).toBe(true);
      }
    }
  });

  it('discoveries have unique ids and rising thresholds', () => {
    const did = DISCOVERIES.map((d) => d.id);
    expect(new Set(did).size).toBe(did.length);
    for (let i = 1; i < DISCOVERIES.length; i++) expect(DISCOVERIES[i].at).toBeGreaterThan(DISCOVERIES[i - 1].at);
  });

  it('roles have unique ids and the first three are built', () => {
    expect(new Set(ROLES.map((r) => r.id)).size).toBe(ROLES.length);
    expect(ROLES.filter((r) => r.built).map((r) => r.id)).toEqual(['sparring', 'scribe', 'cook']);
  });
});
