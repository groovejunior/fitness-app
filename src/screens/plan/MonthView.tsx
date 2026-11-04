import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, daysBetween, mondayOf, weeklyRunMinutes, type Phase, type Split } from '../../engine';
import { useAllSessions, useAllWeeks, useBlock, useProfile } from '../../data/hooks';
import { blockIsOver, chooseBlock, weekIndexOf } from '../../data/repo';
import { today } from '../../lib/today';
import { formatDate } from '../../lib/format';
import { Empty, Loading } from '../../components/Empty';
import { Button, Card, CardButton, Icon, Notice, Page, Pill, SectionLabel } from '../../ui';
import { cx } from '../../ui/cx';
import { PlanHeader } from './PlanHeader';
import { PlannerSheet } from './PlannerSheet';
import { targetsSummary } from './summary';

const SPLIT_LABEL: Record<Split, string> = { fullBody: 'Full body', upperLower: 'Upper / lower', ppl: 'Push / pull / legs' };
const PHASE_LABEL: Record<Phase, string> = { build: 'Build', peak: 'Peak', deload: 'Deload' };
const PHASE_TEXT: Record<Phase, string> = {
  build: 'Steady progress',
  peak: 'Hardest week, heavier and faster',
  deload: 'Lighter week to recover and absorb',
};

export default function MonthView() {
  const nav = useNavigate();
  const profile = useProfile();
  const block = useBlock();
  const weeks = useAllWeeks();
  const sessions = useAllSessions();
  const [planner, setPlanner] = useState(false);

  if (profile === undefined || block === undefined || weeks === undefined || sessions === undefined) {
    return (
      <Page>
        <PlanHeader active="month" />
        <Loading />
      </Page>
    );
  }

  if (!profile) {
    return (
      <Page>
        <PlanHeader active="month" />
        <Empty title="No profile yet">Set up your profile and your first month will show up here.</Empty>
      </Page>
    );
  }

  const now = today();
  if (!block) {
    return (
      <Page>
        <PlanHeader active="month" />
        <Empty title="No plan yet" action={<Button onClick={() => setPlanner(true)}>Plan your month</Button>}>
          Pick how much you want to train and when you are free. You get four weeks.
        </Empty>
        {planner && (
          <PlannerSheet
            title="Plan your month"
            profile={profile}
            initialTargets={{ gym: 3, run: 2, sport: 0, mobility: 1 }}
            initialAvailability={defaultAvailability()}
            startDate={mondayOf(now)}
            onClose={() => setPlanner(false)}
          />
        )}
      </Page>
    );
  }

  const over = blockIsOver(block, now);
  const lastWeek = !over && weekIndexOf(block, now) === 3 && now >= block.startDate;
  const next = over || lastWeek;
  const endDate = addDays(block.startDate, 27);
  const nextStart = (() => {
    const after = addDays(block.startDate, 28);
    const t = mondayOf(now);
    return t > after ? t : after;
  })();
  const currentIdx = (() => {
    const d = daysBetween(block.startDate, now);
    return d >= 0 && d < 28 ? Math.floor(d / 7) : -1;
  })();
  const chosenKey = block.chosen;
  const realismBad = block.realism.level !== 'ok';

  return (
    <Page>
      <PlanHeader active="month" />
      <div className="space-y-6 px-5">
        <Card className="animate-fade-up">
          <p className="text-caption text-ink-2">
            {formatDate(block.startDate)} to {formatDate(endDate, { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <h2 className="mt-1 text-title font-semibold">{block.focusLabel}</h2>
          <p className="text-body text-ink-2">{SPLIT_LABEL[block.split]}</p>
          <p className="mt-3 text-caption text-ink-3">Each week</p>
          <p className="text-body font-medium">{targetsSummary(block.targets, profile)}</p>
        </Card>

        {realismBad && (
          <Notice title={block.realism.level === 'over' ? `You asked for ${targetsSummary(block.requested, profile)}` : 'This fits, but only just'}>
            <ul className="space-y-1">
              {block.realism.issues.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            {block.realism.level === 'over' && <p className="mt-1">The recommended plan below fits.</p>}
          </Notice>
        )}

        <section>
          <SectionLabel>Your options</SectionLabel>
          <div className="grid gap-3">
            {block.options.map((o) => {
              const chosen = o.key === chosenKey;
              return (
                <CardButton
                  key={o.key}
                  aria-pressed={chosen}
                  onClick={() => !chosen && chooseBlock(block.id, o.key, profile)}
                  className={cx(chosen && 'ring-2 ring-accent')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-headline font-semibold">{o.label}</p>
                      <p className="text-caption font-medium text-ink">{targetsSummary(o.targets, profile)}</p>
                    </div>
                    {chosen && (
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
                        <Icon name="check" size={14} />
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-caption text-ink-2">{o.why}</p>
                </CardButton>
              );
            })}
          </div>
        </section>

        <section>
          <SectionLabel>Four weeks</SectionLabel>
          <div className="space-y-2">
            {block.phases.map((phase, i) => {
              const ws = addDays(block.startDate, i * 7);
              const rec = weeks.find((w) => w.weekStart === ws && w.blockId === block.id);
              const done = sessions.filter((s) => s.weekStart === ws && s.status === 'done').length;
              const planned = rec ? rec.plan.slots.length : block.targets.gym + block.targets.run + block.targets.sport + block.targets.mobility;
              const runMin = weeklyRunMinutes(block, i);
              const current = i === currentIdx;
              return (
                <CardButton key={ws} onClick={() => nav(`/plan/week?w=${ws}`)} className={cx('flex items-center gap-3', current && 'ring-2 ring-accent')}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body font-semibold">
                        Week {i + 1} · {PHASE_LABEL[phase]}
                      </p>
                      {current && <Pill tone="accent">This week</Pill>}
                    </div>
                    <p className="text-caption text-ink-3">
                      {formatDate(ws)} to {formatDate(addDays(ws, 6))}
                    </p>
                    <p className="mt-1 text-caption text-ink-2">{PHASE_TEXT[phase]}</p>
                    <p className="mt-1 text-caption text-ink-2 tabular">
                      {rec ? `${done} of ${planned} sessions done` : `${planned} sessions planned`}
                      {block.targets.run > 0 && ` · ${runMin} min running`}
                    </p>
                  </div>
                  <Icon name="chevronRight" size={18} className="shrink-0 text-ink-3" />
                </CardButton>
              );
            })}
          </div>
        </section>

        <div className="flex">
          <Button block variant={next ? 'primary' : 'secondary'} onClick={() => setPlanner(true)}>
            {next ? 'Plan next month' : 'Change this month'}
          </Button>
        </div>
      </div>

      {planner && (
        <PlannerSheet
          title={next ? 'Plan next month' : 'Change this month'}
          profile={profile}
          initialTargets={block.input?.requested ?? block.requested}
          initialAvailability={block.input?.availability ?? block.availability}
          startDate={next ? nextStart : block.startDate}
          onClose={() => setPlanner(false)}
        />
      )}
    </Page>
  );
}

function defaultAvailability() {
  return Array.from({ length: 7 }, (_, i) => ({ available: i !== 2 && i !== 6, minutes: 60, window: 'evening' as const }));
}
