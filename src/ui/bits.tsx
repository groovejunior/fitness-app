import type { InputHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';
import { cx } from './cx';

/** Large page title, iOS style. */
export function ScreenHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4 px-5 pt-8 pb-4 pt-safe">
      <div className="min-w-0 pt-6">
        {eyebrow && <p className="text-micro font-semibold uppercase text-ink-3">{eyebrow}</p>}
        <h1 className="truncate font-display text-display font-bold">{title}</h1>
      </div>
      {action && <div className="shrink-0 pb-1">{action}</div>}
    </header>
  );
}

/** Small uppercase section label. */
export function SectionLabel({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-2 flex items-center justify-between px-1', className)}>
      <h2 className="text-micro font-semibold uppercase text-ink-3">{children}</h2>
      {action}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-accent' : 'bg-line')}
    >
      <span
        className={cx(
          'absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-calm',
          checked && 'translate-x-5',
        )}
      />
    </button>
  );
}

export function Chip({ selected, onClick, children, className }: { selected?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        'h-9 rounded-full px-4 text-caption font-semibold transition-colors',
        selected ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink-2',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Pill({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'warn'; className?: string }) {
  const tones = { neutral: 'bg-surface-2 text-ink-2', accent: 'bg-accent-soft text-accent', warn: 'bg-warn-soft text-warn' };
  return <span className={cx('inline-flex h-6 items-center rounded-full px-2.5 text-micro font-semibold tracking-normal', tones[tone], className)}>{children}</span>;
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx('h-1.5 overflow-hidden rounded-full bg-surface-2', className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-calm" style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%` }} />
    </div>
  );
}

/** A plain, honest note. Used for realism checks and warnings. */
export function Notice({ tone = 'warn', title, children, action }: { tone?: 'warn' | 'info'; title?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={cx('flex gap-3 rounded-md p-3.5', tone === 'warn' ? 'bg-warn-soft text-warn' : 'bg-accent-soft text-accent')}>
      <Icon name={tone === 'warn' ? 'alert' : 'info'} size={20} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 text-caption">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-ink-2">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

export function ListRow({ title, detail, trailing, onClick, className }: { title: ReactNode; detail?: ReactNode; trailing?: ReactNode; onClick?: () => void; className?: string }) {
  const inner = (
    <>
      <div className="min-w-0 flex-1">
        <div className="truncate text-body font-medium">{title}</div>
        {detail && <div className="truncate text-caption text-ink-2">{detail}</div>}
      </div>
      {trailing}
      {onClick && !trailing && <Icon name="chevronRight" size={18} className="text-ink-3" />}
    </>
  );
  const base = cx('flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left', className);
  return onClick ? (
    <button type="button" onClick={onClick} className={cx(base, 'active:bg-surface-2')}>
      {inner}
    </button>
  ) : (
    <div className={base}>{inner}</div>
  );
}

/** Grouped list container (rows separated by hairlines). */
export function List({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('divide-y divide-line overflow-hidden rounded-lg bg-surface shadow-soft', className)}>{children}</div>;
}

export function TextField({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block px-1 text-caption font-medium text-ink-2">{label}</span>
      <input
        className="h-12 w-full rounded-md border border-line bg-surface px-4 text-body text-ink outline-none placeholder:text-ink-3 focus:border-accent"
        {...rest}
      />
    </label>
  );
}

/** Content column with bottom padding that clears the tab bar. */
export function Page({ children, className, withTabBar = true }: { children: ReactNode; className?: string; withTabBar?: boolean }) {
  return <main className={cx('mx-auto w-full max-w-lg', withTabBar ? 'pb-28' : 'pb-10', className)}>{children}</main>;
}
