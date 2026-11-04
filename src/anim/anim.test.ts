import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../content/exercises';
import { allClipIds, getClip } from './registry';
import { GROUND_Y, solveAnchored } from './skeleton';

describe('exercise animations', () => {
  it('every exercise has an animation', () => {
    const missing = EXERCISES.filter((e) => !getClip(e.animation)).map((e) => e.id);
    expect(missing).toEqual([]);
  });

  it('every keyframe stays inside the frame and above the floor', () => {
    for (const id of allClipIds()) {
      const clip = getClip(id)!;
      expect(clip.keyframes.length, id).toBeGreaterThanOrEqual(1);
      clip.keyframes.forEach((k, i) => {
        const j = solveAnchored(clip, k.pose);
        for (const [name, [x, y]] of Object.entries(j)) {
          expect(x, `${id} #${i} ${name} x`).toBeGreaterThanOrEqual(2);
          expect(x, `${id} #${i} ${name} x`).toBeLessThanOrEqual(98);
          expect(y, `${id} #${i} ${name} y`).toBeGreaterThanOrEqual(2);
          expect(y, `${id} #${i} ${name} y`).toBeLessThanOrEqual(GROUND_Y + 1.5);
        }
      });
    }
  });
});
