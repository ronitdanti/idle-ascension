import type { ComponentChildren } from 'preact';

/** Hand-built geometric icons on a 24x24 grid. Solid fills, miter joins, no gradients (see DESIGN.md). */
const Svg = ({ children, size = 24, color = 'currentColor' }: { children: ComponentChildren; size?: number; color?: string }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={color}
    stroke={color}
    stroke-width="1.6"
    stroke-linejoin="miter"
    stroke-linecap="butt"
    aria-hidden="true"
  >
    {children}
  </svg>
);

type P = { size?: number; color?: string };

/** Ki: a flame-teardrop with a hollow core. */
export const KiIcon = (p: P) => (
  <Svg color="var(--ember)" {...p}>
    <path d="M12 2 C13 6 20 9 20 15 A8 8 0 0 1 4 15 C4 11 7 10 8 6 C9.5 7.5 10 8.5 10.5 9.5 C11.5 7.5 12 5 12 2 Z" />
    <path d="M12 21 A4 4 0 0 1 8 17 C8 14.5 11 13 12 11 C13 13 16 14.5 16 17 A4 4 0 0 1 12 21 Z" fill="var(--ember-hot)" stroke="var(--ember-hot)" />
  </Svg>
);

/** Ki Flux: a lightning bolt. */
export const FluxIcon = (p: P) => (
  <Svg color="var(--volt)" {...p}>
    <path d="M14 2 L5 13.5 L11 13.5 L9.5 22 L19 10 L13 10 Z" />
  </Svg>
);

/** Insight: a rolled scroll with a diamond seal. */
export const InsightIcon = (p: P) => (
  <Svg color="var(--violet)" {...p}>
    <path d="M5 3 L19 3 L19 17 L12 22 L5 17 Z" />
    <path d="M12 7 L15 11 L12 15 L9 11 Z" fill="var(--ink-0)" stroke="var(--ink-0)" />
  </Svg>
);

/** Renown: a pennant on a pole. */
export const RenownIcon = (p: P) => (
  <Svg color="var(--gold)" {...p}>
    <path d="M5 2 L7 2 L7 22 L5 22 Z" />
    <path d="M7 4 L20 4 L16 9 L20 14 L7 14 Z" />
  </Svg>
);

/** Disciples: a spiky head. */
export const DiscipleIcon = (p: P) => (
  <Svg color="var(--gold)" {...p}>
    <path d="M4 10 L6 3 L9 7 L12 2 L15 7 L18 3 L20 10 L20 14 L17 21 L7 21 L4 14 Z" />
    <path d="M8 12 L11 12 L11 14 L8 14 Z M13 12 L16 12 L16 14 L13 14 Z" fill="var(--ink-0)" stroke="var(--ink-0)" />
  </Svg>
);

export const HomeIcon = (p: P) => (
  <Svg {...p}>
    <path d="M2 11 L12 3 L22 11 L19 11 L19 21 L5 21 L5 11 Z" fill="none" />
    <path d="M9 21 L9 14 L15 14 L15 21 Z" />
  </Svg>
);

/** Dojo: a spiky-haired head. */
export const DojoIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 10 L6 3 L9 7 L12 2 L15 7 L18 3 L20 10 L20 14 L17 21 L7 21 L4 14 Z" fill="none" />
    <path d="M8 13 L11 13 L11 15 L8 15 Z M13 13 L16 13 L16 15 L13 15 Z" />
  </Svg>
);

export const FrontierIcon = (p: P) => (
  <Svg {...p}>
    <path d="M1 20 L9 6 L13 13 L16 9 L23 20 Z" fill="none" />
    <path d="M9 6 L11 10 L9 9.5 L7 10 Z" />
  </Svg>
);

export const ForgeIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 4 L16 4 L21 8 L15 10 L15 13 L9 13 L9 10 L3 8 Z" />
    <path d="M7 15 L17 15 L19 21 L5 21 Z" fill="none" />
  </Svg>
);

export const MoreIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 5 L21 5 L21 8 L3 8 Z M3 10.5 L21 10.5 L21 13.5 L3 13.5 Z M3 16 L21 16 L21 19 L3 19 Z" stroke="none" />
  </Svg>
);

export const LockIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6 10 L18 10 L18 21 L6 21 Z" />
    <path d="M8.5 10 L8.5 7 A3.5 3.5 0 0 1 15.5 7 L15.5 10" fill="none" />
  </Svg>
);

export const MenuIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 3 L14 9 L21 9 L15.5 13 L17.5 20 L12 16 L6.5 20 L8.5 13 L3 9 L10 9 Z" fill="none" />
  </Svg>
);

export const CloseIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 5 L19 19 M19 5 L5 19" fill="none" stroke-width="3" />
  </Svg>
);

const glyphOk = new Map<string, boolean>();

/** True if the system fonts can draw `ch` (compares against the width of a guaranteed-missing character). */
export function canDraw(ch: string): boolean {
  const cached = glyphOk.get(ch);
  if (cached !== undefined) return cached;
  let ok = true;
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.font = '900 40px "Noto Sans JP", "Hiragino Sans", system-ui, sans-serif';
      ok = ctx.measureText(ch).width !== ctx.measureText('￿').width;
    }
  } catch {
    ok = true;
  }
  glyphOk.set(ch, ok);
  return ok;
}

/** Zone glyph with a text fallback, per DESIGN.md: if the fonts lack the character we show the zone's first letter. */
export const Glyph = ({ glyph, name }: { glyph: string; name: string }) => (
  <span aria-hidden="true">{canDraw(glyph) ? glyph : name.charAt(0)}</span>
);
