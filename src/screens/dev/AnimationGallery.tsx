import { useState } from 'react';
import { ExerciseFigure } from '../../anim/Figure';
import { allClipIds, getClip } from '../../anim/registry';
import { EXERCISES } from '../../content/exercises';

/** Dev-only page: every exercise animation, animated and as keyframe stills. Route: #/dev/animations */
export default function AnimationGallery() {
  const [still, setStill] = useState(false);
  const ids = allClipIds();
  const missing = EXERCISES.filter((e) => !getClip(e.animation)).map((e) => e.id);
  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-4">
        <h1 className="text-title font-bold">Animations ({ids.length})</h1>
        <label className="text-caption">
          <input type="checkbox" checked={still} onChange={(e) => setStill(e.target.checked)} /> keyframes
        </label>
      </div>
      {missing.length > 0 && <p className="mb-4 text-caption text-warn">Missing: {missing.join(', ')}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ids.map((id) => {
          const clip = getClip(id)!;
          return (
            <div key={id} className="rounded-lg bg-surface p-2 shadow-soft" data-clip={id}>
              {still ? (
                <div className="flex">
                  {clip.keyframes.map((_, i) => (
                    <ExerciseFigure key={i} animation={id} frame={i} className="w-1/2 text-ink" title={`${id} ${i}`} />
                  ))}
                </div>
              ) : (
                <ExerciseFigure animation={id} className="w-full text-ink" />
              )}
              <p className="text-center text-micro text-ink-2">{id}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
