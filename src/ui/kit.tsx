// The design system. Every screen builds from these; keep styling here, not in screens.
import { useEffect, useRef, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';
import type { SessionType } from '../engine/types';
import { sheetDragY, shouldDismissSheet, TAP_SLOP_PX } from './sheetDrag';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ---------------------------------------------------------------------------
// Buttons

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'primary',
  size = 'lg',
  block = false,
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'lg' | 'md' | 'sm';
  block?: boolean;
  icon?: IconName;
}) {
  const v: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-accent-ink active:opacity-85',
    secondary: 'bg-surface-2 text-ink active:opacity-80',
    ghost: 'bg-transparent text-accent active:opacity-70',
    danger: 'bg-transparent text-warn active:opacity-70',
  };
  const s = { lg: 'h-13 px-6 text-[17px] rounded-2xl', md: 'h-11 px-5 text-[15px] rounded-xl', sm: 'h-9 px-3.5 text-[14px] rounded-lg' };
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-2 font-semibold transition-[opacity,transform] duration-150 active:scale-[0.985] disabled:opacity-40 disabled:pointer-events-none',
        v[variant],
        s[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 18 : 20} />}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-2 active:bg-surface-2', className)}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Surfaces

export function Card({
  children,
  className,
  onClick,
  as = 'div',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: 'div' | 'button';
} & Record<string, unknown>) {
  const cls = cx('block w-full rounded-card bg-surface p-4 text-left shadow-soft', onClick && 'active:scale-[0.99] transition-transform', className);
  if (as === 'button' || onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} {...rest}>
        {children}
      </button>
    );
  }
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-2 mt-7 flex items-end justify-between px-1', className)}>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function Notice({ tone = 'warn', children, icon }: { tone?: 'warn' | 'info'; children: ReactNode; icon?: IconName }) {
  return (
    <div
      className={cx(
        'flex gap-3 rounded-2xl px-4 py-3 text-[14px] leading-snug',
        tone === 'warn' ? 'bg-warn-soft text-ink' : 'bg-accent-soft text-ink',
      )}
    >
      <Icon name={icon ?? (tone === 'warn' ? 'warning' : 'info')} size={18} className={cx('mt-0.5 shrink-0', tone === 'warn' ? 'text-warn' : 'text-accent')} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cx('h-px bg-line', className)} />;
}

