# Status

Last updated: 2026-11-01 (Milestone 2 built)

## Milestones
- [x] 1. Foundation (confirmed by owner)
- [x] **2. Training Grounds** (built; awaiting owner playtest and confirmation)
- [ ] 3. Dojo and Archive
- [ ] 4. Rebirth
- [ ] 5. Wild Frontier and Forge
- [ ] 6. Tournament Arc
- [ ] 7. Spirit Realm
- [ ] 8. Ascension
- [ ] 9. Heavenly Court and Transcendence
- [ ] 10. Meta
- [ ] 11. Polish and balance

**Current milestone:** 2 (Training Grounds), built, waiting for owner feedback. Do not start Milestone 3 until the owner confirms.

**Live URL:** https://ronitdanti.github.io/idle-ascension/ (deploys on every push to `main`; Pages source must be "GitHub Actions").

## What exists
- **Training Grounds:** 10 drills with count milestones (x2, every 4th x3), 44 upgrades revealed gradually, bulk buy (x1, x10, x100, Max, hold to repeat), Smart Spend (with an info sheet), Multiplier breakdown sheet, estimated time to each unlock, procedural hero scene.
- **Charged Meditation:** time away charges Ki Flux (0.25 per second, 3 h cap, raised by upgrades and drill milestones); Speed Up x2/x3/x5 spends it.
- Offline progress (12 h cap) with Welcome-back sheet.
- Save system: autosave every 15 s, rolling backup, IndexedDB mirror, export/import, versioned (now v3) with migrations, corruption recovery screen, double-confirmed hard reset.
- Debug panel (Settings, Developer toggle): grant Ki, jump to next unlock, Flux fill/empty, time-warp, simulate time away.
- Installable PWA, works offline, update banner on new deploys.
- 92 unit tests; balance simulator with an active bot and a casual bot (`npm run sim`).

**Live URL:** https://ronitdanti.github.io/idle-ascension/

## Known bugs
- None known. Not yet tested on a real Android phone.

## Open questions for the owner
- **Wild Frontier timing (deferred by you).** It unlocks at 2e6 total Ki, about 35 minutes of play, earlier than section 14's 1 to 2 hours. You asked to decide once the Dojo exists, so I will revisit it in Milestone 3 using how long the Dojo keeps you busy.
- Pacing feel: Dojo at about 5 minutes, Archive at about 20 minutes, Rebirth threshold at about 50 minutes. Does the first hour feel too fast, too slow, or right?
- Flux numbers (0.25 charge, 3 h cap) are first guesses; say if Speed Up feels too stingy or generous.

## Next recommended step
Playtest Milestone 2 on the phone (first hour especially), note it in PLAYTEST.md, and confirm so Milestone 3 (Dojo and Archive: disciples, roles, Renown, technique tree, free respec, Auto-Training) can start.
