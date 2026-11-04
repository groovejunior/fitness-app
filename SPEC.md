# Fitness App: Product Spec (v1)

Owner: Carlo Müller. Single user (himself). Melbourne-based student-athlete who has done many sports over the years (gym, running, tennis, water skiing, more).

## 1. The problem
Carlo is motivated once he trains, but he needs to be told *exactly* what to do. Right now he:
- repeats the same few gym exercises (boring, not efficient)
- runs (treadmill or outside) with no plan or progression
- has no long-term structure tying his week to a bigger goal

**Goal for the next months:** build the body he wants, get athletic, improve overall physical health. Training also supports his studies and his overall happiness.

## 2. Product in one sentence
A minimal, beautiful phone web app (PWA) that turns a rough monthly intention ("3 runs + 3 gym sessions a week, I'm free these evenings") into a weekly plan that fits his timetable, then into concrete, animated, trackable workouts, with a recommendation *and* an alternative at every level.

## 3. Platform and technical decisions (agreed with Carlo)
| Decision | Choice |
|---|---|
| Platform | **PWA**: installable to the iPhone home screen, mobile-first, works offline |
| Storage | **On-device only** (IndexedDB). No login, no backend. Include **JSON export/import backup** in Settings |
| Recommendations | **Rule-based training engine**, deterministic and offline. Put it behind a clean interface (`CoachEngine`) so a Claude-powered coach can be swapped in later |
| Exercise visuals | **Custom minimal line-art animations** (SVG + CSS/JS animation) in one consistent style. Aim for ~35 core exercises in v1 |
| Motion tracking | **Not in v1.** Rep counting with phone sensors is unreliable. Track with set check-offs, logged weight/reps/time, and rest timers |
| Hosting | None yet. Do **not** deploy. Carlo decides later (Vercel is the likely choice) |

Suggested stack (the builder may adjust with good reason, documented in `docs/DECISIONS.md`): Vite + React + TypeScript, Tailwind CSS, Dexie (IndexedDB), `vite-plugin-pwa`, Framer Motion (or plain CSS) for motion, date-fns, Vitest for unit tests, Playwright for end-to-end tests and screenshots.

## 4. Core concepts / data model
- **Profile**: name, age (optional), body weight (optional), experience per discipline (beginner/intermediate/advanced), primary goal (e.g. athletic build, endurance, strength, general health), sports he does (tennis, water skiing, …), default equipment context.
- **Goal / Block** (month-level, about 4 weeks): focus (e.g. "build base + upper-body strength"), target sessions per week per type (run / gym / sport / mobility), weekly availability pattern (which days and time windows, typical minutes available), realism check.
- **Week plan**: generated from the block plus this week's availability, with a weekly focus that can be overridden ("this week more legs", "deload", "tennis tournament week"). Each slot is a planned session with type, rough duration and intent.
- **Session (workout)**: type, equipment context (**Gym / Home with some equipment / Bodyweight only / Outdoors**), editable per session; duration; list of exercises or run intervals; status (planned → committed "today I'm doing this" → in progress → done/skipped).
- **Exercise library**: id, name, muscle groups, movement pattern (push/pull/squat/hinge/lunge/carry/core/plyo/cardio), equipment needed, difficulty, cues (2–3 short lines), common mistake, animation id, substitutions (same pattern, different equipment).
- **Log**: per set: weight, reps, RPE (optional), done flag; per run: distance, time, pace, interval completion; per session: date, duration, perceived effort, notes.

## 5. Features
### 5.1 Onboarding (≤ 2 minutes)
Short, friendly steps: goal, sports, experience, availability (days + typical time windows), equipment access (gym nearby?), sessions per week wanted. Ends with the first month plan.

### 5.2 Month view: "the roadmap"
- Shows the 4-week block: focus, weekly targets (e.g. 3× run, 3× gym, 1× tennis), progression per week (build, build, peak, deload).
- **Realism check**: if targets exceed availability or recovery capacity, flag it plainly and suggest a realistic version.
- **Recommendation + alternative**: e.g. "Recommended: 3 gym + 2 runs + 1 tennis. Alternative: 2 gym + 3 runs (endurance bias)." One tap to switch.

### 5.3 Week view: "fit it into my timetable"
- 7-day strip. Enter availability for this week (quick toggles per day + minutes).
- Engine distributes sessions sensibly (no heavy legs before a long run, rest spacing, hard/easy alternation, sport days count as load).
- Weekly focus selector that adjusts the mix.
- Drag or tap to move sessions between days; engine re-validates.
- Recommendation + alternative for the week.
- **Calendar export**: `.ics` file for the week's sessions so they drop into Apple/Google Calendar.

