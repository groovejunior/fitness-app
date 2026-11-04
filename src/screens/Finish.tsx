import { useMemo, useState } from 'react';
import { committedWorkout, finishSession, sessionLog } from '../db/repo';
import { getExercise, personalRecords } from '../engine';
import type { SessionLog, SetLog } from '../engine/types';
import { clock, dayAndDate, kg } from '../lib/format';
import { useHistory, useSession, useSessionSets } from '../lib/hooks';
import { navigate } from '../lib/router';
import { useLiveQuery } from 'dexie-react-hooks';
import { DetailScreen } from '../ui/Layout';
import { Button, Card, cx, SectionTitle, Stepper, Tag } from '../ui/kit';
import { resultKey, ssGet, startKey, type ActiveResult } from './active/device';

const exName = (id: string) => {
  try {
    return getExercise(id).name;
  } catch {
    return id;
  }
};

function bestSet(sets: SetLog[]): string {
  const w = sets.filter((s) => s.weightKg && s.reps);
  if (w.length) {
    const b = w.reduce((m, s) => (s.weightKg! > m.weightKg! || (s.weightKg === m.weightKg && (s.reps ?? 0) > (m.reps ?? 0)) ? s : m));
    return `${kg(b.weightKg)} × ${b.reps}`;
  }
  const t = sets.filter((s) => s.timeSec);
  if (t.length) return `${Math.max(...t.map((s) => s.timeSec!))} s`;
  const r = Math.max(...sets.map((s) => s.reps ?? 0));
  return r ? `${r} reps` : `${sets.length} done`;
}

