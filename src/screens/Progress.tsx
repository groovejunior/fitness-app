import { useMemo, useState } from 'react';
import { Screen } from '../ui/Layout';
import { Card, Empty, SectionTitle, Sheet, cx } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { useAllWeeks, useHistory, useProfile, useSessionLogs } from '../lib/hooks';
import { dateShort, kg, km } from '../lib/format';
import { today } from '../db/repo';
import { e1rmTrend, personalRecords, WEEKDAY_SHORT, type Profile } from '../engine';
import { BarChart, LineChart, Sparkline } from './progress/charts';
import {
  MUSCLE_NAME,
  buildHeatmap,
  doneInLastDays,
  exerciseName,
  muscleVolume,
  paceSeries,
  paceText,
  recentSessions,
  thisWeekCount,
  type RecentSession,
  weekStreak,
  weeklyRunKm,
  weightedExercises,
} from './progress/stats';

type Units = Profile['units'];
const KG_TO_LB = 2.20462;
const KM_TO_MI = 0.621371;

export function Progress() {
  const logs = useSessionLogs();
  const history = useHistory();
  const weeks = useAllWeeks();
  const profile = useProfile();
  const units: Units = profile?.units ?? 'metric';
  const t = today();

  if (!logs || !history || !weeks) return <Screen title="Progress">{null}</Screen>;

  return (
    <Screen title="Progress" subtitle="Last 12 weeks">
      <Adherence logs={logs} weeks={weeks} t={t} />
      <Strength history={history} units={units} />
      <Running logs={logs} units={units} t={t} />
      <MuscleVolume history={history} t={t} />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Adherence

function Stat({ value, label, testId }: { value: string; label: string; testId?: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="tnum text-[24px] font-semibold leading-none tracking-tight" data-testid={testId}>
        {value}
      </div>
      <div className="mt-1.5 text-[13px] leading-tight text-muted">{label}</div>
    </div>
  );
}

function Adherence({ logs, weeks, t }: { logs: ReturnType<typeof useSessionLogs> & object; weeks: NonNullable<ReturnType<typeof useAllWeeks>>; t: string }) {
  const cols = useMemo(() => buildHeatmap(weeks, logs, t), [weeks, logs, t]);
  const wk = thisWeekCount(weeks, logs, t);
  const streak = weekStreak(weeks, logs, t);
  const last4 = doneInLastDays(logs, t, 28);
  const any = logs.length > 0 || weeks.length > 0;

  return (
    <>
      <SectionTitle className="mt-2">Adherence</SectionTitle>
      <Card>
        {!any ? (
          <Empty title="Nothing here yet">Finish a session and your weeks start to fill in.</Empty>
        ) : (
          <>
            <div className="flex gap-4">
              <Stat value={wk.planned ? `${wk.done} of ${wk.planned}` : `${wk.done}`} label="This week" testId="progress-week-count" />
              <Stat value={`${streak} ${streak === 1 ? 'week' : 'weeks'}`} label="In a row" />
              <Stat value={`${last4}`} label="Last 4 weeks" />
            </div>
            <div className="mt-5 flex gap-2.5" data-testid="progress-heatmap" role="img" aria-label="Sessions done over the last 12 weeks">
              <div className="flex flex-col justify-between py-px text-[10px] leading-none text-muted" aria-hidden>
                {WEEKDAY_SHORT.map((d, i) => (
                  <span key={d} className="flex h-[22px] items-center">
                    {i % 2 === 0 ? d.slice(0, 1) : ''}
                  </span>
                ))}
              </div>
              <div className="grid flex-1 grid-flow-col grid-rows-1 gap-[5px]" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}>
                {cols.map((col, ci) => (
                  <div key={ci} className="flex flex-col gap-[5px]">
                    {col.map((c) => (
                      <div
                        key={c.date}
                        title={`${dateShort(c.date)}${c.done ? `: ${c.done} done` : c.planned ? ': planned' : ''}`}
                        className={cx(
                          'h-[22px] rounded-[6px]',
                          c.done > 0 ? 'bg-accent' : c.planned > 0 ? 'border-[1.5px] border-accent/60' : 'bg-surface-2',
                          c.date === t && c.done === 0 && c.planned === 0 && 'ring-1 ring-line',
                        )}
                        style={c.done > 0 ? { opacity: c.done >= 2 ? 1 : 0.6 } : undefined}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 text-[12px] text-muted">
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-3 w-3 rounded-[4px] border-[1.5px] border-accent/60" />
                Planned
              </span>
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-3 w-3 rounded-[4px] bg-accent opacity-60" />
                Done
              </span>
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-3 w-3 rounded-[4px] bg-accent" />
                Two or more
              </span>
            </div>
          </>
        )}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Strength

function Strength({ history, units }: { history: NonNullable<ReturnType<typeof useHistory>>; units: Units }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const ids = useMemo(() => weightedExercises(history.sets), [history.sets]);
  const records = useMemo(() => new Map(personalRecords(history.sets).map((r) => [r.exerciseId, r])), [history.sets]);

  return (
    <>
      <SectionTitle>Strength</SectionTitle>
      <Card className="py-2">
        {ids.length === 0 ? (
          <Empty title="No lifts yet">Log a few gym sessions and your lifts show up here.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {ids.map((id) => {
              const trend = e1rmTrend(id, history.sets);
              const r = records.get(id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    data-testid={`exercise-history-${id}`}
                    onClick={() => setOpenId(id)}
                    className="flex min-h-[56px] w-full items-center gap-3 py-2.5 text-left active:opacity-70"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[16px] font-medium">{exerciseName(id)}</div>
                      <div className="tnum mt-0.5 text-[13px] text-muted">
                        {r ? `Best set ${kg(r.bestWeight, units)}` : ''}
                        {r && trend.length ? ` · e1RM ${kg(Math.round(r.bestE1rm), units)}` : ''}
                      </div>
                    </div>
                    <Sparkline values={trend.map((p) => p.value)} />
                    <Icon name="chevron-right" size={18} className="shrink-0 text-muted" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <p className="mt-2 px-1 text-[12px] leading-snug text-muted">e1RM is an estimate of the heaviest single you could lift, worked out from your sets.</p>
      <Sheet open={openId !== null} onClose={() => setOpenId(null)} title={openId ? exerciseName(openId) : undefined}>
        {openId && <ExerciseDetail id={openId} history={history} units={units} />}
      </Sheet>
    </>
  );
}

function setsText(s: RecentSession, units: Units): string {
  return s.groups.map((g) => `${kg(g.weightKg, units)} × ${g.reps.join(', ')}`).join(' · ');
}

function ExerciseDetail({ id, history, units }: { id: string; history: NonNullable<ReturnType<typeof useHistory>>; units: Units }) {
  const f = units === 'imperial' ? KG_TO_LB : 1;
  const trend = e1rmTrend(id, history.sets);
  const rec = personalRecords(history.sets.filter((s) => s.exerciseId === id))[0];
  const recent = recentSessions(id, history.sets);
  const unit = units === 'imperial' ? 'lb' : 'kg';
  return (
    <div className="pb-2">
      <div className="text-[13px] font-medium text-muted">Estimated one-rep max</div>
      <div className="mb-2 mt-1 text-[13px] text-muted">Best of each session, in {unit}.</div>
      <LineChart
        points={trend.map((p) => ({ date: p.date, value: p.value * f }))}
        format={(v) => `${Math.round(v)}`}
        label={`Estimated one-rep max for ${exerciseName(id)} over time`}
        testId="e1rm-chart"
      />
      {rec && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface-2 px-4 py-3">
            <div className="text-[12px] text-muted">Best e1RM</div>
            <div className="tnum mt-0.5 text-[20px] font-semibold">{kg(Math.round(rec.bestE1rm), units)}</div>
            <div className="text-[12px] text-muted">{dateShort(rec.date)}</div>
          </div>
          <div className="rounded-2xl bg-surface-2 px-4 py-3">
            <div className="text-[12px] text-muted">Heaviest set</div>
            <div className="tnum mt-0.5 text-[20px] font-semibold">{kg(rec.bestWeight, units)}</div>
          </div>
        </div>
      )}
      <h4 className="mb-1 mt-6 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">Recent sessions</h4>
      <ul className="divide-y divide-line">
        {recent.map((s) => (
          <li key={s.date} className="flex items-baseline justify-between gap-4 py-3">
            <span className="text-[15px] font-medium">{dateShort(s.date)}</span>
            <span className="tnum text-right text-[14px] text-ink-2">{setsText(s, units)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Running

function Running({ logs, units, t }: { logs: NonNullable<ReturnType<typeof useSessionLogs>>; units: Units; t: string }) {
  const weekly = useMemo(() => weeklyRunKm(logs, t), [logs, t]);
  const pace = useMemo(() => paceSeries(logs), [logs]);
  const hasRuns = weekly.some((w) => w.km > 0);
  const f = units === 'imperial' ? KM_TO_MI : 1;
  const unit = units === 'imperial' ? 'mi' : 'km';
  const thisWeek = weekly[weekly.length - 1].km;
  const latest = pace[pace.length - 1];
  // Pace chart: convert to the chosen unit, flip nothing; lower is better is stated in the caption.
  const paceConv = pace.slice(-10).map((p) => ({ date: p.date, value: units === 'imperial' ? p.value * 1.609344 : p.value }));

  return (
    <>
      <SectionTitle>Running</SectionTitle>
      <Card>
        {!hasRuns && pace.length === 0 ? (
          <Empty title="No runs yet">Log a run with distance and time and your weekly total and pace show up here.</Empty>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <div className="text-[15px] font-medium">Distance per week</div>
              <div className="tnum text-[13px] text-muted">This week {km(thisWeek, units)}</div>
            </div>
            <div className="mt-3">
              <BarChart
                bars={weekly.map((w, i) => ({ label: dateShort(w.monday).split(' ')[0], value: w.km * f, strong: i === weekly.length - 1 }))}
                format={(v) => (v >= 10 ? `${Math.round(v)}` : v.toFixed(1))}
                label={`Distance per week in ${unit}, last 8 weeks`}
                testId="run-chart"
              />
            </div>
            <div className="mt-1 text-[12px] text-muted">Week starting, in {unit}.</div>
            {pace.length > 0 && (
              <div className="mt-6 border-t border-line pt-5">
                <div className="flex items-baseline justify-between">
                  <div className="text-[15px] font-medium">Pace</div>
                  <div className="tnum text-[20px] font-semibold" data-testid="pace-latest">
                    {paceText(latest.value, units)}
                  </div>
                </div>
                <div className="mt-3">
                  <PaceChart points={paceConv} units={units} />
                </div>
                <div className="mt-1 text-[12px] text-muted">Lower is faster. Last {paceConv.length} runs.</div>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}

function PaceChart({ points, units }: { points: { date: string; value: number }[]; units: Units }) {
  const fmt = (v: number) => paceText(units === 'imperial' ? v / 1.609344 : v, units).split(' ')[0];
  return (
    <div data-testid="pace-chart">
      <LineChart points={points} format={fmt} label="Pace per run" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Muscle volume

function MuscleVolume({ history, t }: { history: NonNullable<ReturnType<typeof useHistory>>; t: string }) {
  const rows = useMemo(() => muscleVolume(history, t), [history, t]);
  const max = Math.max(...rows.map((r) => r.sets), 1);
  return (
    <>
      <SectionTitle>Sets this week</SectionTitle>
      <Card data-testid="muscle-volume">
        {rows.length === 0 ? (
          <Empty title="No sets this week">Log a gym session and you see which muscles got the work.</Empty>
        ) : (
          <ul className="space-y-3.5">
            {rows.map((r) => (
              <li key={r.muscle} className="flex items-center gap-3">
                <span className="w-[88px] shrink-0 text-[14px] text-ink-2">{MUSCLE_NAME[r.muscle]}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(r.sets / max) * 100}%` }} />
                </div>
                <span className="tnum w-6 shrink-0 text-right text-[14px] font-medium">{r.sets}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-2 px-1 text-[12px] leading-snug text-muted">Working sets since Monday, by main muscle. Warm-up drills aren't counted.</p>
    </>
  );
}
