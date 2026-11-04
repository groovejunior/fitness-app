import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { coach, EMPTY_HISTORY, isHardEffort, type EquipmentContext, type Intensity, type PlannedSlot, type Profile, type RunStep, type Workout, type WorkoutItem, type WorkoutSection } from '../../engine';
import { ExerciseFigure } from '../../anim/Figure';
import { Empty, Loading } from '../../components/Empty';
import { SessionGlyph } from '../../components/SessionGlyph';
import { TopBar } from '../../components/TopBar';
import { CONTEXT_LABEL, getExercise } from '../../content/exercises';
import { useHistory, useProfile, useSession, useSettings, useWeek } from '../../data/hooks';
import { commitSession, quickLog, sessionId, startSession } from '../../data/repo';
import type { SessionRecord, WeekRecord } from '../../data/types';
import { distanceLabel, formatClock, formatMinutes, formatPrescription, formatWeight, toDisplayDistance, type Units } from '../../lib/format';
import { Button, Card, Icon, Pill, SectionLabel, Segmented, Sheet, Stepper, cx } from '../../ui';

const DURATION: Record<PlannedSlot['type'], { min: number; max: number; step: number }> = {
  gym: { min: 20, max: 90, step: 5 },
  run: { min: 15, max: 120, step: 5 },
  mobility: { min: 10, max: 40, step: 5 },
  sport: { min: 30, max: 180, step: 15 },
};

const INTENSITY_OPTIONS: { value: Intensity; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'normal', label: 'Normal' },
  { value: 'hard', label: 'Hard' },
];

const EFFORT_LABEL: Record<RunStep['effort'], string> = { walk: 'Walk', easy: 'Easy', steady: 'Steady', tempo: 'Tempo', hard: 'Hard', stride: 'Stride' };

export default function WorkoutDetail() {
  const { weekStart = '', slotId = '' } = useParams();
  const week = useWeek(weekStart);
  const profile = useProfile();
  const history = useHistory();
  const session = useSession(sessionId(weekStart, slotId));

  if (week === undefined || profile === undefined || history === undefined || session === undefined) {
    return (
      <>
        <TopBar />
        <Loading />
      </>
    );
  }
  const slot = week?.plan.slots.find((s) => s.id === slotId);
  if (!week || !profile || !slot) {
    return (
      <>
        <TopBar />
        <Empty title="Workout not found">This session is no longer in the plan.</Empty>
      </>
    );
  }
  return <Detail key={`${weekStart}:${slotId}`} weekStart={weekStart} week={week} slot={slot} profile={profile} session={session} history={history} />;
}

type Props = {
  weekStart: string;
  week: WeekRecord;
  slot: PlannedSlot;
  profile: Profile;
  session: SessionRecord | null;
  history: NonNullable<ReturnType<typeof useHistory>>;
};

