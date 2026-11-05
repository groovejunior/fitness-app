import { addDays, mondayOf, today } from '../db/repo';
import { weekDates } from '../engine/dates';
import type { PlannedSession, WeekPlan } from '../engine/types';
import { dayAndDate, dayLong, dayShort, minutes } from '../lib/format';
import { useWeek } from '../lib/hooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { checkInDue } from '../engine/checkin';
import { navigate } from '../lib/router';
import { Icon } from '../ui/Icon';
import { Screen } from '../ui/Layout';
import { Button, Card, cx, ProgressBar, SectionTitle, Tag, TypeMark } from '../ui/kit';

const PHASE_LABEL = { build: 'Build week', peak: 'Peak week', deload: 'Lighter week' } as const;

function cta(s: PlannedSession): { label: string; to: string } {
  switch (s.status) {
    case 'committed':
      return { label: 'Start workout', to: `/session/${s.id}/active` };
    case 'in_progress':
      return { label: 'Continue', to: `/session/${s.id}/active` };
    case 'done':
      return { label: 'See summary', to: `/session/${s.id}/done` };
    default:
      return { label: "Today I'm doing this", to: `/session/${s.id}` };
  }
}

function SessionHero({ s }: { s: PlannedSession }) {
  const c = cta(s);
  const done = s.status === 'done';
  const skipped = s.status === 'skipped';
  return (
    <Card className="p-5" data-testid="today-session">
      <div className="flex items-start gap-3">
        <TypeMark type={s.type} done={done} size={44} />
        <div className="min-w-0 flex-1">
          <div className="text-[21px] font-semibold leading-tight tracking-tight">{s.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[15px] text-muted">
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" size={15} />
              {minutes(s.durationMin)}
            </span>
            <span>·</span>
            <span className="capitalize">{s.intensity}</span>
          </div>
        </div>
        {done && <Tag tone="accent">Done</Tag>}
        {skipped && <Tag>Skipped</Tag>}
        {s.status === 'committed' && <Tag tone="accent">Committed</Tag>}
      </div>
      {!skipped && (
        <Button
          block
          className="mt-5"
          variant={done ? 'secondary' : 'primary'}
          onClick={() => navigate(c.to)}
          icon={s.status === 'committed' || s.status === 'in_progress' ? 'play' : undefined}
        >
          {c.label}
        </Button>
      )}
      {!done && !skipped && s.status === 'planned' && (
        <button type="button" onClick={() => navigate(`/session/${s.id}`)} className="mt-2 w-full py-2 text-[14px] font-medium text-muted">
          Change equipment, time or effort first
        </button>
      )}
    </Card>
  );
}

function WeekStrip({ week, t }: { week: WeekPlan; t: string }) {
  return (
    <Card as="button" onClick={() => navigate('/plan')} className="px-3 py-3.5" aria-label="Open this week's plan">
      <div className="grid grid-cols-7">
        {weekDates(week.weekStart).map((d) => {
          const list = week.sessions.filter((s) => s.date === d && s.type !== 'mobility');
          const isToday = d === t;
          return (
            <div key={d} className="flex flex-col items-center gap-1.5">
              <div className={cx('text-[12px] font-medium', isToday ? 'text-accent' : 'text-muted')}>{dayShort(d).slice(0, 1)}</div>
              <div
                className={cx(
                  'flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-semibold tnum',
                  isToday ? 'bg-accent text-accent-ink' : 'text-ink',
                )}
              >
                {Number(d.slice(8))}
              </div>
              <div className="flex h-1.5 gap-0.5">
                {list.map((s) => (
                  <span
                    key={s.id}
                    className={cx(
                      'h-1.5 w-1.5 rounded-full',
                      s.status === 'done' ? 'bg-accent' : s.status === 'skipped' ? 'bg-line' : 'border border-accent/60',
                    )}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function Today() {
  const t = today();
  const weekStart = mondayOf(t);
  const week = useWeek(weekStart);
  const doneKeys = useLiveQuery(() => db.checkIns.toCollection().primaryKeys(), []);
  // Only ask once there's a week to look back on (at least one logged session).
  const hasLogs = useLiveQuery(async () => (await db.sessionLogs.count()) > 0, []);
  if (!week) return null;
  const due = doneKeys && hasLogs ? checkInDue(t, (ws) => doneKeys.includes(ws)) : undefined;

  const todays = week.sessions.filter((s) => s.date === t);
  const main = todays.filter((s) => s.type !== 'mobility');
  const extras = todays.filter((s) => s.type === 'mobility');
  const counted = week.sessions.filter((s) => s.type !== 'mobility');
  const done = counted.filter((s) => s.status === 'done').length;
  const next = week.sessions.find((s) => s.date > t && s.status === 'planned');
  const nextWeekHint = !next ? addDays(weekStart, 7) : undefined;

  return (
    <Screen title="Today" subtitle={dayAndDate(t)}>
      <div className="space-y-3">
        {main.length === 0 && extras.length === 0 && (
          <Card className="p-5" data-testid="rest-day">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-ink-2">
                <Icon name="rest" size={22} />
              </div>
              <div>
                <div className="text-[21px] font-semibold tracking-tight">Rest day</div>
                <div className="text-[15px] text-muted">Recovery is where the training sticks.</div>
              </div>
            </div>
            {next && (
              <div className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-[15px]">
                <span className="text-muted">Next: </span>
                <span className="font-medium">
                  {dayLong(next.date)}, {next.title.toLowerCase()}
                </span>
              </div>
            )}
            {nextWeekHint && <div className="mt-3 text-[14px] text-muted">That's the week done. Next week's plan is ready on Monday.</div>}
          </Card>
        )}
        {main.map((s) => (
          <SessionHero key={s.id} s={s} />
        ))}
        {extras.map((s) => (
          <Card key={s.id} onClick={() => navigate(`/session/${s.id}`)} className="flex items-center gap-3">
            <TypeMark type={s.type} done={s.status === 'done'} size={36} />
            <div className="flex-1">
              <div className="text-[16px] font-medium">{s.title}</div>
              <div className="text-[14px] text-muted">{minutes(s.durationMin)}, any time today</div>
            </div>
            <Icon name="chevron-right" size={18} className="text-muted" />
          </Card>
        ))}
      </div>

      {due && (
        <Card className="mt-3 flex items-center gap-3" onClick={() => navigate('/checkin')} data-testid="checkin-card">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="refresh" size={21} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-semibold">Weekly check-in</div>
            <div className="text-[14px] leading-snug text-muted">Three taps, and {due > t ? 'next week' : 'this week'} fits how you're doing.</div>
          </div>
          <Icon name="chevron-right" size={18} className="shrink-0 text-muted" />
        </Card>
      )}

      <SectionTitle action={<span className="text-[13px] font-medium text-muted">{PHASE_LABEL[week.phase]}</span>}>This week</SectionTitle>
      <WeekStrip week={week} t={t} />
      <div className="mt-4 px-1">
        <div className="mb-2 flex justify-between text-[14px]">
          <span className="text-muted">Sessions done</span>
          <span className="tnum font-semibold">
            {done} of {counted.length}
          </span>
        </div>
        <ProgressBar value={counted.length ? done / counted.length : 0} />
      </div>
    </Screen>
  );
}
