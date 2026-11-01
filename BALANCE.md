# Balance Log

Tuning changes and simulator results, newest first. Targets are SPEC section 14.

## 2026-11-01, Milestone 3: Dojo and Archive

**First-hour result (active bot, `npm run sim`):**

| Milestone | Target | Sim | Drift |
| --- | --- | --- | --- |
| Dojo unlocked (1e3 total Ki) | 5m | 5m 8s | +3% |
| Archive unlocked (5e4) | 20m | 20m 48s | +4% |
| Rebirth threshold (1e8 run Ki) | 45m | 41m 54s | -7% (was 48m 41s: Dojo and techniques speed the hour up) |
| Wild Frontier (now 5e8, was 2e6) | 1h 30m | 45m 23s | -50%, SPEC conflict (see DECISIONS.md) |

**Dojo and Archive pacing (active bot, play time):** first disciple 10m, Dojo level 2 at 18m, level 3 at 23m, first technique 24m, Dojo level 5 at 37m, 10 techniques at 38m, Auto-Training 41m, Dojo level 8 at 1h 17m, every tier 0 to 2 technique 1h 28m, 25 techniques 2h, every tier 0 to 3 technique 2h 48m. (The bot recruits at 10m because it weighs recruit value against drills; a human will likely recruit at 5m.)
**Casual bot (SPEC schedule, wall clock):** every tier 0 to 3 technique at 17h, tier 0 to 5 at 1d 12h, the whole 63-node tree at 17d 12h. By day 56: Dojo level 24, 113 disciples, Training Level 20, 1.6e7 Insight earned.

**Ki curve of the active bot** (total Ki, Ki/s): 10m 4.3e3 / 13; 20m 5.0e4 / 171; 30m 9.5e5 / 5.1e3; 40m 5.6e7 / 3.3e5; 50m 6.6e9 / 4.0e7; 60m 1.9e11 / 8.6e8; 90m 6.2e13 / 8.0e10; 3h 1.4e15 / 3.4e11. Growth is explosive from minute 30 to 60, then flattens as the last drills run out. **Consequence:** Tournament (1e9) is reached at about 48 minutes and Spirit (1e12) at about 63 minutes of active play, versus SPEC's day 1 to 2 and day 3 to 5. The day-scale thresholds need re-fitting once Rebirth exists (Milestone 4). This is not a Dojo or Archive problem.

**Dojo's contribution to Ki:** about 30 disciples at the 1 hour mark, roughly 18 sparring, give about +65% Ki on top of everything else. A steady multiplier rather than a spike, so it did not disturb the first-hour targets.

**Tuning log:**
1. First draft of the tree, cost `6 x 2.9^tier`: whole tree (120k Insight) done by the casual bot in under 3 days. Too fast for "deep for weeks".
2. Cost `6 x 3.5^tier`, whole tree 430k: still about 2 days, because Insight income grows with disciples (Dojo level 24 means about 45 Scribes).
3. Scribe yield 0.02 to 0.015 Insight/s, and tiers 4+ steepened to 6x per tier (tiers 0 to 3 unchanged so early nodes stay quick). Whole tree about 4.1M: the casual bot finishes in 17 days, which leaves room for the Aura and Essence nodes (roughly 17 more) to push it past a month.
4. Auto-Training Best value first used Smart Spend's ranking and ended up 3x worse online than offline. Changed to (time to afford + payback) so it waits for a good buy. See DECISIONS.md.

**Knobs, in order of use:** `DOJO` in `content/dojo.ts` (recruit cost and growth, capacity, level costs, `sparringPerPartner`, `scribeInsightPerSec`, Training bonus), `techCost()` in `content/techniques.ts`, effect sizes on each node, discovery thresholds in `content/discoveries.ts`, `CONFIG.auto` (intervals and modes).

## 2026-11-01, Milestone 2: Training Grounds economy

**Final first-hour result (active bot, `npm run sim`):**