function Detail({ weekStart, week, slot, profile, session, history }: Props) {
  const nav = useNavigate();
  const units = useSettings().units;
  const id = sessionId(weekStart, slot.id);
  const isRun = slot.type === 'run';
  const range = DURATION[slot.type];

  const savedStatus = session?.status;
  const saved = session?.workout && (savedStatus === 'committed' || savedStatus === 'in_progress' || savedStatus === 'done') ? session.workout : undefined;

  const defaultEquipment: EquipmentContext = isRun ? 'outdoors' : profile.defaultEquipment === 'gym' && !profile.gymAccess ? 'home' : profile.defaultEquipment;
  const [equipment, setEquipment] = useState<EquipmentContext>(saved?.equipment ?? defaultEquipment);
  const [minutes, setMinutes] = useState(() => Math.min(range.max, Math.max(range.min, saved?.targetMinutes ?? slot.minutes)));
  const [intensity, setIntensity] = useState<Intensity>(saved?.intensity ?? 'normal');
  const [variant, setVariant] = useState<'recommended' | 'alternative'>(saved?.variant ?? 'recommended');
  const [unlocked, setUnlocked] = useState(false);
  const [swaps, setSwaps] = useState<Partial<Record<'recommended' | 'alternative', Workout>>>({});
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [logMin, setLogMin] = useState(0);
  const [logEffort, setLogEffort] = useState(6);

  const locked = !!saved && !unlocked;

  const generated = useMemo(
    () =>
      locked
        ? null
        : coach.buildWorkouts({ slot, profile, equipment, minutes, intensity, phase: week.plan.phase, weekIndex: week.plan.weekIndex, history: history ?? EMPTY_HISTORY }),
    [locked, slot, profile, equipment, minutes, intensity, week.plan.phase, week.plan.weekIndex, history],
  );

  const shown: Workout | undefined = locked ? saved : generated ? (swaps[variant] ?? generated[variant]) : undefined;
  if (!shown) return null;

  const resetSwaps = () => setSwaps({});
  const equipmentOptions: { value: EquipmentContext; label: string }[] = isRun
    ? [
        { value: 'outdoors', label: 'Outdoors' },
        { value: 'gym', label: 'Treadmill' },
      ]
    : (['gym', 'home', 'bodyweight', 'outdoors'] as EquipmentContext[])
        .filter((c) => c !== 'gym' || profile.gymAccess)
        .map((c) => ({ value: c, label: CONTEXT_LABEL[c] }));

  const status = locked ? savedStatus : undefined;
  const isSport = slot.type === 'sport';

  async function commit() {
    await commitSession(weekStart, slot, shown!);
    setUnlocked(false);
  }
  async function start() {
    await startSession(id);
    nav(`/session/${id}`);
  }

  const openedItem = openItem ? shown.sections.flatMap((s) => s.items).find((i) => i.id === openItem) : undefined;

  return (
    <>
      <TopBar title={slot.title} />
      <main className="mx-auto w-full max-w-lg px-5 pb-40">
        <div className="animate-fade-up pt-2">
          <p className="text-body text-ink-2">{slot.intent}</p>

          {locked ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-surface p-4 shadow-soft">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone="accent">{status === 'done' ? 'Done' : 'Saved'}</Pill>
                  <Pill>{isRun ? (shown.equipment === 'gym' ? 'Treadmill' : 'Outdoors') : CONTEXT_LABEL[shown.equipment]}</Pill>
                  <Pill className="tabular">{formatMinutes(shown.estimatedMinutes)}</Pill>
                </div>
                <p className="mt-2 text-caption text-ink-2">{shown.why}</p>
              </div>
              {status !== 'done' && (
                <Button variant="secondary" size="sm" onClick={() => setUnlocked(true)}>
                  Change
                </Button>
              )}
            </div>
          ) : (
            <Card className="mt-4 space-y-5">
              <div>
                <p className="mb-2 text-caption font-medium text-ink-2">{isRun ? 'Where' : 'Equipment'}</p>
                <Segmented
                  ariaLabel={isRun ? 'Where' : 'Equipment'}
                  size="sm"
                  className="[&_button]:px-0 [&_button]:text-[13px]"
                  options={equipmentOptions}
                  value={equipmentOptions.some((o) => o.value === equipment) ? equipment : equipmentOptions[0].value}
                  onChange={(v) => {
                    setEquipment(v);
                    resetSwaps();
                  }}
                />
              </div>
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <p className="text-caption font-medium text-ink-2">Duration</p>
                  {!isSport && shown.estimatedMinutes !== minutes && <p className="text-caption text-ink-3 tabular">about {shown.estimatedMinutes} min</p>}
                </div>
                <Stepper
                  label="Duration"
                  value={minutes}
                  min={range.min}
                  max={range.max}
                  step={range.step}
                  format={formatMinutes}
                  onChange={(v) => {
                    setMinutes(v);
                    resetSwaps();
                  }}
                />
              </div>
              <div>
                <p className="mb-2 text-caption font-medium text-ink-2">Intensity</p>
                <Segmented
                  ariaLabel="Intensity"
                  size="sm"
                  options={INTENSITY_OPTIONS}
                  value={intensity}
                  onChange={(v) => {
                    setIntensity(v);
                    resetSwaps();
                  }}
                />
              </div>
            </Card>
          )}

          {!locked && generated && (
            <div className="mt-4">
              <Segmented
                ariaLabel="Version"
                size="sm"
                options={[
                  { value: 'recommended', label: generated.recommended.label },
                  { value: 'alternative', label: generated.alternative.label },
                ]}
                value={variant}
                onChange={setVariant}
              />
              <p className="mt-2 px-1 text-caption text-ink-2">{shown.why}</p>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-6">
          {shown.run ? (
            <RunView workout={shown} units={units} />
          ) : (
            shown.sections.map((sec, i) => (
              <div key={`${sec.kind}-${i}`} className="space-y-6">
                <SectionView section={sec} units={units} onOpen={(itemId) => setOpenItem(itemId)} />
                {isSport && sec.kind === 'prep' && (
                  <Card className="flex items-center gap-4">
                    <SessionGlyph type="sport" size={44} active />
                    <div className="min-w-0 flex-1">
                      <p className="text-micro font-semibold uppercase text-ink-3">Play</p>
                      <p className="truncate text-headline font-semibold">{shown.title}</p>
                    </div>
                    <p className="text-body font-semibold tabular">{shown.targetMinutes} min</p>
                  </Card>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto max-w-lg space-y-1 px-5 pt-3 pb-safe">
          <div className="pb-3">
            {status === 'done' ? (
              <Button block size="lg" disabled>
                Done{session?.durationMin ? ` · ${formatMinutes(session.durationMin)}` : ''}
              </Button>
            ) : status === 'in_progress' ? (
              <Button block size="lg" onClick={() => nav(`/session/${id}`)}>
                Resume
              </Button>
            ) : status === 'committed' ? (
              <Button block size="lg" onClick={start}>
                Start workout
              </Button>
            ) : (
              <Button block size="lg" onClick={commit}>
                Today I'm doing this
              </Button>
            )}
            {isSport && status !== 'done' && (
              <Button
                block
                variant="ghost"
                className="mt-1"
                onClick={() => {
                  setLogMin(shown.targetMinutes);
                  setLogOpen(true);
                }}
              >
                Log as done
              </Button>
            )}
          </div>
        </div>
      </div>

      <Sheet open={!!openedItem} onClose={() => setOpenItem(null)} title={openedItem ? getExercise(openedItem.exerciseId).name : undefined}>
        {openedItem && (
          <ExerciseSheet
            item={openedItem}
            equipment={shown.equipment}
            canSwap={!locked && !isRun}
            onSwap={(newId) => {
              setSwaps((prev) => ({ ...prev, [variant]: coach.swapExercise(shown, openedItem.id, newId, { profile, history, phase: week.plan.phase }) }));
              setOpenItem(null);
            }}
          />
        )}
      </Sheet>

      <Sheet open={logOpen} onClose={() => setLogOpen(false)} title="Log as done">
        <div className="space-y-6">
          <div>
            <p className="mb-1 text-caption font-medium text-ink-2">Duration</p>
            <Stepper label="duration" value={logMin} min={10} max={300} step={5} format={formatMinutes} onChange={setLogMin} />
          </div>
          <div>
            <p className="mb-1 text-caption font-medium text-ink-2">Effort, 1 easy to 10 all out</p>
            <Stepper label="effort" value={logEffort} min={1} max={10} format={(v) => `${v} / 10`} onChange={setLogEffort} />
          </div>
          <Button
            block
            size="lg"
            onClick={async () => {
              await quickLog(weekStart, slot, shown, { durationMin: logMin, effort: logEffort });
              setLogOpen(false);
              setUnlocked(false);
            }}
          >
            Save
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function SectionView({ section, units, onOpen }: { section: WorkoutSection; units: Units; onOpen: (itemId: string) => void }) {
  const counts: Record<string, number> = {};
  return (
    <section>
      <SectionLabel>{section.title}</SectionLabel>
      <div className="divide-y divide-line overflow-hidden rounded-lg bg-surface shadow-soft">
        {section.items.map((it) => {
          const tag = it.group ? `${it.group}${(counts[it.group] = (counts[it.group] ?? 0) + 1)}` : undefined;
          return <ItemRow key={it.id} item={it} tag={tag} units={units} onOpen={() => onOpen(it.id)} />;
        })}
      </div>
    </section>
  );
}

function ItemRow({ item, tag, units, onOpen }: { item: WorkoutItem; tag?: string; units: Units; onOpen: () => void }) {
  const ex = getExercise(item.exerciseId);
  const weight = formatWeight(item.targetKg, units);
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-surface-2">
      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-surface-2">
        <ExerciseFigure animation={ex.animation} animate={false} className="w-14 text-ink" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {tag && <span className="shrink-0 rounded-sm bg-accent-soft px-1.5 text-micro font-bold text-accent tracking-normal">{tag}</span>}
          <p className="truncate text-body font-medium">{ex.name}</p>
        </div>
        <p className="text-caption text-ink-2 tabular">
          {formatPrescription(item.sets, item.repsMin, item.repsMax, ex.unit)}
          {item.restSec > 0 && <span className="text-ink-3"> · {item.restSec} s rest</span>}
        </p>
        {(weight || item.note) && (
          <p className="truncate text-caption text-ink-3">
            {weight && <span className="font-semibold text-ink-2 tabular">{weight}</span>}
            {weight && item.note && ' · '}
            {item.note}
          </p>
        )}
      </div>
      <Icon name="chevronRight" size={18} className="shrink-0 text-ink-3" />
    </button>
  );
}

function ExerciseSheet({ item, equipment, canSwap, onSwap }: { item: WorkoutItem; equipment: EquipmentContext; canSwap: boolean; onSwap: (id: string) => void }) {
  const ex = getExercise(item.exerciseId);
  const subs = canSwap ? coach.substitutes(ex.id, equipment).slice(0, 8) : [];
  return (
    <div className="space-y-5">
      <div className="mx-auto w-full max-w-72 rounded-lg bg-surface-2 p-2">
        <ExerciseFigure animation={ex.animation} className="w-full text-ink" title={ex.name} />
      </div>
      <ul className="space-y-1.5">
        {ex.cues.map((c) => (
          <li key={c} className="flex gap-2.5 text-body">
            <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
            <span>{c}</span>
          </li>
        ))}
      </ul>
      <p className="rounded-md bg-warn-soft p-3 text-caption">
        <span className="font-semibold text-warn">Common mistake. </span>
        <span className="text-ink-2">{ex.mistake}</span>
      </p>
      {subs.length > 0 && (
        <div>
          <SectionLabel>Swap</SectionLabel>
          <div className="divide-y divide-line overflow-hidden rounded-md bg-surface-2">
            {subs.map((s) => (
              <button key={s.id} type="button" onClick={() => onSwap(s.id)} className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left active:opacity-60">
                <ExerciseFigure animation={s.animation} animate={false} className="w-14 shrink-0 text-ink" />
                <span className="min-w-0 flex-1 truncate text-body font-medium">{s.name}</span>
                <Icon name="swap" size={18} className="text-ink-3" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RunView({ workout, units }: { workout: Workout; units: Units }) {
  const run = workout.run!;
  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Time" value={formatMinutes(Math.round(run.totalSec / 60))} />
        <Stat label="Distance" value={`about ${toDisplayDistance(run.estimatedKm, units)} ${distanceLabel(units)}`} />
        <Stat label="Hard" value={run.hardSec > 0 ? formatMinutes(Math.round(run.hardSec / 60)) : 'None'} />
      </Card>
      {run.paceHint && <p className="px-1 text-caption text-ink-2">{run.paceHint}</p>}
      <section>
        <SectionLabel>Steps</SectionLabel>
        <ol className="rounded-lg bg-surface px-4 py-2 shadow-soft">
          {run.steps.map((st, i) => {
            const hard = isHardEffort(st.effort);
            return (
              <li key={i} className="relative flex gap-3 py-2.5">
                <div className="flex w-3 flex-col items-center">
                  <span className={cx('mt-1.5 size-3 shrink-0 rounded-full', hard ? 'bg-accent' : 'border-2 border-line bg-surface')} />
                  {i < run.steps.length - 1 && <span className="-mb-5 mt-1 w-px flex-1 bg-line" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cx('text-body font-semibold', hard && 'text-accent')}>{st.label}</p>
                  <p className="text-caption text-ink-2">
                    {EFFORT_LABEL[st.effort]} · zone {st.zone}
                    {st.hint ? ` · ${st.hint}` : ''}
                  </p>
                </div>
                <p className={cx('text-body font-semibold tabular', hard && 'text-accent')}>{formatClock(st.seconds)}</p>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-micro font-semibold uppercase text-ink-3">{label}</p>
      <p className="mt-0.5 text-body font-semibold tabular">{value}</p>
    </div>
  );
}
