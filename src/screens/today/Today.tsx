import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dayIndexOf, mondayOf, WEEK_FOCUS_LABEL, type PlannedSlot, type Phase } from '../../engine';
import { sessionId, skipSession, startSession, unskipSession, blockIsOver } from '../../data/repo';
import { useBlock, useProfile, useWeek, useWeekSessions } from '../../data/hooks';
import type { SessionRecord } from '../../data/types';
import { dayLong, formatLongDate, formatMinutes } from '../../lib/format';
import { today } from '../../lib/today';
import { Empty, Loading } from '../../components/Empty';
import { SessionGlyph } from '../../components/SessionGlyph';
import { Button, Card, Icon, Notice, Page, Pill, ProgressBar, ScreenHeader, SectionLabel, cx } from '../../ui';
import { WeekStrip } from '../../components/WeekStrip';

const PHASE_LABEL = (phase: Phase, weekIndex: number) =>
  phase === 'build' ? `Build · week ${weekIndex + 1} of 4` : phase === 'peak' ? 'Peak' : 'Deload';

function statusOf(rec?: SessionRecord) {
  return rec?.status ?? 'planned';
}

function StatusPill({ status }: { status: string }) {
  if (status === 'done') return <Pill tone="accent">Done</Pill>;
  if (status === 'skipped') return <Pill>Skipped</Pill>;
  if (status === 'in_progress') return <Pill tone="accent">In progress</Pill>;
  if (status === 'committed') return <Pill tone="accent">Ready</Pill>;
  return <Pill>Planned</Pill>;
}

function TodayCard({ weekStart, slot, rec }: { weekStart: string; slot: PlannedSlot; rec?: SessionRecord }) {
  const nav = useNavigate();
  const status = statusOf(rec);
  const id = sessionId(weekStart, slot.id);
  const done = status === 'done';
  const skipped = status === 'skipped';
  const detail = `/workout/${weekStart}/${slot.id}`;
  return (
    <Card className={cx('animate-fade-up p-5', (done || skipped) && 'opacity-80')}>
      <div className="flex items-start gap-4">
        <SessionGlyph type={slot.type} size={48} active={!done && !skipped} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-title font-semibold">{rec?.title ?? slot.title}</h2>
            <StatusPill status={status} />
          </div>
          <p className="mt-1 text-body text-ink-2">{slot.intent}</p>
          <p className="mt-2 text-caption text-ink-3 tabular">{formatMinutes(slot.minutes)}</p>
        </div>
      </div>

      <div className="mt-5">
        {done ? (
          <div className="flex items-center gap-2 text-body font-semibold text-accent">
            <Icon name="check" size={20} />
            <span>
              Done
              {rec?.durationMin ? ` · ${formatMinutes(rec.durationMin)}` : ''}
              {rec?.effort ? ` · effort ${rec.effort}/10` : ''}
            </span>
          </div>
        ) : skipped ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-body font-semibold text-ink-2">Skipped</span>
            <Button variant="secondary" onClick={() => unskipSession(id)}>
              Undo
            </Button>
          </div>
        ) : status === 'in_progress' ? (
          <Button block size="lg" onClick={() => nav(`/session/${id}`)}>
            Resume
          </Button>
        ) : status === 'committed' ? (
          <Button
            block
            size="lg"
            onClick={async () => {
              await startSession(id);
              nav(`/session/${id}`);
            }}
          >
            Start
          </Button>
        ) : (
          <Button block size="lg" onClick={() => nav(detail)}>
            See workout
          </Button>
        )}
      </div>

      {(status === 'planned' || status === 'committed') && (
        <div className="mt-2 flex justify-center">
          <Button variant="ghost" size="sm" className="text-ink-3" onClick={() => skipSession(weekStart, slot)}>
            Skip today
          </Button>
        </div>
      )}
    </Card>
  );
}

