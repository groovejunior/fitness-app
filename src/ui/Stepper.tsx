import { Icon } from './Icon';
import { cx } from './cx';

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  format = (v) => String(v),
  label,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
  label?: string;
  className?: string;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v / step) * step)));
  const btn =
    'grid size-10 place-items-center rounded-full bg-surface-2 text-ink transition active:scale-95 disabled:opacity-30';
  return (
    <div className={cx('flex items-center justify-between gap-3', className)}>
      <button type="button" className={btn} onClick={() => set(value - step)} disabled={value <= min} aria-label={`Decrease ${label ?? ''}`.trim()}>
        <Icon name="minus" size={18} />
      </button>
      <div className="min-w-16 text-center text-headline font-semibold tabular" aria-live="polite">
        {format(value)}
      </div>
      <button type="button" className={btn} onClick={() => set(value + step)} disabled={value >= max} aria-label={`Increase ${label ?? ''}`.trim()}>
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}
