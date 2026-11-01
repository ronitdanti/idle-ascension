# Balance Log

Tuning changes and simulator results, newest first. Targets are SPEC section 14.

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
