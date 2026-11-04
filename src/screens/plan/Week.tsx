import { useEffect, useState } from 'react';
import { addDays, ensureWeek, mondayOf, moveSession, replanWeek, today } from '../../db/repo';
import { weekDates, WEEKDAY_LONG } from '../../engine/dates';
import { weekToIcs } from '../../engine';
import type { DayAvailability, PlannedSession, WeekPlan } from '../../engine/types';
import { dateShort, dayShort, downloadFile, minutes } from '../../lib/format';
import { useAllWeeks, useWeek } from '../../lib/hooks';
import { navigate } from '../../lib/router';
import { Icon } from '../../ui/Icon';
import { Button, Card, Chip, cx, IconButton, Notice, SectionTitle, Segmented, Sheet, Stepper, Tag, TypeMark } from '../../ui/kit';
import { FOCUS_LABEL, FOCUS_ORDER, PHASE_NAME, PlanToggle } from './shared';

const STATUS_TAG: Partial<Record<PlannedSession['status'], string>> = {
  done: 'Done',
  skipped: 'Skipped',
  committed: 'Committed',
  in_progress: 'In progress',
};

function availText(a: DayAvailability | undefined): string {
  if (!a || !a.available) return 'Not free';
  return `${minutes(a.minutes)}, ${a.window}`;
}

function SessionCard({ s, canMove, onMove }: { s: PlannedSession; canMove: boolean; onMove: () => void }) {
  const done = s.status === 'done';
  const skipped = s.status === 'skipped';
  const tag = STATUS_TAG[s.status];
  return (
    <div className="flex items-center gap-1" data-testid={`session-card-${s.id}`}>
      <button
        type="button"
        onClick={() => navigate(`/session/${s.id}`)}
        className={cx('flex min-w-0 flex-1 items-center gap-3 rounded-xl py-2 text-left active:opacity-70', skipped && 'opacity-60')}
      >
        <TypeMark type={s.type} done={done} size={38} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-medium leading-tight">{s.title}</div>
          <div className="mt-1 flex items-center gap-2 text-[13px] text-muted">
            <span>{minutes(s.durationMin)}</span>
            {tag && <Tag tone={done || s.status === 'committed' ? 'accent' : 'neutral'}>{tag}</Tag>}
          </div>
        </div>
      </button>
      {canMove && (
        <button
          type="button"
          onClick={onMove}
          data-testid={`move-${s.id}`}
          aria-label={`Move ${s.title}`}
          className="flex h-10 shrink-0 items-center gap-1 rounded-full px-3 text-[14px] font-medium text-accent active:bg-surface-2"
        >
          <Icon name="move" size={16} /> Move
        </button>
      )}
    </div>
  );
}

