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

### 2026-11-01 8:51 PM, Milestone 1
Notes: Rested x2 is equivalent to offline time and will spiral; drop Focus Burst and tapping; replace Rested with "Charged Meditation" where offline time provides Ki Flux, which pays for a Speed Up.

**Dropped (deviations from SPEC.md, by owner request):**
- **Focus Burst** (SPEC 5.1) and everything tied to it. SPEC items that mentioned it are re-pointed so future milestones do not build it:
  - Gravity Chamber's "also boost Focus Burst" milestone effect becomes a Ki Flux effect (flux gain).
  - Breath branch "offline cap, Rested bonus, Focus Burst" becomes offline cap, Flux gain, Flux cap, Speed Up options.
  - Essence Shop "Focus Burst size" becomes Flux cap or Flux gain.
  - Gear stat "Focus Burst size" becomes Flux gain.
- **Tapping / active Ki input.** No mechanic needs manual input to progress.
- **Rested x2 Ki** (SPEC section 9). Replaced as below. Cooks ("expands Rested bonus and offline cap") now expand Flux cap and offline cap.

**Why Rested spiraled:** it paid a second reward for the same absence. Offline time already pays Ki 1:1 and Rested then doubled active play for as long as you were away, so leaving the game was strictly better than playing it. Active play also could not be faster than "x2 for a while".

**Charged Meditation (replacement), as built:**
- **Ki Flux** is a bank of *bonus game-seconds*. Each second away charges **0.25** Flux, up to a **3 h** cap. A full 12 h absence (the offline cap) therefore exactly fills the bank.
- **Speed Up** has levels **x2, x3, x5**, chosen on the Home screen. At xN each real second runs N game-seconds and burns **(N - 1)** Flux. So Flux is always exactly the number of extra game-seconds you can buy; the level only chooses how fast you spend it. Higher levels do not cost extra per game-second; they just compress time.
- Speed Up switches itself off when Flux runs out (a toast says so) and always starts at x1 in a new session, so it can never burn Flux unseen.
- It speeds up the whole simulation (production now; expeditions, ticket accrual and other timers as they arrive), because it is a game-speed boost. Anything with a hard cap (tickets) is already protected by that cap.
- Flux does not charge while playing and does not boost the offline pass itself, so there is no double payment for one absence.

**Why this does not spiral:** away time A pays A game-seconds of Ki through offline progress, plus 0.25 A of Flux. Spending all of it adds at most 0.25 A more game-seconds. So the bonus is bounded at +25% of what you were already paid for being away, rather than the old "double your active time for as long as you were away". Playing never makes you worse off than idling, and idling does not outrun playing. The Flux cap also means a very long absence cannot be banked beyond 3 h of Speed Up.
- **Tuning knobs** (all in `CONFIG`): `fluxPerAwaySec` 0.25, `fluxCapSec` 3 h, `speedLevels` [2, 3, 5]. Later techniques and Cooks raise the cap and the charge rate, which is how this feature grows over the 8 week arc.
- **Debug time-warp is separate** from Speed Up and costs no Flux.

**Save change:** save version 2. Migration 1 to 2 converts old Rested seconds to Flux at the new charge rate (4000 Rested seconds becomes 1000 Flux), capped at the Flux cap, and drops the old field. Tested in unit tests and against a real v1 save in the browser.

## Milestone 2: Training Grounds

Owner confirmed Milestone 1 ("Confirm, start M2"). No new PLAYTEST.md entries at the time, so nothing to action there.

