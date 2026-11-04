# Known issues and gaps (v1)

What isn't done, isn't tested, or is a known compromise.

## Not tested on a real phone
- Everything has only been tested in Chromium at iPhone size (Playwright). Nothing has run on a real iPhone, so these are untested there:
  - Safari quirks
  - "Add to Home Screen"
  - Wake Lock (iOS supports it from 16.4)
  - vibration (iOS Safari does not support `navigator.vibrate`, so the rest timer can only beep there)
  - the rest-timer beep with the phone on silent
- The offline service worker has been built but not checked in airplane mode on a device. It needs an `https://` host to work at all.

## Training engine
- **The +10% weekly run cap is a coaching habit, not a proven injury law.** Buist 2008 found no injury benefit vs a faster build. We keep a gentle cap so weeks don't explode. The screen does not call it an injury law. The lighter week is there so load does not only rise.
- **Pace guidance is effort-based** (talk test) until some easy runs with distance are logged. There are no heart-rate zones.
- **No automatic weight for a lift's first session.** The app says "pick a weight you could lift 2–3 more reps with".
- **A week that starts mid-way drops sessions instead of cramming them in.** If the remaining free days are back to back, the week can still end up with several hard days in a row. The app warns about it but doesn't fix it.
- **Sport sessions aren't fully planned around.** Conditioning advice per sport only exists for tennis, water skiing and running; other sports get a generic version. Sport load counts toward recovery rules, but the engine doesn't change a sport session's own length.
- **The alternative week is always "one session fewer"** (or different days when there are only a few sessions). There's no "harder week" alternative.
- **Week focus "sport week" caps gym at 2 and runs at 1**, whatever the block says. That's a deliberate simplification.

## Exercise animations
- All figures are a side-view stick figure. Some moves can't be shown well from the side:
  - lateral raise (shown as a front raise)
  - side plank, band pull-apart
  - open book (thoracic rotation)
  - Pallof press (the band anchor is drawn behind)
- Near-identical side views: chin-up vs pull-up, diamond vs regular push-up, wide vs regular inverted row. Cossack squat is a sideways move, shown as a deep single-leg squat. Dip bars are drawn as one line without posts.
- There are no machine props. Leg press, rowing machine and incline bench are approximations.
- The loop plays a move forward then back. Jumps look like they rewind on the way back.

## Training style
- "Bodyweight first" keeps barbell squats/deadlifts as the leg main lifts. If Carlo wants legs fully bodyweight too, pick the Bodyweight context for that session (or we add a stricter style).
- Bodyweight progression steps to a harder variation when every set hits the top of the range, and only when that variation is doable (equipment, difficulty, same pattern). If nothing harder fits, the note still says to slow the lowering. A chain can stall at a hard move (for example a beginner who has topped out negatives but is not ready for pull-ups).
- Weighted calisthenics (weighted pull-ups/dips) is not modelled.

## App
- **Sheet drag-to-dismiss is tested in Playwright Chromium, not on a real iPhone yet.** Safari touch and the home-indicator area can still surprise us.
- Calendar export uses fixed start times per time window (07:00, 12:00, 18:00) and doesn't know your timetable.
- A backup import replaces all data. There's no merge.
- Units are converted for display only. Everything is stored in kg/km. Weight inputs during a workout are in kg.
- There's no undo after resetting data, apart from importing a backup.
