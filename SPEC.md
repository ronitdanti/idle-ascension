# Ki Ascension: Game Design Spec

*A shonen-themed incremental idle game for Android Chrome (installable PWA). Working title; rename freely.*

## 0. How to use this document

This is the complete design brief for Claude Code. Save it as `SPEC.md` in an empty repository. Everything here is a starting point: **numbers are first-pass and must be tuned using the simulator in section 16**. Where a decision is not specified, choose the option that is simplest, most data-driven, and easiest to rebalance, and note it in `DECISIONS.md`.

The owner cannot supply any art, audio, or assets. **Every visual and sound must be generated in code.** The owner will judge the game by playing it, so build in playable milestones (section 17) and keep the game running at every commit.

## 1. Vision and pillars

1. **Resource-first economy.** One main resource, **Ki**. Every zone has its own currency and its own mode of growth, and every zone ultimately funnels back into Ki (as a multiplier, a new Ki source, or a cap raise). Ki also pays to unlock and upgrade zones, so the loop closes.
2. **Prestige boosts numbers; it never gates mechanics.** Zones, systems, and automation unlock from *lifetime progress thresholds*, not from prestige count. Prestige exists to make the numbers big enough to hit the next threshold. A player who somehow reached a threshold without prestiging would get the system.
3. **Many parallel systems that interact.** At any time the player should have 4 to 6 things worth looking at, each progressing on a different timescale (seconds, minutes, hours).
4. **Absence is never punished.** No decay, no streaks, no failure states, no timers that expire. Being away accrues resources, stored charges, and a "Rested" bonus that rewards returning.
5. **Short check-ins and long sessions both work.** A 60-second check-in (collect, spend, send expeditions, leave) is always satisfying. A 30-minute session offers optimization, puzzles, and fights that give bonus yield but are never required.
6. **Deep for weeks.** Target 8+ weeks of casual play to reach the first Transcendence, with new zones, systems, and reveals arriving steadily so there is always something new within a day or two.

## 2. Platform and tech stack

- **Target:** Chrome on Android, portrait, 360 to 430 px wide. Must also work on desktop Chrome for development.
- **Delivery:** static PWA (installable via "Add to Home screen"), fully offline-capable via a service worker. No backend, no accounts, no analytics, no network calls at runtime.
- **Stack (recommended):** TypeScript, Vite, a lightweight UI layer (Preact or vanilla DOM with a small reactive store), CSS for layout, Canvas 2D for effects. Avoid heavy frameworks and large dependencies. Use `break_infinity.js` (or equivalent) for big numbers, since values will exceed 1e308.
- **Hosting:** GitHub Pages (or any static host). The owner opens the URL in Chrome and installs it.
- **Performance:** 60 fps UI on a mid-range phone. UI renders at most 10 times per second for number text; effects run on their own requestAnimationFrame loop and pause when the tab is hidden.
- **Safe areas and input:** touch targets at least 44 px, no hover-only interactions, bottom tab navigation reachable by thumb, long-press and tap-hold for repeat purchases, `touch-action` set to avoid double-tap zoom.

## 3. Architecture requirements

- **Data-driven content.** Every drill, disciple role, technique, region, gear piece, rival, achievement, and rank is defined in typed data files (`content/*.ts`). Systems read from data; adding content must not require touching engine code.
- **Fixed-step simulation.** Game logic ticks at 10 Hz using accumulated delta time. The render loop is separate.
- **Pure core.** The simulation core (state, tick, purchase, prestige, offline) has no DOM access and runs in Node, so the headless simulator and unit tests can import it.
- **Offline simulation.** On load, compute elapsed time (clamped to the offline cap) and advance the simulation in chunks (for example, chunk length grows with elapsed time) rather than looping 10 Hz for hours. Production is deterministic; autobuyers, expeditions, and charge accrual must be simulated in the same pass. Show a "Welcome back" summary of everything gained.
- **Saving.** Autosave every 15 seconds and on `visibilitychange`/`pagehide`. Save to `localStorage` with a rolling backup copy (and mirror to IndexedDB if easy). Versioned schema with explicit migrations. Provide **export/import** of the save as a copy-paste string and as a downloadable file, since losing weeks of progress is the worst outcome.
- **Clock safety.** Never subtract resources on a backwards clock change; clamp negative elapsed time to zero.
- **Debug panel** (hidden behind a settings toggle): grant resources, set time-warp (x10, x100, x1000), jump thresholds, dump state. Essential for testing.

