import type { Clip } from '../types';

/** Batch 4: calisthenics progressions. */

// Same hang as the pull-up, palms toward you: knees bent forward, elbows tucked a bit more.
export const chinUp: Clip = {
  id: 'chin-up',
  anchor: { joint: 'wristNear', at: [50, 13] },
  props: [{ kind: 'bar', at: [50, 11] }],
  keyframes: [
    { pose: { torso: 180, armNear: [180, 180], legNear: [75, -40] }, hold: 400, move: 1100 },
    { pose: { torso: 172, armNear: [-28, 172], legNear: [75, -40] }, hold: 300, move: 900 },
  ],
  still: 1,
};

// Starts with the chin over the bar, then lowers very slowly (long move) to a full hang. Loop jumps back up.
export const negativePullUp: Clip = {
  id: 'negative-pull-up',
  anchor: { joint: 'wristNear', at: [50, 13] },
  props: [{ kind: 'bar', at: [50, 11] }],
  loop: 'loop',
  keyframes: [
    { pose: { torso: 170, armNear: [-37, 175], legNear: [70, -45] }, hold: 600, move: 2600 },
    { pose: { torso: 180, armNear: [180, 180], legNear: [70, -45] }, hold: 500, move: 600 },
  ],
  still: 0,
};

// Same body line as the inverted row, elbows flare out more at the top.
export const wideInvertedRow: Clip = {
  id: 'wide-inverted-row',
  anchor: { joint: 'wristNear', at: [76, 52] },
  props: [{ kind: 'bar', at: [76, 49.5] }],
  keyframes: [
    { pose: { torso: 98, armNear: [180, 180], legNear: [-82, -82], footNear: 140 }, hold: 400, move: 1000 },
    { pose: { torso: 112.1, armNear: [-135, 100], legNear: [-67.9, -67.9], footNear: 140 }, hold: 300, move: 900 },
  ],
  still: 1,
};

// Hands right under the chest, elbows brush the ribs.
export const diamondPushUp: Clip = {
  id: 'diamond-push-up',
  anchor: { joint: 'toeNear', at: [14, 92] },
  keyframes: [
    { pose: { torso: 109, head: 112, armNear: [0, 0], legNear: [-71, -71], footNear: 20 }, hold: 350, move: 1000 },
    { pose: { torso: 97.2, head: 101, armNear: [-54.7, 60.3], legNear: [-82.8, -82.8], footNear: 20 }, hold: 200, move: 800 },
  ],
  still: 0,
};

// Feet on a box, body almost level.
export const declinePushUp: Clip = {
  id: 'decline-push-up',
  anchor: { joint: 'toeNear', at: [12, 69] },
  props: [{ kind: 'box', x: 2, y: 69, w: 16 }],
  keyframes: [
    { pose: { torso: 89, head: 93, armNear: [0, 0], legNear: [-91, -91], footNear: 20 }, hold: 350, move: 1000 },
    { pose: { torso: 78.3, head: 82, armNear: [-47.4, 62.6], legNear: [-101.7, -101.7], footNear: 20 }, hold: 200, move: 800 },
  ],
  still: 0,
};

// One arm bends deep, the other stays straight and reaches forward-out (far arm, faint).
export const archerPushUp: Clip = {
  id: 'archer-push-up',
  anchor: { joint: 'toeNear', at: [6, 92] },
  keyframes: [
    { pose: { torso: 109, head: 112, armNear: [0, 0], armFar: [18, 18], legNear: [-71, -71], footNear: 20 }, hold: 350, move: 1000 },
    { pose: { torso: 96.4, head: 100, armNear: [-64.7, 54.3], armFar: [60, 60], legNear: [-83.6, -83.6], footNear: 20 }, hold: 250, move: 900 },
  ],
  still: 1,
};

// Hands on a box, feet on the floor: a steeper body line than a push-up.
export const inclinePushUp: Clip = {
  id: 'incline-push-up',
  anchor: { joint: 'toeNear', at: [14, 92] },
  props: [{ kind: 'box', x: 54, y: 70, w: 42 }],
  keyframes: [
    { pose: { torso: 131, head: 134, armNear: [0, 0], legNear: [-49, -49], footNear: 20 }, hold: 350, move: 1000 },
    { pose: { torso: 119.9, head: 123, armNear: [-66.5, 26.6], legNear: [-60.1, -60.1], footNear: 20 }, hold: 200, move: 800 },
  ],
  still: 0,
};

// Sits back to a box on one leg; the far (faint) leg stays out in front.
export const boxPistolSquat: Clip = {
  id: 'box-pistol-squat',
  anchor: { joint: 'ankleNear', at: [44, 92] },
  props: [{ kind: 'box', x: 16, y: 75, w: 24 }],
  keyframes: [
    { pose: { torso: 180, armNear: [85, 88], legNear: [0, 0], legFar: [88, 88] }, hold: 400, move: 1100 },
    { pose: { torso: 140, armNear: [85, 88], legNear: [80.2, -21.5], legFar: [92, 92] }, hold: 400, move: 900 },
  ],
  still: 1,
};

