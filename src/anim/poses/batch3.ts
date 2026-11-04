import type { Clip } from '../types';

/** Forearm plank, elbow on the floor under the shoulder. Slow breathing between two near-identical poses. */
export const plank: Clip = {
  id: 'plank',
  anchor: { joint: 'elbowNear', at: [74, 92] },
  keyframes: [
    { pose: { torso: 96, head: 104, armNear: [0, 90], legNear: [-82, -82], footNear: 20 }, hold: 700, move: 1500 },
    { pose: { torso: 99, head: 107, armNear: [0, 90], legNear: [-84, -84], footNear: 20 }, hold: 700, move: 1500 },
  ],
  still: 0,
};

/** Front view of a body on its side: forearm (far side) on the floor, top arm up. */
export const sidePlank: Clip = {
  id: 'side-plank',
  view: 'front',
  anchor: { joint: 'hip', at: [50, 82] },
  keyframes: [
    {
      pose: { hip: [50, 81.9], torso: 103, head: 108, armNear: [172, 172], armFar: [0, 90], legNear: [-77, -77], legFar: [-77, -77], footNear: 90, footFar: 90 },
      hold: 700,
      move: 1400,
    },
    {
      pose: { hip: [50, 82.7], torso: 105, head: 110, armNear: [172, 172], armFar: [0, 90], legNear: [-76, -76], legFar: [-76, -76], footNear: 90, footFar: 90 },
      hold: 700,
      move: 1400,
    },
  ],
  still: 0,
};

/** Lying on the back, head to the left. Opposite arm and leg reach away. */
export const deadBug: Clip = {
  id: 'dead-bug',
  anchor: { joint: 'hip', at: [52, 88] },
  loop: 'loop',
  keyframes: [
    {
      pose: { hip: [52, 88], torso: -90, armNear: [180, 180], armFar: [180, 180], legNear: [180, 90], legFar: [180, 90], footNear: 150, footFar: 150 },
      hold: 350,
      move: 900,
    },
    {
      pose: { hip: [52, 88], torso: -90, armNear: [-135, -135], armFar: [180, 180], legNear: [180, 90], legFar: [105, 105], footNear: 150, footFar: 150 },
      hold: 450,
      move: 900,
    },
    {
      pose: { hip: [52, 88], torso: -90, armNear: [180, 180], armFar: [180, 180], legNear: [180, 90], legFar: [180, 90], footNear: 150, footFar: 150 },
      hold: 350,
      move: 900,
    },
    {
      pose: { hip: [52, 88], torso: -90, armNear: [180, 180], armFar: [-135, -135], legNear: [105, 105], legFar: [180, 90], footNear: 150, footFar: 150 },
      hold: 450,
      move: 900,
    },
  ],
  still: 1,
};

/** Hanging from a bar, knees curl up. */
export const hangingKneeRaise: Clip = {
  id: 'hanging-knee-raise',
  anchor: { joint: 'wristNear', at: [46, 4] },
  props: [{ kind: 'bar', at: [46, 4] }],
  keyframes: [
    { pose: { torso: 180, armNear: [180, 180], legNear: [25, -55], footNear: 70 }, hold: 400, move: 1000 },
    { pose: { torso: 172, armNear: [180, 180], legNear: [105, 15], footNear: 40 }, hold: 400, move: 1000 },
  ],
  still: 1,
};

/** Standing, band from behind at chest height. Hands press straight out. */
export const pallofPress: Clip = {
  id: 'pallof-press',
  anchor: { joint: 'ankleNear', at: [44, 92] },
  props: [{ kind: 'band', from: [6, 29], to: 'wristNear' }],
  keyframes: [
    { pose: { torso: 180, armNear: [20, 130], legNear: [0, 0] }, hold: 400, move: 1000 },
    { pose: { torso: 180, armNear: [85, 85], legNear: [0, 0] }, hold: 500, move: 1000 },
  ],
  still: 1,
};

/** Walking in place with a dumbbell in each hand. Four keyframes, looped. */
export const farmersCarry: Clip = {
  id: 'farmers-carry',
  anchor: { joint: 'hip', at: [48, 52] },
  loop: 'loop',
  props: [
    { kind: 'dumbbell', at: 'wristNear' },
    { kind: 'dumbbell', at: 'wristFar' },
  ],
  keyframes: [
    {
      pose: { hip: [48, 53.5], torso: 180, armNear: [-4, -2], armFar: [6, 3], legNear: [22, 18], legFar: [-20, -50], footNear: 110, footFar: 40 },
      hold: 60,
      move: 480,
    },
    {
      pose: { hip: [48, 51], torso: 180, armNear: [-4, -2], armFar: [6, 3], legNear: [2, 0], legFar: [30, -20], footNear: 90, footFar: 70 },
      hold: 60,
      move: 480,
    },
    {
      pose: { hip: [48, 53.5], torso: 180, armNear: [-4, -2], armFar: [6, 3], legFar: [22, 18], legNear: [-20, -50], footFar: 110, footNear: 40 },
      hold: 60,
      move: 480,
    },
    {
      pose: { hip: [48, 51], torso: 180, armNear: [-4, -2], armFar: [6, 3], legFar: [2, 0], legNear: [30, -20], footFar: 90, footNear: 70 },
      hold: 60,
      move: 480,
    },
  ],
  still: 1,
};

