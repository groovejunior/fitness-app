import { STYLE_HINT, STYLE_LABEL } from '../content/exercises';
import type { TrainingStyle } from '../engine';
import { Icon } from '../ui';
import { cx } from '../ui/cx';

const ORDER: TrainingStyle[] = ['calisthenics', 'freeWeights', 'all'];

/** Pick how strength work is built: bodyweight first (default), free weights, or anything. */
export function StyleChoice({ value, onChange }: { value: TrainingStyle; onChange: (v: TrainingStyle) => void }) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Training style">
      {ORDER.map((s) => {
        const on = s === value;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(s)}
            className={cx(
              'flex w-full items-start gap-3 rounded-lg bg-surface p-4 text-left shadow-soft transition-shadow',
              on && 'ring-2 ring-accent',
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold">{STYLE_LABEL[s]}</p>
              <p className="text-caption text-ink-2">{STYLE_HINT[s]}</p>
            </div>
            {on && <Icon name="check" size={20} className="mt-0.5 shrink-0 text-accent" />}
          </button>
        );
      })}
    </div>
  );
}
