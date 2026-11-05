import type { ReactNode } from 'react';
import type { DayAvailability, Targets, WeekFocus, WeekPhase } from '../../engine/types';
import { cx } from '../../ui/kit';

export const PHASE_NAME: Record<WeekPhase, string> = { build: 'Build', peak: 'Peak', deload: 'Lighter' };
export const PHASE_LINE: Record<WeekPhase, string> = {
  build: 'Build: steady progress',
  peak: 'Peak: a bit more',
  deload: 'Lighter week: so the load does not jump',
};

export const FOCUS_LABEL: Record<WeekFocus, string> = {
  balanced: 'Balanced',
  legs: 'More legs',
  upper: 'More upper body',
  endurance: 'More running',
  deload: 'Lighter',
  sport: 'Sport week',
};
export const FOCUS_ORDER: WeekFocus[] = ['balanced', 'legs', 'upper', 'endurance', 'deload', 'sport'];

export const WINDOW_LABEL: Record<DayAvailability['window'], string> = { morning: 'Morning', midday: 'Midday', evening: 'Evening' };

export function targetsText(t: Targets): string {
  const parts = [`${t.gym} gym`, `${t.run} ${t.run === 1 ? 'run' : 'runs'}`];
  if (t.sport) parts.push(`${t.sport} sport`);
  if (t.mobility) parts.push(`${t.mobility} mobility`);
  return parts.join(' · ');
}

/** Segmented switch with test ids on the buttons. */
export function TestSegmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; testId?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="flex rounded-xl bg-surface-2 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={o.testId}
            onClick={() => onChange(o.value)}
            className={cx(
              'h-10 flex-1 rounded-[10px] text-[15px] font-medium transition-all duration-200',
              active ? 'bg-surface text-ink shadow-soft' : 'text-muted',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="rounded-2xl bg-surface px-3 py-3 text-center shadow-soft">
      <div className="tnum text-[26px] font-bold leading-none tracking-tight">{value}</div>
      <div className="mt-1.5 text-[12px] font-medium text-muted">{label}</div>
    </div>
  );
}

/** Local switch (the kit Toggle's knob drifts inside a flex row). */
export function PlanToggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative block h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-accent' : 'bg-line')}
    >
      <span
        className={cx(
          'absolute left-0 top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]',
        )}
      />
    </button>
  );
}