// ---------------------------------------------------------------------------
// Inputs

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: 'md' | 'sm';
}) {
  return (
    <div role="tablist" className={cx('flex rounded-xl bg-surface-2 p-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'flex-1 rounded-[10px] font-medium transition-all duration-200',
              size === 'sm' ? 'h-8 text-[13px]' : 'h-9 text-[14px]',
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

export function Chip({
  selected,
  onClick,
  children,
  className,
  ...rest
}: { selected?: boolean; onClick?: () => void; children: ReactNode; className?: string } & Record<string, unknown>) {
  return (
    <button
      type="button"
      aria-pressed={!!selected}
      onClick={onClick}
      className={cx(
        'inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-4 text-[15px] font-medium transition-colors duration-150',
        selected ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  format,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-1" aria-label={label}>
      <button
        type="button"
        aria-label={`Less ${label ?? ''}`.trim()}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink disabled:opacity-30"
      >
        <Icon name="minus" size={18} />
      </button>
      <div className="tnum min-w-[4.5rem] text-center text-[17px] font-semibold">{format ? format(value) : value}</div>
      <button
        type="button"
        aria-label={`More ${label ?? ''}`.trim()}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink disabled:opacity-30"
      >
        <Icon name="plus" size={18} />
      </button>
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
      className={cx('relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-accent' : 'bg-line')}
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

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
} & Record<string, unknown>) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">{label}</span>
      <input
        type={type}
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-xl bg-surface-2 px-4 text-[17px] text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/40"
        {...rest}
      />
    </label>
  );
}

// ---------------------------------------------------------------------------
// Lists

export function ListRow({
  title,
  subtitle,
  left,
  right,
  onClick,
  chevron,
  className,
  ...rest
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
  className?: string;
} & Record<string, unknown>) {
  const inner = (
    <>
      {left && <div className="shrink-0">{left}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-medium text-ink">{title}</div>
        {subtitle && <div className="mt-0.5 text-[14px] leading-snug text-muted">{subtitle}</div>}
      </div>
      {right && <div className="shrink-0 text-[15px] text-ink-2">{right}</div>}
      {chevron && <Icon name="chevron-right" size={18} className="shrink-0 text-muted" />}
    </>
  );
  const cls = cx('flex w-full items-center gap-3 py-3 text-left', className);
  return onClick ? (
    <button type="button" className={cls + ' active:opacity-70'} onClick={onClick} {...rest}>
      {inner}
    </button>
  ) : (
    <div className={cls} {...rest}>
      {inner}
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session type marks

export const TYPE_ICON: Record<SessionType, IconName> = { gym: 'gym', run: 'run', sport: 'sport', mobility: 'mobility' };
export const TYPE_LABEL: Record<SessionType, string> = { gym: 'Gym', run: 'Run', sport: 'Sport', mobility: 'Mobility' };

export function TypeMark({ type, done, size = 40 }: { type: SessionType; done?: boolean; size?: number }) {
  return (
    <div
      className={cx('flex items-center justify-center rounded-full', done ? 'bg-accent text-accent-ink' : 'bg-accent-soft text-accent')}
      style={{ width: size, height: size }}
    >
      <Icon name={done ? 'check' : TYPE_ICON[type]} size={Math.round(size * 0.52)} />
    </div>
  );
}

export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'warn' }) {
  const t = { neutral: 'bg-surface-2 text-ink-2', accent: 'bg-accent-soft text-accent', warn: 'bg-warn-soft text-warn' };
  return <span className={cx('inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold', t[tone])}>{children}</span>;
}

// ---------------------------------------------------------------------------
// Bottom sheet

const SHEET_EASE = 'transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)';

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const drag = useRef({ active: false, fromHandle: false, startY: 0, lastY: 0, lastT: 0, vel: 0, y: 0, closing: false });

  const apply = (y: number, animate: boolean) => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (panel) {
      panel.style.animation = 'none';
      panel.style.transition = animate ? SHEET_EASE : 'none';
      panel.style.transform = `translateY(${y}px)`;
    }
    if (backdrop) {
      backdrop.style.transition = animate ? 'opacity 0.32s ease' : 'none';
      backdrop.style.opacity = String(Math.max(0, 1 - y / 400));
    }
  };

  const dismiss = () => {
    const d = drag.current;
    if (d.closing) return;
    d.closing = true;
    d.active = false;
    const height = panelRef.current?.getBoundingClientRect().height ?? 480;
    apply(height + 32, true);
    window.setTimeout(() => onCloseRef.current(), 300);
  };
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  useEffect(() => {
    if (!open) {
      drag.current.closing = false;
      drag.current.y = 0;
      drag.current.active = false;
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissRef.current();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const onDown = (fromHandle: boolean) => (e: PointerEvent<HTMLElement>) => {
    if (drag.current.closing) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const d = drag.current;
    d.active = true;
    d.fromHandle = fromHandle;
    d.startY = e.clientY;
    d.lastY = e.clientY;
    d.lastT = performance.now();
    d.vel = 0;
    d.y = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d.active) return;
    const now = performance.now();
    const y = sheetDragY(d.startY, e.clientY);
    const dt = now - d.lastT;
    if (dt > 0) d.vel = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = now;
    d.y = y;
    apply(y, false);
  };

  const onUp = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (d.y < TAP_SLOP_PX) {
      if (d.fromHandle) dismiss();
      return;
    }
    if (shouldDismissSheet(d.y, d.vel)) dismiss();
    else apply(0, true);
  };

  const dragBind = (fromHandle: boolean) => ({
    onPointerDown: onDown(fromHandle),
    onPointerMove: onMove,
    onPointerUp: onUp,
    onPointerCancel: onUp,
  });

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title} data-testid="sheet">
      <div ref={backdropRef} className="fade-in absolute inset-0 bg-black/35" onClick={dismiss} />
      <div
        ref={panelRef}
        className="sheet-up safe-bottom relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-[1.75rem] bg-surface shadow-soft"
      >
        <button
          type="button"
          data-testid="sheet-handle"
          aria-label="Close"
          className="flex w-full shrink-0 touch-none select-none items-center justify-center pb-2 pt-3"
          {...dragBind(true)}
          onClick={(e) => {
            // Mouse/touch already closed in onPointerUp. Keyboard activation uses click.
            if (e.detail !== 0) {
              e.preventDefault();
              return;
            }
            dismiss();
          }}
        >
          <span className="h-1.5 w-10 rounded-full bg-line" aria-hidden />
        </button>
        {title && (
          <h3 className="mb-3 shrink-0 touch-none select-none px-5 text-[20px] font-semibold tracking-tight" {...dragBind(false)}>
            {title}
          </h3>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Empty({ icon, title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon name={icon} size={26} />
        </div>
      )}
      <div className="text-[18px] font-semibold">{title}</div>
      {children && <div className="mt-1.5 max-w-xs text-[15px] leading-relaxed text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export { cx };
