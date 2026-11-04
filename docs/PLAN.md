# v1 build plan

Branch: `feat/v1` (the cloud session also mirrors it on its own working branch). One long build run, committed in small steps.

## Milestones

| # | Milestone | Owner | Done when |
|---|---|---|---|
| 1 | Plan + scaffold (Vite, React, TS, Tailwind, Dexie, PWA, Vitest, Playwright) | Opus (lead) | `npm run build` and `npm test` run on an empty app |
| 2 | Design system: tokens (colour, type, spacing, radius), light + dark, base components (Button, Card, Segmented, Stepper, Sheet, TabBar) | Opus | Components used by a demo screen, both themes look right |
| 3 | Training engine `src/engine/` behind `CoachEngine`: month block + realism check, week distribution + recovery rules, workout generation, rec + alternative, substitutions, progressive overload, running plans (80/20, ≤10 %), deload week 4 | Opus | Thorough Vitest suite passes |
| 4 | Exercise library: ~35 exercises with cues, common mistake, substitutions | Opus (data), Sonnet (animation batches) | Every exercise has an animation in the shared stroke style |
| 5 | Data layer: Dexie schema, repository functions, JSON backup/restore | Opus | Unit-tested round trip |
| 6 | Screens: onboarding, Today, month roadmap, week planner, workout detail, active workout, progress, settings | Sonnet subagents (one screen group each, never sharing files), Opus integrates | Every screen reachable and working with real engine data |
| 7 | PWA: manifest, icons, offline | Opus | Build emits service worker + manifest; app loads offline in preview |
| 8 | Quality: Playwright e2e (onboarding → month → week → commit → complete → progress), screenshots light + dark | Sonnet (tests), Haiku (screenshot runs, small fixes) | e2e green; screenshots reviewed and visual issues fixed |
| 9 | Final review: README for Carlo, DECISIONS, KNOWN_ISSUES, CLAUDE.md status/log | Opus | All checks pass |
| 10 | Push branch, open PR to `main` | Opus | PR open with summary, screenshots, untested list |

## Delegation

- **Opus (lead):** architecture, `src/engine/`, `src/data/`, design tokens + base components, reference animation + style guide, integration, review of every subagent result.
- **Sonnet:** exercise animations in batches (strict style guide + reference), screen groups to precise briefs, Playwright e2e.
- **Haiku:** screenshot runs, mechanical lint/type fixes.

Rule: no two subagents touch the same files at the same time. Each brief lists the files it owns.

## Outcome
All milestones done in one run. Deviations: the animation work was done as pose data for one shared renderer (see DECISIONS); a parallel duplicate session's additions (bodyweight-first style, more calisthenics moves) were ported in at the end. Screenshot runs were done by the lead with `scripts/screenshots.mjs` rather than a Haiku subagent, as a single command run.