| Milestone | Target | Sim | Drift |
| --- | --- | --- | --- |
| Dojo unlocked (1e3 total Ki) | 5m | 5m 8s | +3% |
| Archive unlocked (5e4) | 20m | 20m 17s | +1% |
| Rebirth threshold (1e8 run Ki) | 45m | 48m 41s | +8% |
| Wild Frontier (2e6) | 1h 30m | 35m 3s | -61%, SPEC conflict (see DECISIONS.md) |

Day-scale (casual bot): Tournament Arc 12h, Spirit Realm 17h, Heavenly Court not within 56 days. Not tunable until Rebirth and Ascension add multipliers. The casual bot charged 3d 5h of Flux over 56 days and spent 3d 2h, so Flux gets used rather than hoarded.

**Tuning log (drill `baseProd` versus the first draft of 0.2 / 1.8 / 16 / ...):**
1. First draft (flat 9x per tier): Dojo 2m 22s, Archive 7m 24s, Rebirth 22m 49s. Far too fast.
2. Flat x0.5: Dojo 3m 21s, Archive 13m, Rebirth 43m 56s. Right at the hour mark but the first 20 minutes were still too quick.
3. Weaker early tiers, stronger late tiers (multipliers 0.25, 0.3, 0.4, 0.55, 0.65, 0.7, 0.72 ...): all three targets within 10%. Final `baseProd`: 0.05, 0.55, 6.4, 80, 850, 8200, 76000, 690000, 6.2e6, 5.6e7.
4. The bot was found to stall waiting for expensive purchases, which wrongly made some settings look slower. Fixed in the bot (score = time to afford + payback), not in the data.

Knobs, in order of use: drill `baseProd` (all pacing), upgrade ladder costs (`LADDER` in upgrades.ts), innate Ki upgrades, global bonus sizes.

## 2026-11-01, Charged Meditation replaces Rested
Removed: Rested x2 (4 h cap). Added: Ki Flux, 0.25 charge per second away, 3 h cap, Speed Up x2/x3/x5 burning (N-1) Flux per real second. Net bonus from Flux is bounded at +25% of away time; reasoning in DECISIONS.md. The simulator does not model Flux yet because its bots are always active and nothing is bought; revisit in Milestone 2 when check-in/away patterns matter (casual bot: ~4 five-minute check-ins plus one 20-minute session per day).
Open knobs: charge rate (0.25), cap (3 h), speed levels. If playtests feel too stingy, raise the charge rate first.

## 2026-11-01, after first playtest
Placeholder income 1 to 4 Ki/s (tap removed per PLAYTEST.md). Dojo now at about 4 minutes (sim reports 5m at its 5-minute check-in granularity, target 5m). Archive 3h 30m and Frontier 5d 18h are still far off target; that is the placeholder economy, tuned in Milestone 2.

## Milestone 1: Foundation (2026-11-01)

No real economy yet, so nothing is tuned. The only Ki sources are a placeholder 1 Ki/s
trickle and 1 Ki per tap (`src/content/config.ts`). `npm run sim` result for the casual bot
(check-in every 5 minutes, nothing to buy):

| Milestone | Target | Sim | Note |
| --- | --- | --- | --- |
| Dojo unlocked | 5m | 20m | placeholder economy |
| Archive unlocked | 20m | 13h 55m | placeholder economy |
| Wild Frontier unlocked | 1h 30m | 23d 3h | placeholder economy |
| Tournament, Spirit, Court | - | never | out of reach with a flat trickle |
| Rebirth, Forge, Ascension, Transcendence | - | not built | M4, M5, M8, M9 |

These drifts are expected and are not a tuning signal. Real tuning starts with Milestone 2
(drills and upgrades), when the first three rows become reachable at the target pace.

Placeholder constants to revisit: offline cap 12 h, Rested cap 4 h, Rested multiplier x2
(`CONFIG` in `src/content/config.ts`).