function Summary({ sets, prExercises }: { sets: SetLog[]; prExercises: Set<string> }) {
  const byEx = new Map<string, SetLog[]>();
  for (const s of sets) byEx.set(s.exerciseId, [...(byEx.get(s.exerciseId) ?? []), s]);
  if (byEx.size === 0) return null;
  return (
    <>
      <SectionTitle>Exercises</SectionTitle>
      <Card className="divide-y divide-line/60 py-1">
        {[...byEx.entries()].map(([id, list]) => (
          <div key={id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-medium">{exName(id)}</div>
              <div className="text-[14px] text-muted">
                {list.length} {list.length === 1 ? 'set' : 'sets'}
              </div>
            </div>
            {prExercises.has(id) && <Tag tone="accent">New best</Tag>}
            <div className="tnum text-[15px] text-ink-2">{bestSet(list)}</div>
          </div>
        ))}
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="tnum truncate text-[24px] font-bold tracking-tight">{value}</div>
      <div className="text-[13px] text-muted">{label}</div>
    </div>
  );
}

function volume(sets: SetLog[]): number {
  return sets.reduce((n, s) => n + (s.weightKg && s.reps ? s.weightKg * s.reps : 0), 0);
}

function paceText(km: number, sec: number): string | undefined {
  if (!km || !sec) return undefined;
  const p = sec / km;
  return `${clock(p)} /km`;
}

export function Finish({ sessionId }: { sessionId: string }) {
  const session = useSession(sessionId);
  const sets = useSessionSets(sessionId);
  const history = useHistory();
  const existing = useLiveQuery(async () => ({ log: await sessionLog(sessionId) }), [sessionId]);
  if (!session || !sets || !history || !existing) return null;
  if (existing.log) return <ReadOnly log={existing.log} sets={sets} history={history.sets} />;
  return <Form sessionId={sessionId} />;
}

function ReadOnly({ log, sets, history }: { log: SessionLog; sets: SetLog[]; history: SetLog[] }) {
  const done = sets.filter((s) => s.done);
  const prs = useMemo(() => prsFor(done, history), [done, history]);
  return (
    <DetailScreen
      title="Summary"
      onBack={() => navigate('/today', { replace: true })}
      footer={
        <Button block onClick={() => navigate('/today', { replace: true })} data-testid="back-today">
          Back to today
        </Button>
      }
    >
      <div data-testid="finish-screen">
        <h1 className="mt-4 px-1 text-[28px] font-bold leading-tight tracking-[-0.02em]">{log.title}</h1>
        <div className="mt-1 px-1 text-[15px] text-muted">{dayAndDate(log.date)}</div>
        <Card className="mt-5 flex gap-4 p-5">
          <Stat label="Minutes" value={String(log.durationMin)} />
          {done.length > 0 && <Stat label="Sets" value={String(done.length)} />}
          {log.effort !== undefined && <Stat label="Effort" value={`${log.effort}/10`} />}
          {log.distanceKm !== undefined && <Stat label="Distance" value={`${log.distanceKm} km`} />}
        </Card>
        {log.runTimeSec && log.distanceKm ? <div className="mt-3 px-1 text-[15px] text-muted">Pace {paceText(log.distanceKm, log.runTimeSec)}</div> : null}
        <Summary sets={done} prExercises={prs} />
        {log.notes && (
          <>
            <SectionTitle>Notes</SectionTitle>
            <Card className="text-[15px] leading-relaxed">{log.notes}</Card>
          </>
        )}
      </div>
    </DetailScreen>
  );
}

/** Exercises where this session beat everything before it. */
function prsFor(done: SetLog[], before: SetLog[]): Set<string> {
  const past = new Map(personalRecords(before.filter((s) => s.sessionId !== done[0]?.sessionId)).map((r) => [r.exerciseId, r]));
  const now = personalRecords(done);
  const out = new Set<string>();
  for (const r of now) {
    const p = past.get(r.exerciseId);
    if (!p) continue; // first time is not a "new best"
    if (r.bestWeight > p.bestWeight || r.bestE1rm > p.bestE1rm || (r.bestReps > p.bestReps && r.bestE1rm === 0)) out.add(r.exerciseId);
  }
  return out;
}

function Form({ sessionId }: { sessionId: string }) {
  const session = useSession(sessionId)!;
  const sets = useSessionSets(sessionId)!.filter((s) => s.done);
  const history = useHistory()!;
  const worked = useLiveQuery(() => committedWorkout(sessionId), [sessionId]);
  const result = useMemo(() => ssGet<ActiveResult>(resultKey(sessionId)) ?? {}, [sessionId]);
  const isRun = session.type === 'run';

  const initialMin = useMemo(() => {
    let sec = result.elapsedSec;
    if (!sec) {
      const st = ssGet<number>(startKey(sessionId));
      if (st) sec = Math.round((Date.now() - st) / 1000);
    }
    const m = sec ? Math.round(sec / 60) : 0;
    return m >= 3 && m <= 300 ? m : session.durationMin;
  }, [result, sessionId, session.durationMin]);

  const [duration, setDuration] = useState(initialMin);
  const [effort, setEffort] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [distance, setDistance] = useState('');
  const [runMin, setRunMin] = useState(() => Math.round((result.elapsedSec ?? session.durationMin * 60) / 60));
  const [saving, setSaving] = useState(false);

  const prs = useMemo(() => prsFor(sets, history.sets), [sets, history.sets]);
  const totalSets = worked
    ? worked.blocks.reduce((n, b) => n + b.items.reduce((m, i) => m + (i.kind === 'strength' ? i.sets : 0), 0), 0)
    : undefined;
  const vol = volume(sets);
  const dist = Number(distance.replace(',', '.')) || 0;
  const pace = isRun ? paceText(dist, runMin * 60) : undefined;

  const save = async () => {
    if (effort === null || saving) return;
    setSaving(true);
    await finishSession(sessionId, {
      durationMin: duration,
      effort,
      notes: notes.trim() || undefined,
      distanceKm: isRun && dist > 0 ? dist : undefined,
      runTimeSec: isRun ? runMin * 60 : undefined,
      stepsCompleted: result.stepsCompleted,
      stepsTotal: result.stepsTotal,
    });
    navigate('/today', { replace: true });
  };

  return (
    <DetailScreen
      title="Finish"
      onBack={() => navigate('/today', { replace: true })}
      footer={
        <Button block disabled={effort === null || saving} onClick={save} data-testid="save-finish">
          {effort === null ? 'Pick an effort to save' : 'Save'}
        </Button>
      }
    >
      <div data-testid="finish-screen">
        <h1 className="mt-4 px-1 text-[28px] font-bold leading-tight tracking-[-0.02em]">{worked?.title ?? session.title}</h1>
        <div className="mt-1 px-1 text-[15px] text-muted">Done. Here is how it went.</div>

        <Card className="mt-5 p-5">
          <div className="flex gap-4">
            {!isRun && totalSets !== undefined && totalSets > 0 && <Stat label="Sets done" value={`${sets.length} / ${totalSets}`} />}
            {vol > 0 && <Stat label="Volume" value={`${Math.round(vol).toLocaleString('en')} kg`} />}
            {result.stepsTotal ? <Stat label="Steps" value={`${result.stepsCompleted ?? 0} / ${result.stepsTotal}`} /> : null}
            {(isRun || sets.length === 0) && <Stat label="Time" value={`${duration} min`} />}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-4">
            <div className="text-[15px] text-ink-2">Duration</div>
            <div data-testid="finish-duration">
              <Stepper value={duration} onChange={setDuration} min={1} max={300} step={5} format={(v) => `${v} min`} label="duration" />
            </div>
          </div>
        </Card>

        {isRun && (
          <>
            <SectionTitle>Run</SectionTitle>
            <Card className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">Distance (km)</span>
                <input
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.0"
                  data-testid="run-distance"
                  className="tnum h-12 w-full rounded-xl bg-surface-2 px-4 text-[17px] text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/40"
                />
              </label>
              <div className="flex items-center justify-between">
                <div className="text-[15px] text-ink-2">Run time</div>
                <Stepper value={runMin} onChange={setRunMin} min={1} max={300} step={1} format={(v) => `${v} min`} label="run time" />
              </div>
              <div className="tnum text-[15px] text-muted">{pace ? `Pace ${pace}` : 'Add a distance to see your pace.'}</div>
            </Card>
          </>
        )}

        <Summary sets={sets} prExercises={prs} />

        <SectionTitle>How hard was it?</SectionTitle>
        <Card className="p-4">
          <div className="grid grid-cols-5 gap-2.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setEffort(n)}
                aria-label={`Effort ${n} of 10`}
                aria-pressed={effort === n}
                data-testid={`effort-${n}`}
                className={cx(
                  'tnum mx-auto flex h-12 w-12 items-center justify-center rounded-full text-[17px] font-semibold transition-colors duration-150 active:scale-95',
                  effort === n ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink',
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-3 flex justify-between px-1 text-[13px] text-muted">
            <span>1 · Easy</span>
            <span>Max · 10</span>
          </div>
        </Card>

        <SectionTitle>Notes</SectionTitle>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Anything to remember? (optional)"
          aria-label="Notes"
          data-testid="finish-notes"
          className="w-full resize-none rounded-xl bg-surface-2 px-4 py-3 text-[16px] leading-snug text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/40"
        />
      </div>
    </DetailScreen>
  );
}