### 5.4 Workout detail: "Today I'm doing this"
- Before committing: change **equipment context**, **duration** (slider/stepper, e.g. 20–90 min), and intensity; the workout regenerates live.
- Shows the recommended workout **and one alternative** (different emphasis or format).
- Gym/strength: warm-up → main lifts → accessories → core/finisher → cool-down. Sets × reps, target weight suggestion (from history), rest time.
- Running: type (easy, tempo, intervals, long, recovery, treadmill variants), structure (warm-up, intervals, cool-down), target pace/effort zones, progression across the block.
- Sports (tennis, water skiing, etc.): logged as sessions that count toward load; optional prep/mobility routine and sport-specific conditioning suggestions.
- Swap any exercise for a substitution (same movement pattern).

### 5.5 Active workout mode
- One exercise at a time, large animated illustration, 2–3 cues, sets list.
- Tap to check off each set; log weight/reps (prefilled from last time / suggestion).
- **Rest timer** starts automatically after a set (vibration/sound if available), skippable.
- Run mode: interval timer with clear current/next step, big readable numbers.
- Progress bar for the session; finish screen with summary + perceived effort.
- Screen stays awake during the workout (Wake Lock API where supported).

### 5.6 Progress
- Calendar heatmap / streak of completed sessions vs planned (adherence).
- Per-exercise history and estimated 1RM trend; personal records.
- Running: weekly distance, pace trend.
- Weekly volume per muscle group.
- Minimal charts, no clutter.

### 5.7 Settings
Profile edit, units (kg/km default), backup export/import (JSON), reset data, theme (system / light / dark).

## 6. Training engine principles (must be sound; this is the core value)
- Progressive overload: double progression for strength (rep range, then add load); suggested weight from last logged performance.
- Running: mostly easy (about 80/20), progress weekly volume ≤ ~10%, one quality session per week for beginners, two for intermediate+.
- Weekly balance of movement patterns (push/pull/squat/hinge/core) across gym sessions; full-body or upper/lower or PPL split chosen by sessions per week.
- Recovery spacing: avoid same-muscle heavy days back-to-back; hard run not the day after heavy legs; tennis/water skiing count as load.
- Deload in week 4 of a block.
- Duration scaling: when time is cut, keep main lifts, cut accessories first; when extended, add accessories/conditioning.
- Equipment substitution via movement pattern.
- **Training style (added Nov 2026, Carlo's preference): bodyweight first.** Calisthenics moves (pull-ups, dips, push-up variations, rows, single-leg work) lead; only a few simple classic lifts are used (back squat, deadlift, RDL, bench, overhead press, barbell/dumbbell row, goblet squat); no machines or cables. Leg main lifts stay classic barbell because bodyweight alone stops being enough. Selectable in onboarding/Settings: bodyweight first (default) / free weights / anything.
- Everything deterministic and unit-tested. Keep the logic in a pure TypeScript module (`src/engine/`) with no UI dependencies.

## 7. Design direction
**Minimal.** Calm, lots of white space, one accent color, strong typography, few borders, soft depth. Think "quiet premium": Apple Fitness clarity without the visual noise. Light and dark mode. Mobile-first (iPhone 13–16 sizes), thumb-reachable primary actions, bottom tab bar (Today · Plan · Progress · Settings). Smooth, subtle motion. Line-art exercise animations in a single stroke style that fits the UI. No stock photos, no emoji-heavy UI, no gradients-everywhere.

## 8. Out of scope for v1
Accounts/sync, AI coach, motion/rep detection, social features, nutrition, wearable integrations (Apple Health, Strava). Keep the code ready for AI coach and Health/Strava later.

## 9. Definition of done (v1)
- `npm run build` passes with no type errors; unit tests for the engine pass; Playwright e2e covers onboarding → month plan → week plan → commit workout → complete workout → progress shows it.
- Installable PWA (manifest, icons, offline after first load).
- Mobile screenshots of every main screen in light and dark mode saved in `docs/screenshots/`.
- `README.md` explains for a non-coder how to run it locally and how to deploy it later.
- `docs/DECISIONS.md` lists key choices; `docs/KNOWN_ISSUES.md` lists what's not done or not tested.