## 4. Core economy rules

All generators in every zone follow the same pattern unless noted:

- `cost(n) = baseCost * growth^n` where `n` is the number owned (growth between 1.12 and 1.35, higher for later tiers).
- `production = owned * baseProd * multipliers`.
- **Bulk buy:** x1, x10, x100, Max. Compute bulk cost with the geometric-series formula, never by looping.
- **Count milestones:** at 10, 25, 50, 100, 200, 400, 800... owned of a generator, that generator gets x2 production (with every fourth milestone x3). Show the next milestone on the row.
- **Multiplier categories** are multiplicative with each other and additive within a category. Keep a clear stack: Drill-local, Global-Ki, Technique, Gear, Rival bonuses, Form, Rank, Prestige (Essence, Marks, Seals). Show a "Multiplier breakdown" sheet for transparency; players of this genre love seeing the stack.
- **Number notation:** default scientific-short (1.23e45) with options for engineering and standard suffixes (K, M, B, T... then aa, ab). Setting in options.

## 5. Zones

Total Ki ever produced (lifetime, persists through all resets) drives unlocks. See the threshold table in section 7.

### 5.1 Training Grounds (start)

The home zone. Resource: **Ki**.

- **Focus Burst (active):** tap-and-hold to charge a gauge, release for a burst worth N seconds of current Ki/s (N grows with techniques and gear). Gauge also refills passively while the screen is open. Never required.
- **Drills (generators), 10 tiers**, each produces Ki: Shadow Boxing, Weighted Training, Waterfall Meditation, Breath Control, Mountain Sparring, Meridian Opening, Gravity Chamber, Time Dilation Room, Spirit Refinement, Reality Strain. First cost 10 Ki; each tier costs about 12x the last and produces about 9x the last, with growth rising from 1.15 to 1.30. Later drills gain special effects at milestones (for example, Gravity Chamber milestones also boost Focus Burst).
- **Training upgrades:** one-time Ki purchases (about 40 total) that multiply specific drills or add flat effects. They appear gradually as relevant counts are reached.
- **Auto-Training:** an unlockable automation (via the technique tree, never via prestige) that buys drills on a schedule with configurable priority.

### 5.2 Dojo (unlocks at 1e3 total Ki)

Resource: **Disciples** (population) and **Renown** (soft currency).

- Recruit disciples with Ki (cost scales per disciple). Capacity is limited by **Dojo level** (upgraded with Ki and Renown).
- Assign disciples to roles; each role feeds a different zone. Roles unlock as their zone does: **Sparring Partner** (passive Ki per disciple, multiplied by drill counts), **Scribe** (Insight), **Scout** (expedition speed and capacity), **Smith** (forge speed), **Cook** (expands Rested bonus and offline cap), **Champion** (Glory; unlocked with Tournament).
- Disciples have a shared **Training Level** raised with Renown. Renown accrues passively in proportion to assigned disciples and from tournament placements.
- **Funnel:** sparring partners add Ki; every other role multiplies other zones, whose outputs multiply Ki.

### 5.3 Scroll Archive (unlocks at 5e4 total Ki)

Resource: **Insight** (slow trickle).

- Insight comes from a base trickle plus Scribes. It is spent on the **Technique Tree**, about 80 nodes in five branches: **Body** (drill multipliers), **Breath** (offline cap, Rested bonus, Focus Burst), **Spirit** (Aura, Spirit Realm effects), **Mind** (automation and QoL, such as auto-training, auto-expeditions, bulk-buy options), **Legacy** (prestige-number boosts).
- Nodes have prerequisites and **cross-zone effects** (for example, "Forge-tempered Fists: each Gear tier adds +2% to Weighted Training").
- **Free respec, always.** Refunds are 100% so the player can experiment without penalty.
- **Archive Discoveries:** reading rare scrolls (random Insight finds, expedition relics) reveals lore snippets and one-off bonuses, giving a discovery loop.

### 5.4 Wild Frontier (unlocks at 2e6 total Ki)

Resource: **Spoils**, four types: **Hide, Ore, Herbs, Relics**.

