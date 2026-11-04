# Decisions

Key choices made while building v1, and why. Newest at the bottom.

## Stack
- **Vite 8 + React 19 + TypeScript 7, Tailwind CSS 4, Dexie 4, vite-plugin-pwa 2, Vitest 5, Playwright 1.63** as suggested in the spec. TypeScript 7 (the new native compiler) worked without changes, so it stayed. Playwright is pinned to 1.63 because that matches the browser installed in the build environment.
- **No Framer Motion.** Plain CSS transitions cover the subtle UI motion; exercise animations use their own small renderer (below). One less dependency.
- **date-fns installed but barely needed.** Dates are plain `YYYY-MM-DD` strings with small helpers in `src/engine/dates.ts`, which keeps the engine free of time-zone surprises and of dependencies.
- **Hash routing** (`#/plan/week`). Works on any static host and from the home screen without server rewrites.

## Training engine (`src/engine/`)
- Pure TypeScript, deterministic, no UI imports. Everything the screens need goes through the `CoachEngine` interface (`src/engine/coach.ts`). A Claude-powered coach can implement the same interface later.
- **Realism check** counts training days (sport + gym + runs; mobility can share a day), minutes, and a simple weekly "load points" budget by experience (beginner 9, intermediate 12, advanced 14) with a maximum of 5 (beginner) or 6 training days. Trimming follows the goal: endurance gives up gym first, strength/muscle give up runs first, balanced goals trim the bigger of the two. Sports are never trimmed first: Carlo plays them anyway.
- **Month alternative** shifts one session between gym and running (endurance or strength bias), or adds/removes mobility when that is not possible.
- **Week placement** is an exhaustive search over day assignments (at most 7! layouts, fast) scored by recovery rules: heavy legs the day before a hard run (heavy penalty), same muscles on consecutive days, two hard runs back to back, three hard days in a row, leg-heavy sport next to heavy legs, sessions longer than the free time, long run away from the weekend, Sunday→Monday wrap-around at half weight. Lowest penalty wins; ties keep the first layout found, so results are stable.
- **Week alternative**: with 4+ sessions, a lighter week that drops the least important session; otherwise the second-best layout ("Other days").
- **Moved sessions are pinned**: re-planning after availability or focus changes keeps them where Carlo put them.
- **Quality runs**: beginners get one. Intermediate/advanced get two only when there is enough easy running around them (4+ runs, or 3 runs with at most one gym day). The spec says "two for intermediate+"; with 3 runs and 2–3 gym days, two quality runs made almost every day hard, so the engine keeps one. Logged in `KNOWN_ISSUES.md` for Carlo to confirm.
- **80/20** is enforced per week: hard running (tempo, intervals, strides, steady) may use at most 20 % of that week's planned running time; the budget is split across the quality sessions, which shorten their blocks or reps to fit.
- **Run volume** grows 0 → +8 % → +7.4 % (weeks 1–3) and drops to 70 % in the deload week. A new block starts ~8 % above the last one, and never more than 10 % above what was actually run in the last three weeks.
- **Splits**: 1–3 gym days full body (A/B/C; C is the lighter day), 3 with goal "muscle" and some experience push/pull/legs, 4 upper/lower, 5–6 PPL-based.
- **Workout generation**: templates per day type list movement slots with roles (main, accessory, core, finisher). Exercises are picked per slot from what the equipment allows, ranked by experience (beginners get goblet squats, intermediates back squats). Duration fitting cuts finisher → accessories → accessory sets → warm-up length → main sets, and extends with extra accessories and sets. Main lifts always stay.
- **Alternative workout**: same muscles, the second-best exercise for each slot, accessories paired into supersets with shorter rests.
- **Progressive overload**: double progression. All sets at the top of the rep range → add the smallest increment (5 kg lower-body barbell, 2.5 kg upper-body barbell, 2 kg dumbbells, 4 kg kettlebells). Missing the bottom of the range twice in a row at the same weight → about 10 % lighter. Big rep-range changes (peak week) convert through estimated 1RM (Epley). Deload: 90 % of the last weight.
- **Treadmill** is treated as "gym" equipment for runs (Outdoors / Treadmill toggle).

## Exercise animations
- One small renderer (`src/anim/`) draws every exercise from **pose data** (joint angles over 2–4 keyframes) instead of 40 hand-drawn SVGs. That guarantees a single consistent stroke style, keeps each animation a few lines of data, and makes animations easy to fix or add. Style guide: `docs/ANIMATION_STYLE.md`.
- Thumbnails show a still keyframe; only the open exercise animates. `prefers-reduced-motion` shows stills everywhere.
- 42 exercises (spec asked for about 35) so every equipment context has a real option for every movement pattern, plus warm-up and mobility moves.

## Data
- Dexie (IndexedDB) tables: `kv` (profile, settings), `blocks`, `weeks` (the plan in use plus both generated options), `sessions` (committed/in progress/done/skipped, with a snapshot of the workout), `sets` (one row per logged set). Progress and progression are computed from `sessions` + `sets`.
- Backup is a single JSON file with all tables; import replaces everything after a confirmation.
- A session done on a different day than planned counts on the day it was actually done.

## Design
- Warm off-white background, white cards with very soft shadows, near-black ink; dark mode with the same structure. One accent colour: jade (#1f7a5c light / #4cc497 dark). System font stack (SF Pro on iPhone), no web fonts, so it works offline from the first load.

## Training style: bodyweight first (Nov 2026, Carlo's preference)
Carlo asked for calisthenics plus a few classic lifts and no machines (recorded in `SPEC.md` §6; first built in a parallel session, ported here).
- `Profile.style`: `calisthenics` ("Bodyweight first", the default), `freeWeights`, `all`. Chosen in onboarding (equipment step) and Settings.
- Bodyweight first is a filter plus a ranking in exercise choice: cables/machines are never chosen; loaded exercises must be marked `classic` (back squat, goblet squat, deadlift, Romanian deadlift, bench press, overhead press, dumbbell row); bodyweight moves get a ranking bonus everywhere except squat and hinge slots, which stay classic barbell work because bodyweight alone stops being a strength stimulus for legs.
- If nothing in a slot fits the style, the engine first tries the slot's fallbacks (e.g. carry → core) and only then relaxes the style.
- Bodyweight progression is reps-based: 5–8 for pull-ups, dips and pike push-ups (3–8 for beginners), 8–12 for other main moves, 10–15 for accessories.
- Swap lists show moves that fit the style first; the others stay available below.
