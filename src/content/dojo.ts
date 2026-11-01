/** Dojo constants and disciple roles. Tuning knobs live here, not in engine code. */
export const DOJO = {
  /** Recruit cost: baseCost * growth^disciples (Ki). */
  recruit: { baseCost: 300, growth: 1.35 },
  /** Disciple capacity: base + perLevel * (level - 1), plus technique bonuses. */
  capacity: { base: 4, perLevel: 4 },
  /** Cost of going from level L to L+1: base * growth^(L - 1). Needs Ki and Renown. */
  level: { kiBase: 1500, kiGrowth: 3.5, renownBase: 10, renownGrowth: 1.8 },
  /** Training Level costs Renown only: base * growth^T. Each level adds `bonusPerLevel` to role output. */
  training: { renownBase: 25, renownGrowth: 1.55, bonusPerLevel: 0.1 },
  /** Renown per second for every assigned disciple, whatever the role. */
  renownPerAssignedSec: 0.01,
  /** Each Sparring Partner adds this fraction to all Ki (Dojo category), before Training Level. */
  sparringPerPartner: 0.03,
  /** Insight per second with no Scribes, once the Archive is open. */
  insightTrickle: 0.01,
  /** Insight per second per Scribe, before Training Level. */
  scribeInsightPerSec: 0.015,
  /** Per Cook. */
  cook: { fluxCapSec: 360, offlineCapSec: 1200 },
} as const;

export type RoleUnlock =
  | { kind: 'zone'; zone: string }
  | { kind: 'dojoLevel'; level: number };

export interface RoleDef {
  id: string;
  name: string;
  glyph: string;
  accent: string;
  blurb: string;
  /** One dry line on what each assigned disciple does. */
  effectText: string;
  unlock: RoleUnlock;
  /** False while the zone this role serves is not built yet. Unbuilt roles cannot be assigned. */
  built: boolean;
  /** Shown while locked or unbuilt. */
  lockedHint: string;
}

export const ROLES: RoleDef[] = [
  {
    id: 'sparring',
    name: 'Sparring Partner',
    glyph: '拳',
    accent: 'var(--ember)',
    blurb: 'Gets hit so you do not have to be told how.',
    effectText: `+${DOJO.sparringPerPartner * 100}% all Ki each`,
    unlock: { kind: 'zone', zone: 'dojo' },
    built: true,
    lockedHint: '',
  },
  {
    id: 'scribe',
    name: 'Scribe',
    glyph: '筆',
    accent: 'var(--violet)',
    blurb: 'Copies scrolls and reads them aloud, badly.',
    effectText: `+${DOJO.scribeInsightPerSec} Insight/s each`,
    unlock: { kind: 'zone', zone: 'archive' },
    built: true,
    lockedHint: 'Opens with the Scroll Archive',
  },
  {
    id: 'cook',
    name: 'Cook',
    glyph: '飯',
    accent: 'var(--gold)',
    blurb: 'A well-fed hero meditates longer. Allegedly.',
    effectText: `+${DOJO.cook.fluxCapSec / 60} min Ki Flux cap and +${DOJO.cook.offlineCapSec / 60} min offline cap each`,
    unlock: { kind: 'dojoLevel', level: 3 },
    built: true,
    lockedHint: 'Opens at Dojo level 3',
  },
  {
    id: 'scout',
    name: 'Scout',
    glyph: '偵',
    accent: 'var(--jade)',
    blurb: 'Knows every trail. Refuses to explain how.',
    effectText: 'Faster, larger expeditions',
    unlock: { kind: 'zone', zone: 'frontier' },
    built: false,
    lockedHint: 'Arrives with the Wild Frontier update',
  },
  {
    id: 'smith',
    name: 'Smith',
    glyph: '鍛',
    accent: 'var(--crimson)',
    blurb: 'Hits things until they become better things.',
    effectText: 'Faster forging',
    unlock: { kind: 'zone', zone: 'forge' },
    built: false,
    lockedHint: 'Arrives with the Forge update',
  },
  {
    id: 'champion',
    name: 'Champion',
    glyph: '闘',
    accent: 'var(--gold)',
    blurb: 'Enters every tournament. Wins most of them.',
    effectText: 'Earns Glory',
    unlock: { kind: 'zone', zone: 'tournament' },
    built: false,
    lockedHint: 'Arrives with the Tournament update',
  },
];

export const roleById = (id: string): RoleDef => {
  const r = ROLES.find((x) => x.id === id);
  if (!r) throw new Error(`Unknown role ${id}`);
  return r;
};
