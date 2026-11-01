# Status

Last updated: 2026-11-01 (second playtest note)

## Milestones
- [x] **1. Foundation** (built; awaiting owner confirmation after playtest)
- [ ] 2. Training Grounds
- [ ] 3. Dojo and Archive
- [ ] 4. Rebirth
- [ ] 5. Wild Frontier and Forge
- [ ] 6. Tournament Arc
- [ ] 7. Spirit Realm
- [ ] 8. Ascension
- [ ] 9. Heavenly Court and Transcendence
- [ ] 10. Meta
- [ ] 11. Polish and balance

**Current milestone:** 1 (Foundation), done, waiting for owner feedback. Do not start Milestone 2 until the owner confirms.

**Live URL:** https://ronitdanti.github.io/idle-ascension/ (deploys on every push to `main`; Pages source must be "GitHub Actions").

## What exists
- Installable PWA shell, works offline after first load, update banner on new deploys.
- Fixed 10 Hz engine, offline progress (12 h cap) with Welcome-back sheet, Charged Meditation: time away charges Ki Flux (0.25 per second, 3 h cap), spent on Speed Up x2/x3/x5.
- Save system: autosave every 15 s, rolling backup, IndexedDB mirror, export/import (text and file), versioned with migrations, corruption recovery screen, double-confirmed hard reset.
- Debug panel (Settings, Developer toggle): grant Ki, jump to next unlock, time-warp, simulate time away.
- Placeholder automatic Ki income (4 Ki/s, no tapping) so unlocks and offline can be tested. Real economy comes in Milestone 2.
- 50 unit tests, balance simulator skeleton (`npm run sim`).

## Known bugs
- None known. Not yet tested on a real Android phone.

## Open questions for the owner
- Focus Burst and tapping are dropped (see DECISIONS.md). Flux numbers (0.25 charge, 3 h cap) are first guesses; tell me if Speed Up feels too stingy or too generous.
- Is Milestone 1 confirmed so Milestone 2 can start?
- Otherwise nothing blocking. Feedback on look, feel and the install flow is welcome in PLAYTEST.md.

## Next recommended step
Playtest the install, offline launch and save persistence on the phone. Then confirm Milestone 1 so Milestone 2 (Training Grounds: drills, upgrades, bulk buy) can start.
