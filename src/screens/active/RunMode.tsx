// Interval timer for run sessions. Time comes from timestamps, so it stays right when the phone throttles timers.
import { useEffect, useMemo, useRef, useState } from 'react';
import { EFFORT_HINT, EFFORT_LABEL } from '../../engine';
import type { RunStep, Workout } from '../../engine/types';
import { clock } from '../../lib/format';
import { navigate } from '../../lib/router';
import { Icon } from '../../ui/Icon';
import { cx } from '../../ui/kit';
import { ActiveFrame } from './Frame';
import { alert, resultKey, ssGet, ssSet, unlockAudio, useNow, type ActiveResult } from './device';

interface RunState {
  /** Workout-clock milliseconds banked before the current running stretch. */
  acc: number;
  /** When the current running stretch began (ms timestamp), or null while paused. */
  runStart: number | null;
}

export function RunMode({ sessionId, workout }: { sessionId: string; workout: Workout }) {
  const steps = useMemo(() => workout.blocks.flatMap((b) => b.items).filter((i): i is RunStep => i.kind === 'run'), [workout]);
  const ends = useMemo(() => {
    let t = 0;
    return steps.map((s) => (t += s.durationSec * 1000));
  }, [steps]);
  const totalMs = ends[ends.length - 1] ?? 0;

  const key = `run-state:${sessionId}`;
  const [st, setSt] = useState<RunState>(() => ssGet<RunState>(key) ?? { acc: 0, runStart: null });
  const update = (next: RunState) => {
    setSt(next);
    ssSet(key, next);
  };
  const running = st.runStart !== null;
  const now = useNow(running, 200);
  const elapsed = Math.min(totalMs, st.acc + (st.runStart !== null ? now - st.runStart : 0));
  const idx = Math.min(steps.length - 1, ends.findIndex((e) => elapsed < e) === -1 ? steps.length - 1 : ends.findIndex((e) => elapsed < e));
  const step = steps[idx];
  const stepEnd = ends[idx] ?? 0;
  const remaining = Math.max(0, (stepEnd - elapsed) / 1000);
  const finished = steps.length > 0 && elapsed >= totalMs;

  // Alert on every step change while running (not on first render or reload).
  const lastIdx = useRef(idx);
  useEffect(() => {
    if (idx !== lastIdx.current && running && !finished) alert();
    lastIdx.current = idx;
  }, [idx, running, finished]);

  const done = (completed: number, elapsedMs: number) => {
    const r: ActiveResult = { stepsCompleted: completed, stepsTotal: steps.length, elapsedSec: Math.round(elapsedMs / 1000) };
    ssSet(resultKey(sessionId), r);
    navigate(`/session/${sessionId}/done`);
  };

  // Last step ends on its own.
  const finishedRef = useRef(false);
  useEffect(() => {
    if (finished && !finishedRef.current) {
      finishedRef.current = true;
      alert();
      done(steps.length, totalMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  if (!step) return <div className="p-6">No run steps in this workout.</div>;

  const toggle = () => {
    unlockAudio();
    if (running) update({ acc: elapsed, runStart: null });
    else update({ acc: st.acc, runStart: Date.now() });
  };
  const skip = () => {
    const target = stepEnd;
    update({ acc: target - (st.runStart !== null ? Date.now() - st.runStart : 0), runStart: st.runStart });
  };
  const next = steps[idx + 1];
  const started = elapsed > 0 || running;

  return (
    <ActiveFrame
      title={workout.title}
      progress={totalMs ? elapsed / totalMs : 0}
      bodyClass="pb-48"
      footer={
        <div className="flex items-center justify-between gap-3 pb-2">
          <button
            type="button"
            onClick={() => done(idx, elapsed)}
            data-testid="run-end"
            className="flex h-14 flex-1 items-center justify-center rounded-2xl text-[15px] font-semibold text-warn active:opacity-60"
          >
            End run
          </button>
          <button
            type="button"
            onClick={toggle}
            data-testid="run-toggle"
            aria-label={running ? 'Pause' : started ? 'Resume' : 'Start'}
            className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink shadow-soft transition-transform active:scale-95"
          >
            <Icon name={running ? 'pause' : 'play'} size={34} />
          </button>
          <button
            type="button"
            onClick={skip}
            data-testid="run-skip"
            className="flex h-14 flex-1 items-center justify-center gap-1.5 rounded-2xl text-[15px] font-semibold text-ink-2 active:opacity-60"
          >
            Skip step
            <Icon name="skip" size={18} />
          </button>
        </div>
      }
    >
      <div className="text-center" data-testid="run-step-current">
        <div className="text-[14px] font-medium text-muted">
          Step {idx + 1} of {steps.length}
        </div>
        <div className="mt-6 text-[40px] font-bold leading-none tracking-tight text-accent">{EFFORT_LABEL[step.effort]}</div>
        <div className="mx-auto mt-3 max-w-[18rem] text-[16px] leading-snug text-ink-2">{EFFORT_HINT[step.effort]}</div>
        <div className="tnum mt-10 text-[88px] font-bold leading-none tracking-[-0.03em]" aria-live="off" data-testid="run-remaining">
          {clock(Math.ceil(remaining))}
        </div>
        <div className="mt-3 text-[15px] text-muted">{step.label}</div>
      </div>

      <div className="mt-10 rounded-card bg-surface p-4 shadow-soft">
        <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">Next</div>
        {next ? (
          <div className="mt-1 flex items-baseline justify-between">
            <div className="text-[17px] font-semibold">
              {EFFORT_LABEL[next.effort]} <span className="font-normal text-muted">· {next.label}</span>
            </div>
            <div className="tnum text-[17px] text-ink-2">{clock(next.durationSec)}</div>
          </div>
        ) : (
          <div className="mt-1 text-[17px] font-semibold">Done after this</div>
        )}
      </div>

      <div className="tnum mt-4 flex justify-between px-1 text-[14px] text-muted">
        <span>Elapsed {clock(elapsed / 1000)}</span>
        <span>Total {clock(totalMs / 1000)}</span>
      </div>
      <div className="mt-3 flex gap-1 px-1" aria-hidden>
        {steps.map((s, i) => (
          <div key={i} className={cx('h-1.5 rounded-full', i < idx ? 'bg-accent' : i === idx ? 'bg-accent/60' : 'bg-surface-2')} style={{ flexGrow: s.durationSec }} />
        ))}
      </div>
    </ActiveFrame>
  );
}
