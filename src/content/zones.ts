import type { DecimalSource } from '../core/bignum';

export type UnlockRule =
  | { kind: 'start' }
  | { kind: 'totalKi'; at: DecimalSource }
  | { kind: 'flag'; flag: string; hint: string };

export type TabId = 'home' | 'dojo' | 'frontier' | 'forge' | 'more';

export interface ZoneDef {
  id: string;
  name: string;
  /** Decorative glyph, always paired with a text fallback in the UI. */
  glyph: string;
  tab: TabId;
  accent: string;
  unlock: UnlockRule;
  blurb: string;
}

/** Order matters: it is the order zones are listed in menus. Thresholds follow SPEC section 7. */
export const ZONES: ZoneDef[] = [
  { id: 'training', name: 'Training Grounds', glyph: '気', tab: 'home', accent: 'var(--ember)', unlock: { kind: 'start' }, blurb: 'Where every legend starts: dirt, sweat, and a stubborn heart.' },
  { id: 'dojo', name: 'Dojo', glyph: '道', tab: 'dojo', accent: 'var(--gold)', unlock: { kind: 'totalKi', at: 1e3 }, blurb: 'Recruit disciples and give them jobs. They will complain about the jobs.' },
  { id: 'archive', name: 'Scroll Archive', glyph: '巻', tab: 'more', accent: 'var(--violet)', unlock: { kind: 'totalKi', at: 5e4 }, blurb: 'Dusty scrolls, a technique tree, and one very quiet librarian.' },
  { id: 'frontier', name: 'Wild Frontier', glyph: '野', tab: 'frontier', accent: 'var(--jade)', unlock: { kind: 'totalKi', at: 2e6 }, blurb: 'Send your disciples out to find Spoils. They always come back.' },
  { id: 'forge', name: 'Forge', glyph: '鍛', tab: 'forge', accent: 'var(--crimson)', unlock: { kind: 'flag', flag: 'spoilsCollected', hint: 'Collect your first Spoils' }, blurb: 'Hammer Spoils into gear. Loudly.' },
  { id: 'tournament', name: 'Tournament Arc', glyph: '闘', tab: 'more', accent: 'var(--crimson)', unlock: { kind: 'totalKi', at: 1e9 }, blurb: 'Rivals, brackets, and speeches before every fight.' },
  { id: 'spirit', name: 'Spirit Realm', glyph: '魂', tab: 'more', accent: 'var(--volt)', unlock: { kind: 'totalKi', at: 1e12 }, blurb: 'A lattice of stones that hums when arranged correctly.' },
  { id: 'court', name: 'Heavenly Court', glyph: '天', tab: 'more', accent: 'var(--gold)', unlock: { kind: 'totalKi', at: 1e24 }, blurb: 'Constellations that have opinions about you.' },
];

export const zoneById = (id: string): ZoneDef => {
  const z = ZONES.find((x) => x.id === id);
  if (!z) throw new Error(`Unknown zone ${id}`);
  return z;
};
