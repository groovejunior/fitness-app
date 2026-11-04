import { addDays, DAY_SHORT, parseISODate, type PlannedSlot, type WeekAvailability } from '../engine';
import type { SessionRecord } from '../data/types';
import { cx } from '../ui/cx';

/**
 * Seven-day strip. Each day shows its date and one dot per session
 * (filled = done, ring = planned). Tap a day to select it.
 */
export function WeekStrip({
  weekStart,
  slots,
  sessions = [],
  availability,
  selected,
  today,
  onSelect,
}: {
  weekStart: string;
  slots: PlannedSlot[];
  sessions?: SessionRecord[];
  availability?: WeekAvailability;
  selected?: number;
  today?: string;
  onSelect?: (day: number) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1" role="tablist" aria-label="Days of the week">
      {DAY_SHORT.map((label, d) => {
        const date = addDays(weekStart, d);
        const daySlots = slots.filter((s) => s.day === d);
        const isToday = date === today;
        const isSel = selected === d;
        const busy = availability && !availability[d]?.available;
        return (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={isSel}
            aria-label={`${label} ${parseISODate(date).getDate()}`}
            onClick={() => onSelect?.(d)}
            className={cx(
              'flex flex-col items-center gap-1 rounded-md py-2 transition-colors',
              isSel ? 'bg-ink text-bg' : 'text-ink',
              !isSel && busy && 'opacity-45',
            )}
          >
            <span className={cx('text-micro font-semibold tracking-normal', isSel ? 'text-bg/70' : 'text-ink-3')}>{label}</span>
            <span className={cx('grid size-7 place-items-center rounded-full text-body font-semibold tabular', isToday && !isSel && 'text-accent')}>
              {parseISODate(date).getDate()}
            </span>
            <span className="flex h-1.5 gap-0.5">
              {daySlots.map((s) => {
                const rec = sessions.find((r) => r.slotId === s.id);
                const done = rec?.status === 'done';
                const skipped = rec?.status === 'skipped';
                return (
                  <span
                    key={s.id}
                    className={cx(
                      'size-1.5 rounded-full',
                      done ? (isSel ? 'bg-bg' : 'bg-accent') : skipped ? 'bg-ink-3/40' : isSel ? 'border border-bg/80' : 'border border-accent',
                    )}
                  />
                );
              })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
