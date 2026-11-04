# Brief for screen builders (shared rules)

You build one group of screens for Carlo's fitness PWA. Read `SPEC.md` (§5 features, §7 design) and `CLAUDE.md` (copy rules) first.

## Ownership
- Only create or edit files inside the folder(s) named in your task. Everything else is read-only for you, including `src/ui`, `src/components`, `src/engine`, `src/data`, `src/lib`, `src/App.tsx`.
- Need a change in a shared file (a missing engine function, a new UI component)? Don't make it. Build a local version inside your folder if it is small, or list it in your final report.
- Do not commit, push, deploy or install packages.
- Your screen is a default export at the path given (a placeholder exists; replace it). Routes are already wired in `src/App.tsx`.

## Building blocks
- UI kit (`src/ui`, import from `'../../ui'`): `Button` (variants primary/secondary/ghost/danger, sizes sm/md/lg, `block`), `Card`, `CardButton`, `Segmented`, `Stepper`, `Sheet` (bottom sheet), `Toggle`, `Chip`, `Pill`, `ProgressBar`, `Notice`, `List` + `ListRow`, `TextField`, `Page` (content column, clears the tab bar), `ScreenHeader` (large title), `SectionLabel`, `Icon` (see names in `src/ui/Icon.tsx`), `cx`.
- Shared components (`src/components`): `SessionGlyph`, `TYPE_LABEL`, `TopBar` (back bar for pushed screens), `WeekStrip`, `Empty`, `Loading`.
- Exercise art: `ExerciseFigure` from `src/anim/Figure.tsx` (`animation={exercise.animation}`, `animate={false}` for thumbnails, give it a width class like `w-16` or `w-full` and `text-ink`).
- Content: `src/content/exercises.ts` (`getExercise`, `CONTEXT_LABEL`), `src/content/sports.ts` (`SPORTS`, `getSport`).
- Engine: always go through `coach` (`import { coach } from '../../engine'`), plus pure helpers exported from `src/engine` (dates, labels, stats, `weekToIcs`). Never re-implement training logic in a screen.
- Data: read with hooks in `src/data/hooks.ts` (live: screens update by themselves after writes), write with functions in `src/data/repo.ts`. `today()` is in `src/lib/today.ts`. Formatting in `src/lib/format.ts` (units-aware weight/distance/pace, clock, dates, prescriptions).

## Design rules
- Minimal and calm. One accent colour. Lots of space, few borders, soft cards (`bg-surface shadow-soft rounded-lg`).
- Only use the design tokens, never raw colours: `bg-bg bg-surface bg-surface-2 text-ink text-ink-2 text-ink-3 border-line bg-accent text-accent text-accent-ink bg-accent-soft text-warn bg-warn-soft text-danger`. Type: `text-display text-title text-headline text-body text-caption text-micro text-numeral`, `font-semibold`/`font-bold`, `tabular` for numbers. Radius `rounded-sm/md/lg/xl`. Light and dark mode then work automatically.
- Mobile first at 390 × 844. Horizontal padding `px-5` for page content. Primary actions at the bottom, reachable with a thumb. Pushed screens (no tab bar) put a sticky action bar at the bottom with `pb-safe`.
- Motion: subtle (`animate-fade-up` for entering content is available). No bouncing, no confetti.
- Copy: short, plain, human. Sentence case. No exclamation marks, no emoji, no hype ("Let's crush it"), no "AI". Explain a number when it isn't obvious.
- Accessibility: real `<button>`s, labels on inputs, `aria-label` on icon-only buttons. Use the exact accessible names your task lists: the end-to-end test will look for them.

## Seeing your work
1. Run a dev server on your own port in the background: `npx vite --port <PORT> --strictPort`.
2. Fill it with demo data (wipes data for that port only): open `http://localhost:<PORT>/#/dev/seed?to=<route>` (add `&empty=1` for a profile and current plan without history).
3. Screenshot light and dark: `node scripts/shoot.mjs "http://localhost:<PORT>/#<route>" <file.png> light 390 844 true` (and `dark`). Seed in the same browser context first, or write a small Playwright script that opens the seed URL, waits for the redirect, then screenshots (IndexedDB persists per browser context; `shoot.mjs` starts a fresh context, so for seeded screenshots write your own short script — chromium is preinstalled, `require('playwright')` works).
4. Look at the screenshots critically, like a picky designer: spacing, alignment, truncation, contrast in dark mode, empty states, long names. Fix and repeat.
5. `npx tsc -b` must pass with no errors before you report. Kill your dev server at the end.

## Report
Short: files written, what works, what you skipped or couldn't do, anything you need changed in shared files, paths of your final screenshots.
