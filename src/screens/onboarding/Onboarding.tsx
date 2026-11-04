import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { coach } from '../../engine';
import { GOAL_LABEL, emptyAvailability } from '../../engine/constants';
import type { EquipmentContext, Experience, Goal, Profile, TimeWindow, Targets, WeekAvailability } from '../../engine/types';
import { SPORTS } from '../../content/sports';
import { CONTEXT_LABEL } from '../../content/exercises';
import { createBlock, saveProfile } from '../../data/repo';
import { dayLong } from '../../lib/format';
import { today } from '../../lib/today';
import { Button, Chip, CardButton, Icon, Notice, ProgressBar, Segmented, Stepper, TextField, Toggle, cx } from '../../ui';

const TOTAL = 7;

const GOAL_TEXT: Record<Goal, string> = {
  athletic: 'Strong, fast and good at your sports.',
  strength: 'Lift heavier on the big lifts.',
  muscle: 'Add size with steady volume.',
  endurance: 'Run further and recover faster.',
  health: 'Move well and stay consistent.',
};

const LEVELS: { value: Experience; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const GYM_LEVEL_TEXT: Record<Experience, string> = {
  beginner: 'New to lifting, or less than a year of steady training.',
  intermediate: 'You train regularly and know the main lifts.',
  advanced: 'Years of structured training and good technique.',
};
const RUN_LEVEL_TEXT: Record<Experience, string> = {
  beginner: 'You run now and then, or are just starting.',
  intermediate: 'You run weekly and can keep going for 30 minutes.',
  advanced: 'You run most weeks and follow paces or intervals.',
};

const WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'midday', label: 'Midday' },
  { value: 'evening', label: 'Evening' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<Goal>('athletic');
  const [sports, setSports] = useState<string[]>([]);
  const [gymExp, setGymExp] = useState<Experience>('beginner');
  const [runExp, setRunExp] = useState<Experience>('beginner');
  const [avail, setAvail] = useState<WeekAvailability>(emptyAvailability());
  const [gymAccess, setGymAccess] = useState(true);
  const [equipment, setEquipment] = useState<EquipmentContext>('gym');
  const [targets, setTargets] = useState<Targets>({ gym: 3, run: 2, sport: 0, mobility: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const draft: Profile = useMemo(
    () => ({
      name: name.trim(),
      goal,
      experience: { gym: gymExp, run: runExp },
      sports,
      defaultEquipment: gymAccess ? equipment : equipment === 'gym' ? 'home' : equipment,
      gymAccess,
    }),
    [name, goal, gymExp, runExp, sports, equipment, gymAccess],
  );

  const effectiveTargets: Targets = { ...targets, sport: sports.length ? targets.sport : 0 };
  const report = useMemo(() => coach.checkRealism(effectiveTargets, avail, draft), [effectiveTargets.gym, effectiveTargets.run, effectiveTargets.sport, effectiveTargets.mobility, avail, draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const anyDay = avail.some((d) => d.available);
  const valid = [name.trim().length > 0, true, true, true, anyDay, true, true][step];

  const toggleSport = (id: string) => {
    setSports((s) => {
      const next = s.includes(id) ? s.filter((x) => x !== id) : [...s, id];
      setTargets((t) => ({ ...t, sport: next.length ? Math.max(t.sport, 1) : 0 }));
      return next;
    });
  };
  const patchDay = (i: number, p: Partial<WeekAvailability[number]>) =>
    setAvail((a) => a.map((d, j) => (j === i ? { ...d, ...p } : d)));
  const setGym = (v: boolean) => {
    setGymAccess(v);
    if (!v && equipment === 'gym') setEquipment('home');
  };

  const build = async () => {
    setSaving(true);
    setError('');
    try {
      await saveProfile(draft);
      await createBlock(draft, effectiveTargets, avail, today());
      navigate('/plan/month', { replace: true });
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    }
  };

  const last = step === TOTAL - 1;
  const equipmentOptions = (['gym', 'home', 'bodyweight', 'outdoors'] as EquipmentContext[])
    .filter((c) => gymAccess || c !== 'gym')
    .map((c) => ({ value: c, label: CONTEXT_LABEL[c] }));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <div className="px-5 pt-safe">
        <div className="pt-6">
          <ProgressBar value={(step + 1) / TOTAL} />
          <p className="mt-2 text-micro font-semibold uppercase text-ink-3">
            Step {step + 1} of {TOTAL}
          </p>
        </div>
      </div>

      <main key={step} className="animate-fade-up flex-1 px-5 pt-6 pb-10">
        {step === 0 && (
          <section>
            <h1 className="font-display text-display font-bold">Welcome</h1>
            <p className="mt-3 text-body text-ink-2">
              This app plans your training month around your week, then guides each session. A few questions first. It takes about two minutes.
            </p>
            <TextField
              className="mt-8"
              label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
              autoFocus
            />
          </section>
        )}

        {step === 1 && (
          <section>
            <h1 className="font-display text-title font-bold">What is your main goal?</h1>
            <div className="mt-5 space-y-3">
              {(Object.keys(GOAL_LABEL) as Goal[]).map((g) => (
                <CardButton
                  key={g}
                  aria-pressed={goal === g}
                  onClick={() => setGoal(g)}
                  className={cx('flex items-center gap-3', goal === g && 'ring-2 ring-accent')}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-headline font-semibold">{GOAL_LABEL[g]}</div>
                    <div className="text-caption text-ink-2">{GOAL_TEXT[g]}</div>
                  </div>
                  {goal === g && <Icon name="check" size={20} className="shrink-0 text-accent" />}
                </CardButton>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 className="font-display text-title font-bold">Which sports do you play?</h1>
            <p className="mt-2 text-body text-ink-2">We plan around them so you are not tired on game day. Pick none if that fits.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {SPORTS.map((s) => (
                <Chip key={s.id} selected={sports.includes(s.id)} onClick={() => toggleSport(s.id)}>
                  {s.name}
                </Chip>
              ))}
              <Chip selected={sports.length === 0} onClick={() => { setSports([]); setTargets((t) => ({ ...t, sport: 0 })); }}>
                None
              </Chip>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 className="font-display text-title font-bold">How experienced are you?</h1>
            <div className="mt-6">
              <p className="mb-2 px-1 text-caption font-medium text-ink-2">Gym</p>
              <Segmented ariaLabel="Gym experience" options={LEVELS} value={gymExp} onChange={setGymExp} />
              <p className="mt-2 px-1 text-caption text-ink-3">{GYM_LEVEL_TEXT[gymExp]}</p>
            </div>
            <div className="mt-6">
              <p className="mb-2 px-1 text-caption font-medium text-ink-2">Running</p>
              <Segmented ariaLabel="Running experience" options={LEVELS} value={runExp} onChange={setRunExp} />
              <p className="mt-2 px-1 text-caption text-ink-3">{RUN_LEVEL_TEXT[runExp]}</p>
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h1 className="font-display text-title font-bold">When are you free?</h1>
            <p className="mt-2 text-body text-ink-2">Tap the days you can train, then say how long and when.</p>
            <div className="mt-5 space-y-2">
              {avail.map((d, i) => (
                <div key={i} className="overflow-hidden rounded-lg bg-surface shadow-soft">
                  <button
                    type="button"
                    aria-label={dayLong(i)}
                    aria-pressed={d.available}
                    onClick={() => patchDay(i, { available: !d.available })}
                    className="flex h-12 w-full items-center justify-between px-4 text-left"
                  >
                    <span className="text-body font-medium">{dayLong(i)}</span>
                    <span
                      aria-hidden
                      className={cx('grid size-6 place-items-center rounded-full', d.available ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-transparent')}
                    >
                      <Icon name="check" size={14} />
                    </span>
                  </button>
                  {d.available && (
                    <div className="space-y-3 px-4 pb-4">
                      <Stepper
                        label={`${dayLong(i)} minutes`}
                        value={d.minutes}
                        min={15}
                        max={180}
                        step={15}
                        format={(v) => `${v} min`}
                        onChange={(v) => patchDay(i, { minutes: v })}
                      />
                      <Segmented size="sm" ariaLabel={`${dayLong(i)} time of day`} options={WINDOWS} value={d.window === 'any' ? 'evening' : d.window} onChange={(v) => patchDay(i, { window: v })} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {step === 5 && (
          <section>
            <h1 className="font-display text-title font-bold">What do you train with?</h1>
            <div className="mt-6 flex items-center justify-between gap-4 rounded-lg bg-surface px-4 py-3 shadow-soft">
              <span className="text-body font-medium">Do you have a gym nearby?</span>
              <Toggle checked={gymAccess} onChange={setGym} label="Gym nearby" />
            </div>
            <p className="mt-6 mb-2 px-1 text-caption font-medium text-ink-2">Where do you usually train?</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Default equipment">
              {equipmentOptions.map((o) => (
                <Chip key={o.value} selected={draft.defaultEquipment === o.value} onClick={() => setEquipment(o.value)}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </section>
        )}

        {step === 6 && (
          <section>
            <h1 className="font-display text-title font-bold">Sessions per week</h1>
            <p className="mt-2 text-body text-ink-2">Roughly how many of each. We check it against your free days.</p>
            <div className="mt-5 divide-y divide-line rounded-lg bg-surface px-4 shadow-soft">
              {(
                [
                  ['gym', 'Gym', 0],
                  ['run', 'Runs', 0],
                  ['sport', 'Sport', 0],
                  ['mobility', 'Mobility', 0],
                ] as const
              )
                .filter(([k]) => k !== 'sport' || sports.length > 0)
                .map(([k, label]) => (
                  <div key={k} className="flex items-center justify-between gap-4 py-3">
                    <span className="text-body font-medium">{label}</span>
                    <Stepper className="w-44" label={label} value={targets[k]} min={0} max={7} onChange={(v) => setTargets((t) => ({ ...t, [k]: v }))} />
                  </div>
                ))}
            </div>
            <div className="mt-4">
              {report.level === 'ok' ? (
                <p className="px-1 text-caption text-ink-2">This fits your week.</p>
              ) : (
                <Notice
                  title={report.level === 'over' ? 'This is more than your week allows' : 'This is a tight week'}
                  action={
                    <Button size="sm" variant="secondary" onClick={() => setTargets(report.suggestion)}>
                      Use suggestion
                    </Button>
                  }
                >
                  <ul className="space-y-1">
                    {report.issues.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </Notice>
              )}
            </div>
            {error && <p className="mt-4 px-1 text-caption text-danger">{error}</p>}
          </section>
        )}
      </main>

      <div className="sticky bottom-0 bg-bg/90 px-5 pt-3 pb-5 pb-safe backdrop-blur-xl">
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)} disabled={saving}>
              Back
            </Button>
          )}
          {last ? (
            <Button size="lg" block onClick={build} disabled={saving || !anyDay}>
              {saving ? 'Building…' : 'Build my month'}
            </Button>
          ) : (
            <Button size="lg" block onClick={() => setStep(step + 1)} disabled={!valid}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
