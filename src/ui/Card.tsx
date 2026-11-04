import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export function Card({ className, flat, ...rest }: HTMLAttributes<HTMLDivElement> & { flat?: boolean }) {
  return <div className={cx('rounded-lg bg-surface p-4', !flat && 'shadow-soft', className)} {...rest} />;
}

/** Card that is a button: whole surface tappable. */
export function CardButton({ className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx('block w-full rounded-lg bg-surface p-4 text-left shadow-soft transition-transform duration-150 active:scale-[0.99]', className)}
      {...rest}
    />
  );
}
