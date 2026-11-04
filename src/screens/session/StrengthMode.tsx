import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WorkoutItem } from '../../engine';
import { ExerciseFigure } from '../../anim/Figure';
import { TopBar } from '../../components/TopBar';
import { getExercise } from '../../content/exercises';
import type { SessionRecord, SetRecord } from '../../data/types';
import { logSet, saveCursor, unlogSet } from '../../data/repo';
import { Button, Icon, ProgressBar, cx } from '../../ui';
import { formatClock, formatPrescription, fromDisplayWeight, toDisplayWeight, weightLabel, type Units } from '../../lib/format';
import { beep, primeAudio } from './beep';

interface Flat {
  item: WorkoutItem;
  section: string;
}

interface Draft {
  w?: string;
  r?: string;
}

const parse = (s: string | undefined): number | null => {
  if (s === undefined || s.trim() === '') return null;
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export function StrengthMode({
  session,
  sets,
  units,
  onFinish,
}: {
  session: SessionRecord;
  sets: SetRecord[];
  units: Units;
  onFinish: () => void;
}) {
  const flat = useMemo<Flat[]>(
    () => (session.workout?.sections ?? []).flatMap((s) => s.items.map((item) => ({ item, section: s.title }))),
    [session.workout],
  );
  const [index, setIndex] = useState(() => Math.min(Math.max(0, session.cursor ?? 0), Math.max(0, flat.length - 1)));
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const firedFor = useRef<number | null>(null);

  const cur = flat[index];
  const ex = cur ? getExercise(cur.item.exerciseId) : null;
  const next = flat[index + 1];

  const setMap = useMemo(() => {
    const m = new Map<string, SetRecord>();
    for (const s of sets) m.set(`${s.itemId}:${s.setIndex}`, s);
    return m;
  }, [sets]);

  const totalSets = flat.reduce((n, f) => n + f.item.sets, 0);
  const doneSets = sets.filter((s) => s.done).length;

  useEffect(() => {
    if (restEnd === null) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [restEnd]);

  const remaining = restEnd === null ? 0 : Math.max(0, Math.ceil((restEnd - now) / 1000));
  useEffect(() => {
    if (restEnd !== null && now >= restEnd && firedFor.current !== restEnd) {
      firedFor.current = restEnd;
      beep(1);
      setRestEnd(null);
    }
  }, [now, restEnd]);

  const go = useCallback(
    (i: number) => {
      const n = Math.min(Math.max(0, i), flat.length - 1);
      setIndex(n);
      setRestEnd(null);
      void saveCursor(session.id, n);
      window.scrollTo({ top: 0 });
    },
    [flat.length, session.id],
  );

  /** Value shown in the weight field for a set. */
  const weightFor = (item: WorkoutItem, i: number): string => {
    const logged = setMap.get(`${item.id}:${i}`);
    const d = drafts[`${item.id}:${i}`]?.w;
    if (d !== undefined) return d;
    if (logged?.done) return logged.weightKg === null ? '' : String(toDisplayWeight(logged.weightKg, units));
    if (i > 0) return weightFor(item, i - 1);
    return item.targetKg ? String(toDisplayWeight(item.targetKg, units)) : '';
  };
  const repsFor = (item: WorkoutItem, i: number): string => {
    const logged = setMap.get(`${item.id}:${i}`);
    const d = drafts[`${item.id}:${i}`]?.r;
    if (d !== undefined) return d;
    if (logged?.done) return String(logged.reps);
    return String(item.repsMax);
  };
  const edit = (item: WorkoutItem, i: number, patch: Draft) =>
    setDrafts((d) => ({ ...d, [`${item.id}:${i}`]: { ...d[`${item.id}:${i}`], ...patch } }));

  const toggle = async (item: WorkoutItem, i: number, loaded: boolean) => {
    primeAudio();
    const logged = setMap.get(`${item.id}:${i}`);
    if (logged?.done) {
      await unlogSet(session.id, item.id, i);
      return;
    }
    const w = parse(weightFor(item, i));
    const reps = parse(repsFor(item, i)) ?? item.repsMax;
    await logSet({
      sessionId: session.id,
      date: session.date,
      exerciseId: item.exerciseId,
      itemId: item.id,
      setIndex: i,
      weightKg: loaded && w !== null ? fromDisplayWeight(w, units) : null,
      reps,
      repsMin: item.repsMin,
      repsMax: item.repsMax,
      done: true,
    });
    if (item.restSec > 0) {
      setNow(Date.now());
      setRestEnd(Date.now() + item.restSec * 1000);
    }
  };

  if (!cur || !ex) return null;
  const { item } = cur;
  const isLast = index === flat.length - 1;
  const unitText = ex.unit === 'sec' || ex.unit === 'secPerSide' ? 'sec' : ex.unit === 'meters' ? 'm' : 'reps';
  const partner = item.group ? flat.find((f) => f.item.group === item.group && f.item.id !== item.id && Math.abs(flat.indexOf(f) - index) === 1) : undefined;
  const partnerEx = partner ? getExercise(partner.item.exerciseId) : null;

  return (
    <div className="min-h-dvh bg-bg">
      <TopBar
        onBack={() => window.history.back()}
        title={`${index + 1} of ${flat.length}`}
        trailing={
          <button type="button" onClick={onFinish} className="h-10 rounded-full px-2 text-body font-medium text-accent active:opacity-60">
            Finish
          </button>
        }
      />
      <div className="mx-auto w-full max-w-lg px-5">
        <ProgressBar value={totalSets ? doneSets / totalSets : 0} />
      </div>

      <main className={cx('mx-auto w-full max-w-lg px-5 pt-4', restEnd !== null ? 'pb-72' : 'pb-48')}>
        <div key={item.id} className="animate-fade-up">
          <p className="text-micro font-semibold uppercase text-ink-3">{cur.section}</p>
          <h1 className="mt-0.5 text-title font-semibold">{ex.name}</h1>
          <p className="mt-0.5 text-body text-ink-2 tabular">{formatPrescription(item.sets, item.repsMin, item.repsMax, ex.unit)}</p>

          <div className="mx-auto mt-3 flex max-h-[260px] justify-center rounded-lg bg-surface py-3 text-ink shadow-soft">
            <ExerciseFigure animation={ex.animation} className="h-[230px] w-full text-ink" title={ex.name} />
          </div>

          <ul className="mt-4 space-y-1.5">
            {ex.cues.slice(0, 3).map((c) => (
              <li key={c} className="flex gap-2 text-body text-ink-2">
                <span className="mt-2.5 size-1 shrink-0 rounded-full bg-accent" />
                {c}
              </li>
            ))}
          </ul>
          {item.note && <p className="mt-3 rounded-md bg-accent-soft px-3.5 py-2.5 text-caption text-accent">{item.note}</p>}
          {partnerEx && (
            <p className="mt-3 text-caption text-ink-2">
              Superset with {partnerEx.name}. {index < flat.indexOf(partner!) ? 'Go straight to it after each set.' : 'Go back to it after each set.'}
            </p>
          )}

          <div className="mt-5 space-y-2" role="list" aria-label="Sets">
            {Array.from({ length: item.sets }, (_, i) => {
              const done = !!setMap.get(`${item.id}:${i}`)?.done;
              return (
                <div
                  key={i}
                  role="listitem"
                  className={cx('flex items-center gap-3 rounded-lg p-3 pl-4 shadow-soft transition-colors', done ? 'bg-accent-soft' : 'bg-surface')}
                >
                  <span className="w-12 shrink-0 text-caption font-semibold text-ink-2">Set {i + 1}</span>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {ex.loaded && (
                      <label className="flex min-w-0 flex-1 flex-col">
                        <span className="sr-only">Weight for set {i + 1}</span>
                        <div className="flex h-11 items-center rounded-sm bg-bg px-2.5">
                          <input
                            inputMode="decimal"
                            type="text"
                            value={weightFor(item, i)}
                            placeholder="0"
                            onChange={(e) => edit(item, i, { w: e.target.value })}
                            className="w-full min-w-0 bg-transparent text-body font-semibold tabular outline-none"
                          />
                          <span className="ml-1 text-caption text-ink-3">{weightLabel(units)}</span>
                        </div>
                      </label>
                    )}
                    <label className="flex min-w-0 flex-1 flex-col">
                      <span className="sr-only">{unitText === 'reps' ? 'Reps' : unitText === 'sec' ? 'Seconds' : 'Metres'} for set {i + 1}</span>
                      <div className="flex h-11 items-center rounded-sm bg-bg px-2.5">
                        <input
                          inputMode="numeric"
                          type="text"
                          value={repsFor(item, i)}
                          onChange={(e) => edit(item, i, { r: e.target.value })}
                          className="w-full min-w-0 bg-transparent text-body font-semibold tabular outline-none"
                        />
                        <span className="ml-1 text-caption text-ink-3">{unitText}</span>
                      </div>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(item, i, ex.loaded)}
                    aria-label={done ? `Mark set ${i + 1} not done` : `Mark set ${i + 1} done`}
                    aria-pressed={done}
                    className={cx(
                      'grid size-12 shrink-0 place-items-center rounded-full transition active:scale-95',
                      done ? 'bg-accent text-accent-ink' : 'border-2 border-line text-ink-3',
                    )}
                  >
                    <Icon name="check" size={22} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-5 pt-3 pb-safe">
          {restEnd !== null && (
            <div className="mb-3 rounded-lg bg-surface p-4 shadow-float" role="timer" aria-label="Rest timer">
              <p className="text-micro font-semibold uppercase text-ink-3">Rest</p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-numeral font-bold tabular text-accent" data-testid="rest-remaining">
                  {formatClock(remaining)}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="md" onClick={() => setRestEnd((e) => (e ?? Date.now()) + 15000)}>
                    +15 s
                  </Button>
                  <Button variant="ghost" size="md" onClick={() => setRestEnd(null)}>
                    Skip rest
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2 pb-1">
            <Button variant="secondary" size="lg" onClick={() => go(index - 1)} disabled={index === 0}>
              Previous
            </Button>
            {isLast ? (
              <Button size="lg" className="flex-1" onClick={onFinish}>
                Finish workout
              </Button>
            ) : (
              <Button size="lg" className="flex-1" onClick={() => go(index + 1)}>
                Next exercise
              </Button>
            )}
          </div>
          {next && <p className="truncate pb-1 text-center text-micro text-ink-3">Up next: {getExercise(next.item.exerciseId).name}</p>}
        </div>
      </div>
    </div>
  );
}
