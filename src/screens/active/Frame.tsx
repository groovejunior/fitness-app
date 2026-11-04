// Full-screen frame for the active workout: top bar, progress, scrolling body, fixed footer.
import { useState, type ReactNode } from 'react';
import { navigate } from '../../lib/router';
import { Button, IconButton, ProgressBar, Sheet } from '../../ui/kit';

export function ActiveFrame({
  title,
  progress,
  children,
  footer,
  bodyClass = 'pb-44',
}: {
  title: string;
  progress: number;
  children: ReactNode;
  footer: ReactNode;
  bodyClass?: string;
}) {
  const [leaving, setLeaving] = useState(false);
  return (
    <div className="min-h-dvh" data-testid="active-workout">
      <header className="safe-top sticky top-0 z-30 bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-3">
          <div className="flex h-11 items-center gap-2">
            <IconButton icon="x" label="Close workout" onClick={() => setLeaving(true)} data-testid="active-close" />
            <div className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold">{title}</div>
            <div className="w-10" />
          </div>
          <ProgressBar value={progress} className="mb-1" />
        </div>
      </header>
      <main className={`mx-auto max-w-lg px-4 pt-4 ${bodyClass}`}>{children}</main>
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-bg via-bg to-bg/0 pt-5">
        <div className="mx-auto max-w-lg px-4 pb-2">{footer}</div>
      </div>
      <Sheet open={leaving} onClose={() => setLeaving(false)} title="Leave the workout?">
        <p className="mb-5 text-[15px] leading-relaxed text-muted">Your logged sets are kept.</p>
        <div className="space-y-2">
          <Button block variant="secondary" onClick={() => setLeaving(false)}>
            Keep going
          </Button>
          <Button block variant="danger" onClick={() => navigate('/today', { replace: true })} data-testid="active-leave">
            Leave
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
