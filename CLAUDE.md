# Fitness App: Project Context for Claude

Carlo Müller's personal fitness PWA. **Read `SPEC.md` first**: it is the source of truth for the product. Carlo is not a coder; he steers in plain language. Explain technical terms the first time they come up.

> **Keep this file current.** When a session changes something (decision, feature, status), update §3 and add one dated line to §5.

## 1. Agreed decisions (Nov 2026)
- Phone web app (PWA), on-device storage (IndexedDB) with JSON backup, rule-based training engine behind a swappable `CoachEngine` interface, custom minimal line-art exercise animations, no motion tracking in v1.
- **Do not deploy or publish anything.** Carlo decides hosting later.
- Design: minimal, calm, one accent colour, light + dark mode, mobile-first.

## 2. How to work in this repo (for build sessions)
- **Model use, efficiently:** the lead session (Opus) owns architecture, the training engine (`src/engine/`), design system, integration and the final review. Delegate well-scoped work to subagents via the Agent tool:
  - `model: "sonnet"`: individual screens/components to a clear spec, the exercise library data + SVG animations in batches, Playwright tests, README/docs.
  - `model: "haiku"`: mechanical tasks: data entry, renaming, small lint/type fixes, screenshot runs.
  - Give each subagent a precise brief (files, interface, done criteria) and review its output before moving on. Never give two subagents the same files at once.
- Commit in small, meaningful steps on a feature branch; open a PR at the end. Don't push to `main` directly.
- Before calling something done: build, run unit + e2e tests, take mobile screenshots (light + dark) and look at them critically. Fix visual issues, not just functional ones.
- Record trade-offs in `docs/DECISIONS.md` and anything untested or unfinished in `docs/KNOWN_ISSUES.md`. Be honest there.
- No AI-sounding UI copy. Short, plain, human sentences.

## 3. Current status
- 2026-11-04: v1 built on branch `claude/upbeat-hopper-k4123t` (PR open, not merged, nothing deployed). All screens from SPEC §5 exist: onboarding, Today, Plan (month + week), workout detail, workout mode (sets, rest timer, run interval timer), finish, Progress, Settings. Rule engine in `src/engine/` with 76 unit tests; Playwright e2e journey passes; screenshots in `docs/screenshots/`.
- Exercise library: 89 exercises, each with a line-art animation on one shared stick-figure rig (`src/animations/rig.ts`).
- Training style defaults to **bodyweight first** (Carlo's wish: calisthenics + a few classic lifts, no machines); changeable in Settings.
- Not tested on a real iPhone yet; see `docs/KNOWN_ISSUES.md`.

## 4. Open questions for Carlo (later)
- Hosting (Vercel?) and whether to add cloud sync.
- Whether to add a Claude AI coach on top of the rule engine.
- Which exercises/sports to add after using v1.

## 5. Session log
- 2026-11-04: Spec written from Carlo's brief; decisions agreed (PWA, local storage, rule engine, custom animations). Private repo created; cloud build session launched.
- 2026-11-04: First full build of v1 (engine, library + animations, all screens, tests, docs, screenshots).
- 2026-11-04: Carlo: "not a fan of machines, mainly bodyweight/calisthenics and a few simple classic exercises" → added training style (bodyweight first by default), 16 calisthenics moves, Progress tracks bodyweight lifts by reps.
