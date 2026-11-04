import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../ui';

/** Header for pushed screens: back button, optional centred title and a trailing action. */
export function TopBar({ title, onBack, trailing }: { title?: string; onBack?: () => void; trailing?: ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="sticky top-0 z-30 bg-bg/85 pt-safe backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-lg items-center justify-between gap-2 px-2">
        <button
          type="button"
          onClick={onBack ?? (() => (window.history.length > 1 ? nav(-1) : nav('/')))}
          className="flex h-10 items-center gap-0.5 rounded-full px-2 text-accent active:opacity-60"
          aria-label="Back"
        >
          <Icon name="chevronLeft" size={22} />
          <span className="text-body font-medium">Back</span>
        </button>
        {title && <h1 className="min-w-0 flex-1 truncate text-center text-body font-semibold">{title}</h1>}
        <div className="flex min-w-16 justify-end">{trailing}</div>
      </div>
    </div>
  );
}
