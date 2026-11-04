import type { Clip } from '../types';

/** Batch 2: horizontal/vertical pressing and pulling. */

// Lying on a bench, head to the left, feet flat on the floor. Hip is explicit; bar travels chest <-> straight up.
export const benchPress: Clip = {
  id: 'bench-press',
  anchor: { joint: 'hip', at: [52, 63] },
  props: [{ kind: 'bench', x1: 14, x2: 62, y: 67 }, { kind: 'barbell', at: 'wristNear' }],
  keyframes: [
    { pose: { hip: [52, 63], torso: -90, armNear: [180, 180], legNear: [61, -20] }, hold: 400, move: 1000 },
    { pose: { hip: [52, 63], torso: -90, armNear: [100, 175], legNear: [61, -20] }, hold: 300, move: 900 },
  ],
  still: 0,
};

export const dbBenchPress: Clip = {
  id: 'db-bench-press',
  anchor: { joint: 'hip', at: [52, 63] },
  props: [{ kind: 'bench', x1: 14, x2: 62, y: 67 }, { kind: 'dumbbell', at: 'wristNear' }],
  keyframes: [
    { pose: { hip: [52, 63], torso: -90, armNear: [180, 180], legNear: [61, -20] }, hold: 400, move: 1000 },
    { pose: { hip: [52, 63], torso: -90, armNear: [95, 170], legNear: [61, -20] }, hold: 300, move: 900 },
  ],
  still: 0,
};

// Hanging between two bars on straight arms, then lowering with elbows back.
export const dip: Clip = {
  id: 'dip',
  anchor: { joint: 'wristNear', at: [40, 48] },
  props: [{ kind: 'bar', at: [40, 48] }],
  keyframes: [
    { pose: { torso: 170, armNear: [0, 0], legNear: [25, -50] }, hold: 400, move: 1000 },
    { pose: { torso: 155, armNear: [-80, 5], legNear: [25, -50] }, hold: 300, move: 900 },
  ],
  still: 0,
};

// Standing with soft knees (keeps the lockout inside the frame).
export const overheadPress: Clip = {
  id: 'overhead-press',
  anchor: { joint: 'ankleNear', at: [44, 92] },
  props: [{ kind: 'barbell', at: 'wristNear' }],
  keyframes: [
    { pose: { torso: 180, armNear: [40, 180], legNear: [32, -32] }, hold: 400, move: 1000 },
    { pose: { torso: 180, armNear: [175, 175], legNear: [32, -32] }, hold: 400, move: 1000 },
  ],
  still: 1,
};

export const dbShoulderPress: Clip = {
  id: 'db-shoulder-press',
  anchor: { joint: 'ankleNear', at: [44, 92] },
  props: [{ kind: 'dumbbell', at: 'wristNear' }],
  keyframes: [
    { pose: { torso: 180, armNear: [40, 180], legNear: [32, -32] }, hold: 400, move: 1000 },
    { pose: { torso: 180, armNear: [175, 175], legNear: [32, -32] }, hold: 400, move: 1000 },
  ],
  still: 1,
};

export const pikePushUp: Clip = {
  id: 'pike-push-up',
  anchor: { joint: 'toeNear', at: [14, 92] },
  keyframes: [
    { pose: { torso: 25, head: 30, armNear: [39, 39], legNear: [-15, -15], footNear: 20 }, hold: 350, move: 1000 },
    { pose: { torso: 32, head: 60, armNear: [-43, 61], legNear: [-36, -36], footNear: 20 }, hold: 250, move: 900 },
  ],
  still: 0,
};

export const pullUp: Clip = {
  id: 'pull-up',
  anchor: { joint: 'wristNear', at: [50, 10] },
  props: [{ kind: 'bar', at: [50, 9] }],
  keyframes: [
    { pose: { torso: 180, armNear: [180, 180], legNear: [15, -75] }, hold: 400, move: 1100 },
    { pose: { torso: 170, armNear: [-37, 175], legNear: [10, -70] }, hold: 300, move: 900 },
  ],
  still: 1,
};

// Seated, pulley overhead in front.
export const latPulldown: Clip = {
  id: 'lat-pulldown',
  anchor: { joint: 'hip', at: [46, 72] },
  props: [{ kind: 'bench', x1: 36, x2: 56, y: 75 }, { kind: 'cable', from: [52, 4], to: 'wristNear' }],
  keyframes: [
    { pose: { hip: [46, 72], torso: 190, armNear: [165, 165], legNear: [90, 0] }, hold: 400, move: 1000 },
    { pose: { hip: [46, 72], torso: 190, armNear: [-15, 140], legNear: [90, 0] }, hold: 300, move: 900 },
  ],
  still: 1,
};

export const seatedCableRow: Clip = {
  id: 'seated-cable-row',
  anchor: { joint: 'hip', at: [30, 85] },
  props: [{ kind: 'cable', from: [97, 60], to: 'wristNear' }],
  keyframes: [
    { pose: { hip: [30, 85], torso: 150, armNear: [95, 95], legNear: [78, 100], footNear: 150 }, hold: 400, move: 1000 },
    { pose: { hip: [30, 85], torso: 185, armNear: [-70, 88], legNear: [78, 100], footNear: 150 }, hold: 300, move: 900 },
  ],
  still: 1,
};

export const dbRow: Clip = {
  id: 'db-row',
  anchor: { joint: 'ankleNear', at: [28, 92] },
  props: [{ kind: 'bench', x1: 6, x2: 52, y: 75 }, { kind: 'dumbbell', at: 'wristNear' }],
  keyframes: [
    { pose: { torso: 110, armNear: [22, 10], armFar: [0, 0], legNear: [20, -10], legFar: [10, -95] }, hold: 400, move: 1000 },
    { pose: { torso: 110, armNear: [-110, 10], armFar: [0, 0], legNear: [20, -10], legFar: [10, -95] }, hold: 300, move: 900 },
  ],
  still: 1,
};

export const invertedRow: Clip = {
  id: 'inverted-row',
  anchor: { joint: 'wristNear', at: [76, 52] },
  props: [{ kind: 'bar', at: [76, 52] }],
  keyframes: [
    { pose: { torso: 98, armNear: [180, 180], legNear: [-82, -82], footNear: 140 }, hold: 400, move: 1000 },
    { pose: { torso: 110.3, armNear: [-140, 104], legNear: [-69.7, -69.7], footNear: 140 }, hold: 300, move: 900 },
  ],
  still: 1,
};

export const proneYRaise: Clip = {
  id: 'prone-y-raise',
  anchor: { joint: 'hip', at: [45, 85] },
  keyframes: [
    { pose: { hip: [45, 85], torso: 90, head: 90, armNear: [100, 100], legNear: [-90, -90], footNear: 20 }, hold: 400, move: 1000 },
    { pose: { hip: [45, 85], torso: 95, head: 105, armNear: [140, 140], legNear: [-90, -90], footNear: 20 }, hold: 300, move: 900 },
  ],
  still: 1,
};

export const facePull: Clip = {
  id: 'face-pull',
  anchor: { joint: 'ankleNear', at: [36, 92] },
  props: [{ kind: 'band', from: [92, 20], to: 'wristNear' }],
  keyframes: [
    { pose: { torso: 180, armNear: [92, 92], legNear: [0, 0] }, hold: 400, move: 1000 },
    { pose: { torso: 180, armNear: [100, -130], legNear: [0, 0] }, hold: 300, move: 900 },
  ],
  still: 1,
};
