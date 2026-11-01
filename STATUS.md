# Status

Last updated: 2026-11-01, end of the Milestone 2 session. Written as a cold-start handoff.

## Where things stand (read this first)
- **Milestones 1 and 2 are built, tested, committed, pushed and deployed.** Last commit: `1f6c236` "Add unlock time estimates and Smart Spend info sheet". Working tree is clean.
- **Milestone 1 (Foundation): confirmed by the owner.**
- **Milestone 2 (Training Grounds): built and playtested once by the owner** (positive: balance, drills and upgrades, Smart Spend, Multiplier breakdown, hero animation). Their follow-up requests (unlock time estimates, Smart Spend info button) are done. **The owner has NOT yet said "confirm Milestone 2".** Per CLAUDE.md, do not start Milestone 3 until they do. If their first message in the new session confirms it (for example "Confirm, start M3"), that counts.
- **Next milestone: 3, Dojo and Archive** (SPEC section 17): disciples and roles, Renown, the technique tree with free respec, Auto-Training.
- **Live URL:** https://ronitdanti.github.io/idle-ascension/ (GitHub Pages, deployed by GitHub Actions on every push to `main`).
- Not yet tested on a real Android phone by Claude. The owner plays it on their phone (Android 16, Chrome 156, portrait) and reports in PLAYTEST.md.

## Start-of-session checklist
1. Read, in order: SPEC.md, DESIGN.md, DECISIONS.md, BALANCE.md, PLAYTEST.md, this file. Then `git log --oneline | head`.
2. PLAYTEST.md belongs to the owner. Never edit it. Entries marked `(ACTIONED)` are done. The newest entry (2026-11-01 9:20 PM, Milestone 2) is actioned in DECISIONS.md but the owner has not re-marked it. Treat any entry without a matching DECISIONS.md line as unactioned.
3. Tell the owner briefly where the project stands and what you will do next, before changing anything.
4. Run `npm install` if `node_modules` is missing, then `npm run check` to confirm 92 tests and the simulator pass.

## Owner preferences (learned, not all in SPEC)
- **No tapping, no manual Ki input.** Ki is fully automatic. Focus Burst is dropped from the game. Do not reintroduce active-input mechanics for Ki.
- **No "Rested x2".** Replaced by **Charged Meditation**: time away charges **Ki Flux** (0.25 per second away, 3 h cap), spent on **Speed Up** x2/x3/x5, which burns (N-1) Flux per real second. Reasoning in DECISIONS.md. Knobs live in `src/content/config.ts`.
- Loves: Smart Spend, Multiplier breakdown, the hero scene reacting to Speed Up. Likes unlock time estimates and info buttons on mechanics. Wants mechanics explained in-game.
- Judges by playing, not by reading code. Keep summaries short, plain language. Give the live URL and what to playtest at the end of each milestone.
- Wants design decisions made and logged, not asked about, unless truly the owner's call (see Open questions).
- Pacing feel is judged against how engaging the *other* zones turn out to be, so zone unlock timing will be revisited as zones land.

## Open questions and deferred decisions
- **Wild Frontier unlock timing (deferred by the owner to Milestone 3).** It unlocks at 2e6 total Ki, about 35 minutes of active play, but SPEC section 14 says 1 to 2 hours. SPEC conflicts with itself here (Rebirth is due at 1e8 run Ki around 45 minutes, which is after 2e6). The owner said: depending on how long the Dojo keeps them engaged, scale Frontier's unlock accordingly. **In Milestone 3, once the Dojo and Archive are playable, measure how long they keep a player busy (use the simulator) and propose or set a Frontier threshold, log it in DECISIONS.md, and tell the owner.** The threshold is `unlock.at` for the `frontier` zone in `src/content/zones.ts`.
- **Day-scale pacing (Tournament, Spirit Realm, Heavenly Court) is untunable until Rebirth (M4) and Ascension (M8)** add multipliers. With drills alone the casual bot gets Tournament at about 12 h and Spirit at about 17 h, and never reaches Heavenly Court. These are flagged as known in the simulator, not failures.
- **Flux numbers are first guesses.** Ask the owner if Speed Up feels too stingy or too generous.

## Milestone checklist
- [x] 1. Foundation
- [x] 2. Training Grounds (built, owner feedback actioned, awaiting explicit confirmation)
- [ ] 3. Dojo and Archive
- [ ] 4. Rebirth
- [ ] 5. Wild Frontier and Forge
- [ ] 6. Tournament Arc
- [ ] 7. Spirit Realm
- [ ] 8. Ascension
- [ ] 9. Heavenly Court and Transcendence
- [ ] 10. Meta (ranks, achievements, story, stats, settings, accessibility)
- [ ] 11. Polish and balance

