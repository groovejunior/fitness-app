import { useMemo, useState, type ReactNode } from 'react';
import { Empty, Loading } from '../../components/Empty';
import { getExercise } from '../../content/exercises';
import { addDays, adherence, doneByDay, e1rmTrend, mondayOf, parseISODate, personalRecords, runWeeks, weekStreak, weeklyMuscleVolume, type Muscle } from '../../engine';
import { useAllSessions, useAllSets, useAllWeeks, useSettings } from '../../data/hooks';
import { distanceLabel, formatDate, formatPace, toDisplayDistance, toDisplayWeight, weightLabel } from '../../lib/format';
import { today } from '../../lib/today';
import { Card, Chip, Page, ScreenHeader, SectionLabel } from '../../ui';
import { Bars, Heatmap, LineChart, MuscleBars } from './charts';

const MUSCLE_LABEL: Record<Muscle, string> = {
  quads: 'Front thigh',
  hamstrings: 'Back thigh',
  glutes: 'Glutes',
  calves: 'Calves',
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 animate-fade-up">
      <SectionLabel>{title}</SectionLabel>
      {children}
    </section>
  );
}

function Tile({ value, label, caption }: { value: string; label: string; caption: string }) {
  return (
    <Card className="px-3 py-3.5">
      <p className="text-numeral font-bold tabular leading-none">{value}</p>
      <p className="mt-2 text-caption font-semibold">{label}</p>
      <p className="mt-0.5 text-micro normal-case tracking-normal text-ink-3">{caption}</p>
    </Card>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-surface px-4 py-6 text-center text-body text-ink-2 shadow-soft">{children}</p>;
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

export default function Progress() {
  const sessions = useAllSessions();
  const sets = useAllSets();
  const weeks = useAllWeeks();
  const { units } = useSettings();
  const [picked, setPicked] = useState<string | null>(null);

  const t = today();
  const thisMonday = mondayOf(t);

  const strengthList = useMemo(() => {
    const by = new Map<string, Set<string>>();
    for (const s of sets ?? []) {
      if (!s.done || !s.weightKg || s.reps <= 0) continue;
      if (!by.has(s.exerciseId)) by.set(s.exerciseId, new Set());
      by.get(s.exerciseId)!.add(s.date);
    }
    return [...by.entries()]
      .map(([id, d]) => ({ id, n: d.size, ex: getExercise(id) }))
      .sort((a, b) => b.n - a.n || a.ex.name.localeCompare(b.ex.name));
  }, [sets]);

  if (!sessions || !sets || !weeks) return <Loading />;

  const done = sessions.filter((s) => s.status === 'done');
  if (done.length === 0) {
    return (
      <Page>
        <ScreenHeader title="Progress" />
        <div className="px-5">
          <Empty title="Nothing to show yet">Finish a workout and it shows up here.</Empty>
        </div>
      </Page>
    );
  }

  const dw = (kg: number) => toDisplayWeight(kg, units);
  const wl = weightLabel(units);
  const dl = distanceLabel(units);

  /* summary */
  const streak = weekStreak(sessions, t);
  const since = addDays(t, -27);
  const month = done.filter((s) => s.date >= since && s.date <= t).length;
  const recentWeeks = weeks.filter((w) => w.weekStart <= thisMonday).slice(-4);
  const plannedRecent = recentWeeks.reduce((n, w) => n + w.plan.slots.length, 0);
  const doneRecent = recentWeeks.reduce((n, w) => n + done.filter((s) => mondayOf(s.date) === w.weekStart).length, 0);
  const followed = plannedRecent > 0 ? `${Math.min(100, Math.round((doneRecent / plannedRecent) * 100))}%` : '–';

  /* consistency */
  const heatWeeks = Array.from({ length: 12 }, (_, i) => addDays(thisMonday, (i - 11) * 7));
  const byDay = doneByDay(sessions);
  const adh = adherence(
    weeks.map((w) => ({ weekStart: w.weekStart, planned: w.plan.slots.length })),
    sessions,
  )
    .filter((w) => w.weekStart <= thisMonday)
    .slice(-8);

  /* strength */
  const defaultLift = (strengthList.find((e) => e.ex.compound) ?? strengthList[0])?.id;
  const selected = picked && strengthList.some((e) => e.id === picked) ? picked : defaultLift;
  const trend = selected ? e1rmTrend(sets, selected).map((p) => ({ date: p.date, value: dw(p.e1rm) })) : [];
  let change = '';
  if (trend.length === 1) change = 'One session so far.';
  else if (trend.length > 1) {
    const diff = Math.round((trend[trend.length - 1].value - trend[0].value) * 10) / 10;
    const wk = Math.max(1, Math.round((parseISODate(trend[trend.length - 1].date).getTime() - parseISODate(trend[0].date).getTime()) / (7 * 86_400_000)));
    change = `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.abs(diff)} ${wl} in ${wk} ${wk === 1 ? 'week' : 'weeks'}`;
  }
  const prs = personalRecords(sets).slice(0, 6);

  /* running */
  const rw = runWeeks(sessions);
  const runStarts = Array.from({ length: 8 }, (_, i) => addDays(thisMonday, (i - 7) * 7));
  const runData = runStarts.map((ws) => rw.find((r) => r.weekStart === ws) ?? { weekStart: ws, km: 0, pace: null, runs: 0 });
  const hasRuns = runData.some((r) => r.km > 0);
  const pacePts = runData.filter((r) => r.pace).map((r) => ({ date: r.weekStart, value: units === 'imperial' ? r.pace! / 0.621371 : r.pace! }));
  const lastRun = [...done].reverse().find((s) => s.type === 'run' && s.run?.distanceKm);
  const lastRunPace = lastRun?.run?.durationSec && lastRun.run.distanceKm ? lastRun.run.durationSec / lastRun.run.distanceKm : null;

  /* volume */
  const vol = weeklyMuscleVolume(sets, thisMonday);
  const prev = weeklyMuscleVolume(sets, addDays(thisMonday, -7));
  const muscles = (Object.keys(vol) as Muscle[]).sort((a, b) => vol[b] - vol[a] || prev[b] - prev[a]);
  const anyVolume = muscles.some((m) => vol[m] > 0 || prev[m] > 0);

  const adhTotalDone = adh.reduce((n, w) => n + w.done, 0);
  const adhTotalPlanned = adh.reduce((n, w) => n + w.planned, 0);

  return (
    <Page>
      <ScreenHeader title="Progress" />
      <div className="px-5">
        <div className="grid grid-cols-3 gap-2.5 animate-fade-up">
          <Tile value={String(streak)} label="Week streak" caption="Weeks in a row with a workout" />
          <Tile value={String(month)} label="Sessions this month" caption="Done in the last 28 days" />
          <Tile value={followed} label="Plan followed" caption="Done vs planned, last 4 weeks" />
        </div>

        <Section title="Consistency">
          <Card className="px-3 py-4">
            <Heatmap
              weekStarts={heatWeeks}
              done={byDay}
              todayIso={t}
              label={`Workouts per day over the last 12 weeks. ${done.filter((s) => s.date >= heatWeeks[0]).length} sessions done.`}
            />
            <p className="px-1 pt-3 text-caption text-ink-3">Darker means more sessions that day. Today has an outline.</p>
          </Card>
          <Card className="mt-3 px-4 py-4">
            <p className="mb-2 text-caption font-semibold">Done vs planned, by week</p>
            {adh.length === 0 ? (
              <p className="text-caption text-ink-2">Your weekly plans show up here.</p>
            ) : (
              <>
                <Bars
                  data={adh.map((w) => ({ label: formatDate(w.weekStart), value: w.done, ghost: w.planned }))}
                  label={`Sessions done against planned for the last ${adh.length} weeks: ${adhTotalDone} of ${adhTotalPlanned}.`}
                />
                <p className="pt-2 text-caption text-ink-3">Solid is done, faint is planned. Weeks start on Monday.</p>
              </>
            )}
          </Card>
        </Section>

        <Section title="Strength">
          {strengthList.length === 0 ? (
            <EmptyLine>Finish a workout with weights and it shows up here.</EmptyLine>
          ) : (
            <>
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-3">
                {strengthList.map((e) => (
                  <Chip key={e.id} selected={e.id === selected} onClick={() => setPicked(e.id)} className="shrink-0">
                    {e.ex.name}
                  </Chip>
                ))}
              </div>
              <Card className="px-4 py-4">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <p className="truncate text-caption font-semibold">{selected ? getExercise(selected).name : ''}</p>
                  <p className="shrink-0 text-caption font-semibold tabular text-accent">{change}</p>
                </div>
                {trend.length > 0 && (
                  <LineChart
                    points={trend}
                    format={(n) => String(Math.round(n * 10) / 10)}
                    label={`Estimated one-rep max for ${selected ? getExercise(selected).name : ''}, from ${trend[0].value} to ${trend[trend.length - 1].value} ${wl}. ${change}`}
                  />
                )}
                <p className="pt-2 text-caption text-ink-3">Estimated one-rep max in {wl}, from your best set.</p>
              </Card>

              <SectionLabel className="mt-6">Personal records</SectionLabel>
              <div className="divide-y divide-line overflow-hidden rounded-lg bg-surface shadow-soft">
                {prs.map((p) => {
                  const ex = getExercise(p.exerciseId);
                  const weighted = p.bestE1rm > 0;
                  return (
                    <div key={p.exerciseId} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-medium">{ex.name}</p>
                        <p className="truncate text-caption text-ink-2 tabular">
                          {weighted ? `Heaviest ${dw(p.heaviestKg)} ${wl} × ${p.heaviestReps}` : `Most reps: ${p.mostReps}`} · {formatDate(p.date)}
                        </p>
                      </div>
                      {weighted && (
                        <div className="shrink-0 text-right">
                          <p className="text-headline font-semibold tabular">{dw(p.bestE1rm)}</p>
                          <p className="text-micro normal-case tracking-normal text-ink-3">{wl} est. 1RM</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Section>

        <Section title="Running">
          {!hasRuns ? (
            <EmptyLine>Finish a run and it shows up here.</EmptyLine>
          ) : (
            <>
              <Card className="px-4 py-4">
                <p className="mb-2 text-caption font-semibold">Distance per week ({dl})</p>
                <Bars
                  data={runData.map((r) => ({ label: formatDate(r.weekStart), value: toDisplayDistance(r.km, units) }))}
                  format={(n) => String(n)}
                  label={`Running distance per week in ${dl} for the last 8 weeks. This week ${toDisplayDistance(runData[7].km, units)} ${dl}.`}
                />
              </Card>
              <Card className="mt-3 px-4 py-4">
                <p className="mb-2 text-caption font-semibold">Average pace</p>
                {pacePts.length < 2 ? (
                  <p className="text-caption text-ink-2">Two weeks of runs and the pace trend appears.</p>
                ) : (
                  <>
                    <LineChart
                      points={pacePts}
                      format={mmss}
                      label={`Average pace per ${dl} by week, from ${mmss(pacePts[0].value)} to ${mmss(pacePts[pacePts.length - 1].value)}. Lower is faster.`}
                    />
                    <p className="pt-2 text-caption text-ink-3">Minutes per {dl}. Lower is faster, so a falling line is progress.</p>
                  </>
                )}
              </Card>
              {lastRun && (
                <p className="px-1 pt-3 text-caption text-ink-2 tabular">
                  Last run: {formatDate(lastRun.date)}, {toDisplayDistance(lastRun.run!.distanceKm!, units)} {dl}
                  {lastRunPace ? `, ${formatPace(lastRunPace, units)}` : ''}
                </p>
              )}
            </>
          )}
        </Section>

        <Section title="Weekly volume">
          {!anyVolume ? (
            <EmptyLine>Finish a workout and it shows up here.</EmptyLine>
          ) : (
            <Card className="px-4 py-4">
              <p className="mb-2 text-caption font-semibold">Hard sets per muscle this week</p>
              <MuscleBars
                target={10}
                data={muscles.map((m) => ({ label: MUSCLE_LABEL[m], value: vol[m], prev: prev[m] }))}
                label={`Working sets per muscle group this week: ${muscles.map((m) => `${MUSCLE_LABEL[m]} ${vol[m]}`).join(', ')}.`}
              />
              <p className="pt-2 text-caption text-ink-3">Solid is this week, faint is last week. About 10 hard sets a week per muscle is a good target.</p>
            </Card>
          )}
        </Section>
      </div>
    </Page>
  );
}
