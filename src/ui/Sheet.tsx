import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

/** Bottom sheet. Tap the backdrop or the close button to dismiss. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <div className="animate-fade-in absolute inset-0 bg-black/35" onClick={onClose} />
      <div className="animate-sheet-in relative mx-auto max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-surface px-5 pt-3 pb-8 pb-safe shadow-float">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line" />
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-title font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full bg-surface-2 text-ink-2" aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
