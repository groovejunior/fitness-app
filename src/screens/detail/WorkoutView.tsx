import { useState } from 'react';
import type { Profile, RunStep, StrengthItem, Workout, WorkoutBlock } from '../../engine/types';
import { EFFORT_HINT, EFFORT_LABEL, getExercise } from '../../engine';
import { ExerciseFigure } from '../../animations/Figure';
import { clock, kg, minutes, targetText } from '../../lib/format';
import { Icon } from '../../ui/Icon';
import { cx } from '../../ui/kit';

type Units = Profile['units'];

// ---------------------------------------------------------------------------
// Strength

function StrengthRow({ item, compact, units, onOpen }: { item: StrengthItem; compact: boolean; units: Units; onOpen: () => void }) {
  const ex = getExercise(item.exerciseId);
  if (!ex) return null;
  const parts = [`${item.sets} × ${targetText(item.target, ex.unilateral)}`];
  if (item.weightKg) parts.push(kg(item.weightKg, units));
  return (
    <button
      type="button"
      data-testid="exercise-row"
      data-exercise-id={item.exerciseId}
      onClick={onOpen}
      className={cx('flex w-full items-center gap-3 text-left active:opacity-70', compact ? 'py-2' : 'py-2.5')}
    >
      <div className={cx('shrink-0 overflow-hidden rounded-xl bg-surface-2', compact ? 'h-11 w-11' : 'h-14 w-14')}>
        <ExerciseFigure animationId={ex.animationId} playing={false} label={ex.name} className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <div className={cx('font-medium', compact ? 'text-[15px] text-ink-2' : 'text-[16px] leading-snug text-ink')}>{ex.name}</div>
        <div className="tnum mt-0.5 text-[14px] text-muted">
          <span className={compact ? '' : 'font-semibold text-ink-2'}>{parts[0]}</span>
          {parts[1] && <span> · {parts[1]}</span>}
          {!compact && item.restSec > 0 && <span> · {item.restSec}s rest</span>}
        </div>
      </div>
      <Icon name="chevron-right" size={16} className="shrink-0 text-muted" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Runs

const EFFORT_OPACITY: Record<RunStep['effort'], number> = { walk: 0.18, easy: 0.35, steady: 0.55, tempo: 0.75, stride: 0.85, hard: 1 };

function stepTime(sec: number): string {
  return sec >= 120 && sec % 60 === 0 ? `${sec / 60} min` : sec < 60 ? `${sec}s` : clock(sec);
}

function EffortBar({ steps }: { steps: RunStep[] }) {
  const total = steps.reduce((a, s) => a + s.durationSec, 0) || 1;
  return (
    <div className="flex h-8 w-full items-end gap-px overflow-hidden rounded-lg" role="img" aria-label="Effort across the run">
      {steps.map((s, i) => (
        <div
          key={i}
          className="rounded-[3px] bg-accent"
          style={{ width: `${(s.durationSec / total) * 100}%`, minWidth: 2, opacity: EFFORT_OPACITY[s.effort], height: `${30 + EFFORT_HEIGHT[s.effort] * 70}%` }}
        />
      ))}
    </div>
  );
}
const EFFORT_HEIGHT: Record<RunStep['effort'], number> = { walk: 0, easy: 0.2, steady: 0.5, tempo: 0.7, stride: 0.85, hard: 1 };

type RunGroup = { kind: 'single'; step: RunStep } | { kind: 'repeat'; count: number; steps: RunStep[] };

function groupSteps(steps: RunStep[]): RunGroup[] {
  const out: RunGroup[] = [];
  const same = (a: RunStep, b: RunStep) => a.effort === b.effort && a.durationSec === b.durationSec;
  let i = 0;
  while (i < steps.length) {
    const a = steps[i];
    const b = steps[i + 1];
    if (b && a.effort !== b.effort) {
      let n = 1;
      while (steps[i + 2 * n] && steps[i + 2 * n + 1] && same(steps[i + 2 * n], a) && same(steps[i + 2 * n + 1], b)) n++;
      if (n >= 2) {
        out.push({ kind: 'repeat', count: n, steps: steps.slice(i, i + 2 * n) });
        i += 2 * n;
        continue;
      }
    }
    out.push({ kind: 'single', step: a });
    i++;
  }
  return out;
}

function StepLine({ step, hint }: { step: RunStep; hint?: boolean }) {
  return (
    <div data-testid="run-step" className="flex items-start gap-3 py-2.5">
      <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" style={{ opacity: Math.max(EFFORT_OPACITY[step.effort], 0.25) }} />
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-medium">{step.label}</div>
        <div className="mt-0.5 text-[14px] text-muted">
          {EFFORT_LABEL[step.effort]}
          {hint !== false && <span> · {EFFORT_HINT[step.effort]}</span>}
        </div>
      </div>
      <div className="tnum shrink-0 pt-0.5 text-[15px] font-semibold text-ink-2">{stepTime(step.durationSec)}</div>
    </div>
  );
}

function RepeatGroup({ g }: { g: Extract<RunGroup, { kind: 'repeat' }> }) {
  const [open, setOpen] = useState(false);
  const [a, b] = g.steps;
  const summary = `${g.count} × (${stepTime(a.durationSec)} ${EFFORT_LABEL[a.effort].toLowerCase()}, ${stepTime(b.durationSec)} ${EFFORT_LABEL[b.effort].toLowerCase()})`;
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 py-2.5 text-left">
        <Icon name="refresh" size={16} className="shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <div data-testid="run-step" className="tnum text-[16px] font-semibold">
            {summary}
          </div>
          <div className="mt-0.5 text-[14px] text-muted">{open ? 'Hide each one' : 'Show each one'}</div>
        </div>
        <Icon name="chevron-down" size={16} className={cx('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="ml-2 border-l border-line pl-3">
          {g.steps.map((s, i) => (
            <StepLine key={i} step={s} hint={false} />
          ))}
        </div>
      )}
    </div>
  );
}

function RunBlock({ block }: { block: WorkoutBlock }) {
  const steps = block.items.filter((i): i is RunStep => i.kind === 'run');
  const groups = groupSteps(steps);
  return (
    <>
      {steps.length > 1 && (
        <div className="mb-3">
          <EffortBar steps={steps} />
        </div>
      )}
      <div className="divide-y divide-line/70">
        {groups.map((g, i) => (g.kind === 'single' ? <StepLine key={i} step={g.step} /> : <RepeatGroup key={i} g={g} />))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

const LIGHT_KINDS = new Set(['warmup', 'cooldown']);

export function WorkoutView({
  workout,
  units,
  onOpenExercise,
}: {
  workout: Workout;
  units: Units;
  onOpenExercise: (exerciseId: string) => void;
}) {
  const runSteps = workout.blocks.flatMap((b) => b.items).filter((i): i is RunStep => i.kind === 'run');
  return (
    <div className="space-y-1" data-testid="workout">
      {workout.blocks.map((block, bi) => {
        const strength = block.items.filter((i): i is StrengthItem => i.kind === 'strength');
        const light = LIGHT_KINDS.has(block.kind);
        const isRun = block.items.some((i) => i.kind === 'run');
        const empty = block.items.length === 0;
        return (
          <section key={bi}>
            <div className="mb-1.5 mt-6 flex items-end justify-between px-1">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">{block.title}</h3>
              {isRun && <span className="tnum text-[13px] text-muted">{minutes(Math.round(runSteps.reduce((a, s) => a + s.durationSec, 0) / 60))}</span>}
            </div>
            {empty ? (
              <div className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-soft">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon name="sport" size={22} />
                </div>
                <div>
                  <div className="text-[17px] font-semibold capitalize">{block.title}</div>
                  <div className="text-[14px] text-muted">
                    {minutes(workout.durationMin)}
                  </div>
                </div>
              </div>
            ) : (
              <div className={cx('rounded-card px-4 py-1.5', light ? 'bg-surface-2/60' : 'bg-surface shadow-soft')}>
                {isRun ? (
                  <RunBlock block={block} />
                ) : (
                  <div className="divide-y divide-line/70">
                    {strength.map((it, i) => (
                      <StrengthRow key={`${it.exerciseId}-${i}`} item={it} compact={light} units={units} onOpen={() => onOpenExercise(it.exerciseId)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
