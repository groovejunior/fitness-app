import type { Clip } from '../types';

/** Batch 1: squats, hinges, lunges, plyos, calves. Geometry follows docs/ANIMATION_STYLE.md. */

export const gobletSquat: Clip = {
  id: 'goblet-squat',
  anchor: { joint: 'ankleNear', at: [44, 92] },
  props: [{ kind: 'dumbbell', at: 'wristNear' }],
  keyframes: [
    { pose: { torso: 180, armNear: [5, 130], legNear: [0, 0] }, hold: 400, move: 1100 },
    { pose: { torso: 155, armNear: [15, 125], legNear: [80, -25] }, hold: 300, move: 900 },
  ],
  still: 1,
};

export const bodyweightSquat: Clip = {
  id: 'bodyweight-squat',
  anchor: { joint: 'ankleNear', at: [44, 92] },
  keyframes: [
    { pose: { torso: 180, armNear: [10, 15], legNear: [0, 0] }, hold: 400, move: 1100 },
    { pose: { torso: 145, armNear: [85, 88], legNear: [80, -25] }, hold: 300, move: 900 },
  ],
  still: 1,
};

export const deadlift: Clip = {
  id: 'deadlift',
  anchor: { joint: 'ankleNear', at: [40, 92] },
  props: [{ kind: 'barbell', at: 'wristNear' }],
  keyframes: [
    { pose: { torso: 105, head: 125, armNear: [-5, -5], legNear: [70, -10] }, hold: 400, move: 1100 },
    { pose: { torso: 180, armNear: [0, 0], legNear: [0, 0] }, hold: 400, move: 1000 },
  ],
  still: 0,
};

export const romanianDeadlift: Clip = {
  id: 'romanian-deadlift',
  anchor: { joint: 'ankleNear', at: [40, 92] },
  props: [{ kind: 'barbell', at: 'wristNear' }],
  keyframes: [
    { pose: { torso: 180, armNear: [0, 0], legNear: [4, -3] }, hold: 400, move: 1100 },
    { pose: { torso: 95, head: 115, armNear: [-15, -15], legNear: [30, -8] }, hold: 300, move: 1000 },
  ],
  still: 1,
};

export const dbRomanianDeadlift: Clip = {
  id: 'db-romanian-deadlift',
  anchor: { joint: 'ankleNear', at: [40, 92] },
  props: [{ kind: 'dumbbell', at: 'wristNear' }],
  keyframes: [
    { pose: { torso: 180, armNear: [0, 0], legNear: [4, -3] }, hold: 400, move: 1100 },
    { pose: { torso: 95, head: 115, armNear: [-15, -15], legNear: [30, -8] }, hold: 300, move: 1000 },
  ],
  still: 1,
};

export const kettlebellSwing: Clip = {
  id: 'kettlebell-swing',
  anchor: { joint: 'ankleNear', at: [44, 92] },
  props: [{ kind: 'kettlebell', at: 'wristNear' }],
  keyframes: [
    { pose: { torso: 120, head: 130, armNear: [-30, -30], legNear: [50, -15] }, hold: 150, move: 450 },
    { pose: { torso: 180, armNear: [90, 90], legNear: [0, 0] }, hold: 150, move: 450 },
  ],
  still: 1,
};

/** Lying on the back, head to the left. Hip anchored with explicit pose.hip; feet stay put at (64, 92). */
export const gluteBridge: Clip = {
  id: 'glute-bridge',
  anchor: { joint: 'hip', at: [46, 86] },
  keyframes: [
    { pose: { hip: [46, 86], torso: -90, head: -90, armNear: [80, 80], legNear: [131, 6] }, hold: 400, move: 1000 },
    { pose: { hip: [50, 70], torso: -55, head: -80, armNear: [80, 80], legNear: [81, -20] }, hold: 500, move: 1000 },
  ],
  still: 1,
};

/** Front ankle anchored at (69, 92); legFar is the rear leg with its foot on the bench. */
export const bulgarianSplitSquat: Clip = {
  id: 'bulgarian-split-squat',
  anchor: { joint: 'ankleNear', at: [69, 92] },
  props: [
    { kind: 'bench', x1: 8, x2: 28, y: 70 },
    { kind: 'dumbbell', at: 'wristNear' },
  ],
  keyframes: [
    { pose: { torso: 180, armNear: [0, 0], legNear: [47, 11], legFar: [-18, -120], footFar: -90 }, hold: 400, move: 1100 },
    { pose: { torso: 172, armNear: [0, 0], legNear: [85, 0], legFar: [-40, -155], footFar: -90 }, hold: 300, move: 1000 },
  ],
  still: 1,
};

export const reverseLunge: Clip = {
  id: 'reverse-lunge',
  anchor: { joint: 'ankleNear', at: [60, 92] },
  keyframes: [
    { pose: { torso: 180, armNear: [-35, 40], legNear: [0, 0] }, hold: 400, move: 1000 },
    { pose: { torso: 180, armNear: [-35, 40], legNear: [86, -14], legFar: [-35, -100], footFar: 5 }, hold: 300, move: 1000 },
  ],
  still: 1,
};

/** Near foot on the box (ankle anchored on its top at y 82); far foot starts on the floor. */
export const stepUp: Clip = {
  id: 'step-up',
  anchor: { joint: 'ankleNear', at: [64, 82] },
  props: [{ kind: 'box', x: 50, y: 82, w: 36 }],
  keyframes: [
    { pose: { torso: 165, armNear: [-35, 40], legNear: [62, -1], legFar: [9, -16] }, hold: 400, move: 1000 },
    { pose: { torso: 180, armNear: [-35, 40], legNear: [0, 0], legFar: [75, -5] }, hold: 400, move: 900 },
  ],
  still: 1,
};

export const jumpSquat: Clip = {
  id: 'jump-squat',
  anchor: { joint: 'hip', at: [30, 64] },
  keyframes: [
    { pose: { hip: [30, 64], torso: 155, armNear: [-60, -70], legNear: [65, -15] }, hold: 200, move: 350 },
    { pose: { hip: [44, 45], torso: 180, armNear: [110, 125], legNear: [0, 0], footNear: 40 }, hold: 150, move: 450 },
  ],
  still: 1,
};

/** Front view. Near = viewer's right. Bounds from the left leg to the right leg. */
export const skaterJump: Clip = {
  id: 'skater-jump',
  view: 'front',
  anchor: { joint: 'hip', at: [64, 58] },
  keyframes: [
    {
      pose: { hip: [64, 58], torso: 172, armNear: [-30, -15], armFar: [-30, -15], legNear: [40, -27], legFar: [-60, -30], footNear: 90, footFar: -90 },
      hold: 350,
      move: 500,
    },
    {
      pose: { hip: [36, 58], torso: 188, armNear: [30, 15], armFar: [30, 15], legNear: [60, 30], legFar: [-40, 27], footNear: 90, footFar: -90 },
      hold: 350,
      move: 500,
    },
  ],
  still: 0,
};

/** Toe anchored: the heel lifts as the foot angles down. */
export const calfRaise: Clip = {
  id: 'calf-raise',
  anchor: { joint: 'toeNear', at: [50, 92] },
  keyframes: [
    { pose: { torso: 180, armNear: [-35, 40], legNear: [0, 0], footNear: 90 }, hold: 400, move: 900 },
    { pose: { torso: 180, armNear: [-35, 40], legNear: [0, 0], footNear: 20 }, hold: 500, move: 900 },
  ],
  still: 1,
};