### Economy
- **10 drills** from `src/content/drills.ts`: first cost 10, each tier costs about 12x the last, per-unit cost growth rises 1.15 to 1.30. **Production ratio deviates from SPEC's "about 9x":** it runs 9x to 12.5x between early tiers (see BALANCE.md). The simulator showed that a flat 9x made the first 20 minutes too fast relative to the rest of the first hour; weaker early tiers fixed Dojo and Archive timing without slowing the hour mark.
- **Innate Ki**: every player has 1 Ki/s with no drills. It means the game can never soft-lock (tested), and the first drill (10 Ki, which you start with) is a free first step.
- **Count milestones** (SPEC section 4): x2 at 10, 25, 50, 100, then doubling (200, 400, ...), with every 4th x3. Per drill, shown on each row as a progress bar to the next one.
- **Multiplier stack**: additive within a category, multiplicative between categories. Today the categories are the per-drill milestone product, the per-drill additive upgrade bonus, and the global-Ki additive bonus. Later layers (Technique, Gear, Rival, Form, Rank, Prestige) slot in as extra lines of `breakdown()` and appear automatically on the Multiplier breakdown sheet.
- **44 upgrades** in `src/content/upgrades.ts` (SPEC said about 40): 30 from a three-rung ladder per drill (+100%, +200%, +400% additive to that drill, revealed at 3, 15 and 60 owned, priced as 5x, 200x and 500,000x the drill's first cost), plus 14 hand-written ones (innate Ki, global bonuses, every-drill bonuses, two cross-drill bonuses, two cost reductions capped at 75% total, and two Ki Flux upgrades). Upgrades are revealed gradually, one-time, priced in Ki.
- **Focus Burst is gone** (owner request), so its drill hooks became Ki Flux hooks: Gravity Chamber milestones add 3% to the Flux charge rate each, Time Dilation Room milestones add 5 minutes of Flux cap each. They are data on the drill (`milestoneEffect`).
- **Smart Spend** (SPEC section 9) is built now because the simulator needs the same "best value" logic: it repeatedly buys the affordable purchase with the shortest payback (extra Ki/s per cost). Flux upgrades are left for the player to choose since they do not raise Ki/s. Cost reductions are valued as extra income.
- **Bulk buy**: x1, x10, x100, Max, all via the closed-form geometric series. A numeric amount buys exactly that many or nothing (the button is disabled if you cannot afford it); Max buys as many as affordable. Holding a buy button repeats the purchase.
- **Auto-Training** stays in Milestone 3 (technique tree), as SPEC section 7 says.

### Save version 3
Adds `drills` and `upgrades` and the buy-amount setting. Migration 2 to 3 starts them empty, keeping Ki, Flux and unlocks. Junk counts are dropped on load; unknown ids are kept so removing a content item later cannot corrupt a save.

### UI
- Home is now a hero scene, two stat chips, and three sub-tabs: **Drills**, **Upgrades** (green dot when something is affordable) and **Overview** (Charged Meditation, Multiplier breakdown button, Unlocks in). The tab bar's Home icon also gets a dot while another tab is open.
- **Hero scene** replaces the Ki orb: dusk sky, three drifting ridges, a silhouette hero with a headband, an aura that grows with Ki/s and turns electric under Speed Up, speed lines while sped up, embers, and a particle burst whenever a purchase crosses a count milestone. Reduce Motion freezes the scenery and stops all particles.
- Milestone crossings also toast ("Shadow Boxing x2!") and vibrate if haptics are on.

### Simulator (SPEC section 16)
- Two bots over the pure core: **active** (continuous, picks the purchase with the lowest time-to-afford plus payback, which avoids the stall that pure payback ordering causes) and **casual** (SPEC's schedule: four 5-minute check-ins and one 20-minute session, offline in between, all Ki Flux spent on x3 Speed Up). Active measures first-hour milestones in play-minutes; casual measures day-scale ones in wall-clock time.
- **Known SPEC conflict:** Wild Frontier unlocks at 2e6 total Ki and Rebirth is available at 1e8 run Ki around 45 minutes, so Frontier must come well before 45 minutes, yet section 14 says 1 to 2 hours. The simulator marks it as a known conflict rather than a failure. Open question for the owner in STATUS.md.
- **Day-scale milestones cannot be tuned yet.** Tournament and Spirit arrive within a day and Heavenly Court never arrives within 8 weeks with drills alone, because there are no prestige multipliers until Milestones 4 and 8. They are annotated and not counted as failures.

### Tests
88 unit tests (new: milestones, production stack, bulk buy parity, Max, cost reductions, upgrade reveal, Flux effects, Smart Spend, offline parity with drills, content validation, save v3 and v2 to v3 migration, and a soft-lock check over 200 random states).
