# Where the training knowledge comes from

Carlo asked to stop using unnamed "general training knowledge" and build the coach on open science. He confirmed the **cited rulebook**: the coach stays a set of rules on the phone, and each rule points at a published source.

This note is the research pass (5 Nov 2026). It lists what is worth reading, then the short set that should actually drive the app.

Nothing here is copied out of a book. We link. We do not paste.

## What should go into the app

Six sources. They cover the decisions the coach actually makes, they are free to read, and they do not fight each other. Settings shows this same list.

| What it decides | Source |
|---|---|
| The health floor: muscle work on 2 or more days, about 30 minutes of harder activity on most days, less sitting | [Australian 24-hour movement guidelines](https://www.health.gov.au/topics/physical-activity/24-hour-movement-guidelines-for-all-australians/recommendations-for-adults-18-to-64-years) for adults 18–64. Athletic and strength goals sit above this floor, not instead of it. |
| How a gym week is built: several sets, heavier work when the goal is strength, about twice a week per muscle for size and up to three for strength. Every sensible program beats doing nothing | [Currier and colleagues, 2023](https://bjsm.bmj.com/content/57/18/1211), *British Journal of Sports Medicine*. Open. 178 strength trials, 119 muscle-size trials. |
| When to add load: if you can do 1–2 reps past the target, add roughly 2–10%. Beginners live around 8–12 reps. Big exercises before small ones | [ACSM position stand, 2009](https://doi.org/10.1249/mss.0b013e3181915670), *Progression Models in Resistance Training for Healthy Adults*. Read with the [2025 ACSM overview of reviews](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/), which updates it: going to failure is not required, and the equipment (bar, dumbbell, bodyweight) is not what decides the result. |
| Most running stays easy enough to talk. One harder session is enough until you run a lot | [Seiler, 2009](https://sportscience.sportsci.org/2009/ss.htm), free. "Easy" means the [talk test](https://pubmed.ncbi.nlm.nih.gov/15354048/) (Persinger, Foster and colleagues, 2004): full sentences means you are under the first threshold. |
| Do not jump the weekly load. Tennis, skiing and gym all count. A lighter week is allowed; a sudden spike is the thing to avoid | [IOC consensus, 2016](https://bjsm.bmj.com/content/50/17/1030) (Soligard and colleagues), plus the [AIS note on reloading after a break](https://www.ausport.gov.au/ais/position_statements/training-load-in-relation-to-loading-and-unloading-phases-of-training). |
| When bodyweight reps get easy, make the movement harder, not just slower | [Kotarsky and colleagues, 2018](https://journals.lww.com/nsca-jscr/fulltext/2018/03000/effect_of_progressive_calisthenic_push_up_training.9.aspx): progressive push-ups built strength about as well as bench press in a short trial. |

Two papers sit behind those six and should be cited in the engine, not as extra buttons:

- [Lopez and colleagues, 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8126497/) (open). Muscle size is similar across light and heavy loads if the sets are hard. Strength prefers heavier loads. That is why bodyweight-first is legitimate, and why squats and deadlifts stay barbell once a bodyweight squat is easy.
- [Grgic and colleagues, 2017](https://pubmed.ncbi.nlm.nih.gov/28933024/) and [Singer and colleagues, 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11349676/) (the second is open). Beginners can rest 1–2 minutes. Trained lifters get more strength from rests over 2 minutes on the main lifts. For muscle size, little is gained by resting past about 90 seconds.

WHO's [2020 guidelines](https://www.who.int/publications/i/item/9789240015128) say the same health floor as the Australian ones (150–300 minutes of moderate activity a week, or 75–150 vigorous, plus muscle work twice a week). We follow the Australian page in the app. WHO is the backup citation, not a second rule.

## What we read and will not encode

These are real, and they are the wrong thing to hard-code.

- **The exact "add 10% running each week" rule.** [Buist and colleagues, 2008](https://pubmed.ncbi.nlm.nih.gov/17940147/) randomised novice runners. A graded plan and a faster plan had the same injury rate, about 21%. A later review ([PMC6253751](https://pmc.ncbi.nlm.nih.gov/articles/PMC6253751/)) found no safe weekly percentage. The IOC sentence we *do* encode is the honest one: avoid a sudden jump. The app can keep a gentle cap so a week cannot double. The screen must not call 10% an injury law.
- **A fixed deload as a way to grow more.** Coaches often lighten a week every 4–6 weeks ([Bell and colleagues, 2022](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2022.1073223/full), open). A trial that *stopped* training for a week in the middle of nine weeks did not grow more muscle, and grew less strength ([Coleman and colleagues, 2024](https://doi.org/10.7717/peerj.16777), open). So week 4 stays a lighter week (fewer sets, a bit less load), not a week off, and we do not claim it builds extra muscle.
- **Polarised training as a law for new runners.** [Silva and colleagues, 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11329428/) (open) found a small fitness edge for an 80/20 split, mostly in already-trained athletes and in short studies. Race-style performance was similar to other mixes. A 2025 review of individual results suggested recreational athletes may do just as well with a pyramidal mix (mostly easy, some steady, a little hard). Our default — mostly easy, one quality session until you run four times a week — matches that caution.
- **Fancy set-counting.** A 2024 dose-response analysis (Pelland and colleagues, later indexed on PubMed) says more weekly sets mean more growth, with diminishing returns, and that a set which only brushes a muscle should count as half. Useful to know. Too fussy to code. Currier already says "use several sets."
- **Periodisation brands** (linear vs daily undulating, Bompa's books). When the total work is the same, [Moesgaard and colleagues, 2022](https://pubmed.ncbi.nlm.nih.gov/35044672/) found a modest strength edge for planned variation, and no edge for muscle size. Untrained people did not benefit from the complicated version. A simple month that builds and then lightens is enough.
- **ESSA position statements.** Exercise & Sports Science Australia is the local professional body, and their statements are good. The ones on the public list are for diabetes, bone health, obesity and similar. They are not the default plan for a healthy student. If a condition shows up later, we pull the matching statement in.
- **Nutrition stands** (ISSN protein, 1.4–2.0 g per kg). Solid, open, and out of scope. The app does not coach food.
- **Copyrighted coaching books** — *Starting Strength*, *Practical Programming*, *Overcoming Gravity*, Bompa, the NSCA textbook, Renaissance Periodization, Stronger by Science programs. Fine to read. Not ours to copy. If a book and a paper agree, the paper is what we cite.
- **Open physiology textbooks**, including MacIntosh's [*Open Textbook of Exercise Physiology*](https://pressbooks.openeducationalberta.ca/otep/) (CC BY-NC). They explain bodies. They do not write the week.
- **The acute:chronic workload ratio** (the "0.8 to 1.3" number in the IOC paper). It came from a few team sports and has not held up as a personal injury predictor. We keep the plain warning, not the ratio.
- **A magic push/pull/squat/hinge ratio.** ACSM says cover the big movement patterns and do the hard compound lifts first. The templates in the app are how we do that. No paper says the counts must match.

## What changes in the rules, once we encode this

Not done yet. One family at a time, with you able to see the diff:

1. **Gym dose.** Keep multiple sets. Point weekly frequency and "main lifts before accessories" at Currier 2023 and ACSM 2009. Muscle groups land about twice a week when the calendar allows.
2. **Adding load.** Keep double progression. Cite ACSM's 2–10% step. Stop implying you must grind to failure.
3. **Bodyweight.** When reps hit the top of the range, offer a harder variation (Kotarsky), not only "slow the lowering." Keep barbell squats and deadlifts as the leg strength lifts (Lopez).
4. **Rest.** Beginners stay near 90 seconds. Past beginner, main strength lifts rest closer to 2 minutes.
5. **Running.** Keep mostly easy, talk-test cues, one quality session for beginners. Soften the 10% copy. A second quality session only when there is enough easy running around it.
6. **Week 4.** Keep it lighter, and say it is there to avoid a spike, not because a rest week grows more muscle.
7. **Each rule gets a source id** the screen can show in one sentence. No bibliography on the workout card.

## Status

2026-11-05: research done, shortlist chosen, Settings lists it. The engine rules are still the original ones. Encoding is the next training-engine session.
