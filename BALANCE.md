# Balance Log

Tuning changes and simulator results, newest first. Targets are SPEC section 14.

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
