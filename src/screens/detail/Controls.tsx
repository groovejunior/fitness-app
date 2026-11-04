import { useEffect, useRef, useState } from 'react';
import type { EquipmentContext, Intensity, PlannedSession } from '../../engine/types';
import { CONTEXT_LABEL } from '../../engine';
import { minutes } from '../../lib/format';
import { updateSession } from '../../db/repo';
import { cx } from '../../ui/kit';

/** Small segmented control with test ids on each option. */
function Seg<T extends string>({
  label,
  options,
  value,
  onChange,
  testPrefix,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  testPrefix: string;
}) {
  return (
    <div>
      <div className="mb-1.5 px-1 text-[13px] font-medium text-muted">{label}</div>
      <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-surface-2 p-1">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              data-testid={`${testPrefix}-${o.value}`}
              onClick={() => onChange(o.value)}
              className={cx(
                'h-10 min-w-0 flex-1 rounded-[10px] text-[13px] font-medium transition-all duration-200',
                active ? 'bg-surface text-ink shadow-soft' : 'text-muted',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const INTENSITY: { value: Intensity; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'hard', label: 'Hard' },
];

export function Controls({ session }: { session: PlannedSession }) {
  const [dur, setDur] = useState(session.durationMin);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Follow outside changes (e.g. week replanned).
  useEffect(() => setDur(session.durationMin), [session.durationMin]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onDur = (v: number) => {
    setDur(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (v !== session.durationMin) void updateSession(session.id, { durationMin: v });
    }, 150);
  };

  const strength = session.type === 'gym';
  const run = session.type === 'run';
  const equipOptions: { value: EquipmentContext; label: string }[] = run
    ? [
        { value: 'outdoors', label: 'Outdoors' },
        { value: 'gym', label: 'Treadmill' },
      ]
    : (['gym', 'home', 'bodyweight', 'outdoors'] as EquipmentContext[]).map((v) => ({ value: v, label: CONTEXT_LABEL[v] }));
  const equipValue: EquipmentContext = run ? (session.equipment === 'gym' ? 'gym' : 'outdoors') : session.equipment;

  return (
    <div className="space-y-4 rounded-card bg-surface p-4 shadow-soft" data-testid="session-controls">
      {(strength || run) && (
        <Seg
          label={run ? 'Where' : 'Where I am'}
          options={equipOptions}
          value={equipValue}
          onChange={(v) => void updateSession(session.id, { equipment: v })}
          testPrefix="equipment"
        />
      )}
      <div>
        <div className="mb-1 flex items-baseline justify-between px-1">
          <label htmlFor="duration-slider" className="text-[13px] font-medium text-muted">
            Time I have
          </label>
          <span className="tnum text-[15px] font-semibold">{minutes(dur)}</span>
        </div>
        <input
          id="duration-slider"
          data-testid="duration-slider"
          type="range"
          min={20}
          max={90}
          step={5}
          value={dur}
          onChange={(e) => onDur(Number(e.target.value))}
          className="range w-full"
          aria-label="Duration in minutes"
        />
      </div>
      <Seg label="Effort" options={INTENSITY} value={session.intensity} onChange={(v) => void updateSession(session.id, { intensity: v })} testPrefix="intensity" />
    </div>
  );
}
