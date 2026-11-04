# Decisions

Key choices made while building v1, and why. Newest at the bottom of each section.

## Stack
- **Vite + React 19 + TypeScript, Tailwind CSS 4, Dexie (IndexedDB), vite-plugin-pwa, Vitest, Playwright**, as suggested in the spec. Pinned to well-known major versions (Vite 7, Vitest 3) rather than the newest majors, to avoid early-release breakage.
- **No router library.** A ~40-line hash router (`src/lib/router.ts`). Hash URLs (`#/plan`) also work on any static host without rewrite rules.
- **No chart library, no animation library.** Charts are small hand-drawn SVGs and motion is CSS. This keeps the bundle small and the look consistent.
- **Framer Motion not used.** Plain CSS keyframes cover the subtle motion needed.

## Engine (`src/engine/`)
- **Pure, deterministic TypeScript.** No `Math.random`: variety comes from hashing stable inputs (block id, week number, slot). The same inputs always give the same plan, which makes it testable.
- **`CoachEngine` interface** (`coach.ts`) is the only way the app reaches the engine. `RuleCoach` is the offline implementation, and a Claude-powered coach can implement the same interface later.
- **Week placement is a small search.** It starts greedy (most constrained session first), then improves with single moves and pairwise swaps against a penalty score. Several deterministic starting orders are tried. The penalties are the recovery rules: hard run not the day after heavy legs, no same muscles back to back, no two hard runs in a row, at least one rest day, long run on the longest free day, sport days count as load, avoid two sessions in a day. The same rules produce the warnings the user sees after moving a session, so the plan and the warnings never disagree.
- **Starting mid-week drops sessions rather than cramming.** The least important sessions go first (an easy run before a gym session; fixed sport days are never dropped).
- **Quality runs: one for beginners; two for intermediate+ only with 4+ runs a week.** The spec says two for intermediate+. With only 3 runs that would mean 2 hard runs + a long run and no easy running, which breaks the 80/20 rule the spec also asks for. 80/20 won.
- **Run volume is in minutes, not km.** That's honest for a beginner without pace data. Weekly volume goes ×1, ×1.08, ×1.16, then ×0.8 in the deload week (never more than +10% a week). Effort uses the talk test. Once there are logged easy runs, a pace hint is added.
- **Realism check** compares the ask with free days, free minutes, sessions per week (5 / 6 / 7 by level) and hard days per week (4 / 5 / 6). It trims what matters least for the goal (runs first for athletic/strength goals, gym first for endurance/health). For example "3 gym + 3 runs + tennis" becomes "3 gym + 2 runs + tennis", which matches the spec's example.
- **Main lifts stay fixed for a whole block; accessories rotate every two weeks.** That gives variety (Carlo's main complaint) without losing visible progression on the lifts that matter.
- **Double progression** with a rep range per goal. When every working set hits the top of the range, the next session adds load (barbell lower +5 kg, upper +2.5, dumbbells +2, kettlebell +4). If most sets fell short, the load drops 10%. Deload is about 85%. The first time, there's no number, just "pick a weight you could lift 2–3 more reps with". Guessing a weight with no history is worse.
- **Duration scaling.** Warm-up and cool-down shrink for short sessions. Main lifts always stay (sets are trimmed to a minimum of 2). Accessories are cut from the end of a priority list. Extra time adds accessory sets, then a short conditioning finisher.
- **Alternatives.** Month: a strength or endurance bias (or a lighter version). Week: a lighter week (one session fewer), or different days if there are only a few sessions. Workout: same patterns with different lifts and supersets for gym; tempo ↔ intervals, run/walk ↔ continuous, or fartlek for runs; "can't play today" conditioning for sport.
- **Timed drills in warm-up / cool-down are picked by body region** (lower-body days get hip and leg drills).

- **Training style, "bodyweight first" by default** (Carlo asked for calisthenics and a few classic lifts, no machines). It's a filter plus a ranking in exercise choice:
  - Machines and cables are never chosen.
  - Loaded exercises must be flagged `classic`.
  - Upper-body main lifts are bodyweight, matched to experience by difficulty.
  - Squat and hinge main lifts stay a barbell classic (goblet squat for beginners), because bodyweight squats stop being a strength stimulus quickly.
  - Bodyweight progression is reps-based: 5–8 for pull-ups and dips, 8–12 for other mains.
  - "Free weights" and "anything" styles are one tap away in Settings.

## Animations
- **One stick-figure rig for every exercise** (`src/animations/rig.ts`), side view, with poses given as joint angles and blended frame to frame. This is what keeps all ~70 illustrations in the same line style, and makes them cheap to add. Frames are snapped to the ground automatically. Reduced-motion users see a still pose.

## Storage
- **Dexie tables:** profile, blocks, weeks (sessions are stored inside their week), committed workouts (frozen when you press "Today I'm doing this", so the workout doesn't change mid-session), swaps, set logs, session logs.
- **Backup** is a single JSON file of all tables, with an app tag and a version. Import replaces everything after a confirmation.
- **A fake "today" for tests:** `localStorage['fitness.today']` overrides the date. It's used by screenshots and e2e only.

## Design
- One accent (deep green `#1f7a63`, lighter in dark mode) on warm neutrals. System font (SF Pro on iPhone). Large titles, soft cards, few borders, bottom tab bar.
