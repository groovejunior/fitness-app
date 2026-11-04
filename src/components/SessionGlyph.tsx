import type { SessionType } from '../engine';
import { Icon, type IconName } from '../ui';
import { cx } from '../ui/cx';

const ICON: Record<SessionType, IconName> = { gym: 'dumbbell', run: 'run', sport: 'ball', mobility: 'stretch' };
export const TYPE_LABEL: Record<SessionType, string> = { gym: 'Gym', run: 'Run', sport: 'Sport', mobility: 'Mobility' };

/** Round icon badge for a session type. Accent tint when `active`. */
export function SessionGlyph({ type, size = 40, active, className }: { type: SessionType; size?: number; active?: boolean; className?: string }) {
  return (
    <span
      className={cx('grid shrink-0 place-items-center rounded-full', active ? 'bg-accent text-accent-ink' : 'bg-accent-soft text-accent', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon name={ICON[type]} size={Math.round(size * 0.5)} />
    </span>
  );
}
