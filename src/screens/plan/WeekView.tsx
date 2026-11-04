import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  addDays,
  DAY_LONG,
  daysBetween,
  mondayOf,
  weekToIcs,
  WEEK_FOCUS_HINT,
  WEEK_FOCUS_LABEL,
  type DayIndex,
  type PlannedSlot,
  type WeekAvailability,
  type WeekFocus,
  type WeekPlan,
} from '../../engine';
import { useBlock, useWeek, useWeekSessions } from '../../data/hooks';
import type { SessionRecord } from '../../data/types';
import { chooseWeekOption, moveSlot, replanWeek } from '../../data/repo';
import { today } from '../../lib/today';
import { formatDate } from '../../lib/format';
import { Empty, Loading } from '../../components/Empty';
import { SessionGlyph } from '../../components/SessionGlyph';
import { WeekStrip } from '../../components/WeekStrip';
import { Button, Card, Chip, Icon, Notice, Page, Pill, SectionLabel, Sheet } from '../../ui';
import { cx } from '../../ui/cx';
import { AvailabilityEditor } from './AvailabilityEditor';
import { PlanHeader } from './PlanHeader';

const FOCUSES: WeekFocus[] = ['balanced', 'legs', 'upper', 'endurance', 'strength', 'deload', 'sport'];
const PHASE_LABEL = { build: 'Build', peak: 'Peak', deload: 'Deload' } as const;

function availText(a: WeekAvailability[number]): string {
  if (!a.available) return 'Busy';
  return a.window === 'any' ? `${a.minutes} min` : `${a.minutes} min, ${a.window}`;
}

