import type { ReactNode } from 'react';

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <p className="text-headline font-semibold">{title}</p>
      {children && <p className="mt-1 text-body text-ink-2">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Loading() {
  return <div className="p-10" aria-busy="true" />;
}
