# Fitness

Carlo's personal training app. It turns a rough plan for the month ("3 gym sessions, 2 runs and tennis each week, I'm free these evenings") into a week that fits your timetable, and then into concrete workouts with animated exercises, sets, reps, rest timers and progress tracking.

It is a **PWA** (progressive web app): a website that you can add to your iPhone home screen. Once added it opens like an app, works without internet, and keeps all your data **on the phone only**. There is no account and no server.

- What the app should do: [`SPEC.md`](SPEC.md)
- Why things were built the way they are: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- What is not finished or not tested: [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md)
- Screenshots: [`docs/screenshots/`](docs/screenshots/)

## Run it on your computer

You need **Node.js** once (the program that runs the build tools). Download the "LTS" version from [nodejs.org](https://nodejs.org) and install it like any other app.

Then open the **Terminal** app, go to this folder and run these commands one at a time:

```bash
cd path/to/fitness-app
```

```bash
npm install
```

```bash
npm run dev
```

The last command prints an address like `http://localhost:5173`. Open it in your browser. Leave the terminal window open while you use it; press `Ctrl + C` to stop.

**Try it on your phone (same Wi-Fi):** run `npm run dev -- --host` instead. It prints a second address like `http://192.168.1.20:5173`; open that in Safari on your iPhone. (Installing to the home screen and offline mode need a real https address, which comes with hosting, below.)

**Demo data:** open `http://localhost:5173/#/dev/seed` to fill the app with four weeks of made-up history so every screen has something in it. This wipes whatever is in the app in that browser.

## Checks

| Command | What it does |
|---|---|
| `npm test` | Runs the unit tests (training engine, data storage, animations). |
| `npm run e2e` | Builds the app and clicks through it in a headless browser: onboarding → month → week → workout → finish → progress. |
| `npm run build` | Makes the final version in the `dist/` folder and checks for type errors. |
| `npm run preview` | Serves the built `dist/` folder locally, the way it would run when hosted. |

## Put it online later (not done yet)

Nothing has been published. When you want the app on your phone for real, it needs to be hosted at an https address. The app is a plain static website (just the `dist/` folder), so any static host works. **Vercel** is the easiest:

1. Make a free account at [vercel.com](https://vercel.com) and sign in with GitHub.
2. "Add new project" → pick this repository.
3. Vercel detects Vite. Keep the defaults (build command `npm run build`, output folder `dist`) and deploy.
4. Open the address it gives you in Safari on your iPhone → Share → **Add to Home Screen**.

Every time `main` changes on GitHub, Vercel rebuilds automatically. Your training data stays on the phone and is not touched by updates. Netlify, Cloudflare Pages or GitHub Pages work the same way.

## Your data

- Everything lives in the browser's storage on the device you use (IndexedDB). Using the app on a different phone or browser starts empty.
- **Settings → Export backup** saves everything as one `.json` file (put it in iCloud Drive or email it to yourself). **Import backup** restores it, replacing what is there.
- Deleting the home-screen app or clearing Safari's website data deletes your training history. Export a backup now and then.

## How the code is organised

| Folder | What's inside |
|---|---|
| `src/engine/` | The "coach": all training logic (month plans, week layout, workouts, progression, running plans, stats). Pure TypeScript, no screens, fully unit-tested. Behind one interface (`CoachEngine` in `coach.ts`), so an AI coach could replace it later. |
| `src/content/` | The exercise library (42 exercises with cues and swaps) and the list of sports. |
| `src/anim/` | The line-art exercise animations: a small renderer plus pose data per exercise. See `docs/ANIMATION_STYLE.md`. |
| `src/data/` | Storage on the phone (Dexie / IndexedDB), backup and restore. |
| `src/ui/`, `src/components/` | The design system: colours, type, buttons, cards, sheets, tab bar. |
| `src/screens/` | The screens: onboarding, Today, Plan (month + week), workout detail, active workout, progress, settings. |
| `e2e/` | The end-to-end browser test. |