- Six regions, unlocked in sequence as the player's disciple power and total Ki grow: Bamboo Forest, Crimson Canyon, Frozen Peak, Sunken Temple, Sky Archipelago, Void Rift. Later regions yield rarer Spoils and bigger Ki rewards.
- **Expeditions:** choose a region and a party (disciples assigned). Durations range from 1 minute to 8 hours. Party power versus region difficulty sets the **outcome tier** (Bronze, Silver, Gold), which affects bonus yield. **Expeditions never fail or lose anything.** A weak party simply gets Bronze.
- Multiple **expedition slots** (start with 1, unlock more with Ki and techniques). A **queue** lets the player stack expeditions that run back-to-back while away.
- Offline: expeditions complete, results wait to be collected, no expiry.
- **Funnel:** Spoils feed the Forge; every expedition also grants a Ki lump scaled to current Ki/s; Relics feed the Spirit Realm and Archive.

### 5.5 Forge (unlocks when the first Spoils is collected)

Resource: **Gear**.

- Six equipment slots: Headband, Gi, Gauntlets, Belt, Footwear, Talisman. Gear rarity: Common, Uncommon, Rare, Epic, Legendary, Mythic.
- **Forging:** spend Spoils to craft a piece for a slot. Outcomes are weighted by Smith count and tools, with **pity counters** (a guaranteed upgrade after N forges) so there is no bad luck streak.
- **Tempering:** spend Ore to raise a piece's level; each level boosts its stats.
- **Stats:** Ki multiplier, expedition yield, disciple capacity, Focus Burst size, tournament power, Aura gain. Each piece has one main stat and up to three substats that unlock at higher rarity.
- **Sets:** themed sets (for example, Stormcaller, Ashen Monk, Frostbound) with 2-piece, 4-piece, and 6-piece bonuses that change play style.
- **Loadouts:** saved presets so swapping builds before a tournament or expedition is one tap.
- **Funnel:** large Ki multipliers; later gear boosts every other zone.

### 5.6 Tournament Arc (unlocks at 1e9 total Ki)

Resource: **Glory**.

- **Fight Tickets** accrue 1 per 30 minutes, stored up to a cap of 12 (accrual simply pauses at the cap; nothing is lost beyond that).
- A **Bracket** is a ladder of rivals (about 40 rivals across 8 ranked tiers). Fights **auto-resolve** from player power versus rival power. Optionally the player can enter an active **Clash**: a short timing-tap sequence (about 10 seconds) that raises the result tier. Auto-resolve is always acceptable.
- **Rivals** are procedurally defined from data: a name, a silhouette (section 11), a palette, a signature stat, and a one-line personality. Beating a rival repeatedly raises **Bond**; at max Bond the rival is **befriended**, giving a permanent bonus and a passive ally perk (for example, "Kaito: +15% expedition speed").
- **Rankings:** rank points from tournaments raise the player's **Tournament Rank**, unlocking higher brackets and boosting Renown.
- **Funnel:** Glory buys permanent Rival Bonuses (global multipliers) and Dojo capacity.

### 5.7 Spirit Realm (unlocks at 1e12 total Ki)

Resource: **Aura**.

- A **Meditation Lattice**: a hex grid where the player places **Spirit Stones** (various shapes and colors, obtained from expeditions, tournaments, and the Archive). Adjacency, color matches, and shape patterns create bonus links that generate Aura and multiply other resources. Rearranging is free and unrestricted.
- **Passive Aura** comes from the placed stones. Optimization is a pleasant extended-session activity; a decent layout still works for casual players.
- **Forms:** spend Aura to unlock global Forms (Base, Awakened, Ascended, Radiant, Celestial...). Each Form gives a large Ki multiplier and raises caps; the active Form can be switched at will, and some Forms trade off bonuses (for example, "Berserk": more Ki, less offline efficiency).
- **Funnel:** Aura multiplies Ki, raises the offline cap, and boosts Spirit Stone drop rates.

### 5.8 Heavenly Court (unlocks at 1e24 total Ki)

Resource: **Fragments** (celestial currency).

