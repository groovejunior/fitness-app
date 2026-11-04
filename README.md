# Fitness App

Carlo's personal training planner. It is a web app for your phone (a "PWA": a website you can install to the home screen and use offline). See `SPEC.md` for what it does and `CLAUDE.md` for how work happens here.

Everything is stored on the phone itself. There's no account and no server. A backup can be exported in Settings.

## What's in it

- **Onboarding** (about 2 minutes): goal, sports, experience, free days, equipment, sessions per week. It ends with the first month plan.
- **Plan, Month view**: the 4-week block (build, build, peak, deload), weekly targets, a realism check, and a recommended plan plus an alternative you can switch to with one tap.
- **Plan, Week view**: your week fitted to your free days. You can change availability, pick a weekly focus (more legs, deload, sport week…), move sessions, switch to the lighter alternative and export the week to your calendar (`.ics`).
- **Bodyweight first**: by default workouts are built from calisthenics (pull-ups, dips, push-up variations, rows, single-leg work) plus a few classic barbell lifts for legs, never machines. Switch to "free weights" or "anything" in Settings.
- **Today, "Today I'm doing this"**: change equipment (gym, home, bodyweight, outdoors), time and effort, and the workout rebuilds itself. There's always a recommended workout and an alternative. Any exercise can be swapped.
- **Workout mode**: one exercise at a time, with a line-art animation and short cues. Tap to check off a set; weights are filled in from last time. A rest timer starts on its own. Runs get a big interval timer. The screen stays awake.
- **Progress**: a calendar of done vs planned sessions, a streak, lift history with estimated 1-rep max, running distance and pace, and weekly sets per muscle group.
- **Settings**: profile, units, theme (system / light / dark), backup export/import and reset.

The training rules (progressive overload, 80/20 running, recovery spacing, deload weeks) live in `src/engine/`. That code is plain logic with no screen code in it, and it has unit tests. `docs/DECISIONS.md` explains the choices.

## Run it on your computer

You need **Node.js** (version 20 or newer). Get it from https://nodejs.org (the "LTS" button).

Open the Terminal app, go to this folder, and run:

```bash
npm install
```

```bash
npm run dev
```

The terminal then shows an address like `http://localhost:5173`. Open it in a browser. To see the phone layout on a computer, open the browser's developer tools and switch on the device toolbar.

**On your phone (same Wi-Fi):** run `npm run dev -- --host`. The terminal shows a "Network" address like `http://192.168.1.20:5173`. Open that on the iPhone in Safari.

Installing to the home screen and offline use need a proper `https://` address, so they only work once it's hosted (see below).

## Checks

```bash
npm run build        # type-check and build the app into dist/
npm test             # unit tests for the training engine
npm run e2e          # end-to-end test in a phone-sized browser (needs a build first)
npm run screenshots  # regenerate docs/screenshots/
```

## Putting it online later (not done yet, on purpose)

Nothing is deployed. When you decide, Vercel is the simplest option:

1. Push this repository to GitHub (it already is).
2. Sign in at https://vercel.com with GitHub, choose **Add New → Project**, and pick this repository.
3. Vercel detects Vite. Keep the defaults (build command `npm run build`, output folder `dist`) and press **Deploy**.
4. Open the `https://…vercel.app` address on your iPhone in Safari, tap **Share → Add to Home Screen**. It now opens like an app and works offline.

Your data stays on each device. If you switch phones, export a backup in Settings and import it on the new one.

## Folder map

| Folder | What's inside |
|---|---|
| `src/engine/` | The training engine: planning rules, workouts, progression, exercise library. No UI. |
| `src/animations/` | The stick-figure rig and one animation per exercise. |
| `src/db/` | On-device storage (IndexedDB), backup, and the app's actions. |
| `src/screens/` | The screens: Today, Plan, workout detail, workout mode, Progress, Settings, onboarding. |
| `src/ui/` | Shared design system: buttons, cards, sheets, icons. |
| `e2e/` | End-to-end test and screenshot script. |
| `docs/` | Decisions, known issues, screenshots. |
