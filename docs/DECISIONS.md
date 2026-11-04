# Decisions

Key choices made while building v1, and why. Newest at the bottom of each section.

## Stack
- **Vite + React 19 + TypeScript, Tailwind CSS 4, Dexie (IndexedDB), vite-plugin-pwa, Vitest, Playwright**, as suggested in the spec. Pinned to well-known major versions (Vite 7, Vitest 3) rather than the newest majors, to avoid early-release breakage.
- **No router library.** A ~40-line hash router (`src/lib/router.ts`). Hash URLs (`#/plan`) also work on any static host without rewrite rules.
- **No chart library, no animation library.** Charts are small hand-drawn SVGs and motion is CSS. This keeps the bundle small and the look consistent.
- **Framer Motion not used.** Plain CSS keyframes cover the subtle motion needed.

## Hosting
- **GitHub Pages**, at `groovejunior.github.io/fitness-app/`, chosen by Carlo to sit next to his other app. The build reads `BASE_PATH` (set to `/fitness-app/` by the workflow), so the manifest, service worker scope and asset URLs all live under that folder. Locally it stays `/`. Hash routes mean no server rewrites are needed; `404.html` is a copy of `index.html` as a safety net.
- **The deploy workflow runs the unit tests first**, so a change that breaks the training rules never goes live. The e2e tests are not run in CI (they need a browser install); run `npm run e2e` locally.

