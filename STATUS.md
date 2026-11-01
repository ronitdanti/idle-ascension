# Status

Last updated: 2026-11-01, end of the Milestone 3 session. Written as a cold-start handoff.

## Where things stand (read this first)
- **Milestones 1, 2 and 3 are built and tested.** Milestone 3 (Dojo and Archive) is committed locally; see the git log for the exact commit, and the "Deploy" note at the bottom for whether it has been pushed.
- **Milestone 1 and 2: confirmed by the owner.** **Milestone 3: built, awaiting the owner's playtest and explicit confirmation.** Per CLAUDE.md, do not start Milestone 4 until they confirm (a first message like "Confirm M3, start M4" counts).
- **Next milestone: 4, Rebirth** (SPEC sections 6.1 and 17). Brief below.
- **Live URL:** https://ronitdanti.github.io/idle-ascension/ (GitHub Pages, deployed by GitHub Actions on every push to `main`).
- Not yet tested on a real Android phone by Claude. The owner plays it on their phone (Android 16, Chrome 156, portrait) and reports in PLAYTEST.md. This session was checked in the Browser pane at 390 x 844.

## Start-of-session checklist
1. Read, in order: SPEC.md, DESIGN.md, DECISIONS.md, BALANCE.md, PLAYTEST.md, this file. Then `git log --oneline | head`.
2. PLAYTEST.md belongs to the owner. Never edit it. Entries marked `(ACTIONED)` are done. The entries dated 2026-11-01 9:20 PM (Milestone 2) are actioned in DECISIONS.md but the owner has not re-marked them. Treat any entry without a matching DECISIONS.md line as unactioned.
3. Tell the owner briefly where the project stands and what you will do next, before changing anything.
4. Run `npm install` if `node_modules` is missing, then `npm run check` to confirm 145 tests and the simulator pass.

## Owner preferences (learned, not all in SPEC)
- **No tapping, no manual Ki input.** Ki is fully automatic. Focus Burst is dropped from the game. Do not reintroduce active-input mechanics for Ki.
- **No "Rested x2".** Replaced by **Charged Meditation**: time away charges **Ki Flux** (0.25 per second away, 3 h cap), spent on **Speed Up** x2/x3/x5, which burns (N-1) Flux per real second. Reasoning in DECISIONS.md. Knobs live in `src/content/config.ts`.
- Loves: Smart Spend, Multiplier breakdown, the hero scene reacting to Speed Up. Likes unlock time estimates and info buttons on mechanics. Wants mechanics explained in-game.
- Judges by playing, not by reading code. Keep summaries short, plain language. Give the live URL and what to playtest at the end of each milestone.
- Wants design decisions made and logged, not asked about, unless truly the owner's call (see Open questions).
- Pacing feel is judged against how engaging the *other* zones turn out to be, so zone unlock timing is revisited as zones land.
- Asked (Milestone 3 session) that DESIGN.md and STATUS.md stay current and that tech choices are explained in DECISIONS.md. Also: walk them through anything they must do.

