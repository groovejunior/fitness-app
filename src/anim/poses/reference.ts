import type { Clip } from '../types';

/**
 * Reference animations. Every other clip follows these conventions:
 * - Figure faces right. Side view unless the movement only reads from the front.
 * - Anchor whatever stays planted (ankle on the floor, wrist on the bar) so nothing slides.
 * - Feet on the floor sit at y = 92.
 * - 2–3 keyframes: start, (middle), end. Holds ~250–500 ms, moves ~800–1100 ms.
 */
export const backSquat: Clip = {
  id: 'back-squat',
  anchor: { joint: 'ankleNear', at: [44, 92] },
  props: [{ kind: 'barbell', at: 'neck', offset: [-6, 2] }],
  keyframes: [
    { pose: { torso: 180, armNear: [-20, 184], legNear: [0, 0] }, hold: 400, move: 1100 },
    { pose: { torso: 140, armNear: [-10, 195], legNear: [80, -25] }, hold: 250, move: 900 },
  ],
  still: 1,
};

export const pushUp: Clip = {
  id: 'push-up',
  anchor: { joint: 'toeNear', at: [14, 92] },
  keyframes: [
    { pose: { torso: 109, head: 112, armNear: [0, 0], legNear: [-71, -71], footNear: 20 }, hold: 350, move: 1000 },
    { pose: { torso: 98, head: 102, armNear: [-62, 47], legNear: [-82, -82], footNear: 20 }, hold: 200, move: 800 },
  ],
  still: 0,
};

/** Front view reference: both sides solid. Near = the figure's right side, drawn on the viewer's right. */
export const jumpingJack: Clip = {
  id: 'jumping-jack',
  view: 'front',
  anchor: { joint: 'hip', at: [50, 51.3] },
  keyframes: [
    { pose: { hip: [50, 51.3], torso: 180, armNear: [12, 6], armFar: [-12, -6], legNear: [6, 3], legFar: [-6, -3], footNear: 90, footFar: -90 }, hold: 120, move: 380 },
    { pose: { hip: [50, 53.5], torso: 180, armNear: [145, 165], armFar: [-145, -165], legNear: [22, 18], legFar: [-22, -18], footNear: 90, footFar: -90 }, hold: 120, move: 380 },
  ],
  still: 1,
};