## Engine (`src/engine/`)
- **Pure, deterministic TypeScript.** No `Math.random`: variety comes from hashing stable inputs (block id, week number, slot). The same inputs always give the same plan, which makes it testable.
- **`CoachEngine` interface** (`coach.ts`) is the only way the app reaches the engine. `RuleCoach` is the offline implementation, and a Claude-powered coach can implement the same interface later.
- **Week placement is a small search.** It starts greedy (most constrained session first), then improves with single moves and pairwise swaps against a penalty score. Several deterministic starting orders are tried. The penalties are the recovery rules: hard run not the day after heavy legs, no same muscles back to back, no two hard runs in a row, at least one rest day, long run on the longest free day, sport days count as load, avoid two sessions in a day. The same rules produce the warnings the user sees after moving a session, so the plan and the warnings never disagree.
- **Starting mid-week drops sessions rather than cramming.** The least important sessions go first (an easy run before a gym session; fixed sport days are never dropped).
- **Quality runs: one for beginners; two for intermediate+ only with 4+ runs a week.** The spec says two for intermediate+. With only 3 runs that would mean 2 hard runs + a long run and no easy running, which breaks the 80/20 rule the spec also asks for. 80/20 won.
- **Run volume is in minutes, not km.** That's honest for a beginner without pace data. Weekly volume goes ×1, ×1.08, ×1.16, then ×0.8 in the lighter week. The rise is a gentle brake so a week cannot jump (IOC 2016). It is not an injury law: Buist 2008 found no injury benefit to a graded plan. Effort uses the talk test (Seiler 2009, Persinger/Foster 2004). Most running stays easy. A second harder session only appears once there are 4+ runs a week and the runner is past beginner. Once there are logged easy runs, a pace hint is added.
- **Realism check** compares the ask with free days, free minutes, sessions per week (5 / 6 / 7 by level) and hard days per week (4 / 5 / 6). It trims what matters least for the goal (runs first for athletic/strength goals, gym first for endurance/health). For example "3 gym + 3 runs + tennis" becomes "3 gym + 2 runs + tennis", which matches the spec's example.
- **Main lifts stay fixed for a whole block; accessories rotate every two weeks.** That gives variety (Carlo's main complaint) without losing visible progression on the lifts that matter.
- **Double progression** with a rep range per goal (ACSM 2009). When every working set hits the top of the range, the next session adds load. The step is the usual plate jump when that jump is about 2–10%: barbell lower +5 kg (or +2.5 if +5 is over 10%), upper +2.5 (or +1.25), dumbbells +2 (or +1), kettlebell +4 (or +2). If even the small jump is over 10%, the weight stays and the note says to slow the lowering. If most sets fell short, the load drops about 10%. The lighter week is about 85% and fewer sets, so the month does not only go up. It is not sold as extra muscle (Coleman 2024). The first time, there's no number, just "pick a weight you could lift 2–3 more reps with. Stop before form breaks." Guessing a weight with no history is worse. Going to failure is not required.
- **Duration scaling.** Warm-up and cool-down shrink for short sessions. Main lifts always stay (sets are trimmed to a minimum of 2). Accessories are cut from the end of a priority list. Extra time adds accessory sets, then a short conditioning finisher.
- **Alternatives.** Month: a strength or endurance bias (or a lighter version). Week: a lighter week (one session fewer), or different days if there are only a few sessions. Workout: same patterns with different lifts and supersets for gym; tempo ↔ intervals, run/walk ↔ continuous, or fartlek for runs; "can't play today" conditioning for sport.
- **Timed drills in warm-up / cool-down are picked by body region** (lower-body days get hip and leg drills).

- **Training style, "bodyweight first" by default** (Carlo asked for calisthenics and a few classic lifts, no machines). It's a filter plus a ranking in exercise choice:
  - Machines and cables are never chosen.
  - Loaded exercises must be flagged `classic`.
  - Upper-body main lifts are bodyweight, matched to experience by difficulty.
  - Squat and hinge main lifts stay a barbell classic (goblet squat for beginners), because bodyweight squats stop being a strength stimulus quickly.
  - Bodyweight ranges: 5–8 for pull-ups and dips, 8–12 for other mains. When every set hits the top, the next session is a harder variation of the same pattern (Kotarsky 2018), if equipment and difficulty allow. Otherwise the note says to slow the lowering. A push-up never turns into a bench press by itself.
  - "Free weights" and "anything" styles are one tap away in Settings.

## Animations
- **One stick-figure rig for every exercise** (`src/animations/rig.ts`), side view, with poses given as joint angles and blended frame to frame. This is what keeps all ~70 illustrations in the same line style, and makes them cheap to add. Frames are snapped to the ground automatically. Reduced-motion users see a still pose.

## Storage
- **Dexie tables:** profile, blocks, weeks (sessions are stored inside their week), committed workouts (frozen when you press "Today I'm doing this", so the workout doesn't change mid-session), swaps, set logs, session logs.
- **Backup** is a single JSON file of all tables, with an app tag and a version. Import replaces everything after a confirmation.
- **A fake "today" for tests:** `localStorage['fitness.today']` overrides the date. It's used by screenshots and e2e only.

## Design
- One accent (deep green `#1f7a63`, lighter in dark mode) on warm neutrals. System font (SF Pro on iPhone). Large titles, soft cards, few borders, bottom tab bar.
- **Bottom sheets are drag-to-dismiss.** The grabber bar was decorative in v1; it now follows the finger, snaps back on a short pull, and closes on a long pull, a flick, or a tap. Backdrop tap and Escape still close. The handle sits outside the scrolling body so it doesn't scroll away.

## Training knowledge
- **Cited rulebook, not a live AI and not copyrighted books in the repo.** Carlo asked to move off "general training knowledge" onto science. The coach stays a deterministic rule engine (offline, testable). Each rule will be pinned to an open paper or guideline. Settings has a short "Where the plan comes from" note; the full list and the "how we fold this in" plan live in `docs/TRAINING_KNOWLEDGE.md`.
- **The six sources that drive the coach** (chosen 2026-11-05, after a wider read): Australian 24-hour movement guidelines; Currier et al. 2023 (BJSM, open) for gym dose; ACSM 2009 progression stand (with the 2025 overview of reviews) for adding load; Seiler 2009 plus the talk test for easy running; the 2016 IOC load consensus plus the AIS reload note for spikes and mixed sport; Kotarsky 2018 for harder bodyweight variations. Lopez 2021 (load vs size) and Grgic/Singer (rest) are cited in the engine notes, not as extra buttons. Full list, and what we deliberately leave out, is `docs/TRAINING_KNOWLEDGE.md`.
- **We will not** copy Starting Strength, Overcoming Gravity, Bompa, the NSCA textbook, or paid programs into the app. ISSN nutrition stands and ESSA clinical statements stay off the default plan (nutrition is out of scope; ESSA's public statements are for medical conditions).
- **We will not pretend thin evidence is a law.** The 10% weekly run cap is a gentle brake (Buist 2008 found no injury benefit). Week 4 is a lighter week so load does not only rise, not a proven muscle-builder (Coleman 2024). 80/20 running is a safe default, strongest in trained athletes (Silva 2024).
- **The engine cites the six sources.** Each workout carries a source id (`src/engine/sources.ts`). The workout screen shows one sentence from it: gym dose (Currier 2023), a harder bodyweight variation (Kotarsky 2018), a lighter week or a sport session (IOC 2016), running (Seiler 2009), mobility (Australian movement guidelines). ACSM 2009 is the load step. Lopez 2021 is why leg strength stays on a bar. Grgic 2017 and Singer 2024 are the rest times: beginners at or under 2 minutes, trained main lifts at least 2 minutes, accessories about 60 seconds unless they are short-rest supersets. No bibliography on the card.