- A map of **Constellations**, each a small skill-graph spent with Fragments, whose nodes buff every earlier zone in distinctive ways.
- **Heavenly Trials:** long-running challenges (days) where the player picks modifiers (for example, "Drills produce half, Disciples produce double") and tries to hit a target Ki within the run for permanent rewards. Optional and never time-failing; the trial simply continues.
- **Star Seals** (see Transcendence) are spent here.
- **Funnel:** the final scaling layer; boosts everything, and extends the endgame indefinitely.

## 6. Prestige layers (number boosters only)

**Hard rule:** no prestige layer unlocks a mechanic. Automation, new zones, and new systems unlock from thresholds, techniques, or purchases. Prestige currencies only provide multipliers, starting resources, cap raises, and progress speedups.

### 6.1 Rebirth

- Available once the run's Ki reaches about 1e8. Gives **Spirit Essence** (SE): `SE gained = floor((runKi / 1e8) ^ 0.45)`.
- **Resets:** Ki, drills, drill upgrades, Dojo level and disciple assignments, current expeditions, Focus charge.
- **Persists:** Insight and the tech tree, Spoils and Gear, Glory and Rival Bonuses, Aura and Spirit Realm, Renown (reduced), unlocked zones, Rank, achievements.
- **Effect:** `+5% Ki per SE` (additive), plus the **Essence Shop**, which sells permanent number upgrades only: starting Ki, drill cost reduction, Focus Burst size, offline cap extensions, and more.
- Cooldown-free. Show a live preview: "Rebirth now for +X SE (Y% of current)" and a recommended-timing hint.

### 6.2 Ascension

- Available after accumulating enough lifetime SE (about 5e3 as a first target, tuned by the simulator). Gives **Realm Marks**: `Marks = floor((SE earned this ascension / 1e3) ^ 0.5)`.
- **Resets:** everything Rebirth resets, plus SE and the Essence Shop, Gear levels (gear items are kept), Rival Bond levels (befriended rivals are kept), and current Spirit Stone placements (stones are kept).
- **Persists:** Insight and tech tree, Marks and their upgrades, Fragments, Heavenly Court progress, Rank, unlocked zones, achievements.
- **Effect:** `x(1 + 0.25 * Marks)` to all zone currencies (Insight, Spoils, Glory, Aura, Fragments), plus raises the SE formula exponent slightly per Mark milestone. **Marks Shop:** number upgrades only.

### 6.3 Transcendence

- Available when lifetime Marks reach about 200 and the player has reached about 1e150 Ki in a single run (tuned). Gives **Star Seals**.
- **Resets:** nearly everything except zone unlocks, Rank, achievements, Seals, and Heavenly Court constellation levels (partially).
- **Effect:** each Seal gives `x2` to all production (multiplicative) and spendable Seal upgrades in the Heavenly Court for cap and rate boosts.
- **Endgame:** after the first Transcendence, Seals scale indefinitely and Heavenly Trials provide repeatable challenge. Each subsequent Transcendence should reach the earlier layer thresholds much faster, since the point is only to reach higher numbers.

## 7. Unlock thresholds

All thresholds use **Total Ki Ever Produced** (monotonic, survives all resets) unless noted.

| System | Threshold | Notes |
| --- | --- | --- |
| Training Grounds, Focus Burst | Start |  |
| First 4 drills | Start to 1e2 | Remaining drills unlock by drill count and Ki |
| Dojo, Disciples | 1e3 |  |
| Scroll Archive, Technique Tree | 5e4 |  |
| Auto-Training | Technique node in Mind branch | Not prestige-gated |
| Rebirth available | Run Ki 1e8 | First available around the 30 to 45 minute mark |
| Wild Frontier | 2e6 | Expedition slots 2 and 3 via Dojo level and techniques |
| Forge | First Spoils collected |  |
| Tournament Arc | 1e9 |  |
| Spirit Realm | 1e12 |  |
| Ascension available | Lifetime SE \~5e3 |  |
| Heavenly Court | 1e24 |  |
| Transcendence available | Marks \~200 and run Ki \~1e150 |  |

An **"Unlocks in" list** on the main screen always shows the next 2 or 3 thresholds with progress bars, so the player always has a near-term goal.

## 8. Ranks, achievements, and story