## Open questions and deferred decisions
- **Day-scale zone thresholds do not fit the economy (needs the owner's eyes in Milestone 4).** The drill economy reaches 1e9 total Ki at about 48 minutes of active play and 1e12 at about 63 minutes, but SPEC wants Tournament on day 1 to 2 and Spirit Realm on day 3 to 5. Rebirth and Ascension only add multipliers, so they will not fix it. Likely fixes: raise the Tournament, Spirit and Court thresholds, and/or slow the late drill tiers. **In Milestone 4, bring a concrete proposal (numbers plus simulator evidence) and tell the owner.** The simulator flags these as known drift, not failures.
- **Wild Frontier unlock: resolved this session.** Moved from 2e6 to 5e8 total Ki (about 45 minutes of active play), right after the first Rebirth threshold and before Tournament. SPEC's "1 to 2 hours" cannot be met with a Ki threshold without breaking the order of the other zones, see DECISIONS.md. The owner may want it later; it is one number (`frontier` in `src/content/zones.ts`). Owners who already unlocked Frontier keep it.
- **Flux numbers are first guesses.** Ask the owner if Speed Up feels too stingy or too generous.
- **Dojo and Archive numbers are first guesses.** Ask: do disciples feel worth recruiting right away, does Renown feel slow, do techniques arrive fast enough in the first hour, is Auto-Training too strong or too weak?
- **Technique tree is 63 nodes (SPEC says about 80).** The remaining Aura nodes come with the Spirit Realm (M7) and Essence nodes with Rebirth (M4). Add them as data.
- **Rebirth and the Dojo (decide in M4):** SPEC says Rebirth resets "Dojo level and disciple assignments" and keeps Renown (reduced). It does not say whether recruited disciples persist. Suggested: disciples persist (they are people), level and assignments reset. Note it in DECISIONS.md.

## Milestone checklist
- [x] 1. Foundation
- [x] 2. Training Grounds
- [x] 3. Dojo and Archive (built, awaiting owner playtest and confirmation)
- [ ] 4. Rebirth
- [ ] 5. Wild Frontier and Forge
- [ ] 6. Tournament Arc
- [ ] 7. Spirit Realm
- [ ] 8. Ascension
- [ ] 9. Heavenly Court and Transcendence
- [ ] 10. Meta (ranks, achievements, story, stats, settings, accessibility)
- [ ] 11. Polish and balance

## What exists (Milestones 1 to 3)
- **Training Grounds:** 10 drills (`src/content/drills.ts`) with count milestones, 44 upgrades (`src/content/upgrades.ts`), bulk buy (x1, x10, x100, Max, hold to repeat), **Smart Spend** with an (i) info sheet, **Multiplier breakdown** sheet, estimated time to each unlock, procedural hero scene (canvas).
- **Charged Meditation / Speed Up** as above. Speed Up levels can grow by technique (Wider Channel adds x8, Mountain Heartbeat adds x12).
- **Dojo** (tab 2): recruit disciples (Ki, geometric cost, x1/x10/x100/Max), capacity from Dojo level, roles (Sparring Partner, Scribe, Cook live; Scout, Smith, Champion are data with `built: false`), Renown from every assigned disciple, Dojo level (Ki + Renown) and Training Level (Renown). Sparring Partners add +3% all Ki each as their own multiplier category.
- **Scroll Archive** (More, then Scroll Archive): Insight (trickle plus Scribes), **63-node Technique Tree** in five branches (`src/content/techniques.ts`), free 100% respec (and leaf refunds), **12 Discoveries** (scrolls found by lifetime Insight, with lore and one-off rewards, `src/content/discoveries.ts`).
- **Auto-Training** (Mind branch, three levels plus an upgrades toggle), controlled from Home, Overview.
- **Offline progress** (12 h cap, raised by Breath techniques and Cooks up to 7 days, chunked simulation, Welcome-back sheet listing Ki, Insight, Renown, Flux and unlocks).
- **Saves:** autosave every 15 s and on hide/pagehide, rolling backup, IndexedDB mirror, export/import (text and file), versioned (**current `SAVE_VERSION = 4`**) with migrations, an unreadable-save recovery screen that blocks writes, double-confirmed hard reset. Replacing a save always keeps the old raw text under a `kia.save.unreadable.<time>` key.
- **Debug panel** (Settings, Developer toggle): grant Ki, Insight and Renown, jump to next unlock, Flux fill/empty, time-warp x10/100/1000, simulate time away, dump state.
- **PWA:** installable, offline, update banner (prompt mode, so deploys never reload mid-session).
- **Tests:** 145 (Vitest) in `tests/`. **Simulator:** `npm run sim` (active bot, casual bot, Dojo and Archive engagement tables).

## Repo map
```
SPEC.md DESIGN.md DECISIONS.md BALANCE.md STATUS.md PLAYTEST.md CLAUDE.md
src/content/   typed game data. config.ts (engine constants, Auto-Training intervals), zones.ts (unlock thresholds),
               drills.ts, upgrades.ts, dojo.ts (DOJO constants + roles), techniques.ts (63 nodes + branches + cost curve),
               discoveries.ts (12 scrolls). Add content here; do not hardcode it in engine code.
src/core/      PURE, no DOM. bignum.ts (break_infinity.js wrapper), state.ts, engine.ts (systems, step/advance, offline),
               game.ts (fixed-step driver + Speed Up), training.ts (production, buying, milestones, Smart Spend, bestOffer,
               Flux caps), dojo.ts (roster, recruiting, levels, Renown, Insight rate, offline cap), archive.ts (tech purchases,
               respec, discoveries), techniques.ts (folds owned effects into one table, effect text), auto.ts (Auto-Training),
               economy.ts (cost and bulk formulas), format.ts, save.ts (versions, migrations, export strings).
src/app/       browser glue. runtime.ts (boot, rAF loop, autosave, visibility, scroll toasts), storage.ts (localStorage +
               IndexedDB, recovery), ui-store.ts (UI state, toasts, fx bus).
src/ui/        Preact UI. App, screens, train (Drills/Upgrades/Overview + Auto-Training panel), dojo (Dojo tab), archive
               (Archive screen), sheets (all sheets), HeroScene (canvas), components, icons, unlock, theme.css.
sim/           run.ts (bots + report), bot.ts (how a bot spends Ki, Renown, Insight), milestones.ts (SPEC section 14 targets
               and the informational Dojo/Archive events).
tests/         engine, economy, format, save, training, dojo, archive.
scripts/make-icons.mjs   generates PWA icons at build time (output git-ignored).
.github/workflows/deploy.yml   test, build, deploy to Pages on push to main.
```

## How the engine works (what you must not break)
- State is one mutable `GameState` object (`src/core/state.ts`). The UI re-reads it at 10 Hz; there is no reactive layer. (This means a click's result shows on the next tick, up to 100 ms later.)
- `engine.ts` runs a list of `System`s (`SYSTEMS`: ki, dojo/Renown, archive/Insight, auto). **New mechanics add a system; they do not edit the loop.** Every system must be exact for any `dt` because offline and Speed Up run it with large chunks. `tests/engine.test.ts`, `tests/training.test.ts` and `tests/dojo.test.ts` have parity tests (chunked advance versus 10 Hz stepping); extend them for any new system. Decision-making systems (Auto-Training) are held to a looser tolerance.
- Production is `kiPerSec(state)` in `training.ts`: `(innate + sum of drills) x (1 + global upgrades) x (1 + sparring partners) x (1 + technique global)`. Each drill is `base x owned x milestones x (1 + upgrade bonus) x (1 + technique bonus)`. `breakdown(state)` returns the same figure itemized for the Multiplier sheet (`categoriesFor` builds the category list). **New multiplier categories (gear, rivals, forms, ranks, prestige) go in `categoriesFor` and `kiPerSec`**, keeping the rule: additive within a category, multiplicative between categories. Add a test that `breakdown().total` equals `kiPerSec`.
- `effects(state)` in `training.ts` folds bought upgrades; `techEffects(state)` in `core/techniques.ts` folds owned techniques and read scrolls. Same pattern for any new effect source: add a case, add a line to `effectText`.
- Hooks for later milestones: `offlineCapSec` (dojo.ts) and `fluxCapSec` / `fluxChargeRate` (training.ts) already read techniques and Cooks. `ROLES` in `content/dojo.ts` has `built: false` roles waiting for Frontier, Forge and Tournament. `bestOffer` in training.ts is the shared "what should a player buy" ranking.
- **Any save-shape change:** bump `SAVE_VERSION` in `save.ts`, add a migration `MIGRATIONS[oldVersion]`, extend `parseSave` coercion, add a migration test. Never delete or overwrite a player save without an explicit confirmed action.
- Prestige layers only boost numbers; never gate a mechanic behind prestige. Auto-Training is unlocked by a technique purchase, not prestige.

## Milestone 4 brief (when the owner confirms)
SPEC sections 6.1 (Rebirth), 7 (thresholds), 17, and the open questions above.
- **Rebirth:** available at run Ki about 1e8. `SE gained = floor((runKi / 1e8) ^ 0.45)`. **Resets:** Ki, drills, drill upgrades, Dojo level and disciple assignments, Flux-independent run state (`runKi`, `auto.acc`). **Persists:** Insight and the tech tree, Renown (reduced, suggest 50%), unlocked zones, discoveries, achievements (later). **Effect:** +5% Ki per SE (additive) as a new Prestige category in `categoriesFor`, plus the **Essence Shop** (permanent number upgrades only: starting Ki, drill cost reduction, Flux cap or gain, offline cap, Insight gain). Show a live preview ("Rebirth now for +X SE") and what resets, what stays and what you gain, with a confirm. Never gate a mechanic behind it.
- **Essence nodes in the Legacy branch** of the tech tree (data only) are the planned home for prestige-number techniques.
- Add a Rebirth panel (More, or a tab dot when it is worth doing), a recommended-timing hint, and a `rebirths` stat. Save version becomes 5.
- **Simulator:** extend the bots to rebirth at a sensible moment, check first-Rebirth timing (target about 45 min; the 1e8 threshold currently lands at 42 min), and **bring the proposal for the day-scale thresholds** (see Open questions) with evidence.
- Add tests: SE formula, what resets and what persists, preview equals result, soft-lock check after a Rebirth, save v5 migration.

## Before every commit (CLAUDE.md)
1. `npm run check` (tests plus simulator), and `npx tsc --noEmit`.
2. Compare the simulator against SPEC section 14; record changes in BALANCE.md.
3. Log choices and reasons in DECISIONS.md. Log what you changed for each PLAYTEST.md entry, citing its date.
4. Update this file and DESIGN.md. Small, descriptive commits. End commit messages with the `Co-Authored-By` line given by the environment.
5. When a milestone is finished: push, confirm the deploy, give the owner the URL and a short list of what to playtest, then wait.

## Practical notes and gotchas
- **Pushing:** the Bash tool has no GitHub credentials (and `gh` is not installed). Pushing works by running `git push origin main` in the **user's Terminal panel** (`mcp__terminal__run_in_terminal`, then `read_terminal`). It uses the owner's stored login. Pushing a docs-only change also triggers a deploy.
- **Deploy check:** open https://github.com/ronitdanti/idle-ascension/actions (the page text shows run status; logs need a sign-in). A deploy takes about a minute. GitHub Pages source is already set to "GitHub Actions".
- **Stale cache when verifying live:** the service worker serves the previous build and shows a "new version is ready" banner. Click Reload (or the banner button) before judging the live site. The owner's phone does the same: they should tap Reload on the banner after a deploy.
- **Local preview:** `.claude/launch.json` is git-ignored and may be missing. Recreate it: one configuration named `dev` running `npm run dev -- --port 5173 --strictPort` on port 5173, then open `http://localhost:5173/idle-ascension/` (note the base path). Use the Browser pane at 390 x 844 and reset the viewport to desktop afterwards. A Vite hot reload resets the page to the last planted save.
- **Testing saves in the browser:** the running page rewrites `localStorage` on `pagehide`, so to plant a test save, set it and stub `Storage.prototype.setItem` to a no-op before reloading. The browser pane's `localStorage` is a scratch profile, not the owner's save. A minimal v4 save needs `v:4`, the Ki fields as strings, `unlocked`, `dojo`, `techniques`, `auto`, and the rest can be left out (they default).
- **Shell quirks:** long heredocs with apostrophes or backticks fail in the Bash tool (this session lost a whole docs edit to it). For big doc or script edits, use the Edit or Write tools, or write a script to the scratchpad directory and run it. Short `python - <<'EOF'` edits worked fine. Python's `"\n"` inside a bash heredoc becomes a real newline; double-check string escapes in generated TypeScript. `structuredClone` does not preserve `Decimal`; clone test states through `parseSave(serialize(s))`.
- **Build details:** `npm run build` runs the icon generator, `tsc --noEmit`, then `vite build`. The Pages base path is `/idle-ascension/`. JS bundle is about 43 KB gzipped. Dependency versions are pinned by `package-lock.json` (Vite 8, TypeScript 7, Vitest 5, Preact 11, vite-plugin-pwa 2).
- **Balance knobs:** drill `baseProd` (all early pacing), upgrade ladder costs (`LADDER` in `upgrades.ts`), `DOJO` and `techCost()` (Dojo and Archive pacing), `CONFIG` in `config.ts`. The simulator's bot picks purchases by (time to afford plus payback); pure payback ordering makes bots stall and gives misleading results.
- **Small known cosmetic issue:** on a 390 px screen the Smart Spend (i) button wraps below the buy-amount row on the Drills tab. It still works; fix if the owner mentions it.

## Known bugs
- None known. Not yet verified on a real phone by Claude.

## What to playtest (Milestone 3)
1. Reach 1,000 Ki, open **Dojo**, recruit, assign Sparring Partners and watch Ki/s rise (the Multiplier breakdown shows a "Sparring Partners" line).
2. At 50,000 Ki the **Scroll Archive** opens under **More**. Assign a Scribe, learn a few techniques, try **Respec** (always free).
3. Learn Routine Training in the **Mind** branch, then turn on **Auto-Training** in Home, Overview. Try the modes.
4. Leave the game for a while: the Welcome-back sheet now also shows Insight and Renown.
5. Tell me: do disciples feel worth it, is Insight too slow or fast, do techniques feel meaningful, is Auto-Training too strong?

## Next recommended step
Wait for the owner's playtest notes and explicit confirmation of Milestone 3, then follow the Milestone 4 brief. Open with the status summary, action any new PLAYTEST.md entries first, and finish with deploy, URL and a short playtest list.