// Front view. Feet stay put; hips slide over the near foot while the far leg stays straight.
export const cossackSquat: Clip = {
  id: 'cossack-squat',
  view: 'front',
  anchor: { joint: 'hip', at: [46, 62] },
  keyframes: [
    {
      pose: { hip: [45.7, 62], torso: 180, armNear: [-5, -25], armFar: [5, 25], legNear: [42.7, 42.7], legFar: [-42.7, -42.7], footNear: 90, footFar: -90 },
      hold: 400,
      move: 1100,
    },
    {
      pose: { hip: [52.5, 70], torso: 180, armNear: [-5, -25], armFar: [5, 25], legNear: [84.5, 2.8], legFar: [-57.5, -57.5], footNear: 90, footFar: -110 },
      hold: 400,
      move: 1100,
    },
  ],
  still: 1,
};

// Both feet planted, hips drop straight down, back knee hovers above the floor.
export const splitSquat: Clip = {
  id: 'split-squat',
  anchor: { joint: 'hip', at: [42, 54] },
  keyframes: [
    { pose: { hip: [42, 54], torso: 180, armNear: [-35, 40], legNear: [32.7, 31.9], legFar: [-30.9, -49.1], footFar: 5 }, hold: 400, move: 1000 },
    { pose: { hip: [42, 68], torso: 180, armNear: [-35, 40], legNear: [78.2, 11.8], legFar: [-17.3, -96.4], footFar: 5 }, hold: 300, move: 1000 },
  ],
  still: 1,
};

// Lying on the back, head left. Far leg stays straight, in line with the body at the top.
export const singleLegGluteBridge: Clip = {
  id: 'single-leg-glute-bridge',
  anchor: { joint: 'hip', at: [46, 86] },
  keyframes: [
    { pose: { hip: [46, 86], torso: -90, head: -90, armNear: [80, 80], legNear: [131, 6], legFar: [140, 140] }, hold: 400, move: 1000 },
    { pose: { hip: [50, 70], torso: -55, head: -80, armNear: [80, 80], legNear: [81, -20], legFar: [125, 125] }, hold: 500, move: 1000 },
  ],
  still: 1,
};

// Hips up, heels on a towel. Heels slide out until the legs are straight, then back in.
export const slidingLegCurl: Clip = {
  id: 'sliding-leg-curl',
  anchor: { joint: 'hip', at: [40, 70] },
  keyframes: [
    { pose: { hip: [40, 70], torso: -55, head: -80, armNear: [80, 80], legNear: [91, -10.8], footNear: 150 }, hold: 400, move: 1200 },
    { pose: { hip: [40, 70], torso: -55, head: -80, armNear: [80, 80], legNear: [62, 62], footNear: 150 }, hold: 400, move: 1200 },
  ],
  still: 1,
};

// Hanging from a bar, legs straight. Raised to horizontal without swinging.
export const hangingLegRaise: Clip = {
  id: 'hanging-leg-raise',
  tall: true,
  anchor: { joint: 'wristNear', at: [46, -6] },
  props: [{ kind: 'bar', at: [46, -6] }],
  keyframes: [
    { pose: { torso: 180, armNear: [180, 180], legNear: [5, 5], footNear: 80 }, hold: 400, move: 1000 },
    { pose: { torso: 172, armNear: [180, 180], legNear: [88, 88], footNear: 80 }, hold: 400, move: 1000 },
  ],
  still: 1,
};

// Held on straight arms between two bars, legs straight out in front. Barely moves.
export const lSit: Clip = {
  id: 'l-sit',
  anchor: { joint: 'wristNear', at: [40, 64] },
  props: [{ kind: 'bar', at: [40, 66.5] }],
  keyframes: [
    { pose: { torso: 180, armNear: [0, 0], legNear: [88, 88], footNear: 80 }, hold: 700, move: 1400 },
    { pose: { torso: 177, armNear: [0, 0], legNear: [92, 92], footNear: 80 }, hold: 700, move: 1400 },
  ],
  still: 0,
};

// Lying on the back, head left. A tight banana shape, rocked as one piece.
export const hollowRock: Clip = {
  id: 'hollow-rock',
  anchor: { joint: 'hip', at: [50, 88] },
  keyframes: [
    { pose: { hip: [50, 88], torso: -100, head: -85, armNear: [-140, -140], legNear: [122, 122], footNear: 60 }, hold: 350, move: 900 },
    { pose: { hip: [50, 88], torso: -125, head: -110, armNear: [-150, -150], legNear: [100, 100], footNear: 60 }, hold: 350, move: 900 },
  ],
  still: 1,
};
