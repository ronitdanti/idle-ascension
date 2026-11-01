# Ki Ascension: Design Bible

Short, binding rules for every screen. If a UI decision isn't covered here, decide,
then add it here. Everything is generated in code: no image, font, or audio files.

## Feel in one line
A battered training-scroll comic printed on night-black paper, lit by ember-orange
Ki. Loud numbers, sharp corners, a little humor. Never cute-round, never corporate.

## Name and wordmark
- Title: **Ki Ascension** (working title kept on purpose: short, clear, ownable).
- Wordmark: the glyph **気** in an ember-orange angled badge, then `KI ASCENSION`
  in heavy italic caps. If the glyph can't render, the badge shows an inline-SVG flame.

## Palette (CSS custom properties, defined once in `src/ui/theme.css`)
| Token | Hex | Use |
| --- | --- | --- |
| `--ink-0` | `#07060d` | page background |
| `--ink-1` | `#100e1a` | panels |
| `--ink-2` | `#1a1727` | raised rows, inputs |
| `--line` | `#383150` | panel outlines |
| `--paper` | `#f4efe4` | primary text (warm white, never pure #fff) |
| `--mute` | `#9b94b3` | secondary text |
| `--ember` | `#ff6b21` | Ki, primary action, brand |
| `--ember-hot` | `#ffb347` | highlights on ember |
| `--volt` | `#22e5ff` | Aura, links, focus rings |
| `--violet` | `#9163ff` | Insight, Archive |
| `--gold` | `#ffcf4a` | Renown, ranks, rewards |
| `--jade` | `#3ddc97` | ready / success / Spoils |
| `--crimson` | `#ff3b5c` | Glory, danger, destructive actions |

Zone accents (backdrops and tab highlights): Training Grounds ember, Dojo gold,
Archive violet, Frontier jade, Forge ember+crimson, Tournament crimson+gold,
Spirit Realm volt+violet, Heavenly Court gold on deep navy `#0a1030`.

Contrast: body text on panels must be at least 7:1 (paper on ink-1 is ~15:1).
Never convey state by color alone: pair with an icon or label.

## Type
- Body: `"Noto Sans JP", "Hiragino Sans", system-ui, sans-serif`. System fonts only.
- Display (headings, big numbers, buttons): same stack, weight 900, uppercase for
  headings, letter-spacing `.04em`, tilted with `transform: skewX(-6deg)` on badges
  and section titles (inner text un-skewed where legibility suffers).
- Numbers: `font-variant-numeric: tabular-nums` always, so counters don't jitter.
- Scale (px, multiplied by the Text Size setting): 12 label, 14 body, 18 title,
  26 section, 38 Ki readout.
- Decorative glyphs (気 力 魂 天 闘 鍛) are used big and low-contrast behind panels.
  Every glyph use has a text or SVG fallback.

## Shape language
- Corners are **cut, not rounded**: panels use `clip-path` with a 10px angled
  top-right and bottom-left corner. No border-radius over 4px except pills for bars.
- Outlines: 2px `--line`, plus a hard offset shadow `3px 3px 0 #000` on raised
  things (buttons, sheets). Pressed state moves the element 2px and shrinks the shadow.
- Halftone: panel headers get a CSS `radial-gradient` dot pattern at 6% opacity in
  the zone accent.
- Progress bars: slanted ends (skewed), accent fill, dark track, number inside.

## Icons
Hand-built inline SVG in `src/ui/icons.tsx`: 24x24 grid, solid fills plus a 2px
miter-join outline in the same hue, no gradients. One distinct silhouette and color
per currency so they read at 16px:
- Ki: flame-teardrop (ember). Ki Flux: lightning bolt (volt). Insight: scroll/diamond (violet). Disciples: spiky
  head (gold). Spoils: faceted hexagon (jade). Gear: hammer-chevron (ember-red).
  Glory: starburst (crimson). Aura: ring with rays (volt). Fragments: four-point
  star (pale gold).
- Locked things show as a **silhouette** (flat `--ink-2` shape of the icon) with a
  threshold hint, never as a blank space.

## Layout (portrait, 360 to 430 px)
- Sticky header (56px): wordmark badge, Ki value, Ki/s, menu button.
- Content scrolls; 16px side gutters; 12px gaps between panels.
- Bottom tab bar (64px + safe-area inset): Home, Dojo, Frontier, Forge, More.
  Thumb-reachable, all targets at least 44px. A small "!" badge dot = something ready.
- Sheets (menus, settings, info, welcome-back) slide up from the bottom, dim the
  page, close by backdrop tap or the close button. No hover-only anything.
- Tooltips are tap-to-open info sheets.

## Motion
- Default curve `cubic-bezier(.2,.9,.2,1)`, 120 to 180 ms. Snappy, then settle.
- Button press: 2px nudge. Number gain: quick scale pop 1 to 1.08 to 1.
- Sheets: 180 ms slide-up. Tabs: instant swap with a 100 ms fade.
- Canvas effects run on their own rAF loop, pause when the tab is hidden, scale
  particle counts by the performance setting.
- **Reduce Motion** removes: screen shake, skew animations, pops, particle bursts.
  Static glow remains. Honors `prefers-reduced-motion` by default.

## Sound and haptics
Off by default (sound) and light (haptics: 10 ms pulses). All synthesized with WebAudio
or `navigator.vibrate`. No files.

## Naming conventions
- Short, punchy, evocative. Two words for techniques ("Iron Breath", "Hollow Palm").
- Original names only: invented place and person names with a Japanese-flavored feel,
  no existing franchise terms. Plain English for all functional UI labels.
- Currencies are capitalized nouns: Ki, Insight, Renown, Spoils, Glory, Aura, Fragments.
- Buttons are verbs: Gather, Recruit, Forge, Rebirth. Never "OK/Submit".

## Story and text tone
Affectionate shonen tropes, a wink to the reader, never mean. 2 to 4 short lines.
Present tense, second person for the hero ("You hit the ground again"). Humor
comes from earnestness (a rival who monologues, a master who is always eating).
Mechanical text is dry and exact; story text is where the flavor goes.

## Accessibility
- Text Size setting (85% to 140%). Reduce Motion. High Contrast and colorblind-safe
  palette options arrive in the Meta milestone but every color is already a token
  so they are a swap, not a rewrite.
- Focus rings in `--volt`, 2px, offset 2px.
- Minimum touch target 44 x 44 px. `touch-action: manipulation` on interactive
  elements to kill double-tap zoom.

## Training Grounds (Milestone 2)
- **Home layout**: scene panel (hero + two chips), a three-way sub-nav (Drills, Upgrades, Overview), then the content. Sub-nav buttons are 44 px tall; the selected one is solid ember with a hard shadow. A green dot on a tab means something is affordable.
- **Drill row**: a skewed tier badge in the drill's accent, name and count, income line (or flavor text before the first purchase), a slim milestone bar, and a square buy button showing amount and price. A green outline means it is affordable now. Buy buttons repeat while held.
- **Upgrade card**: same frame, no tier badge: name, one-line effect, buy button with price. Cheapest first.
- **Hero scene** (canvas): dusk gradient, three parallax ridges, silhouette hero with a crimson headband, flame aura that scales with log Ki/s. Speed Up swaps ember for volt and adds speed lines. Milestones burst sparks. Reduce Motion freezes everything but the static art.
- **Charged Meditation** uses `--volt` and the bolt icon; Speed Up buttons are a segmented control (x1, x2, x3, x5).
