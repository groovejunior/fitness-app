import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { proposeBlock, saveProfile, startBlock } from '../db/repo';
import { WEEKDAY_LONG, WEEKDAY_SHORT } from '../engine/dates';
import type {
  BlockOption,
  DayAvailability,
  Equipment,
  TrainingStyle,
  EquipmentContext,
  Experience,
  PrimaryGoal,
  Profile,
  SportPref,
  Targets,
  Weekday,
  WeekPhase,
} from '../engine/types';
import { useProfile } from '../lib/hooks';
import { back, navigate } from '../lib/router';
import { Icon } from '../ui/Icon';
import { Button, Card, Chip, cx, IconButton, Notice, ProgressBar, Segmented, Stepper, Toggle, TextField } from '../ui/kit';

const STEPS = 8;

const GOALS: { value: PrimaryGoal; label: string; text: string }[] = [
  { value: 'athletic', label: 'Athletic build', text: 'Lean, strong and quick. A bit of everything.' },
  { value: 'strength', label: 'Strength', text: 'Lift heavier and build muscle.' },
  { value: 'endurance', label: 'Endurance', text: 'Run further and recover faster.' },
  { value: 'health', label: 'General health', text: 'Feel good, stay consistent, keep it easy to sustain.' },
];

const EXP: { value: Experience; label: string; text: string }[] = [
  { value: 'beginner', label: 'Beginner', text: 'New to it, or coming back after a long break.' },
  { value: 'intermediate', label: 'Intermediate', text: 'Trained regularly for a while and know the basics.' },
  { value: 'advanced', label: 'Advanced', text: 'Years of consistent training.' },
];

export const STYLE_CHOICES: { value: TrainingStyle; label: string; text: string }[] = [
  { value: 'calisthenics', label: 'Bodyweight first', text: 'Pull-ups, dips, push-ups and friends, plus a few classic barbell lifts. No machines.' },
  { value: 'free-weights', label: 'Free weights', text: 'Barbells, dumbbells, kettlebells and bodyweight. No machines.' },
  { value: 'all', label: 'Anything goes', text: 'Machines and cables too.' },
];

const EQUIP_CONTEXT: { value: EquipmentContext; label: string; text: string }[] = [
  { value: 'gym', label: 'At the gym', text: 'Bars, racks and free weights.' },
  { value: 'home', label: 'At home', text: 'Whatever you have there.' },
  { value: 'bodyweight', label: 'Just my body', text: 'No equipment needed.' },
];

const HOME_ITEMS: { value: Equipment; label: string }[] = [
  { value: 'dumbbell', label: 'Dumbbells' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'band', label: 'Bands' },
  { value: 'pullup-bar', label: 'Pull-up bar' },
  { value: 'bench', label: 'Bench' },
  { value: 'box', label: 'Box' },
  { value: 'barbell', label: 'Barbell' },
];

const WINDOWS: { value: DayAvailability['window']; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'midday', label: 'Midday' },
  { value: 'evening', label: 'Evening' },
];

const INTENSITY: { value: SportPref['intensity']; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'hard', label: 'Hard' },
];

const PHASE_LABEL: Record<WeekPhase, string> = { build: 'Build', peak: 'Peak', deload: 'Lighter' };

type SportKey = 'tennis' | 'ski' | 'other';
const SPORT_NAME: Record<Exclude<SportKey, 'other'>, string> = { tennis: 'Tennis', ski: 'Water skiing' };

const defaultSport = (name: string): SportPref => ({ name, perWeek: 1, durationMin: 60, intensity: 'moderate', days: [] });

const defaultAvailability = (): DayAvailability[] =>
  [0, 1, 2, 3, 4, 5, 6].map((i) =>
    i >= 5
      ? { available: true, minutes: 90, window: 'morning' }
      : { available: i !== 2, minutes: 60, window: 'evening' },
  );

/** Days that hold a fixed sport must be free for at least the sport's length. */
function withFixedDays(avail: DayAvailability[], sports: SportPref[]): { avail: DayAvailability[]; touched: Weekday[] } {
  const need = new Map<number, number>();
  for (const s of sports) for (const d of s.days ?? []) need.set(d, Math.max(need.get(d) ?? 0, Math.min(150, s.durationMin)));
  const touched: Weekday[] = [];
  const out = avail.map((a, i) => {
    const n = need.get(i);
    if (n === undefined) return a;
    if (a.available && a.minutes >= n) return a;
    touched.push(i as Weekday);
    return { ...a, available: true, minutes: Math.max(a.minutes, n) };
  });
  return { avail: out, touched };
}