export default function WeekView() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const weekStart = mondayOf(params.get('w') ?? today());
  const rec = useWeek(weekStart);
  const block = useBlock(weekStart);
  const sessions = useWeekSessions(weekStart);
  const [moving, setMoving] = useState<PlannedSlot | null>(null);
  const [editing, setEditing] = useState(false);

  if (rec === undefined || sessions === undefined || block === undefined) {
    return (
      <Page>
        <PlanHeader active="week" />
        <Loading />
      </Page>
    );
  }
  if (rec === null || !block) {
    return (
      <Page>
        <PlanHeader active="week" />
        <Empty title="Outside this month's plan" action={<Button variant="secondary" onClick={() => nav('/plan/week', { replace: true })}>Go to this week</Button>}>
          There is no plan for the week of {formatDate(weekStart)}.
        </Empty>
      </Page>
    );
  }

  const plan = rec.plan;
  const idx = Math.max(0, Math.min(3, Math.floor(daysBetween(block.startDate, weekStart) / 7)));
  const go = (w: string) => nav(`/plan/week?w=${w}`, { replace: true });
  const todayIso = today();

  const download = () => {
    const blob = new Blob([weekToIcs(plan)], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `week-${weekStart}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Page>
      <PlanHeader active="week" />
      <div className="space-y-6 px-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Previous week"
            disabled={idx === 0}
            onClick={() => go(addDays(weekStart, -7))}
            className="grid size-10 place-items-center rounded-full bg-surface-2 text-ink disabled:opacity-30"
          >
            <Icon name="chevronLeft" size={20} />
          </button>
          <div className="min-w-0 text-center">
            <p className="text-body font-semibold">
              Week {idx + 1} of 4 · {PHASE_LABEL[plan.phase]}
            </p>
            <p className="text-caption text-ink-2">
              {formatDate(weekStart)} to {formatDate(addDays(weekStart, 6))}
            </p>
          </div>
          <button
            type="button"
            aria-label="Next week"
            disabled={idx === 3}
            onClick={() => go(addDays(weekStart, 7))}
            className="grid size-10 place-items-center rounded-full bg-surface-2 text-ink disabled:opacity-30"
          >
            <Icon name="chevronRight" size={20} />
          </button>
        </div>

        <WeekStrip
          weekStart={weekStart}
          slots={plan.slots}
          sessions={sessions}
          availability={plan.availability}
          today={todayIso}
          onSelect={(d) => document.getElementById(`day-${d}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />

        {plan.warnings.length > 0 && (
          <div className="space-y-2">
            {plan.warnings.map((w, i) => (
              <Notice key={`${w.code}-${i}`}>{w.message}</Notice>
            ))}
          </div>
        )}

        <section>
          <SectionLabel>Focus this week</SectionLabel>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {FOCUSES.map((f) => (
              <Chip key={f} selected={plan.focus === f} onClick={() => plan.focus !== f && replanWeek(weekStart, { focus: f })} className="shrink-0">
                {WEEK_FOCUS_LABEL[f]}
              </Chip>
            ))}
          </div>
          <p className="mt-2 px-1 text-caption text-ink-2">{WEEK_FOCUS_HINT[plan.focus]}</p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {(
            [
              { key: 'recommended', p: rec.recommended },
              { key: 'alternative', p: rec.alternative },
            ] as const
          ).map(({ key, p }) => {
            const active = plan.chosen === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => !active && chooseWeekOption(weekStart, key)}
                className={cx('rounded-lg bg-surface p-3.5 text-left shadow-soft active:scale-[0.99]', active && 'ring-2 ring-accent')}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-body font-semibold">{p.label}</span>
                  {active && <Icon name="check" size={16} className="mt-1 shrink-0 text-accent" />}
                </span>
                <span className="mt-1 block text-caption text-ink-2">{p.why}</span>
              </button>
            );
          })}
        </section>

        <section>
          <SectionLabel
            action={
              <button type="button" onClick={() => setEditing(true)} className="text-caption font-semibold text-accent">
                Edit availability
              </button>
            }
          >
            Days
          </SectionLabel>
          <div className="space-y-5">
            {DAY_LONG.map((name, d) => {
              const date = addDays(weekStart, d);
              const slots = plan.slots.filter((s) => s.day === d);
              const a = plan.availability[d];
              return (
                <div key={d} id={`day-${d}`} className="scroll-mt-16">
                  <div className="mb-2 flex items-baseline justify-between px-1">
                    <p className="text-body font-semibold">
                      {name} <span className="font-normal text-ink-3">{formatDate(date)}</span>
                      {date === todayIso && <Pill tone="accent" className="ml-2 align-middle">Today</Pill>}
                    </p>
                    <p className="text-caption text-ink-3">{availText(a)}</p>
                  </div>
                  {slots.length === 0 ? (
                    <p className="px-1 text-caption text-ink-3">Rest</p>
                  ) : (
                    <div className="space-y-2">
                      {slots.map((s) => (
                        <SlotCard
                          key={s.id}
                          slot={s}
                          session={sessions.find((r) => r.slotId === s.id)}
                          onOpen={() => nav(`/workout/${weekStart}/${s.id}`)}
                          onMove={() => setMoving(s)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <Button block variant="secondary" icon={<Icon name="calendar" size={18} />} onClick={download}>
            Add to calendar
          </Button>
          <p className="mt-2 text-center text-caption text-ink-3">Opens in Apple or Google Calendar.</p>
        </section>
      </div>

      {moving && <MoveSheet plan={plan} slot={moving} weekStart={weekStart} onClose={() => setMoving(null)} />}
      {editing && <AvailabilitySheet plan={plan} weekStart={weekStart} onClose={() => setEditing(false)} />}
    </Page>
  );
}

function SlotCard({ slot, session, onOpen, onMove }: { slot: PlannedSlot; session?: SessionRecord; onOpen: () => void; onMove: () => void }) {
  const status = session?.status;
  return (
    <Card className="flex items-center gap-1 p-0">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-3.5 text-left active:opacity-70">
        <SessionGlyph type={slot.type} active={status === 'done'} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-semibold">{slot.title}</span>
          <span className="block truncate text-caption text-ink-2">{slot.intent}</span>
          <span className="mt-0.5 flex items-center gap-2 text-caption text-ink-3 tabular">
            {slot.minutes} min
            {status === 'done' && <Pill tone="accent">Done</Pill>}
            {status === 'skipped' && <Pill>Skipped</Pill>}
            {status === 'in_progress' && <Pill tone="accent">In progress</Pill>}
            {status === 'committed' && <Pill>Ready</Pill>}
          </span>
        </span>
      </button>
      {status !== 'done' && (
        <button
          type="button"
          aria-label={`Move ${slot.title}`}
          onClick={onMove}
          className="mr-3 h-9 shrink-0 rounded-sm bg-surface-2 px-3 text-caption font-semibold text-ink-2 active:opacity-70"
        >
          Move
        </button>
      )}
    </Card>
  );
}

function MoveSheet({ plan, slot, weekStart, onClose }: { plan: WeekPlan; slot: PlannedSlot; weekStart: string; onClose: () => void }) {
  return (
    <Sheet open onClose={onClose} title={`Move ${slot.title}`}>
      <div className="divide-y divide-line">
        {DAY_LONG.map((name, d) => {
          const current = d === slot.day;
          const busy = !plan.availability[d].available;
          return (
            <button
              key={d}
              type="button"
              disabled={current}
              onClick={async () => {
                await moveSlot(weekStart, slot.id, d as DayIndex);
                onClose();
              }}
              className="flex min-h-12 w-full items-center justify-between py-2 text-left disabled:opacity-40"
            >
              <span className="text-body font-medium">
                {name} <span className="font-normal text-ink-3">{formatDate(addDays(weekStart, d))}</span>
              </span>
              <span className="text-caption text-ink-3">{current ? 'Now here' : busy ? 'Busy' : availText(plan.availability[d])}</span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

function AvailabilitySheet({ plan, weekStart, onClose }: { plan: WeekPlan; weekStart: string; onClose: () => void }) {
  const [value, setValue] = useState<WeekAvailability>(plan.availability.map((d) => ({ ...d })));
  return (
    <Sheet open onClose={onClose} title="Edit availability">
      <AvailabilityEditor value={value} onChange={setValue} />
      <Button
        block
        size="lg"
        className="mt-5"
        onClick={async () => {
          await replanWeek(weekStart, { availability: value });
          onClose();
        }}
      >
        Save
      </Button>
    </Sheet>
  );
}