/** Stand, squat with hands down, kick back to plank, jump. */
export const burpee: Clip = {
  id: 'burpee',
  anchor: { joint: 'hip', at: [52, 51] },
  loop: 'loop',
  keyframes: [
    { pose: { hip: [52, 51], torso: 180, armNear: [0, 0], legNear: [0, 0] }, hold: 250, move: 500 },
    { pose: { hip: [42.5, 68.5], torso: 102, head: 110, armNear: [0, 0], legNear: [75, -25] }, hold: 200, move: 400 },
    { pose: { hip: [43.4, 71.5], torso: 109, head: 112, armNear: [0, 0], legNear: [-71, -71], footNear: 20 }, hold: 250, move: 450 },
    { pose: { hip: [52, 49], torso: 180, armNear: [125, 135], legNear: [10, -5] }, hold: 250, move: 400 },
  ],
  still: 2,
};

/** High plank, knees drive in alternately. */
export const mountainClimber: Clip = {
  id: 'mountain-climber',
  anchor: { joint: 'wristNear', at: [70, 92] },
  keyframes: [
    {
      pose: { torso: 109, head: 112, armNear: [0, 0], legNear: [70, -50], legFar: [-71, -71], footNear: 90, footFar: 20 },
      hold: 40,
      move: 380,
    },
    {
      pose: { torso: 109, head: 112, armNear: [0, 0], legNear: [-71, -71], legFar: [70, -50], footNear: 20, footFar: 90 },
      hold: 40,
      move: 380,
    },
  ],
  still: 0,
};

/** Standing on the far leg (hand on a rail), near leg swings. */
export const legSwing: Clip = {
  id: 'leg-swing',
  anchor: { joint: 'ankleFar', at: [50, 92] },
  props: [{ kind: 'bar', at: [79, 30] }],
  keyframes: [
    { pose: { torso: 180, armNear: [75, 85], legNear: [-35, -40], legFar: [0, 0], footNear: 50, footFar: 90 }, hold: 80, move: 650 },
    { pose: { torso: 180, armNear: [75, 85], legNear: [55, 55], legFar: [0, 0], footNear: 110, footFar: 90 }, hold: 80, move: 650 },
  ],
  still: 1,
};

/** Long lunge, hand down by the front foot, then rotate and reach the near arm up. */
export const worldsGreatestStretch: Clip = {
  id: 'worlds-greatest-stretch',
  anchor: { joint: 'hip', at: [44, 72] },
  keyframes: [
    {
      pose: { hip: [44, 72], torso: 110, head: 120, armNear: [0, 0], armFar: [0, 0], legNear: [90, 0], legFar: [-71, -71], footNear: 90, footFar: 20 },
      hold: 500,
      move: 1100,
    },
    {
      pose: { hip: [44, 72], torso: 116, head: 150, armNear: [180, 180], armFar: [0, 0], legNear: [90, 0], legFar: [-71, -71], footNear: 90, footFar: 20 },
      hold: 600,
      move: 1100,
    },
  ],
  still: 1,
};

/** Half kneeling, rear knee on the floor. Hips shift forward. */
export const hipFlexorStretch: Clip = {
  id: 'hip-flexor-stretch',
  anchor: { joint: 'ankleNear', at: [66, 92] },
  keyframes: [
    { pose: { torso: 180, armNear: [170, 170], legNear: [95, -8], legFar: [-31, -90], footNear: 90, footFar: -90 }, hold: 400, move: 1200 },
    { pose: { torso: 178, armNear: [170, 170], legNear: [100, -25], legFar: [-46.3, -90], footNear: 90, footFar: -90 }, hold: 600, move: 1200 },
  ],
  still: 1,
};

/** On hands and knees. Hips fixed, torso and head angle show the round and the dip. */
export const catCow: Clip = {
  id: 'cat-cow',
  anchor: { joint: 'hip', at: [42, 71] },
  keyframes: [
    {
      pose: { hip: [42, 71], torso: 103, head: 55, armNear: [-18, 21], legNear: [0, -90], footNear: -90 },
      hold: 500,
      move: 1400,
    },
    {
      pose: { hip: [42, 71.5], torso: 110, head: 150, armNear: [0, 0], legNear: [0, -90], footNear: -90 },
      hold: 500,
      move: 1400,
    },
  ],
  still: 0,
};

/** Lying on the side (drawn side-on), knees bent. Top arm sweeps up and over to open the chest. */
export const openBook: Clip = {
  id: 'open-book',
  anchor: { joint: 'hip', at: [40, 86] },
  keyframes: [
    {
      pose: { hip: [40, 86], torso: 90, head: 95, armNear: [120, 120], armFar: [120, 120], legNear: [-135, -45], legFar: [-140, -50], footNear: -90, footFar: -90 },
      hold: 400,
      move: 1000,
    },
    {
      pose: { hip: [40, 86], torso: 90, head: 100, armNear: [180, 180], armFar: [120, 120], legNear: [-135, -45], legFar: [-140, -50], footNear: -90, footFar: -90 },
      hold: 250,
      move: 1000,
    },
    {
      pose: { hip: [40, 86], torso: 90, head: 80, armNear: [-125, -125], armFar: [120, 120], legNear: [-135, -45], legFar: [-140, -50], footNear: -90, footFar: -90 },
      hold: 500,
      move: 1000,
    },
  ],
  still: 2,
};
