# Where the training knowledge should come from

Carlo asked: the first draft uses general training knowledge. Can we do deep research, find open books and papers, and build the coach on that instead?

Short answer: **yes, and the right way is a cited rulebook** — keep the same kind of coach (fast, offline, predictable), but pin each rule to a published source. Do not paste copyrighted books into the app, and do not ask an AI to invent a new plan from the internet every week.

## What we have today

The coach in `src/engine/` is a set of rules. They match common good practice:

- Add a little over time (progressive overload).
- Most running stays easy; one or two sessions a week are quality work.
- Hard days are spaced; sport counts as load.
- Week 4 of a block is lighter.
- Bodyweight moves lead; a few classic lifts cover legs.

Those rules are not yet tied to named papers. That is the gap. The app already has a clean seam (`CoachEngine`) so we can change the rules without rebuilding the screens.

## The options

### 1. Cited rulebook (recommended)

Keep the rule engine. For each rule, write down the source, in one plain sentence, and a link. Where the evidence is thin or mixed, say so instead of dressing a habit up as science.

Then, one rule at a time, check the code against the paper. If they disagree, change the code (or keep the rule and write why).

**Why this fits the app:** it stays offline, instant, and testable. You can open a workout and later tap “why this looks like that.” A Claude coach, if we add one, can read the same notes instead of guessing.

### 2. Drop open books in and let an AI read them live

Possible later, not as the base. It needs the network, answers can drift, and it fights the “works on the phone with no account” design. Use this only as an extra explainer on top of option 1.

### 3. Build on famous coaching books

Books such as *Starting Strength*, *Practical Programming*, *Overcoming Gravity*, Bompa’s periodization texts, or Helms’s hypertrophy pyramid are useful to **read**. They are not free to copy. We must not put their text, tables, or programs in the repo. If a book and a paper say the same thing, we cite the paper.

