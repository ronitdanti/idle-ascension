# Decisions

Why things are the way they are. Newest at the bottom of each section. Entries that
act on an owner note in PLAYTEST.md reference that note's date.

## Milestone 1: Foundation

### Tech stack
| Choice | Why |
| --- | --- |
| **TypeScript + Vite** | Strict typing catches content-data mistakes early (the game is mostly typed data files). Vite gives instant dev reload and a tiny, tree-shaken production build. |
| **Preact (not React, not vanilla)** | The UI is many live-updating panels. Preact is 4 KB, has the same component model as React, and keeps UI code readable. Vanilla DOM would mean hand-written update logic for every counter. Whole app is 24 KB gzipped, far under the 1 MB target. |
| **No state library** | Game state is one plain mutable object owned by the core. The UI re-reads it 10 times a second (`useTick`). That is simpler and faster than reactive wrappers for fast-changing numbers, and keeps the core free of UI concepts. |
| **break_infinity.js** | The SPEC's recommendation: values pass 1e308 and this is the lightest library built for that (mantissa + exponent, fast). All Ki and later currencies are `Decimal`. Plain numbers are used only for small counts, times and settings. |
| **vite-plugin-pwa (Workbox generateSW)** | Generates the manifest and a precaching service worker that also handles the GitHub Pages sub-path. Registration mode is **prompt**: a new deploy shows a "Reload" banner instead of refreshing mid-play. |
| **Vitest + tsx** | Vitest runs the unit tests with the same Vite config. `tsx` runs the simulator (`npm run sim`) straight from TypeScript in Node with no build step. |
| **GitHub Actions to GitHub Pages** | No extra branch to maintain. Every push to `main` runs the tests, builds, and deploys, so the owner's phone always gets the latest. Tests failing blocks the deploy. |
| **Base path `/idle-ascension/`** | The site lives at `ronitdanti.github.io/idle-ascension/`. All asset paths and the manifest are relative to that. |

Dependency versions are whatever `npm install` resolved on 2026-11-01 (Vite 8, TypeScript 7, Vitest 5, Preact 11, vite-plugin-pwa 2); `package-lock.json` pins them.

### Architecture
- **Pure core in `src/core`**, no DOM imports. The browser runtime (`src/app`) and UI (`src/ui`) sit on top of it. The simulator and tests import the core directly.
- **Systems list.** `engine.ts` runs a list of `System`s each tick. Later milestones add systems (drills, expeditions, tickets) without changing the engine.
- **Fixed 10 Hz step; offline uses chunks.** `Game.update(dt)` accumulates real frame time and runs whole 0.1 s ticks. Large batches (time-warp, offline) go through `advance()`, which uses chunk lengths that grow with elapsed time (max 60 s). Every system must be exact for any `dt`; the Rested bonus is written that way and a test checks chunked and stepped runs match.
- **Content in `src/content`**: `zones.ts` (unlock thresholds from SPEC section 7) and `config.ts` (engine constants). Engine code reads them; it never hardcodes content.
- **Placeholder economy.** Until Training Grounds exists (Milestone 2), Ki comes from a flat 1 Ki/s trickle plus tapping the orb for 1 Ki. This exists only so the offline, save and unlock plumbing can be played and tested. It will be replaced, not tuned.

### Saving
- `localStorage` main slot `kia.save`, a rolling backup `kia.save.bak` (refreshed at most every 10 minutes, and only from a copy that still parses, so a bad save can never become the backup), and an IndexedDB mirror.
- Autosave every 15 s, and on `visibilitychange` (hidden) and `pagehide`.
- **Versioned schema** (`SAVE_VERSION = 1`) with a migration table. Missing or odd fields fall back to defaults instead of rejecting the save. A save from a *newer* build is refused and left untouched.
- **Unreadable saves are never overwritten.** If a save exists but cannot be read, writing is blocked and the player gets a recovery screen: try again, download the raw data, paste a backup, or start new (double confirmed). If loading falls back to the backup or mirror, the unreadable main copy is first copied to a recovery key.
- **Replacing a save** (import, hard reset, new game) is always an explicit, confirmed action, and the previous raw text is kept under a `kia.save.unreadable.<time>` key in the browser. Hard reset needs two steps (read the warning, then type RESET). After these actions writes are frozen and the page reloads, so the autosave on page unload cannot overwrite the new save.
- **Export string**: `KIA1.<base64 JSON>.<checksum>`. Import also accepts raw JSON. Whitespace and line breaks from copy/paste are tolerated; a cut-off paste is detected by the checksum.
- Requests persistent storage (`navigator.storage.persist()`) so the browser is less likely to evict the save.

