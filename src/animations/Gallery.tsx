// Dev-only page (#/dev/gallery): every animation as a strip of frames + a live loop.
import { ANIMATIONS } from './poses';
import { ExerciseFigure, FigureFrame } from './Figure';

const PHASES = [0, 0.3, 0.5];

export function Gallery() {
  const ids = Object.keys(ANIMATIONS).sort();
  const only = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('id');
  return (
    <div className="p-4 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(560px, 1fr))' }}>
      {ids
        .filter((id) => !only || id === only)
        .map((id) => (
          <div key={id} data-anim={id} className="rounded-2xl bg-surface p-3 shadow-soft">
            <div className="text-xs font-medium text-muted mb-2">{id}</div>
            <div className="flex gap-1">
              {PHASES.map((p) => (
                <div key={p} className="w-32 h-32 bg-bg rounded-lg">
                  <FigureFrame def={ANIMATIONS[id]} phase={p} />
                </div>
              ))}
              <div className="w-32 h-32 bg-accent-soft rounded-lg">
                <ExerciseFigure animationId={id} />
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