function DayRow({
  date,
  index,
  week,
  t,
  readOnly,
  onMove,
}: {
  date: string;
  index: number;
  week: WeekPlan;
  t: string;
  readOnly: boolean;
  onMove: (s: PlannedSession) => void;
}) {
  const list = week.sessions.filter((s) => s.date === date);
  const a = week.availability[index];
  const isToday = date === t;
  const isPast = date < t;
  return (
    <Card className={cx('px-4 py-3', isToday && 'ring-2 ring-accent/70', isPast && !list.length && 'opacity-70')} data-testid={`week-day-${index}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className={cx('text-[17px] font-semibold', isToday && 'text-accent')}>{dayShort(date)}</span>
          <span className="tnum text-[15px] text-muted">{dateShort(date)}</span>
          {isToday && <Tag tone="accent">Today</Tag>}
        </div>
        <span className={cx('text-[13px]', a?.available ? 'text-ink-2' : 'text-muted')}>{availText(a)}</span>
      </div>
      {list.length === 0 ? (
        <div className="mt-1 text-[14px] text-muted">Rest</div>
      ) : (
        <div className="mt-1 divide-y divide-line/60">
          {list.map((s) => (
            <SessionCard
              key={s.id}
              s={s}
              canMove={!readOnly && date >= t && (s.status === 'planned' || s.status === 'committed')}
              onMove={() => onMove(s)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function MoveSheet({ week, session, t, onClose }: { week: WeekPlan; session: PlannedSession | null; t: string; onClose: () => void }) {
  if (!session) return null;
  const go = async (d: string) => {
    await moveSession(session.id, d);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title="Move to which day?">
      <p className="-mt-2 mb-2 text-[14px] text-muted">
        {session.title}, {minutes(session.durationMin)}
      </p>
      <div className="divide-y divide-line">
        {weekDates(week.weekStart).map((d, i) => {
          const a = week.availability[i];
          const used = week.sessions.filter((s) => s.date === d && s.id !== session.id).reduce((n, s) => n + s.durationMin, 0);
          const free = a?.available ? Math.max(0, a.minutes - used) : 0;
          const current = d === session.date;
          const past = d < t;
          const tight = a?.available && free < session.durationMin;
          return (
            <button
              key={d}
              type="button"
              disabled={past || current}
              onClick={() => go(d)}
              data-testid={`move-to-${i}`}
              className="flex min-h-[52px] w-full items-center justify-between gap-3 py-2 text-left disabled:opacity-40"
            >
              <div>
                <div className="text-[16px] font-medium">
                  {WEEKDAY_LONG[i]} <span className="tnum font-normal text-muted">{dateShort(d)}</span>
                </div>
                <div className={cx('text-[13px]', !a?.available || tight ? 'text-muted' : 'text-ink-2')}>
                  {current ? 'Where it is now' : past ? 'Already gone' : a?.available ? free === 0 ? "Full already" : `${minutes(free)} free${tight ? ", a bit tight" : ""}` : 'Not free'}
                </div>
              </div>
              {!past && !current && <Icon name="chevron-right" size={18} className="text-muted" />}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

function AvailabilitySheet({ week, onClose }: { week: WeekPlan; onClose: () => void }) {
  const [av, setAv] = useState<DayAvailability[]>(week.availability.map((a) => ({ ...a })));
  const [busy, setBusy] = useState(false);
  const patch = (i: number, p: Partial<DayAvailability>) => setAv((cur) => cur.map((a, j) => (j === i ? { ...a, ...p } : a)));
  const save = async () => {
    setBusy(true);
    try {
      await replanWeek(week.weekStart, { availability: av });
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open onClose={onClose} title="This week's availability">
      <div className="divide-y divide-line">
        {av.map((a, i) => (
          <div key={i} className="py-3" data-testid={`avail-row-${i}`}>
            <div className="flex items-center justify-between">
              <span className="text-[16px] font-medium">{WEEKDAY_LONG[i]}</span>
              <PlanToggle checked={a.available} onChange={(v) => patch(i, { available: v })} label={`${WEEKDAY_LONG[i]} free`} />
            </div>
            {a.available && (
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <Stepper value={a.minutes} onChange={(v) => patch(i, { minutes: v })} min={20} max={150} step={15} format={(v) => `${v} min`} label={`${WEEKDAY_LONG[i]} minutes`} />
                <Segmented
                  size="sm"
                  className="w-[170px] shrink-0"
                  value={a.window}
                  onChange={(v) => patch(i, { window: v })}
                  options={[
                    { value: 'morning', label: 'AM' },
                    { value: 'midday', label: 'Noon' },
                    { value: 'evening', label: 'PM' },
                  ]}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <Button block className="mt-4" onClick={save} disabled={busy} data-testid="availability-save">
        Save and re-plan
      </Button>
    </Sheet>
  );
}

export function Week() {
  const t = today();
  const thisMonday = mondayOf(t);
  const [weekStart, setWeekStart] = useState(thisMonday);
  const week = useWeek(weekStart);
  const all = useAllWeeks();
  const [moving, setMoving] = useState<PlannedSession | null>(null);
  const [editing, setEditing] = useState(false);
  const isPast = weekStart < thisMonday;

  useEffect(() => {
    if (week === null && weekStart >= thisMonday) void ensureWeek(weekStart);
  }, [week, weekStart, thisMonday]);

  const hasEarlier = !!all && all.some((w) => w.weekStart < weekStart);
  const canNext = weekStart < addDays(thisMonday, 28);
  const label = weekStart === thisMonday ? 'This week' : weekStart === addDays(thisMonday, 7) ? 'Next week' : weekStart === addDays(thisMonday, -7) ? 'Last week' : `Week of ${dateShort(weekStart)}`;

  const nav = (
    <div className="flex items-center justify-between">
      <IconButton icon="chevron-left" label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))} disabled={!hasEarlier} data-testid="week-prev" className="disabled:opacity-30" />
      <div className="text-center">
        <div className="text-[18px] font-semibold tracking-tight" data-testid="week-label">{label}</div>
        <div className="text-[13px] text-muted">
          {dateShort(weekStart)} – {dateShort(addDays(weekStart, 6))}
        </div>
      </div>
      <IconButton icon="chevron-right" label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))} disabled={!canNext} data-testid="week-next" className="disabled:opacity-30" />
    </div>
  );

  if (!week) {
    return (
      <div>
        {nav}
        {week === null && (
          <div className="px-6 py-14 text-center text-[15px] text-muted">{isPast ? 'No plan was made for this week.' : 'Getting this week ready.'}</div>
        )}
      </div>
    );
  }

  const dates = weekDates(week.weekStart);
  const countable = week.sessions.filter((s) => s.type !== 'mobility');

  return (
    <div>
      {nav}
      <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
        <Tag tone="accent">{PHASE_NAME[week.phase]} week</Tag>
        <span className="text-[14px] text-muted">
          {FOCUS_LABEL[week.focus]} · {countable.length} {countable.length === 1 ? 'session' : 'sessions'}
        </span>
        {isPast && <span className="text-[14px] text-muted">· Read only</span>}
      </div>

      {week.warnings.length > 0 && (
        <div className="mt-3" data-testid="week-warnings">
          <Notice>
            <ul className="space-y-1">
              {week.warnings.map((w, i) => (
                <li key={i}>{w.message}</li>
              ))}
            </ul>
          </Notice>
        </div>
      )}

      <div className="mt-4 space-y-2.5">
        {dates.map((d, i) => (
          <DayRow key={d} date={d} index={i} week={week} t={t} readOnly={isPast} onMove={setMoving} />
        ))}
      </div>

      {!isPast && (
        <>
          <SectionTitle>Shape of the week</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {FOCUS_ORDER.map((f) => (
              <Chip key={f} selected={week.focus === f} onClick={() => replanWeek(week.weekStart, { focus: f })} data-testid={`week-focus-${f}`}>
                {FOCUS_LABEL[f]}
              </Chip>
            ))}
          </div>

          <SectionTitle>Version</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5">
            {(['recommended', 'alternative'] as const).map((v) => {
              const active = week.variant === v;
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={active}
                  data-testid={`week-variant-${v}`}
                  onClick={() => !active && replanWeek(week.weekStart, { variant: v })}
                  className={cx(
                    'rounded-card bg-surface p-3.5 text-left shadow-soft ring-2 transition-[box-shadow] active:scale-[0.99]',
                    active ? 'ring-accent' : 'ring-transparent',
                  )}
                >
                  <div className="text-[15px] font-semibold">{v === 'recommended' ? 'Recommended' : 'Alternative'}</div>
                  <div className="mt-0.5 text-[13px] leading-snug text-muted">
                    {v === 'recommended' ? 'The plan I would pick' : (week.alternativeLabel ?? 'A different mix')}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 space-y-2.5">
            <Button variant="secondary" block icon="clock" onClick={() => setEditing(true)} data-testid="availability-edit">
              Edit this week's availability
            </Button>
            <Button
              variant="secondary"
              block
              icon="calendar"
              onClick={() => downloadFile(`week-${week.weekStart}.ics`, weekToIcs(week.sessions, week.availability), 'text/calendar')}
              data-testid="ics-export"
            >
              Add to calendar
            </Button>
          </div>
        </>
      )}
      {isPast && (
        <div className="mt-6">
          <Button
            variant="secondary"
            block
            icon="calendar"
            onClick={() => downloadFile(`week-${week.weekStart}.ics`, weekToIcs(week.sessions, week.availability), 'text/calendar')}
            data-testid="ics-export"
          >
            Add to calendar
          </Button>
        </div>
      )}

      <MoveSheet week={week} session={moving} t={t} onClose={() => setMoving(null)} />
      {editing && <AvailabilitySheet week={week} onClose={() => setEditing(false)} />}
    </div>
  );
}