## What exists (Milestones 1 and 2)
- **Training Grounds:** 10 drills (`src/content/drills.ts`) with count milestones (x2 at 10, 25, 50, 100, then doubling; every 4th is x3), 44 upgrades (`src/content/upgrades.ts`) revealed gradually, bulk buy (x1, x10, x100, Max, hold to repeat), **Smart Spend** with an (i) info sheet, **Multiplier breakdown** sheet, estimated time to each unlock, procedural hero scene (canvas).
- **Charged Meditation / Speed Up** as above. Gravity Chamber milestones raise the Flux charge rate; Time Dilation Room milestones raise the Flux cap; two upgrades also do. All are data (`milestoneEffect` on drills, `fluxCap` / `fluxGain` upgrade effects).
- **Offline progress** (12 h cap, chunked simulation, Welcome-back sheet that also lists unlocks gained while away).
- **Saves:** autosave every 15 s and on hide/pagehide, rolling backup, IndexedDB mirror, export/import (text and file), versioned (**current `SAVE_VERSION = 3`**) with migrations, an unreadable-save recovery screen that blocks writes, double-confirmed hard reset. Replacing a save always keeps the old raw text under a `kia.save.unreadable.<time>` key.
- **Debug panel** (Settings, Developer toggle): grant Ki, jump to next unlock, Flux fill/empty, time-warp x10/100/1000, simulate time away, dump state.
- **PWA:** installable, offline, update banner (prompt mode, so deploys never reload mid-session).
- **Tests:** 92 (Vitest) in `tests/`. **Simulator:** `npm run sim` (active bot, casual bot).

## Repo map
```
SPEC.md DESIGN.md DECISIONS.md BALANCE.md STATUS.md PLAYTEST.md CLAUDE.md
src/content/   typed game data. config.ts (engine constants), zones.ts (unlock thresholds),
               drills.ts, upgrades.ts. Add content here; do not hardcode it in engine code.
src/core/      PURE, no DOM. bignum.ts (break_infinity.js wrapper), state.ts, engine.ts (systems,
               step/advance, offline), game.ts (fixed-step driver + Speed Up), training.ts
               (production, buying, milestones, Smart Spend, Flux caps), economy.ts (cost and
               bulk formulas), format.ts, save.ts (versions, migrations, export strings).
src/app/       browser glue. runtime.ts (boot, rAF loop, autosave, visibility), storage.ts
               (localStorage + IndexedDB, recovery), ui-store.ts (UI state, toasts, fx bus).
src/ui/        Preact UI. App, screens, train (Drills/Upgrades/Overview), sheets (all sheets),
               HeroScene (canvas), components, icons, unlock, theme.css.
sim/           run.ts (bots + report), milestones.ts (SPEC section 14 targets and predicates).
tests/         engine, economy, format, save, training.
scripts/make-icons.mjs   generates PWA icons at build time (output git-ignored).
.github/workflows/deploy.yml   test, build, deploy to Pages on push to main.
```

## How the engine works (what you must not break)
- State is one mutable `GameState` object (`src/core/state.ts`). The UI re-reads it at 10 Hz; there is no reactive layer.
- `engine.ts` runs a list of `System`s (`SYSTEMS`). **New mechanics add a system; they do not edit the loop.** Every system must be exact for any `dt` because offline and Speed Up run it with large chunks. `tests/engine.test.ts` and `tests/training.test.ts` have parity tests (chunked advance versus 10 Hz stepping); extend them for any new system.
- Production is `kiPerSec(state)` in `training.ts`: `(innate + sum of drills) x (1 + global bonus)`. `breakdown(state)` returns the same figure itemized for the Multiplier sheet. **New multiplier categories (techniques, gear, rivals, forms, ranks, prestige) go in `breakdown().categories` and `kiPerSec`**, keeping the rule: additive within a category, multiplicative between categories. Add a test that `breakdown().total` equals `kiPerSec`.
- `effects(state)` in `training.ts` folds bought upgrades into one table. Techniques should follow the same pattern (or extend it).
- Stub hooks already waiting for Milestone 3: `offlineCapSec(_s)` in `state.ts` (returns the constant; Breath techniques and Cooks should raise it), `fluxCapSec` and `fluxChargeRate` in `training.ts` (Breath techniques and Cooks should raise these), `settings`/`flags`/`unlocked` in state.
- **Any save-shape change:** bump `SAVE_VERSION` in `save.ts`, add a migration `MIGRATIONS[oldVersion]`, extend `parseSave` coercion, add a migration test. Never delete or overwrite a player save without an explicit confirmed action.
- Prestige layers only boost numbers; never gate a mechanic behind prestige. Auto-Training (a Mind-branch technique) must unlock by technique purchase, not prestige.