function CompactRow({ weekStart, slot, rec }: { weekStart: string; slot: PlannedSlot; rec?: SessionRecord }) {
  const status = statusOf(rec);
  return (
    <Link to={`/workout/${weekStart}/${slot.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 active:bg-surface-2">
      <SessionGlyph type={slot.type} size={36} active={status === 'done'} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-medium">{rec?.title ?? slot.title}</p>
        <p className="truncate text-caption text-ink-2 tabular">{formatMinutes(slot.minutes)}</p>
      </div>
      <StatusPill status={status} />
      <Icon name="chevronRight" size={18} className="text-ink-3" />
    </Link>
  );
}

export default function Today() {
  const t = today();
  const weekStart = mondayOf(t);
  const todayIdx = dayIndexOf(t);
  const block = useBlock();
  const week = useWeek(weekStart);
  const sessions = useWeekSessions(weekStart);
  const profile = useProfile();
  const [selDay, setSelDay] = useState<number>(todayIdx);

  const header = <ScreenHeader eyebrow={formatLongDate(t)} title="Today" />;

  if (block === undefined || profile === undefined || sessions === undefined) return <Loading />;

  if (block === null) {
    return (
      <Page>
        {header}
        <Empty title="No plan yet" action={<LinkButton to="/plan/month">Plan a month</LinkButton>}>
          Pick what you want to do and the app builds your weeks.
        </Empty>
      </Page>
    );
  }

  if (blockIsOver(block, t)) {
    return (
      <Page>
        {header}
        <div className="px-5">
          <Notice tone="info" title="This month's block is done. Plan the next one." action={<LinkButton to="/plan/month">Plan next month</LinkButton>} />
        </div>
      </Page>
    );
  }

  if (week === undefined) return <Loading />;
  if (week === null) {
    return (
      <Page>
        {header}
        <Empty title="No plan yet" action={<LinkButton to="/plan/month">Plan a month</LinkButton>} />
      </Page>
    );
  }

  const slots = week.plan.slots;
  const recOf = (s: PlannedSlot) => sessions.find((r) => r.slotId === s.id);
  const todaySlots = slots.filter((s) => s.day === todayIdx);
  const next = [...slots].filter((s) => s.day > todayIdx).sort((a, b) => a.day - b.day)[0];
  const selSlots = slots.filter((s) => s.day === selDay);
  const doneCount = slots.filter((s) => recOf(s)?.status === 'done').length;

  return (
    <Page>
      {header}
      <div className="space-y-4 px-5">
        {todaySlots.length > 0 ? (
          todaySlots.map((s) => <TodayCard key={s.id} weekStart={weekStart} slot={s} rec={recOf(s)} />)
        ) : (
          <Card className="animate-fade-up p-5">
            <h2 className="text-title font-semibold">Rest day</h2>
            <p className="mt-1 text-body text-ink-2">Nothing planned. Rest is when you get stronger.</p>
            {next && (
              <Link
                to={`/workout/${weekStart}/${next.id}`}
                className="mt-4 flex items-center justify-between gap-3 rounded-md bg-surface-2 px-4 py-3 active:opacity-70"
              >
                <span className="min-w-0 truncate text-body">
                  <span className="text-ink-2">Next up: </span>
                  <span className="font-semibold">
                    {next.title}, {dayLong(next.day)}
                  </span>
                </span>
                <Icon name="chevronRight" size={18} className="shrink-0 text-ink-3" />
              </Link>
            )}
          </Card>
        )}
      </div>

      <section className="mt-8 px-5">
        <SectionLabel>This week</SectionLabel>
        <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
          <Pill tone="accent">{PHASE_LABEL(week.plan.phase, week.plan.weekIndex)}</Pill>
          {week.plan.focus !== 'balanced' && <Pill>{WEEK_FOCUS_LABEL[week.plan.focus]}</Pill>}
        </div>
        <Card className="p-2">
          <WeekStrip weekStart={weekStart} slots={slots} sessions={sessions} availability={week.plan.availability} selected={selDay} today={t} onSelect={setSelDay} />
        </Card>

        <div className="mt-3">
          {selSlots.length > 0 ? (
            <div className="divide-y divide-line overflow-hidden rounded-lg bg-surface shadow-soft">
              {selSlots.map((s) => (
                <CompactRow key={s.id} weekStart={weekStart} slot={s} rec={recOf(s)} />
              ))}
            </div>
          ) : (
            <p className="px-1 py-3 text-caption text-ink-3">Nothing planned on {dayLong(selDay)}.</p>
          )}
        </div>

        {slots.length > 0 && (
          <div className="mt-5 px-1">
            <p className="mb-2 text-caption text-ink-2 tabular">
              {doneCount} of {slots.length} done
            </p>
            <ProgressBar value={doneCount / slots.length} />
          </div>
        )}
      </section>
    </Page>
  );
}

function LinkButton({ to, children }: { to: string; children: string }) {
  const nav = useNavigate();
  return (
    <Button onClick={() => nav(to)} variant="primary">
      {children}
    </Button>
  );
}
