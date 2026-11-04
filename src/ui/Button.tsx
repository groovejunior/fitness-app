import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink active:bg-accent-press',
  secondary: 'bg-surface-2 text-ink active:opacity-80',
  ghost: 'bg-transparent text-accent active:opacity-60',
  danger: 'bg-transparent text-danger active:opacity-60',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-caption font-semibold rounded-sm gap-1.5',
  md: 'h-11 px-4.5 text-body font-semibold rounded-md gap-2',
  lg: 'h-14 px-6 text-headline font-semibold rounded-lg gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', block, icon, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center whitespace-nowrap transition-[background-color,opacity,transform] duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