## Milestone 3 brief (when the owner confirms)
SPEC sections 5.2 (Dojo), 5.3 (Scroll Archive), 7 (thresholds), 6.1 (what persists through Rebirth, for later) and 17.
- **Dojo** (unlocks at 1e3 total Ki, already wired in `zones.ts`; the Dojo tab currently shows a placeholder `ZoneScreen`): recruit disciples with Ki (cost scales), capacity limited by Dojo level (Ki and Renown), roles, shared Training Level raised with Renown, Renown accrual. Only **Sparring Partner** (passive Ki per disciple, multiplied by drill counts) and **Scribe** (Insight) matter in M3; Scout, Smith, Cook, Champion unlock with their zones (the roles can exist as data, locked). Cooks should expand the Flux cap and offline cap (not the removed Rested bonus).
- **Scroll Archive** (unlocks at 5e4; lives under More today): Insight (slow trickle plus Scribes), the **Technique Tree** of about 80 nodes in five branches (Body, Breath, Spirit, Mind, Legacy) with prerequisites and cross-zone effects, **free respec with 100% refund**, Archive Discoveries (lore snippets).
- **Auto-Training** in the Mind branch: buys drills on a schedule with configurable priority. Never prestige-gated.
- **Breath branch wording changed by owner decisions:** offline cap, Ki Flux charge and cap, Speed Up options (no Focus Burst, no Rested).
- Content goes in new typed data files under `src/content/` (roles, techniques, discoveries). Add UI for the Dojo tab and an Archive screen (More list entry is a placeholder row today). Follow DESIGN.md; extend it for new screens.
- Update `sim/run.ts` and `sim/milestones.ts`: bots need to recruit, assign roles, and spend Insight; re-check Dojo, Archive and Rebirth threshold timing (currently 5m 8s, 20m 17s, 48m 41s, all within 10%); then resolve the Wild Frontier question above. Soft-lock checks must still pass.
- Save version will become 4.

## Before every commit (CLAUDE.md)
1. `npm run check` (tests plus simulator), and `npx tsc --noEmit`.
2. Compare the simulator against SPEC section 14; record changes in BALANCE.md.
3. Log choices and reasons in DECISIONS.md. Log what you changed for each PLAYTEST.md entry, citing its date.
4. Update this file. Small, descriptive commits. End commit messages with the `Co-Authored-By` line given by the environment.
5. When a milestone is finished: push, confirm the deploy, give the owner the URL and a short list of what to playtest, then wait.

## Practical notes and gotchas
- **Pushing:** the Bash tool has no GitHub credentials (and `gh` is not installed). Pushing works by running `git push origin main` in the **user's Terminal panel** (`mcp__terminal__run_in_terminal`, then `read_terminal`). It uses the owner's stored login. Pushing a docs-only change also triggers a deploy.
- **Deploy check:** open https://github.com/ronitdanti/idle-ascension/actions (the page text shows run status; logs need a sign-in). A deploy takes about a minute. GitHub Pages source is already set to "GitHub Actions". The very first run failed only because Pages was not yet enabled.
- **Stale cache when verifying live:** the service worker serves the previous build and shows a "new version is ready" banner. Click Reload (or the banner button) before judging the live site.
- **Local preview:** `.claude/launch.json` is git-ignored and may be missing. Recreate it: one configuration named `dev` running `npm run dev -- --port 5173 --strictPort` on port 5173, then open `http://localhost:5173/idle-ascension/` (note the base path). Use the Browser pane at 390 x 844 and reset the viewport to desktop afterwards.
- **Testing saves in the browser:** the running page rewrites `localStorage` on `pagehide`, so to plant a test save, set it and stub `Storage.prototype.setItem` to a no-op before reloading. The browser pane's `localStorage` is a scratch profile, not the owner's save.
- **Shell quirks:** very long heredocs with embedded Python and apostrophes have failed in the Bash tool. For big doc or script edits, write the script with the Write tool into the scratchpad directory and run it. Windows-native Python cannot see `/tmp`; use project or scratchpad paths. CRLF warnings from git are harmless (`.gitattributes` normalizes).
- **Build details:** `npm run build` runs the icon generator, `tsc --noEmit`, then `vite build`. The Pages base path is `/idle-ascension/`. Bundle is about 31 KB gzipped. Dependency versions are pinned by `package-lock.json` (Vite 8, TypeScript 7, Vitest 5, Preact 11, vite-plugin-pwa 2).
- **Balance knobs:** drill `baseProd` (all early pacing), upgrade ladder costs (`LADDER` in `upgrades.ts`), `CONFIG` in `config.ts`. The simulator's bot picks purchases by (time to afford plus payback); pure payback ordering makes bots stall and gives misleading results.

## Known bugs
- None known. Not yet verified on a real phone by Claude.

## Next recommended step
Wait for the owner's explicit confirmation of Milestone 2 (or their next PLAYTEST.md entry), then follow the Milestone 3 brief above. Open with the status summary, then build Dojo first (it feeds the Archive), commit in small steps, and finish with deploy, URL, and a short playtest list.
