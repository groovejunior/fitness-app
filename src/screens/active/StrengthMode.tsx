// One exercise at a time: figure, cues, sets with a big check each, rest timer, prev / next.
import { useEffect, useMemo, useState } from 'react';
import { ExerciseFigure } from '../../animations/Figure';
import { deleteSet, logSet, newId } from '../../db/repo';
import { getExercise, suggestLoad } from '../../engine';
import type { Exercise, History, PlannedSession, SetLog, StrengthItem, Workout } from '../../engine/types';
import { clock, targetText } from '../../lib/format';
import { navigate } from '../../lib/router';
import { Icon } from '../../ui/Icon';
import { Button, cx } from '../../ui/kit';
import { ActiveFrame } from './Frame';
import { alert, resultKey, ssGet, ssSet, startKey, unlockAudio, useNow, type ActiveResult } from './device';

interface Entry {
  item: StrengthItem;
  ex: Exercise;
  blockTitle: string;
  pos: number;
  count: number;
  /** One tick, no weights or reps (warm-up, cool-down, mobility, sport prep). */
  single: boolean;
}

type Field = 'w' | 'r' | 't';

export function buildEntries(workout: Workout): Entry[] {
  const out: Entry[] = [];
  for (const b of workout.blocks) {
    const items = b.items.filter((i): i is StrengthItem => i.kind === 'strength');
    items.forEach((item, i) => {
      let ex: Exercise;
      try {
        ex = getExercise(item.exerciseId);
      } catch {
        return;
      }
      const single = b.kind === 'warmup' || b.kind === 'cooldown' || workout.type === 'sport' || workout.type === 'mobility';
      out.push({ item, ex, blockTitle: b.title, pos: i + 1, count: items.length, single });
    });
  }
  return out;
}

