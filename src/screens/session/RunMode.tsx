import { useEffect, useMemo, useRef, useState } from 'react';
import type { RunPlan } from '../../engine';
import { TopBar } from '../../components/TopBar';
import { Button, Icon, ProgressBar, cx } from '../../ui';
import { formatClock } from '../../lib/format';
import { beep, primeAudio } from './beep';

export interface RunResult {
  durationSec: number;
  stepsDone: number;
  stepsTotal: number;
}

/** Interval timer. Time comes from timestamps, so it stays right when the screen sleeps. */
export function RunMode({ run, title, onFinish, onBack }: { run: RunPlan; title: string; onFinish: (r: RunResult) => void; onBack: () => void }) {
  const steps = run.steps;
  const bounds = useMemo(() => {
    let acc = 0;
    return steps.map((s) => (acc += s.seconds));
  }, [steps]);
  const total = bounds[bounds.length - 1] ?? 0;

  // elapsed = banked + (running ? now - segStart : 0) + skipped
  const [banked, setBanked] = useState(0);
  const [segStart, setSegStart] = useState<number | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (segStart === null) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [segStart]);

  const elapsedMs = banked + (segStart !== null ? now - segStart : 0) + skipped;
  const elapsed = elapsedMs / 1000;
  const complete = total > 0 && elapsed >= total;
  const idx = complete ? steps.length - 1 : Math.max(0, bounds.findIndex((b) => elapsed < b));
  const step = steps[idx];
  const stepStart = idx === 0 ? 0 : bounds[idx - 1];
  const remaining = complete ? 0 : Math.max(0, bounds[idx] - elapsed);
  const next = steps[idx + 1];
  const running = segStart !== null;

  // Beep at each step change and at the end.
  const lastIdx = useRef(0);
  const doneFired = useRef(false);
  useEffect(() => {
    if (!started) return;
    if (idx !== lastIdx.current) {
      lastIdx.current = idx;
      beep(1);
    }
  }, [idx, started]);
  useEffect(() => {
    if (complete && !doneFired.current) {
      doneFired.current = true;
      beep(2);
      setBanked(total * 1000);
      setSkipped(0);
      setSegStart(null);
    }
  }, [complete, total]);

  const start = () => {
    primeAudio();
    setStarted(true);
    setNow(Date.now());
    setSegStart(Date.now());
  };
  const pause = () => {
    if (segStart === null) return;
    setBanked((b) => b + (Date.now() - segStart));
    setSegStart(null);
  };
  const skip = () => {
    if (complete) return;
    const raw = banked + (segStart !== null ? Date.now() - segStart : 0) + skipped;
    setSkipped(skipped + (bounds[idx] * 1000 - raw));
    setNow(Date.now());
  };
  const finish = () => {
    const sec = Math.round(Math.min(total, elapsedMs / 1000));
    onFinish({ durationSec: sec, stepsDone: complete ? steps.length : idx, stepsTotal: steps.length });
  };

  if (!step) return null;
  const stepProgress = step.seconds ? (elapsed - stepStart) / step.seconds : 0;

  return (
    <div className="min-h-dvh bg-bg">
      <TopBar title={title} onBack={onBack} />
      <main className="mx-auto w-full max-w-lg px-5 pb-56">
        <ProgressBar value={total ? elapsed / total : 0} className="mt-1" />
        <p className="mt-2 flex justify-between text-caption text-ink-2 tabular">
          <span>{formatClock(elapsed)} elapsed</span>
          <span>{formatClock(total)} total</span>
        </p>

        <section className="mt-6 text-center" aria-live="off">
          <p className="text-micro font-semibold uppercase text-ink-3">
            Step {idx + 1} of {steps.length}
          </p>
          <h2 className="mt-1 font-display text-display font-bold" data-testid="step-label">
            {complete ? 'Done' : step.label}
          </h2>
          <p className="mt-2 text-[88px] leading-none font-bold tabular text-accent" data-testid="step-remaining">
            {formatClock(remaining)}
          </p>
          <div className="mx-auto mt-5 max-w-xs">
            <ProgressBar value={complete ? 1 : stepProgress} />
          </div>
          <p className="mx-auto mt-4 max-w-xs text-body text-ink-2">{complete ? 'All steps finished.' : step.hint}</p>
          {next && !complete && (
            <p className="mt-4 text-caption text-ink-3 tabular">
              Next: {next.label} {formatClock(next.seconds)}
            </p>
          )}
        </section>

        <ol className="mt-8 divide-y divide-line overflow-hidden rounded-lg bg-surface shadow-soft">
          {steps.map((s, i) => {
            const done = complete || i < idx;
            const current = !complete && i === idx;
            return (
              <li key={i} className={cx('flex items-center gap-3 px-4 py-3', current && 'bg-accent-soft')}>
                <span
                  className={cx(
                    'grid size-6 shrink-0 place-items-center rounded-full text-micro font-semibold tabular',
                    done ? 'bg-accent text-accent-ink' : current ? 'border-2 border-accent text-accent' : 'bg-surface-2 text-ink-3',
                  )}
                >
                  {done ? <Icon name="check" size={14} /> : i + 1}
                </span>
                <span className={cx('min-w-0 flex-1 truncate text-body', done ? 'text-ink-3' : current ? 'font-semibold' : 'text-ink')}>{s.label}</span>
                <span className="text-caption text-ink-2 tabular">{formatClock(s.seconds)}</span>
              </li>
            );
          })}
        </ol>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg flex-col gap-2 px-5 pt-3 pb-safe">
          <div className="flex gap-2">
            {!complete && (
              <Button size="lg" className="flex-1" onClick={running ? pause : start} icon={<Icon name={running ? 'pause' : 'play'} size={20} />}>
                {running ? 'Pause' : started ? 'Resume' : 'Start'}
              </Button>
            )}
            {!complete && (
              <Button size="lg" variant="secondary" onClick={skip} disabled={!started} icon={<Icon name="skip" size={18} />}>
                Skip step
              </Button>
            )}
          </div>
          <Button size={complete ? 'lg' : 'md'} variant={complete ? 'primary' : 'ghost'} block onClick={finish}>
            Finish run
          </Button>
        </div>
      </div>
    </div>
  );
}
