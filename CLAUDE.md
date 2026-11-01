## Project
Ki Ascension: a shonen-themed incremental idle game, shipped as an installable
PWA for Android Chrome. The full design is in SPEC.md. Read it completely at the
start of every session. SPEC.md is the source of truth for design; if you
deviate from it, record why in DECISIONS.md.

## Start of every session
Read, in this order: SPEC.md, DESIGN.md, DECISIONS.md, BALANCE.md, PLAYTEST.md,
and STATUS.md. Then check `git log` for recent work. Briefly tell the owner where
the project stands and what you plan to do next before making changes.

## Working rules
- Build milestone by milestone, in the order given in SPEC.md section 17. Do not
  start the next milestone until the owner confirms the current one.
- Keep the game playable and committed at every step. Make small, descriptive commits.
- The simulation core (state, tick, purchases, prestige, offline progress) must
  have no DOM access, so it runs headless in Node for the simulator and tests.
- All game content (drills, techniques, regions, gear, rivals, achievements,
  ranks, story) lives in typed data files. Never hardcode content in engine code.
- Use the big-number library for every game value that can exceed 1e15.
- Prestige layers only boost numbers. Never gate a mechanic behind prestige.
- No art, audio, or font files. Generate all visuals and sounds in code.
- No network requests at runtime, no analytics, no accounts.
- Never write code that deletes or overwrites player saves without an explicit,
  confirmed user action. Saves are versioned and need migrations.

## Before every commit
1. Run the unit tests.
2. Run the balance simulator and compare against the pacing targets in SPEC.md
   section 14.
3. Update BALANCE.md (tuning changes and results) and DECISIONS.md (choices made
   and why).

## When a milestone is finished
Deploy, give the owner the URL, summarize what to playtest, and wait for feedback.
Update STATUS.md: milestones completed, current milestone, known bugs, open
questions for the owner, and the next recommended step.

## Owner context
- Device: Android 16, Chrome 156.0.8078.73. Played in portrait on a phone.
- The owner judges the game by playing it, not by reading code. Keep summaries
  short and in plain language.
- Numbers in SPEC.md are first-pass guesses; expect to retune from feedback.

## Owner's notes
PLAYTEST.md belongs to the owner. Read it at the start of each session and treat
it as the priority feedback source. Never edit it. When you act on an entry, log
what you changed and why in DECISIONS.md, referencing the entry's date.

## Creative authority
The owner is deliberately handing over design. You have full creative control over:
the game's title, art direction, color palette, typography choices, icon and
character style, naming of techniques/rivals/regions/gear, story tone, UI layout
details, animation and effect style, and sound design.
- Stay within SPEC.md's constraints (original IP only, procedural visuals, no
  asset files, mobile-first).
- Decide, don't ask. Make a strong choice, record it in DESIGN.md, and move on.
- Before building any UI, write DESIGN.md as a short design bible (palette,
  type, icon language, motion style, naming conventions, tone of the story text)
  and follow it consistently.
- Aim for a distinctive, polished look that doesn't read as a generic template.
- The owner will give feedback after each milestone; revise freely based on it.