const setCount = (e: Entry) => (e.single ? 1 : Math.max(1, e.item.sets));
const num = (s: string | undefined): number | undefined => {
  if (s === undefined || s.trim() === '') return undefined;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

export function StrengthMode({
  session,
  workout,
  sets,
  history,
}: {
  session: PlannedSession;
  workout: Workout;
  sets: SetLog[];
  history: History;
}) {
  const sessionId = session.id;
  const entries = useMemo(() => buildEntries(workout), [workout]);
  const isSport = workout.type === 'sport';
  const pages = entries.length + (isSport ? 1 : 0);
  const loggedFor = (e: Entry, i: number) => sets.find((s) => s.exerciseId === e.ex.id && s.setIndex === i && s.done);
  const doneCount = (e: Entry) => Array.from({ length: setCount(e) }, (_, i) => i).filter((i) => loggedFor(e, i)).length;

  const [idx, setIdx] = useState(() => {
    const first = entries.findIndex((e) => doneCount(e) < setCount(e));
    return first === -1 ? Math.max(0, pages - 1) : first;
  });
  const [edits, setEdits] = useState<Record<string, Partial<Record<Field, string>>>>({});
  const [rest, setRest] = useState<{ endAt: number; total: number } | null>(null);
  const [hold, setHold] = useState<{ set: number; endAt: number } | null>(null);

  const totalSets = entries.reduce((n, e) => n + setCount(e), 0);
  const doneSets = entries.reduce((n, e) => n + doneCount(e), 0);
  const progress = isSport ? (doneSets + (idx >= entries.length ? 1 : 0)) / (totalSets + 1) : totalSets ? doneSets / totalSets : 0;

  // Prefill comes from earlier sessions only, never this one.
  const past = useMemo<History>(() => ({ ...history, sets: history.sets.filter((s) => s.sessionId !== sessionId) }), [history, sessionId]);

  const now = useNow(!!rest || !!hold, 250);

  useEffect(() => {
    if (rest && now >= rest.endAt) {
      alert();
      setRest(null);
    }
  }, [rest, now]);

  const entry = entries[idx] as Entry | undefined;
  const onPlay = isSport && idx >= entries.length;
  const lastPage = idx >= pages - 1;

  // Reset transient timers when changing page.
  const go = (to: number) => {
    unlockAudio();
    setHold(null);
    setIdx(Math.max(0, Math.min(pages - 1, to)));
    window.scrollTo(0, 0);
  };

  const suggestion = useMemo(() => {
    if (!entry) return undefined;
    return suggestLoad(entry.ex, entry.item.target, past, {});
  }, [entry, past]);

  const metric: 'time' | 'reps' = entry ? (entry.item.target.kind === 'time' || entry.ex.load === 'timed' ? 'time' : 'reps') : 'reps';
  const weighted = entry?.ex.load === 'weighted';

  const defaults = (e: Entry): Record<Field, number | undefined> => {
    const s = suggestLoad(e.ex, e.item.target, past, {});
    return {
      w: e.item.weightKg ?? s.weightKg,
      r: s.reps ?? (e.item.target.kind === 'reps' ? e.item.target.max : undefined),
      t: e.item.target.kind === 'time' ? e.item.target.seconds : 30,
    };
  };

  const valueOf = (e: Entry, i: number, f: Field): string => {
    const edited = edits[`${idxOf(e)}:${i}`]?.[f];
    if (edited !== undefined) return edited;
    const l = loggedFor(e, i);
    if (l) {
      const v = f === 'w' ? l.weightKg : f === 'r' ? l.reps : l.timeSec;
      if (v !== undefined) return String(v);
    }
    const d = defaults(e)[f];
    return d === undefined ? '' : String(d);
  };
  const idxOf = (e: Entry) => entries.indexOf(e);

  const writeSet = async (e: Entry, i: number, over?: Partial<Record<Field, number>>) => {
    const metricT = e.item.target.kind === 'time' || e.ex.load === 'timed';
    const w = over?.w ?? num(valueOf(e, i, 'w'));
    const r = over?.r ?? num(valueOf(e, i, 'r'));
    const t = over?.t ?? num(valueOf(e, i, 't'));
    const existing = loggedFor(e, i);
    const set: SetLog = {
      id: existing?.id ?? newId('set'),
      sessionId,
      exerciseId: e.ex.id,
      date: session.date,
      setIndex: i,
      weightKg: e.ex.load === 'weighted' && !e.single ? w : undefined,
      reps: metricT ? undefined : r,
      timeSec: metricT ? t : undefined,
      done: true,
    };
    await logSet(set);
  };

  const toggleSet = async (e: Entry, i: number) => {
    unlockAudio();
    setHold(null);
    const existing = loggedFor(e, i);
    if (existing) {
      await deleteSet(existing.id);
      return;
    }
    await writeSet(e, i);
    const lastOfAll = idxOf(e) === entries.length - 1 && i === setCount(e) - 1 && !isSport;
    if (!e.single && e.item.restSec > 0 && !lastOfAll) {
      setRest({ endAt: Date.now() + e.item.restSec * 1000, total: e.item.restSec });
    }
  };

  const editField = (e: Entry, i: number, f: Field, v: string) => {
    setEdits((m) => ({ ...m, [`${idxOf(e)}:${i}`]: { ...m[`${idxOf(e)}:${i}`], [f]: v } }));
    // Correct a set that is already checked.
    const l = loggedFor(e, i);
    if (l) {
      const n = num(v);
      if (n !== undefined) void writeSet(e, i, { [f]: n });
    }
  };

  // Hold timer reaching zero logs the set.
  useEffect(() => {
    if (hold && entry && now >= hold.endAt) {
      alert();
      const t = num(valueOf(entry, hold.set, 't'));
      const i = hold.set;
      setHold(null);
      if (!loggedFor(entry, i)) {
        void writeSet(entry, i, { t }).then(() => {
          if (entry.item.restSec > 0 && !(idx === entries.length - 1 && i === setCount(entry) - 1 && !isSport)) {
            setRest({ endAt: Date.now() + entry.item.restSec * 1000, total: entry.item.restSec });
          }
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hold, now]);

  const finish = (elapsedSec?: number) => {
    const start = ssGet<number>(startKey(sessionId));
    const r: ActiveResult = { elapsedSec: elapsedSec ?? (start ? Math.round((Date.now() - start) / 1000) : undefined) };
    ssSet(resultKey(sessionId), r);
    navigate(`/session/${sessionId}/done`);
  };

  const allDone = entry ? doneCount(entry) >= setCount(entry) : true;

  const footer = (
    <div className="space-y-2.5 pb-1">
      {rest && (
        <RestCard
          remaining={Math.max(0, (rest.endAt - now) / 1000)}
          total={rest.total}
          onSkip={() => setRest(null)}
          onAdd={() => setRest({ endAt: rest.endAt + 15000, total: rest.total + 15 })}
        />
      )}
      <div className="flex gap-2.5">
        <Button variant="secondary" className="w-28 shrink-0" icon="chevron-left" disabled={idx === 0} onClick={() => go(idx - 1)} data-testid="prev-exercise" aria-label="Previous exercise">
          Prev
        </Button>
        {onPlay ? (
          <PlayDone sessionId={sessionId} onDone={(sec) => finish(sec)} />
        ) : lastPage ? (
          <Button className="flex-1" onClick={() => finish()} data-testid="finish-workout">
            Finish workout
          </Button>
        ) : (
          <Button className="flex-1" variant={allDone ? 'primary' : 'secondary'} onClick={() => go(idx + 1)} data-testid="next-exercise">
            Next exercise
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <ActiveFrame title={workout.title} progress={progress} footer={footer} bodyClass={rest ? 'pb-72' : 'pb-40'}>
      {onPlay && <PlayCard sessionId={sessionId} />}
      {entry && suggestion && (
        <div key={idx} className="rise">
          <div className="px-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
            {entry.blockTitle} · {entry.pos} of {entry.count}
          </div>
          <div className="mt-3 flex h-[210px] items-center justify-center overflow-hidden rounded-[1.75rem] bg-surface-2 p-3">
            <ExerciseFigure animationId={entry.ex.animationId} playing label={entry.ex.name} className="h-full max-w-[300px]" />
          </div>
          <h1 className="mt-5 px-1 text-[28px] font-bold leading-tight tracking-[-0.02em]" data-testid="active-exercise-name">
            {entry.ex.name}
          </h1>
          <div className="mt-1 px-1 text-[15px] text-muted">
            {entry.single
              ? targetText(entry.item.target, entry.ex.unilateral)
              : `${entry.item.sets} × ${targetText(entry.item.target, entry.ex.unilateral)}${entry.item.restSec ? ` · ${entry.item.restSec} s rest` : ''}`}
          </div>
          <ul className="mt-3 space-y-1 px-1 text-[14px] leading-snug text-ink-2">
            {entry.ex.cues.slice(0, entry.single ? 2 : 3).map((c) => (
              <li key={c} className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted" />
                {c}
              </li>
            ))}
          </ul>
          {entry.item.note && <div className="mt-2 px-1 text-[14px] text-muted">{entry.item.note}</div>}

          <div className="mt-6 rounded-card bg-surface p-4 shadow-soft">
            {entry.single ? (
              <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[17px] font-semibold">{targetText(entry.item.target, entry.ex.unilateral)}</div>
                  <div className="text-[14px] text-muted">{loggedFor(entry, 0) ? 'Done' : 'Tick when done'}</div>
                </div>
                <CheckButton done={!!loggedFor(entry, 0)} onClick={() => toggleSet(entry, 0)} testid="set-check-0" label="Mark done" />
              </div>
            ) : (
              <>
                <div className="mb-1 flex items-center gap-3 px-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
                  <div className="w-7">Set</div>
                  {weighted && <div className="flex-1 text-center">kg</div>}
                  <div className="flex-1 text-center">{metric === 'time' ? 'seconds' : 'reps'}</div>
                  <div className="w-14" />
                </div>
                <div className="divide-y divide-line/60">
                  {Array.from({ length: setCount(entry) }, (_, i) => {
                    const l = loggedFor(entry, i);
                    const holding = hold?.set === i;
                    return (
                      <div key={i} className="flex items-center gap-3 py-2.5">
                        <div className={cx('tnum w-7 pl-1 text-[17px] font-semibold', l ? 'text-accent' : 'text-muted')}>{i + 1}</div>
                        {weighted && (
                          <NumInput value={valueOf(entry, i, 'w')} onChange={(v) => editField(entry, i, 'w', v)} decimal label={`Set ${i + 1} weight in kg`} testid={`set-weight-${i}`} done={!!l} />
                        )}
                        {metric === 'time' && holding ? (
                          <button
                            type="button"
                            onClick={() => setHold(null)}
                            aria-label="Stop the hold timer"
                            className="tnum flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-accent-soft text-[24px] font-semibold text-accent"
                          >
                            {clock(Math.ceil((hold!.endAt - now) / 1000))}
                            <Icon name="pause" size={18} />
                          </button>
                        ) : (
                          <NumInput
                            value={valueOf(entry, i, metric === 'time' ? 't' : 'r')}
                            onChange={(v) => editField(entry, i, metric === 'time' ? 't' : 'r', v)}
                            label={`Set ${i + 1} ${metric === 'time' ? 'seconds' : 'reps'}`}
                            testid={`set-reps-${i}`}
                            done={!!l}
                          />
                        )}
                        <div className="flex w-14 shrink-0 justify-end">
                          {metric === 'time' && !l && !holding ? (
                            <button
                              type="button"
                              aria-label={`Start hold timer for set ${i + 1}`}
                              onClick={() => {
                                unlockAudio();
                                setRest(null);
                                setHold({ set: i, endAt: Date.now() + (num(valueOf(entry, i, 't')) ?? 30) * 1000 });
                              }}
                              className="mr-1 flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent"
                            >
                              <Icon name="play" size={16} />
                            </button>
                          ) : null}
                          <CheckButton done={!!l} onClick={() => toggleSet(entry, i)} testid={`set-check-${i}`} label={l ? `Undo set ${i + 1}` : `Mark set ${i + 1} done`} small />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 border-t border-line/60 px-1 pt-3 text-[13px] leading-snug text-muted">
                  {suggestion.last && <div className="text-ink-2">Last time: {suggestion.last.summary}</div>}
                  <div>{suggestion.reason}</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {!entry && !onPlay && <div className="p-6 text-muted">Nothing to do in this workout.</div>}
    </ActiveFrame>
  );
}

function NumInput({ value, onChange, decimal, label, testid, done }: { value: string; onChange: (v: string) => void; decimal?: boolean; label: string; testid: string; done: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      inputMode={decimal ? 'decimal' : 'numeric'}
      aria-label={label}
      data-testid={testid}
      className={cx(
        'tnum h-14 min-w-0 flex-1 rounded-xl bg-surface-2 text-center text-[22px] font-semibold outline-none focus:ring-2 focus:ring-accent/40',
        done ? 'text-ink-2' : 'text-ink',
      )}
    />
  );
}

function CheckButton({ done, onClick, testid, label, small }: { done: boolean; onClick: () => void; testid: string; label: string; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={done}
      data-testid={testid}
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150 active:scale-90',
        small ? 'h-12 w-12' : 'h-16 w-16',
        done ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-transparent text-transparent',
      )}
    >
      <Icon name="check" size={small ? 24 : 30} strokeWidth={2.5} />
    </button>
  );
}

function RestCard({ remaining, total, onSkip, onAdd }: { remaining: number; total: number; onSkip: () => void; onAdd: () => void }) {
  return (
    <div className="sheet-up rounded-[1.5rem] bg-surface p-4 shadow-soft ring-1 ring-line/60" data-testid="rest-timer" role="timer" aria-label="Rest timer">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">Rest</div>
          <div className="tnum text-[52px] font-bold leading-none tracking-[-0.03em]">{clock(Math.ceil(remaining))}</div>
        </div>
        <Button variant="secondary" size="md" onClick={onAdd} data-testid="rest-add">
          +15 s
        </Button>
        <Button size="md" onClick={onSkip} data-testid="rest-skip">
          Skip
        </Button>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-[width] duration-300 ease-linear" style={{ width: `${Math.min(100, (remaining / total) * 100)}%` }} />
      </div>
    </div>
  );
}

// Sport: a plain elapsed timer for the game itself.
const playKey = (id: string) => `play-start:${id}`;
function usePlayStart(sessionId: string): number {
  const [start] = useState(() => {
    const s = ssGet<number>(playKey(sessionId));
    if (s) return s;
    const n = Date.now();
    ssSet(playKey(sessionId), n);
    return n;
  });
  return start;
}

function PlayCard({ sessionId }: { sessionId: string }) {
  const start = usePlayStart(sessionId);
  const now = useNow(true, 500);
  return (
    <div className="rise rounded-[1.75rem] bg-surface p-8 text-center shadow-soft" data-testid="play-card">
      <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">Playing</div>
      <div className="tnum mt-3 text-[72px] font-bold leading-none tracking-[-0.03em]">{clock((now - start) / 1000)}</div>
      <div className="mt-4 text-[15px] text-muted">Have fun. Press Done when you are finished.</div>
    </div>
  );
}

function PlayDone({ sessionId, onDone }: { sessionId: string; onDone: (sec: number) => void }) {
  const start = usePlayStart(sessionId);
  return (
    <Button className="flex-1" onClick={() => onDone(Math.round((Date.now() - start) / 1000))} data-testid="finish-workout">
      Done
    </Button>
  );
}
