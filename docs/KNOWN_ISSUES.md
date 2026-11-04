# Known issues and gaps (v1)

Honest list of what is not done, not tested, or only approximately right. Newest findings at the bottom of each section.

## Not tested on a real phone
- Everything was tested in desktop Chromium with an iPhone-sized window (Playwright). **Not tested on a real iPhone/Safari**: home-screen install, Safari's storage behaviour, wake lock, vibration, sound, safe-area padding around the notch and home bar.
- **Wake Lock** (screen stays on) needs iOS 16.4+ and only works when the app is installed or open in Safari. It fails silently elsewhere.
- **Vibration** is not supported on iPhone at all (Safari has no Vibration API). Rest-timer and run-step alerts there are the short beep only, and iOS may mute it with the silent switch.
- **Offline**: the service worker precaches the app and the e2e test checks it reloads offline in Chromium. Not verified in iOS Safari.
- **Storage can be cleared by iOS**: Safari may delete website data for sites not used in a while (about 7 days) unless the app is added to the home screen. Export a backup now and then.

## Features that are simplified
- **Supersets** in active mode: shown as a hint ("Superset with …") and a short rest after the first exercise. The screen does not jump between the two exercises automatically.
- **Sports** are planned by the engine on free days; there is no "tennis is always on Tuesday" setting yet. Move the session once per week, or set the day as the only free day for it.
- **One sport count per week** for all sports together. With tennis and water skiing in the profile, the plan alternates between them ("1 tennis / water skiing").
- **Weekly volume per muscle** counts logged sets only (warm-ups and mobility are excluded). Bodyweight sets count the same as loaded ones.
- **e1RM trend** includes deload weeks, so it dips in week 4 (lighter weights → lower estimate). Expected, but it can look like a step back.
- **Imperial units** are converted for display only; the engine still works in kg and kg increments (e.g. "+2.5 kg" becomes about 5–6 lb).
- **Run distance** is typed in by hand after a run. No GPS, no Strava/Health import (out of scope for v1).
- **No reminders/notifications.** The .ics calendar export is the way to get sessions into the phone calendar.
- **Past weeks** are only visible in Progress; the week planner can navigate within the current 4-week block only.

## Engine choices to confirm with Carlo
- With 3 runs and 2–3 gym days per week, intermediate runners get **one** quality run, not two (two made almost every day a hard day). Two quality runs start at 4 runs a week, or 3 runs with one gym day. See `DECISIONS.md`.
- When the block's run count goes up but recent logged running is low, the plan keeps total running minutes within +10 % of what was actually run, so individual runs get short (e.g. a 25-minute tempo run). Correct by the 10 % rule, but may feel small.
- Starting weights: with no history the app does not guess a number; it says "pick a weight you could lift 2–3 more times". The first logged session sets the baseline.
- Rep ranges, rest times and the weekly "load points" budget are sensible defaults, not tuned to Carlo yet.

## Animations that are only approximate
All 42 exercises have an animation in the same style; these read less well than the rest:
- **Side plank**, **open book**: lying on the side is hard to show in a side-view stick figure; stylised.
- **Hanging knee raise**, **pull-up**: the hang is a little compressed to fit the frame.
- **Pike push-up**: the bottom position bends the elbows awkwardly.
- **Prone Y raise**: the "Y" isn't visible from the side.
- **Skater jump**: reads more like a wide squat than a bound.
- Small props (bars, rails, dumbbells) are hard to see at thumbnail size.

## Not covered by automated tests
- Unit tests cover the engine, the data layer (incl. backup round trip) and animation bounds. Screens have no unit tests.
- The e2e tests cover onboarding → month → week (move, focus) → commit gym workout → complete → progress, a run session, and offline reload. Not covered: settings (export/import/reset, units, theme), "Plan next month", week availability editing, "Log as done" for sport, skip/undo, swap exercise.
- Backup **import** was unit-tested at the data layer, not clicked through in the UI with a real file picker.
