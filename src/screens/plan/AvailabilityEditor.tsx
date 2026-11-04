import { DAY_LONG, type DayAvailability, type TimeWindow, type WeekAvailability } from '../../engine';
import { Segmented, Stepper, Toggle } from '../../ui';

const WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'midday', label: 'Midday' },
  { value: 'evening', label: 'Evening' },
  { value: 'any', label: 'Any' },
];

/** Seven rows: free or busy, how long, and roughly when. */
export function AvailabilityEditor({ value, onChange }: { value: WeekAvailability; onChange: (v: WeekAvailability) => void }) {
  const set = (i: number, patch: Partial<DayAvailability>) => onChange(value.map((d, k) => (k === i ? { ...d, ...patch } : d)));
  return (
    <div className="divide-y divide-line">
      {value.map((d, i) => (
        <div key={i} className="py-3">
          <div className="flex items-center justify-between">
            <span className={d.available ? 'text-body font-medium' : 'text-body text-ink-3'}>{DAY_LONG[i]}</span>
            <Toggle checked={d.available} onChange={(v) => set(i, { available: v })} label={`${DAY_LONG[i]} free`} />
          </div>
          {d.available && (
            <div className="mt-3 space-y-3">
              <Stepper
                label={`${DAY_LONG[i]} minutes`}
                value={d.minutes}
                min={15}
                max={180}
                step={15}
                format={(v) => `${v} min`}
                onChange={(v) => set(i, { minutes: v })}
              />
              <Segmented size="sm" ariaLabel={`${DAY_LONG[i]} time of day`} options={WINDOWS} value={d.window} onChange={(v) => set(i, { window: v })} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