- **Ranks:** a ladder of about 40 ranks on Total Ki (Novice, Initiate, Apprentice, Adept, Expert, Master, Grandmaster, Sage, Transcendent, and so on to cosmic titles). Each rank gives a small permanent bonus (about +2% global) and a short story beat.
- **Story beats:** 40 to 60 short text passages (2 to 4 lines each), written in affectionate genre-trope style (training arc, rival introduced, a tournament, a mysterious master, a power from beyond). Shown in a log, never blocking.
- **Achievements:** about 150 in tiers (Bronze, Silver, Gold) covering counts, speed, collections, and hidden ones. Each gives a small permanent bonus (about +1% to something specific). Show progress toward the next tier of each.
- **Original IP only.** Use genre tropes and original names. Do not reference or copy any existing anime, characters, techniques, or trademarked terms.

## 9. Active play and check-in design

- **Rested bonus:** time away accrues **Rested time** (up to a cap that grows with techniques and Cooks). While Rested remains, active play gets x2 Ki. This rewards returning without ever penalizing absence.
- **Offline cap:** 12 hours by default, extendable to 7 days via techniques, SE shop, and Cooks. Beyond the cap, production simply stops accruing; nothing is lost.
- **Check-in loop (under 1 minute):** Welcome-back summary, collect expeditions, spend Ki and currencies (a "Smart Spend" button buys the best-value affordable upgrades), queue the next expedition, use fight tickets. A clearly highlighted action badge on each tab shows what is ready.
- **Extended-session content:** lattice optimization, gear builds, Clash fights, technique planning, Heavenly Trials. All optional.
- **Notifications:** none (PWA push is unreliable and unnecessary). A "Ready" tab badge and the welcome-back screen are enough.

## 10. UI structure

Bottom tab bar with 5 slots; zones overflow into a "More" sheet:

1. **Home** (Training Grounds, Focus Burst, Ki/s, next-unlock progress)
2. **Dojo** (disciples, roles, Renown)
3. **Frontier** (expeditions, queue, Spoils)
4. **Forge** (gear, sets, loadouts)
5. **More** (Archive, Tournament, Spirit Realm, Heavenly Court, Prestige, Achievements, Ranks, Stats, Settings)

Only show tabs for unlocked zones; locked ones appear as silhouettes with a threshold hint so there is always something to look forward to.

Global elements: a sticky header with Ki and Ki/s, a **Multiplier breakdown** sheet, a **Prestige panel** with live gain preview, and a **Stats** page (lifetime totals, run time, best run, per-zone production share).

## 11. Visual direction (all procedural, zero external assets)

- **Overall look:** high-contrast dark UI with saturated accents (ember orange, electric cyan, violet), crisp typography, and a comic-panel feel (angled panel edges, bold outlines, halftone dot patterns generated in CSS).
- **Type:** system fonts only, with a heavy display weight for headings. Use Japanese-style glyphs (such as 気) as decorative icons since Android ships CJK fonts, with a graceful text fallback.
- **Icons:** hand-built inline SVG icon set generated from simple geometric shapes, one per resource and zone, each with a distinct silhouette and color.
- **Zone art:** each zone gets a procedurally drawn backdrop (layered SVG or canvas gradients, parallax silhouettes: mountains, bamboo, temples, stars) in its own palette.
- **Characters:** the player and rivals are rendered as **geometric silhouette characters** from a small parametric generator (body shape, hair spikes, headband, stance, aura color), seeded by the rival's data so each is recognizable. No photographic or traced art.
- **Effects (Canvas 2D):** aura flames around the hero that grow with Form and Ki/s, speed lines on Focus Burst, screen-shake on big purchases (disable with Reduce Motion), floating damage-style numbers, particle bursts on milestones, glowing rarity borders on gear.
- **Accessibility:** a Reduce Motion toggle, a high-contrast option, a colorblind-safe palette option, and scalable text size.
- **Audio:** optional and **off by default**. If enabled, synthesize sounds with WebAudio (short blips for purchases, a rising tone while charging Focus, a drum hit for tournaments). No audio files.
- **Haptics:** light `navigator.vibrate` pulses on purchases and bursts, toggle in settings.

## 12. Settings and quality of life

- Number notation, bulk-buy default, purchase confirmation toggles for prestige, reduce motion, haptics, sound, text size, theme, performance mode (lower particle counts).
- Export/import save, hard reset with a double confirmation.
- Offline cap and Rested status displayed in the header menu.
- Tooltips as tap-to-open info sheets (no hover).

