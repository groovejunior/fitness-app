# Fitness App: Project Context for Claude

Carlo Müller's personal fitness PWA. **Read `SPEC.md` first**: it is the source of truth for the product. Carlo is not a coder; he steers in plain language. Explain technical terms the first time they come up.

> **Keep this file current.** When a session changes something (decision, feature, status), update §3 and add one dated line to §5.

## 1. Agreed decisions (Nov 2026)
- Phone web app (PWA), on-device storage (IndexedDB) with JSON backup, rule-based training engine behind a swappable `CoachEngine` interface, custom minimal line-art exercise animations, no motion tracking in v1.
- **Hosting: GitHub Pages** (decided 2026-11-04), at https://groovejunior.github.io/fitness-app/, published by `.github/workflows/pages.yml` on every push to `main`. Don't publish anywhere else without Carlo asking.
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
- 2026-11-04: v1 merged into `main` (PR #2). GitHub Pages deploy workflow added (PR #3); Carlo still has to switch Pages on in the repo settings (and the repo must be public or on GitHub Pro). All screens from SPEC §5 exist: onboarding, Today, Plan (month + week), workout detail, workout mode (sets, rest timer, run interval timer), finish, Progress, Settings. Rule engine in `src/engine/` with 76 unit tests; Playwright e2e journey passes; screenshots in `docs/screenshots/`.
- Exercise library: 89 exercises, each with a line-art animation on one shared stick-figure rig (`src/animations/rig.ts`).
- Training style defaults to **bodyweight first** (Carlo's wish: calisthenics + a few classic lifts, no machines); changeable in Settings.
- Bottom sheets: grabber bar now drags (or taps) to dismiss.
- Training knowledge: cited rulebook confirmed. The six sources that should drive the coach are listed in Settings and in `docs/TRAINING_KNOWLEDGE.md` (Australian guidelines, Currier 2023, ACSM 2009 progression, Seiler, IOC load consensus, Kotarsky 2018). Engine rules are not rewritten to cite them yet.
- Not tested on a real iPhone yet; see `docs/KNOWN_ISSUES.md`.

## 4. Open questions for Carlo (later)
- Whether to add cloud sync.
- Whether to add a Claude AI coach on top of the rule engine.
- Which exercises/sports to add after using v1.
- Encode the six chosen sources into the engine, one family of rules at a time (gym dose, adding load, bodyweight variations, rest, running mix, the lighter week).

## 5. Session log
- 2026-11-04: Spec written from Carlo's brief; decisions agreed (PWA, local storage, rule engine, custom animations). Private repo created; cloud build session launched.
- 2026-11-04: First full build of v1 (engine, library + animations, all screens, tests, docs, screenshots).
- 2026-11-04: Carlo: "not a fan of machines, mainly bodyweight/calisthenics and a few simple classic exercises" → added training style (bodyweight first by default), 16 calisthenics moves, Progress tracks bodyweight lifts by reps.
- 2026-11-04: Carlo chose GitHub Pages (like his other app). Added `BASE_PATH` support in `vite.config.ts` and a deploy workflow that runs the unit tests, builds and publishes on every push to `main`.
- 2026-11-04: Sheet grabber bar now dismisses (drag / flick / tap). Training knowledge: research into open sources; decision is a cited rulebook (`docs/TRAINING_KNOWLEDGE.md`); Settings explains it. Engine not rewritten yet.
- 2026-11-05: Sheet-grabber PR merged. Deeper source pass: six sources chosen to drive the coach (Australian guidelines, Currier 2023, ACSM 2009, Seiler, IOC 2016, Kotarsky 2018). Written up in `docs/TRAINING_KNOWLEDGE.md` and shown in Settings. Engine still not rewritten.