### Offline and clock safety
- Away time = now minus `lastSeen`, clamped to zero if negative or not a number. `lastSeen` never moves backwards, so setting the clock back cannot subtract anything or create free time later.
- Counted away time is capped at 12 h (`CONFIG.offlineCapSec`); beyond that production simply stops accruing and the Welcome-back sheet says so.
- **Rested time**: away time banks into Rested (cap 4 h for now) at 1:1. While it lasts, active play earns x2 Ki and it counts down in real play time. Offline simulation does not use or spend Rested. These values are placeholders in `config.ts`.
- Welcome-back only shows for absences of 60 s or more; shorter gaps are applied silently.
- Returning to the tab (`visibilitychange`) runs the same offline path, so a backgrounded tab on Android is handled like a closed one.

### UI and design
- Title kept as **Ki Ascension**: short, clear, and it names the fantasy. Visual identity is in DESIGN.md.
- Zone tabs follow SPEC section 10: Home, Dojo, Frontier, Forge, More. Locked tabs show as dimmed silhouettes with a lock; tapping shows the zone's threshold and progress. Once a zone unlocks before it is built, its tab says so honestly.
- **Unlock progress bars are log-scaled** (each power of ten counts the same), because linear bars would sit at 0% for most of a run. The label always shows the real numbers.
- Settings for notation, text size, reduce motion and haptics are live. Sound, theme, high-contrast and performance toggles are deliberately absent until the features behind them exist.
- Reduce motion defaults to the device's `prefers-reduced-motion` on first launch.
- Debug panel sits behind a Settings toggle: grant Ki, jump to next threshold, time-warp x10/100/1000, simulate time away, dump state.

### PWA icons
SPEC forbids asset files, so `scripts/make-icons.mjs` rasterizes the flame-orb mark per pixel and writes the PNGs with zlib at build time (`npm run build` and `npm run dev` run it). The output in `public/icons/` is git-ignored. Includes a maskable variant with the mark inside the safe zone.

### Simulator
`npm run sim` runs a casual-bot over the pure core and prints SPEC section 14 targets against simulated times, flagging more than 25% drift (`--strict` makes drift a failing exit code). In Milestone 1 it is a skeleton: bots have nothing to buy, so the output only proves the pipeline works. Milestones that need later systems print "not built yet".

### Process
- `npm run check` = unit tests + simulator. Run before each commit per CLAUDE.md. CI runs the tests again before every deploy.
- `.claude/` (local preview config) is git-ignored.

## Acting on PLAYTEST.md

### 2026-11-01 8:42 PM, Milestone 1
- **"We don't need the Tap to Gather Ki mechanic. Let the function be just automatic."** Removed tapping entirely: the `gather` function, the tap stat, the tap config and the tap handler. Ki is now purely automatic. The home orb stays as a visual that grows with Ki/s; it is non-interactive for now. (SPEC's Focus Burst, a hold-to-charge bonus, is a separate optional mechanic planned for Milestone 2; I will raise with the owner whether to keep it, since this note suggests they prefer no manual Ki input.) Old saves load fine: the extra `taps` field is simply ignored.
- **"The wait for 1000 Ki to unlock Dojo ... is sharp."** Two changes. (1) Placeholder income raised from 1 to 4 Ki/s, so Dojo arrives at about 4 minutes, in line with the SPEC target of about 5 minutes. (2) The "Unlocks in" list now shows a one-line description under each zone, so the player knows what the Dojo does before reaching it. Real pacing comes with the drill economy in Milestone 2.
- "Proceed as is appropriate": read as general approval of direction, not as confirmation of Milestone 1, so Milestone 2 has not been started.