## 13. Content scale targets

| Content | Target count |
| --- | --- |
| Drills | 10 |
| Training upgrades | \~40 |
| Technique tree nodes | \~80 |
| Disciple roles | 6 |
| Expedition regions | 6 (each with 4 durations) |
| Gear pieces per slot | \~12 base types across rarities |
| Gear sets | 6 |
| Rivals | \~40 |
| Spirit Stone shapes | \~12 |
| Forms | 6 |
| Constellations | 8 |
| Ranks | \~40 |
| Achievements | \~150 |
| Story beats | 40 to 60 |

With content in data files, the owner can later ask Claude Code for more of any of these.

## 14. Pacing targets (for a casual player: \~4 five-minute check-ins plus one 20-minute session per day)

| Milestone | Target time |
| --- | --- |
| Dojo unlocked | \~5 min |
| Archive unlocked | \~20 min |
| First Rebirth | \~45 min |
| Wild Frontier unlocked | \~1 to 2 hours |
| Forge unlocked | \~2 to 3 hours |
| Tournament Arc unlocked | Day 1 to 2 |
| Spirit Realm unlocked | Day 3 to 5 |
| First Ascension | Day 4 to 6 |
| Heavenly Court unlocked | Week 3 to 4 |
| First Transcendence | Week 6 to 8 |

**New-thing cadence rule:** the player should encounter a new zone, system, unlock, rank, or lore reveal at least once per day of normal play for the first four weeks. Later layers should repeat faster each time, since prestige currencies make earlier thresholds quick.

## 15. Guardrails

- No monetization, ads, tracking, or network requests at runtime.
- No fail states, no decaying resources, no streak mechanics, no limited-time events.
- No soft-locks: a player must always be able to progress with their current resources. The simulator checks this.
- Never delete or reset player data without a confirmed, double-checked action.
- Prestige resets must be clearly listed before confirming (what resets, what stays, what you gain).
- Keep the bundle small (target under 1 MB gzipped) so installs and loads are instant.

## 16. Testing and balancing

1. **Headless simulator** (Node, uses the pure core): a scripted "casual player" bot (check in at set intervals, spends greedily by best payback, uses expeditions and tickets) and an "active player" bot. It outputs the time to reach each milestone in section 14 and flags drift from the targets by more than 25%.
2. **Unit tests:** cost and bulk-buy formulas, milestone multipliers, prestige gain formulas, save migration, big-number edge cases, offline simulation parity (offline result versus stepping the same duration at 10 Hz must match within a small tolerance).
3. **Soft-lock check:** from random saved states, verify there is always an affordable progress action within a reasonable time.
4. **Tuning workflow:** change data constants, rerun the simulator, record results in `BALANCE.md`.
5. **Manual:** test on a real Android phone via the deployed URL after each milestone; verify install, offline launch, and save persistence.

## 17. Build milestones (build in this order, keep each playable and committed)

1. **Foundation:** repo, tooling, PWA shell, big-number library, fixed-step engine, save/load/export, offline simulation, debug panel, simulator skeleton.
2. **Training Grounds:** drills, milestones, upgrades, Focus Burst, bulk buy, multiplier breakdown, number formatting, procedural visuals for the home screen.
3. **Dojo and Archive:** disciples and roles, Renown, technique tree, free respec, Auto-Training.
4. **Rebirth:** formula, Essence Shop, preview UI; simulator checks first-Rebirth timing.
5. **Wild Frontier and Forge:** expeditions, queue, Spoils, gear, tempering, sets, loadouts.
6. **Tournament Arc:** tickets, rivals, Clash mini-game, Bond and befriending, Rival Bonuses.
7. **Spirit Realm:** lattice puzzle, Forms.
8. **Ascension:** formula, Marks shop, reset rules.
9. **Heavenly Court and Transcendence:** constellations, trials, Seals.
10. **Meta:** ranks, achievements, story beats, stats page, settings, accessibility.
11. **Polish and balance:** effects, audio, haptics, full simulator pass, performance pass, final PWA checks.

After each milestone: run tests and the simulator, update `BALANCE.md` and `DECISIONS.md`, deploy, and pause for the owner to playtest and give feedback before continuing.
