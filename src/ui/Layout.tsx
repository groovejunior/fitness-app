import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { back, navigate } from '../lib/router';
import { cx } from './kit';

/** A tab screen: large title, content, room for the tab bar. */
export function Screen({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={cx('safe-top mx-auto max-w-lg px-4 pb-32', className)}>
      <header className="mb-4 mt-6 flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          {subtitle && <div className="mb-1 text-[14px] font-medium text-muted">{subtitle}</div>}
          <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em]">{title}</h1>
        </div>
        {action}
      </header>
      <div className="rise">{children}</div>
    </main>
  );
}

/** A pushed screen with a back button. */
export function DetailScreen({
  title,
  onBack,
  right,
  children,
  footer,
  className,
}: {
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-dvh">
      <div className="safe-top sticky top-0 z-30 bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-lg items-center justify-between px-2">
          <button
            type="button"
            onClick={onBack ?? (() => back())}
            className="flex h-10 items-center gap-0.5 rounded-full pl-1 pr-3 text-[16px] font-medium text-accent active:opacity-60"
            aria-label="Back"
          >
            <Icon name="chevron-left" size={24} />
            Back
          </button>
          {title && <div className="absolute left-1/2 max-w-[55%] -translate-x-1/2 truncate text-[16px] font-semibold">{title}</div>}
          <div className="flex items-center">{right}</div>
        </div>
      </div>
      <main className={cx('mx-auto max-w-lg px-4', footer ? 'pb-36' : 'pb-12', className)}>
        <div className="rise">{children}</div>
      </main>
      {footer && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-bg via-bg to-bg/0 pt-6">
          <div className="mx-auto max-w-lg px-4 pb-2">{footer}</div>
        </div>
      )}
    </div>
  );
}

const TABS: { path: string; label: string; icon: IconName }[] = [
  { path: '/today', label: 'Today', icon: 'today' },
  { path: '/plan', label: 'Plan', icon: 'plan' },
  { path: '/progress', label: 'Progress', icon: 'progress' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

export function TabBar({ current }: { current: string }) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-bg/85 backdrop-blur-xl" aria-label="Main">
      <div className="mx-auto flex max-w-lg">
        {TABS.map((t) => {
          const active = current === t.path;
          return (
            <button
              key={t.path}
              type="button"
              onClick={() => navigate(t.path)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'flex h-[54px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                active ? 'text-accent' : 'text-muted',
              )}
            >
              <Icon name={t.icon} size={24} strokeWidth={active ? 2 : 1.75} />
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
