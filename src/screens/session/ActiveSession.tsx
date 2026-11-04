import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Empty, Loading } from '../../components/Empty';
import { TopBar } from '../../components/TopBar';
import { getExercise } from '../../content/exercises';
import { useSession, useSessionSets, useSettings } from '../../data/hooks';
import { finishSession, startSession } from '../../data/repo';
import { Button, Card, Page, SectionLabel } from '../../ui';
import { formatMinutes, formatClock, toDisplayDistance, toDisplayWeight, distanceLabel, weightLabel } from '../../lib/format';
import { FinishScreen } from './FinishScreen';
import { RunMode, type RunResult } from './RunMode';
import { StrengthMode } from './StrengthMode';
import { useWakeLock } from './useWakeLock';

export default function ActiveSession() {
  const { id } = useParams();
  const nav = useNavigate();
  const session = useSession(id);
  const sets = useSessionSets(id);
  const settings = useSettings();
  const units = settings.units;
  const [finishing, setFinishing] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [finishMinutes, setFinishMinutes] = useState(1);
  const started = useRef(false);

  useWakeLock();

  useEffect(() => {
    if (session?.status === 'committed' && !started.current) {
      started.current = true;
      void startSession(session.id);
    }
  }, [session?.status, session?.id]);

  const doneSets = useMemo(() => (sets ?? []).filter((s) => s.done), [sets]);

  if (session === undefined || sets === undefined) return <Loading />;
  if (session === null || !session.workout) {
    return (
      <div className="min-h-dvh bg-bg">
        <TopBar onBack={() => nav('/')} />
        <Empty title="Workout not found" action={<Link to="/" className="text-body font-semibold text-accent">Go home</Link>}>
          It may have been removed or moved.
        </Empty>
      </div>
    );
  }
  const workout = session.workout;
  const isRun = workout.type === 'run' && !!workout.run;

  if (session.status === 'done') return <Summary />;

  const flatItems = workout.sections.flatMap((s) => s.items);
  const setsTotal = flatItems.reduce((n, i) => n + i.sets, 0);
  const volumeKg = doneSets.reduce((n, s) => n + (s.weightKg ?? 0) * s.reps, 0);

  const openFinish = (minutes?: number) => {
    const m = minutes ?? (session.startedAt ? Math.max(1, Math.round((Date.now() - session.startedAt) / 60000)) : workout.estimatedMinutes);
    setFinishMinutes(m);
    setFinishing(true);
  };

  if (finishing) {
    return (
      <div className="min-h-dvh bg-bg">
        <FinishScreen
          units={units}
          defaultMinutes={finishMinutes}
          setsDone={doneSets.length}
          setsTotal={setsTotal}
          volumeDisplay={toDisplayWeight(volumeKg, units)}
          run={isRun ? (runResult ?? { durationSec: 0, stepsDone: 0, stepsTotal: workout.run!.steps.length }) : undefined}
          onBack={() => setFinishing(false)}
          onSave={async (d) => {
            await finishSession(session.id, {
              effort: d.effort,
              notes: d.notes,
              durationMin: d.durationMin,
              run: isRun
                ? {
                    distanceKm: d.distanceKm,
                    durationSec: runResult?.durationSec ?? d.durationMin * 60,
                    stepsDone: runResult?.stepsDone ?? 0,
                    stepsTotal: runResult?.stepsTotal ?? workout.run!.steps.length,
                  }
                : undefined,
            });
            nav('/progress', { replace: true });
          }}
        />
      </div>
    );
  }

  if (isRun) {
    return (
      <RunMode
        run={workout.run!}
        title={workout.title}
        storageKey={`fitness.run.${session.id}`}
        onBack={() => nav(-1)}
        onFinish={(r) => {
          setRunResult(r);
          openFinish(Math.max(1, Math.round(r.durationSec / 60)));
        }}
      />
    );
  }

  return <StrengthMode session={session} sets={sets} units={units} onFinish={() => openFinish()} />;

  function Summary() {
    const s = session!;
    const w = s.workout!;
    const names = new Map(w.sections.flatMap((x) => x.items).map((i) => [i.id, i]));
    return (
      <div className="min-h-dvh bg-bg">
        <TopBar title="Summary" onBack={() => nav('/progress')} />
        <Page withTabBar={false} className="px-5">
          <h1 className="pt-4 font-display text-display font-bold">{s.title}</h1>
          <p className="mt-1 text-body text-ink-2">Finished. This view is read only.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Card className="p-4">
              <p className="text-micro font-semibold uppercase text-ink-3">Duration</p>
              <p className="text-title font-semibold tabular">{formatMinutes(s.durationMin ?? 0)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-micro font-semibold uppercase text-ink-3">Effort</p>
              <p className="text-title font-semibold tabular">{s.effort ? `${s.effort} of 10` : 'Not rated'}</p>
            </Card>
            {s.run && (
              <>
                <Card className="p-4">
                  <p className="text-micro font-semibold uppercase text-ink-3">Distance</p>
                  <p className="text-title font-semibold tabular">
                    {s.run.distanceKm ? `${toDisplayDistance(s.run.distanceKm, units)} ${distanceLabel(units)}` : 'Not logged'}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-micro font-semibold uppercase text-ink-3">Time</p>
                  <p className="text-title font-semibold tabular">{formatClock(s.run.durationSec ?? 0)}</p>
                </Card>
              </>
            )}
          </div>
          {s.notes && <p className="mt-4 text-body text-ink-2">{s.notes}</p>}
          {doneSets.length > 0 && (
            <>
              <SectionLabel className="mt-6">Sets</SectionLabel>
              <div className="divide-y divide-line overflow-hidden rounded-lg bg-surface shadow-soft">
                {[...names.values()].map((it) => {
                  const mine = doneSets.filter((x) => x.itemId === it.id).sort((a, b) => a.setIndex - b.setIndex);
                  if (!mine.length) return null;
                  return (
                    <div key={it.id} className="px-4 py-3">
                      <p className="text-body font-medium">{getExercise(it.exerciseId).name}</p>
                      <p className="text-caption text-ink-2 tabular">
                        {mine.map((x) => (x.weightKg !== null ? `${toDisplayWeight(x.weightKg, units)} ${weightLabel(units)} × ${x.reps}` : `${x.reps}`)).join('  ·  ')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <div className="mt-6">
            <Button block variant="secondary" onClick={() => nav('/progress')}>
              Back to progress
            </Button>
          </div>
        </Page>
      </div>
    );
  }
}