function Heading({ title, text }: { title: string; text?: string }) {
  return (
    <div className="mb-6 mt-4 px-1">
      <h1 className="text-[28px] font-bold leading-[1.15] tracking-[-0.02em]">{title}</h1>
      {text && <p className="mt-2 text-[16px] leading-relaxed text-muted">{text}</p>}
    </div>
  );
}

function Choice({
  selected,
  label,
  text,
  onClick,
  ...rest
}: { selected: boolean; label: string; text: string; onClick: () => void } & Record<string, unknown>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-3 rounded-card bg-surface px-4 py-4 text-left shadow-soft transition-shadow active:scale-[0.99]',
        selected && 'ring-2 ring-accent',
      )}
      {...rest}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[17px] font-semibold">{label}</div>
        <div className="mt-0.5 text-[14px] leading-snug text-muted">{text}</div>
      </div>
      <span
        className={cx(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
          selected ? 'bg-accent text-accent-ink' : 'border border-line',
        )}
      >
        {selected && <Icon name="check" size={14} />}
      </span>
    </button>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="text-[16px] font-medium">{label}</div>
        {hint && <div className="text-[13px] text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function targetsText(t: Targets): string {
  const parts = [
    t.gym && `${t.gym} gym`,
    t.run && `${t.run} ${t.run === 1 ? 'run' : 'runs'}`,
    t.sport && `${t.sport} sport`,
    t.mobility && `${t.mobility} mobility`,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Rest week';
}

function OptionCard({ o, selected, onPick }: { o: BlockOption; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onPick}
      data-testid={`option-${o.key}`}
      className={cx(
        'block w-full rounded-card bg-surface p-5 text-left shadow-soft transition-shadow active:scale-[0.99]',
        selected && 'ring-2 ring-accent',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[19px] font-semibold tracking-tight">{o.label}</div>
        <span
          className={cx(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
            selected ? 'bg-accent text-accent-ink' : 'border border-line',
          )}
        >
          {selected && <Icon name="check" size={14} />}
        </span>
      </div>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{o.description}</p>
      <div className="mt-3 text-[14px] font-medium text-accent">{targetsText(o.targets)} each week</div>
    </button>
  );
}

function Flow({ existing }: { existing: Profile | null }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(existing?.name ?? '');
  const [goal, setGoal] = useState<PrimaryGoal>(existing?.goal ?? 'athletic');

  // Sports: tennis / water skiing / one custom entry
  const initSports = (): { sel: Partial<Record<SportKey, SportPref>>; other: string } => {
    const sel: Partial<Record<SportKey, SportPref>> = {};
    let other = '';
    for (const s of existing?.sports ?? []) {
      const n = s.name.toLowerCase();
      if (n === 'tennis') sel.tennis = s;
      else if (n === 'water skiing') sel.ski = s;
      else if (!sel.other) {
        sel.other = s;
        other = s.name;
      }
    }
    return { sel, other };
  };
  const [sportSel, setSportSel] = useState(() => initSports().sel);
  const [otherName, setOtherName] = useState(() => initSports().other);

  const [expGym, setExpGym] = useState<Experience>(existing?.experience.gym ?? 'beginner');
  const [expRun, setExpRun] = useState<Experience>(existing?.experience.run ?? 'beginner');
  const [rawAvail, setRawAvail] = useState<DayAvailability[]>(() => existing?.availability.map((a) => ({ ...a })) ?? defaultAvailability());
  const [equipCtx, setEquipCtx] = useState<EquipmentContext>(existing?.defaultEquipment ?? 'gym');
  const [style, setStyle] = useState<TrainingStyle>(existing?.style ?? 'calisthenics');
  const [home, setHome] = useState<Equipment[]>(existing?.homeEquipment.filter((e) => e !== 'none') ?? ['dumbbell']);
  const [gym, setGym] = useState(existing?.wanted.gym ?? 3);
  const [runs, setRuns] = useState(existing?.wanted.run ?? 2);
  const [mob, setMob] = useState(existing?.wanted.mobility ?? 0);
  const [choice, setChoice] = useState<'recommended' | 'alternative'>('recommended');

  const sports: SportPref[] = useMemo(() => {
    const list: SportPref[] = [];
    if (sportSel.tennis) list.push({ ...sportSel.tennis, name: SPORT_NAME.tennis });
    if (sportSel.ski) list.push({ ...sportSel.ski, name: SPORT_NAME.ski });
    if (sportSel.other && otherName.trim()) list.push({ ...sportSel.other, name: otherName.trim() });
    return list.map((s) => (s.days && s.days.length ? s : { ...s, days: undefined }));
  }, [sportSel, otherName]);

  const { avail, touched } = useMemo(() => withFixedDays(rawAvail, sports), [rawAvail, sports]);
  const sportCount = sports.reduce((n, s) => n + s.perWeek, 0);

  const draft: Profile = useMemo(
    () => ({
      name: name.trim(),
      age: existing?.age,
      weightKg: existing?.weightKg,
      experience: { gym: expGym, run: expRun },
      goal,
      sports,
      defaultEquipment: equipCtx,
      style,
      homeEquipment: home.length ? home : ['none'],
      wanted: { gym, run: runs, sport: sportCount, mobility: mob },
      availability: avail,
      units: existing?.units ?? 'metric',
      theme: existing?.theme ?? 'system',
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    }),
    [name, existing, expGym, expRun, goal, sports, equipCtx, style, home, gym, runs, sportCount, mob, avail],
  );

  const proposal = useMemo(() => (step === STEPS ? proposeBlock(draft) : null), [step, draft]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const toggleSport = (k: SportKey) =>
    setSportSel((s) => {
      const next = { ...s };
      if (next[k]) delete next[k];
      else next[k] = defaultSport(k === 'other' ? otherName : SPORT_NAME[k]);
      return next;
    });
  const patchSport = (k: SportKey, p: Partial<SportPref>) => setSportSel((s) => ({ ...s, [k]: { ...s[k]!, ...p } }));
  const patchDay = (i: number, p: Partial<DayAvailability>) => setRawAvail((a) => a.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const canNext =
    step === 1 ? name.trim().length > 0 : step === 3 ? !(sportSel.other && !otherName.trim()) : true;

  const goBack = () => (step > 1 ? setStep(step - 1) : back('/settings'));

  const start = async () => {
    if (!proposal || saving) return;
    setSaving(true);
    try {
      await saveProfile(draft);
      await startBlock(draft, proposal, choice);
      navigate('/today', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  const sportKeys: SportKey[] = ['tennis', 'ski', 'other'];

  return (
    <div className="min-h-dvh">
      <div className="safe-top sticky top-0 z-30 bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-lg items-center gap-2 px-2">
          <div className="w-10">
            {(step > 1 || existing) && <IconButton icon="chevron-left" label="Back" data-testid="onboarding-back" onClick={goBack} />}
          </div>
          <ProgressBar value={step / STEPS} className="flex-1" />
          <div className="w-10 text-right text-[13px] font-medium text-muted tnum">
            {step}/{STEPS}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-lg px-4 pb-40">
        <div key={step} className="rise" data-testid="onboarding-step" data-step={step}>
          {step === 1 && (
            <>
              <Heading
                title="Welcome"
                text="This app plans your training week around your real schedule, then walks you through each workout."
              />
              <TextField
                label="First name"
                value={name}
                onChange={setName}
                placeholder="Your name"
                autoComplete="given-name"
                data-testid="onboarding-name"
              />
              <p className="mt-4 px-1 text-[14px] text-muted">Takes about two minutes. Everything stays on this phone.</p>
            </>
          )}

          {step === 2 && (
            <>
              <Heading title="What matters most right now?" text="Pick the one that fits best. You can change it later." />
              <div className="space-y-3">
                {GOALS.map((g) => (
                  <Choice key={g.value} selected={goal === g.value} label={g.label} text={g.text} onClick={() => setGoal(g.value)} data-testid={`goal-${g.value}`} />
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <Heading title="Any other sports?" text="Besides gym and running. Skip this if there are none." />
              <div className="flex flex-wrap gap-2">
                {sportKeys.map((k) => (
                  <Chip key={k} selected={!!sportSel[k]} onClick={() => toggleSport(k)} data-testid={`sport-${k}`}>
                    {k === 'other' ? 'Other' : SPORT_NAME[k]}
                  </Chip>
                ))}
              </div>
              <div className="mt-5 space-y-3">
                {sportKeys.map((k) => {
                  const s = sportSel[k];
                  if (!s) return null;
                  return (
                    <Card key={k} className="p-5">
                      {k === 'other' ? (
                        <TextField label="Sport" value={otherName} onChange={setOtherName} placeholder="e.g. Surfing" />
                      ) : (
                        <div className="text-[18px] font-semibold">{SPORT_NAME[k]}</div>
                      )}
                      <div className="mt-2 divide-y divide-line">
                        <Row label="Times a week">
                          <Stepper value={s.perWeek} onChange={(v) => patchSport(k, { perWeek: v })} min={1} max={7} label="times a week" />
                        </Row>
                        <Row label="Usual length">
                          <Stepper value={s.durationMin} onChange={(v) => patchSport(k, { durationMin: v })} min={30} max={240} step={15} format={(v) => `${v} min`} label="minutes" />
                        </Row>
                      </div>
                      <div className="mt-3">
                        <div className="mb-1.5 px-1 text-[13px] font-medium text-muted">Intensity</div>
                        <Segmented options={INTENSITY} value={s.intensity} onChange={(v) => patchSport(k, { intensity: v })} />
                      </div>
                      <div className="mt-4">
                        <div className="mb-1.5 px-1 text-[13px] font-medium text-muted">Fixed days, if any</div>
                        <div className="flex gap-1.5">
                          {WEEKDAY_SHORT.map((d, i) => {
                            const on = s.days?.includes(i as Weekday) ?? false;
                            return (
                              <button
                                key={d}
                                type="button"
                                aria-pressed={on}
                                aria-label={WEEKDAY_LONG[i]}
                                onClick={() =>
                                  patchSport(k, {
                                    days: on ? (s.days ?? []).filter((x) => x !== i) : [...(s.days ?? []), i as Weekday].sort() as Weekday[],
                                  })
                                }
                                className={cx(
                                  'h-10 flex-1 rounded-full text-[12px] font-semibold transition-colors',
                                  on ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink-2',
                                )}
                              >
                                {d.slice(0, 2)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <Heading title="How experienced are you?" text="Gym and running separately. Be honest, it sets your starting point." />
              {([['Gym', expGym, setExpGym], ['Running', expRun, setExpRun]] as const).map(([label, val, set]) => (
                <div key={label} className="mb-6">
                  <div className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">{label}</div>
                  <div className="space-y-2.5">
                    {EXP.map((e) => (
                      <Choice key={e.value} selected={val === e.value} label={e.label} text={e.text} onClick={() => set(e.value)} data-testid={`exp-${label.toLowerCase()}-${e.value}`} />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {step === 5 && (
            <>
              <Heading title="When can you train?" text="Your usual week. You can change single weeks later." />
              <Card className="px-4 py-2">
                <div className="divide-y divide-line">
                  {avail.map((a, i) => {
                    const locked = touched.includes(i as Weekday) || sports.some((s) => s.days?.includes(i as Weekday));
                    return (
                      <div key={i} className="py-3" data-testid={`day-${i}`}>
                        <div className="flex items-center gap-3">
                          <div className={cx('min-w-0 flex-1 text-[16px] font-medium', !a.available && 'text-muted')}>{WEEKDAY_LONG[i]}</div>
                          {a.available && (
                            <Stepper
                              value={a.minutes}
                              onChange={(v) => patchDay(i, { minutes: v })}
                              min={30}
                              max={150}
                              step={15}
                              format={(v) => `${v} min`}
                              label={`${WEEKDAY_LONG[i]} minutes`}
                            />
                          )}
                          <div className={cx('relative [&_span]:left-0', locked && 'pointer-events-none opacity-60')}>
                            <Toggle checked={a.available} onChange={(v) => patchDay(i, { available: v })} label={`${WEEKDAY_LONG[i]} free`} />
                          </div>
                        </div>
                        {a.available && (
                          <Segmented size="sm" className="mt-3" options={WINDOWS} value={a.window} onChange={(v) => patchDay(i, { window: v })} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
              {touched.length > 0 && (
                <p className="mt-3 px-1 text-[13px] leading-snug text-muted">
                  {touched.map((d) => WEEKDAY_LONG[d]).join(' and ')} {touched.length > 1 ? 'are' : 'is'} marked free because of your fixed sport.
                </p>
              )}
            </>
          )}

          {step === 6 && (
            <>
              <Heading title="Where do you lift?" text="Where you usually do strength work." />
              <div className="space-y-3">
                {EQUIP_CONTEXT.map((e) => (
                  <Choice key={e.value} selected={equipCtx === e.value} label={e.label} text={e.text} onClick={() => setEquipCtx(e.value)} data-testid={`equip-${e.value}`} />
                ))}
              </div>
              <div className="mb-2 mt-8 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">How you like to train</div>
              <div className="space-y-3">
                {STYLE_CHOICES.map((c) => (
                  <Choice key={c.value} selected={style === c.value} label={c.label} text={c.text} onClick={() => setStyle(c.value)} data-testid={`style-${c.value}`} />
                ))}
              </div>
              <div className="mb-2 mt-8 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">What do you have at home?</div>
              <div className="flex flex-wrap gap-2">
                {HOME_ITEMS.map((h) => (
                  <Chip
                    key={h.value}
                    selected={home.includes(h.value)}
                    onClick={() => setHome((x) => (x.includes(h.value) ? x.filter((y) => y !== h.value) : [...x, h.value]))}
                  >
                    {h.label}
                  </Chip>
                ))}
              </div>
              <p className="mt-3 px-1 text-[13px] text-muted">Nothing selected means bodyweight only at home.</p>
            </>
          )}

          {step === 7 && (
            <>
              <Heading title="How many sessions a week?" text="What you would like. I will check it against your free days." />
              <Card className="px-5 py-2">
                <div className="divide-y divide-line">
                  <Row label="Gym">
                    <Stepper value={gym} onChange={setGym} min={0} max={6} label="gym sessions" />
                  </Row>
                  <Row label="Runs">
                    <Stepper value={runs} onChange={setRuns} min={0} max={6} label="runs" />
                  </Row>
                  <Row label="Mobility" hint="Short stretch and reset sessions">
                    <Stepper value={mob} onChange={setMob} min={0} max={3} label="mobility sessions" />
                  </Row>
                  <Row label="Sport" hint={sports.length ? sports.map((s) => s.name).join(', ') : 'None added'}>
                    <div className="tnum min-w-[4.5rem] text-center text-[17px] font-semibold text-muted">{sportCount}</div>
                  </Row>
                </div>
              </Card>
            </>
          )}

          {step === 8 && proposal && (
            <>
              <div className="mb-6 mt-4 px-1">
                <div className="text-[14px] font-medium text-accent">Your first month</div>
                <h1 className="mt-1 text-[30px] font-bold leading-[1.15] tracking-[-0.02em]">{proposal.focus}</h1>
              </div>

              <div className="grid grid-cols-4 gap-2" data-testid="block-weeks">
                {proposal.phases.map((p, i) => (
                  <div key={i} className="rounded-2xl bg-surface px-2 py-3 text-center shadow-soft">
                    <div className="text-[12px] text-muted">Week {i + 1}</div>
                    <div className={cx('mt-0.5 text-[15px] font-semibold', p === 'deload' ? 'text-ink-2' : p === 'peak' ? 'text-accent' : 'text-ink')}>
                      {PHASE_LABEL[p]}
                    </div>
                  </div>
                ))}
              </div>

              {!proposal.realism.ok && (
                <div className="mt-5" data-testid="realism-notice">
                  <Notice>
                    <ul className="space-y-1">
                      {proposal.realism.issues.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-ink-2">The recommended plan is adjusted to fit.</p>
                  </Notice>
                </div>
              )}

              <div className="mb-3 mt-8 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">Choose your version</div>
              <div className="space-y-3">
                <OptionCard o={proposal.recommended} selected={choice === 'recommended'} onPick={() => setChoice('recommended')} />
                <OptionCard o={proposal.alternative} selected={choice === 'alternative'} onPick={() => setChoice('alternative')} />
              </div>
              <p className="mt-4 px-1 text-[13px] text-muted">You can switch versions later from the Plan tab.</p>
            </>
          )}
        </div>
      </main>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-bg via-bg to-bg/0 pt-6">
        <div className="mx-auto max-w-lg px-4 pb-2">
          {step < STEPS ? (
            <Button block disabled={!canNext} onClick={() => setStep(step + 1)} data-testid="onboarding-next">
              Continue
            </Button>
          ) : (
            <Button block disabled={saving} onClick={start} data-testid="onboarding-start">
              Start this plan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Onboarding() {
  const profile = useProfile();
  if (profile === undefined) return null;
  return <Flow existing={profile} />;
}