The one open textbook worth keeping on the shelf is MacIntosh’s *[Open Textbook of Exercise Physiology](https://pressbooks.openeducationalberta.ca/otep/)* (CC BY-NC). It is physiology, not a training program, so it backs *why* a rule works rather than *what* the week contains.

### 4. Re-research the literature every time you open the app

Slow, expensive, inconsistent, and useless on a plane. A one-off literature pass (this document) is the research step. Encoding it is the product step.

## The source library (all free to read)

We only pin rules to things we can link. Order: official guidelines first, then consensus reviews, then specific trials.

### Health minimums (the floor)

- **Australian 24-hour movement guidelines** (Department of Health, 2026 update). Adults: 30 minutes most days, muscle-strengthening on 2+ days, some balance/coordination work, less sitting. [Guidelines](https://www.health.gov.au/topics/physical-activity/24-hour-movement-guidelines-for-all-australians/recommendations-for-adults-18-to-64-years).
- **WHO 2020 guidelines on physical activity and sedentary behaviour.** Same idea globally: 150–300 minutes moderate aerobic work a week (or 75–150 vigorous), plus muscle strengthening on 2+ days. CC BY-NC-SA. [WHO page](https://www.who.int/publications/i/item/9789240015128).

These set the floor for a “health” goal. Your athletic/strength goals sit *on top* of this, not instead of it.

### Gym and bodyweight

- **ACSM 2009 position stand**, *Progression Models in Resistance Training for Healthy Adults* (Ratamess et al.). The classic “how to add load” paper: novices 8–12 reps, 2–3 days/week; when you can do 1–2 reps over the target, add about 2–10% load; sequence big moves before small ones. [DOI](https://doi.org/10.1249/mss.0b013e3181915670).
- **ACSM 2025 overview of reviews**, *Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults*. Updates the 2009 stand. Strength likes heavier loads and 2–3 sets, 2+ sessions/week; size likes higher weekly set counts; training to failure is not required. Open on PMC: [PMC12965823](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/).
- **ACSM 2011 position stand**, *Quantity and Quality of Exercise…* (Garber et al.). Cardio + strength + neuromotor (balance/agility) + some mobility. [DOI](https://doi.org/10.1249/mss.0b013e318213fefb).
- **Schoenfeld, Ogborn & Krieger 2016**, volume and hypertrophy: more weekly sets → more growth, with diminishing returns. [PubMed](https://pubmed.ncbi.nlm.nih.gov/27433992/).
- **Schoenfeld, Ogborn & Krieger 2016**, frequency: train a muscle at least twice a week if you care about size. [PubMed](https://pubmed.ncbi.nlm.nih.gov/27102172/). A 2019 follow-up found that once weekly volume is equated, frequency itself matters less — so full-body three times a week and upper/lower both fine. [PubMed](https://pubmed.ncbi.nlm.nih.gov/30558493/).
- **Grgic, Schoenfeld et al. 2017**, rest between sets: short rests still build strength; trained people gain more with 2+ minutes on the main lifts. [PubMed](https://pubmed.ncbi.nlm.nih.gov/28933024/).
- **Singer et al. 2024**, rest and size: a small extra benefit past 60 seconds, little extra past 90. Open: [PMC11349676](https://pmc.ncbi.nlm.nih.gov/articles/PMC11349676/).
- **Kotarsky et al. 2018**, progressive push-up variations vs bench press: harder bodyweight versions *are* a real progression, not just a workaround. [JSCR](https://journals.lww.com/nsca-jscr/fulltext/2018/03000/effect_of_progressive_calisthenic_push_up_training.9.aspx).
- **Grgic et al. 2022**, training to failure vs stopping a little short: not required for strength or size. Open: [PMC9068575](https://pmc.ncbi.nlm.nih.gov/articles/PMC9068575/).

There is no good open textbook that *is* a calisthenics program. Bodyweight work uses the same physics as any other resistance training (overload, enough hard sets, progress the move when reps get easy). That is why we keep barbell squats/deadlifts for legs: once a bodyweight squat is easy, it stops being a strength stimulus. The 2025 ACSM overview says the same in other words — load and volume matter more than the toy you hold.

### Running

- **Seiler & Kjerland 2006** and **Seiler 2009**, *Intervals, Thresholds, and Long Slow Distance*. About 80% of endurance sessions stay easy (you can talk); the rest are quality. Free: [sportsci.org](https://sportscience.sportsci.org/2009/ss.htm).
- **Talk test** as an effort guide is the honest stand-in until we have heart-rate or pace data. It maps onto Seiler’s zone 1 reasonably well.

### The 10% running rule (be honest)

The app currently caps weekly run minutes at about +10%. That is a common coaching habit. It is **not** a law.

Buist et al. 2008 (GRONORUN) randomised novice runners to a 10%-ish build vs a faster 8-week plan. Injury rates were the same (~21%). A later review (Nielsen / PMC6253751) said there is no clear safe weekly jump. So: keep a gentle cap so weeks do not explode, but do not tell you it is proven to prevent injury. Sudden spikes still look unwise; the exact 10% number is a convention.

## How we should fold this in (next sessions)

1. **Do not rewrite the engine in one go.** Change one family of rules at a time (first: gym progression and weekly set counts; then running intensity mix; then rest times; then deload).
2. **Each rule gets a source id** in the engine, plus a one-line reason the screens can show.
3. **Where we already match**, just cite. Double progression is the ACSM “add 2–10% when you overshoot the RM” idea in another costume. 80/20 running is Seiler. Muscle-strengthening twice a week is WHO + Australian guidelines.
4. **Where we might change**, check with you first:
   - Rest on main lifts may be a bit short for strength (papers lean 2+ minutes once you are trained).
   - Bodyweight progressions should move to a harder variation when reps top out, not only “slow the lowering.”
   - The 10% run cap stays as a comfort brake, with honest copy.
5. **A “Why this?” line** on the workout and week, in the same quiet tone as the rest of the app. Not a bibliography on every card.

## What we will not do

- Copy or reconstruct copyrighted books.
- Claim the first draft was already a literature review. It was not.
- Swap the offline coach for a live chatbot.
- Pretend there is a perfect paper for every choice. Some calls (which accessory, which run on Tuesday) are logistics, not science.

## Status

2026-11-04: sources chosen and written up. The engine is **not** cited yet. Settings now has a short “Where the plan comes from” note so this is visible in the app. Encoding the citations into the rules is the next training-engine session.
