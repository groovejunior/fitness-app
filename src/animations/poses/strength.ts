// Animations for squat / hinge / lunge / push / pull / arm exercises.
// Side view, figure faces right. Angle conventions are in ../rig.ts.
//
// Most poses are built from target points: "hip here, foot there" via legTo(), "hand there"
// via armTo()/armRel(). Those work out the thigh/knee and arm/elbow angles with a simple
// two-segment solver, so feet stay planted and hands stay on the bar, floor or handle.
import { GROUND, SEG, type AnimationDef, type Pose, type Vec } from '../rig';

const FL = GROUND - 0.8; // y of a foot or hand resting on the floor
const G = GROUND;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const pt = (from: Vec, a: number, len: number): Vec => [from[0] + len * Math.sin(rad(a)), from[1] + len * Math.cos(rad(a))];
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Which way the middle joint (knee/elbow) points. */
type Side = 'fwd' | 'back' | 'up' | 'down';

/** Two-segment reach. Returns the absolute angles of the first and second segment. */
function twoLink(from: Vec, to: Vec, l1: number, l2: number, side: Side): [number, number] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dist = Math.hypot(dx, dy) || 0.001;
  const d = Math.min(dist, l1 + l2 - 0.01);
  const phi = deg(Math.atan2(dx, dy));
  const alpha = deg(Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))));
  const target: Vec = [from[0] + (dx / dist) * d, from[1] + (dy / dist) * d];
  const score = (m: Vec) => (side === 'fwd' ? m[0] : side === 'back' ? -m[0] : side === 'up' ? -m[1] : m[1]);
  let best: [number, number] | null = null;
  let bestScore = -Infinity;
  for (const a1 of [phi + alpha, phi - alpha]) {
    const mid = pt(from, a1, l1);
    if (score(mid) > bestScore) {
      bestScore = score(mid);
      best = [a1, deg(Math.atan2(target[0] - mid[0], target[1] - mid[1]))];
    }
  }
  return best!;
}

/** [thigh, knee] that puts the foot at `foot`. */
function legTo(hip: Vec, foot: Vec, side: Side = 'fwd'): [number, number] {
  const [a1, a2] = twoLink(hip, foot, SEG.thigh, SEG.shin, side);
  return [r1(a1), r1(a1 - a2)];
}

const shoulderOf = (hip: Vec, torso: number): Vec => [hip[0] + SEG.torso * Math.sin(rad(torso)), hip[1] - SEG.torso * Math.cos(rad(torso))];

/** [upper arm, elbow] that puts the hand at an absolute point. */
function armTo(hip: Vec, torso: number, hand: Vec, side: Side = 'down'): [number, number] {
  const [a1, a2] = twoLink(shoulderOf(hip, torso), hand, SEG.upperArm, SEG.forearm, side);
  return [r1(a1), r1(a2 - a1)];
}

/** Same, with the hand given relative to the shoulder. */
function armRel(hip: Vec, torso: number, d: Vec, side: Side = 'down'): [number, number] {
  const s = shoulderOf(hip, torso);
  return armTo(hip, torso, [s[0] + d[0], s[1] + d[1]], side);
}

/** Both feet on the floor at the given x positions. */
function feet(hip: Vec, nx: number, fx: number, side: Side = 'fwd'): Pick<Pose, 'legN' | 'legF'> {
  return { legN: legTo(hip, [nx, FL], side), legF: legTo(hip, [fx, FL], side) };
}

// Hips and feet for upright standing, used by many standing exercises.
const STAND_HIP: Vec = [50, 57.8];
const STAND_FEET = feet(STAND_HIP, 52, 48);

// Seated-on-the-floor leg position shared by the two seated rows.
const SEAT_HIP: Vec = [30, 88];
const SEAT_LEGS = { legN: legTo(SEAT_HIP, [62, 89], 'up'), legF: legTo(SEAT_HIP, [61, 89.5], 'up') };

// Lying face-down on the floor (prone), shoulders towards +x.
const PRONE_HIP: Vec = [40, 87.5];

export const STRENGTH_ANIMATIONS: Record<string, AnimationDef> = {
  // ------------------------------------------------------------------ squat
  'back-squat': {
    keyframes: [
      { hip: STAND_HIP, torso: 3, armN: [-30, 150], armF: [-34, 150], ...STAND_FEET },
      { hip: [45, 70], torso: 40, head: -14, armN: [-40, 148], armF: [-44, 148], ...feet([45, 70], 52, 48) },
    ],
    props: [{ kind: 'barbell', anchor: 'shoulder' }],
    durationMs: 2800,
  },

  'goblet-squat': {
    keyframes: [
      {
        hip: STAND_HIP,
        torso: 2,
        armN: armRel(STAND_HIP, 2, [9, 6]),
        armF: armRel(STAND_HIP, 2, [8, 7]),
        ...STAND_FEET,
      },
      {
        hip: [46, 70],
        torso: 22,
        head: -8,
        armN: armRel([46, 70], 22, [9, 6]),
        armF: armRel([46, 70], 22, [8, 7]),
        ...feet([46, 70], 52, 48),
      },
    ],
    props: [{ kind: 'dumbbell', anchor: 'handN' }],
    durationMs: 2800,
  },

  'bodyweight-squat': {
    keyframes: [
      { hip: STAND_HIP, torso: 2, armN: [10, 4], armF: [6, 4], ...STAND_FEET },
      { hip: [44, 70], torso: 35, head: -12, armN: [88, 0], armF: [84, 0], ...feet([44, 70], 52, 48) },
    ],
    durationMs: 2600,
  },

  // Lying back on the sled, knees come in toward the chest, then push away. The plate stands in
  // for the foot platform (the rig has no machine prop).
  'leg-press': (() => {
    const hip: Vec = [36, 80];
    const arms = { armN: [50, 0] as [number, number], armF: [46, 0] as [number, number] };
    return {
      keyframes: [
        { hip, torso: -50, ...arms, legN: legTo(hip, [hip[0] + 28, hip[1] - 18], 'up'), legF: legTo(hip, [hip[0] + 26, hip[1] - 17], 'up') },
        { hip, torso: -50, ...arms, legN: legTo(hip, [hip[0] + 16, hip[1] - 4], 'up'), legF: legTo(hip, [hip[0] + 14, hip[1] - 5], 'up') },
      ],
      props: [{ kind: 'plate', anchor: 'footN' }],
      durationMs: 3000,
    } satisfies AnimationDef;
  })(),

  // ------------------------------------------------------------------ hinge
  'romanian-deadlift': (() => {
    const top: Vec = STAND_HIP;
    const low: Vec = [43, 58.8];
    return {
      keyframes: [
        { hip: top, torso: 0, armN: [3, 0], armF: [-1, 0], ...STAND_FEET },
        { hip: low, torso: 72, head: -22, armN: armTo(low, 72, [58, 76]), armF: armTo(low, 72, [56, 76]), ...feet(low, 52, 48) },
      ],
      props: [{ kind: 'barbell', anchor: 'handN' }],
      durationMs: 3000,
    } satisfies AnimationDef;
  })(),

  'db-romanian-deadlift': (() => {
    const top: Vec = STAND_HIP;
    const low: Vec = [43, 58.8];
    return {
      keyframes: [
        { hip: top, torso: 0, armN: [4, 0], armF: [1, 0], ...STAND_FEET },
        { hip: low, torso: 72, head: -22, armN: armTo(low, 72, [58, 76]), armF: armTo(low, 72, [55, 76]), ...feet(low, 52, 48) },
      ],
      props: [{ kind: 'dumbbell', anchor: 'hands' }],
      durationMs: 3000,
    } satisfies AnimationDef;
  })(),

  // Bar on the floor over mid-foot, hips low; stand up with the bar sliding up the legs.
  deadlift: (() => {
    const low: Vec = [33, 70.5];
    const top: Vec = [51, 57.8];
    return {
      keyframes: [
        { hip: low, torso: 62, head: -16, armN: armTo(low, 62, [54, 84.2], 'back'), armF: armTo(low, 62, [53, 84.2], 'back'), ...feet(low, 52, 50) },
        { hip: top, torso: -2, armN: armRel(top, -2, [2.3, 24.5]), armF: armRel(top, -2, [1.3, 24.5]), ...feet(top, 52, 49) },
      ],
      props: [{ kind: 'barbell', anchor: 'handN' }],
      durationMs: 3000,
    } satisfies AnimationDef;
  })(),

  // Upper back on the bench, feet planted; the bar sits on the hips and goes up with them.
  'hip-thrust': (() => {
    const low: Vec = [48, 83.5];
    const top: Vec = [50, 73.5];
    const tLow = -66.4;
    const tTop = -90;
    return {
      keyframes: [
        { hip: low, torso: tLow, head: 30, armN: armTo(low, tLow, [low[0], low[1] - 2], 'up'), armF: armTo(low, tLow, [low[0] - 1, low[1] - 2], 'up'), ...feet(low, 66, 64, 'up') },
        { hip: top, torso: tTop, head: 30, armN: armTo(top, tTop, [top[0], top[1] - 2], 'up'), armF: armTo(top, tTop, [top[0] - 1, top[1] - 2], 'up'), ...feet(top, 66, 64, 'up') },
      ],
      props: [
        { kind: 'bench', at: [12, 76], w: 26 },
        { kind: 'barbell', anchor: 'hip' },
      ],
      durationMs: 2800,
      hold: 0.14,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // Shoulders stay on the floor, hips lift until the body is a straight line from knee to shoulder.
  'glute-bridge': (() => {
    const low: Vec = [54, 89.5];
    const top: Vec = [50.2, 76.5];
    const tLow = -90;
    const tTop = -122.8;
    const hand = (hip: Vec, t: number): Vec => [shoulderOf(hip, t)[0] + 22, 90.3];
    return {
      keyframes: [
        { hip: low, torso: tLow, head: 20, armN: armTo(low, tLow, hand(low, tLow), 'up'), armF: armTo(low, tLow, [hand(low, tLow)[0] - 2, 90.3], 'up'), ...feet(low, 68, 66, 'up') },
        { hip: top, torso: tTop, head: 53, armN: armTo(top, tTop, hand(top, tTop), 'up'), armF: armTo(top, tTop, [hand(top, tTop)[0] - 2, 90.3], 'up'), ...feet(top, 68, 66, 'up') },
      ],
      props: [{ kind: 'mat', at: [18, G], w: 72 }],
      durationMs: 2600,
      hold: 0.14,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // Balance on the near leg, free leg and chest tip over together like a see-saw.
  'single-leg-rdl': (() => {
    const top: Vec = [49, 57.8];
    const low: Vec = [46, 59.3];
    const sh = shoulderOf(low, 80);
    return {
      keyframes: [
        { hip: top, torso: 0, armN: [5, 0], armF: [1, 0], legN: legTo(top, [48, FL]), legF: legTo(top, [42, 84]) },
        { hip: low, torso: 80, head: -20, armN: armTo(low, 80, [sh[0] - 2, 79]), armF: armTo(low, 80, [sh[0] - 4, 79]), legN: legTo(low, [48, FL]), legF: [-80, 0] },
      ],
      durationMs: 3000,
    } satisfies AnimationDef;
  })(),

  // ------------------------------------------------------------------ lunge
  'reverse-lunge': (() => {
    const top: Vec = [52, 57.8];
    const low: Vec = [44, 70];
    return {
      keyframes: [
        { hip: top, torso: 2, armN: [5, 0], armF: [1, 0], legN: legTo(top, [54, FL]), legF: legTo(top, [50, FL]) },
        { hip: low, torso: 4, armN: [5, 0], armF: [1, 0], legN: legTo(low, [54, FL]), legF: legTo(low, [24, 89], 'down') },
      ],
      durationMs: 2800,
    } satisfies AnimationDef;
  })(),

  'db-reverse-lunge': (() => {
    const top: Vec = [52, 57.8];
    const low: Vec = [44, 70];
    return {
      keyframes: [
        { hip: top, torso: 2, armN: [5, 0], armF: [1, 0], legN: legTo(top, [54, FL]), legF: legTo(top, [50, FL]) },
        { hip: low, torso: 4, armN: [5, 0], armF: [1, 0], legN: legTo(low, [54, FL]), legF: legTo(low, [24, 89], 'down') },
      ],
      props: [{ kind: 'dumbbell', anchor: 'hands' }],
      durationMs: 2800,
    } satisfies AnimationDef;
  })(),

  // Back foot rests on the bench, front foot well out; the back knee drops toward the floor.
  'bulgarian-split-squat': (() => {
    const top: Vec = [50, 60];
    const low: Vec = [47, 73];
    const rear: Vec = [29, 76.2];
    return {
      keyframes: [
        { hip: top, torso: 10, armN: [5, 0], armF: [1, 0], legN: legTo(top, [62, FL]), legF: legTo(top, rear, 'down') },
        { hip: low, torso: 18, head: -6, armN: [5, 0], armF: [1, 0], legN: legTo(low, [62, FL]), legF: legTo(low, rear, 'down') },
      ],
      props: [{ kind: 'bench', at: [10, 78], w: 22 }],
      durationMs: 2800,
    } satisfies AnimationDef;
  })(),

  'step-up': (() => {
    const start: Vec = [50, 58];
    const end: Vec = [62, 42];
    return {
      keyframes: [
        { hip: start, torso: 10, armN: [5, 0], armF: [1, 0], legN: legTo(start, [62, 75.2]), legF: legTo(start, [46, FL]) },
        { hip: end, torso: 0, armN: [5, 0], armF: [1, 0], legN: legTo(end, [63, 75.2]), legF: legTo(end, [58, 60]) },
      ],
      props: [{ kind: 'box', at: [56, 76], w: 24 }],
      durationMs: 2800,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // ------------------------------------------------------ push, horizontal
  // Lying on the bench, bar from the chest to straight arms over the shoulders.
  'bench-press': (() => {
    const hip: Vec = [56, 71];
    const legs = feet(hip, 66, 64, 'up');
    return {
      keyframes: [
        { hip, torso: -90, head: 25, armN: [172, 8], armF: [168, 12], ...legs },
        { hip, torso: -90, head: 25, armN: [90, 90], armF: [86, 94], ...legs },
      ],
      props: [
        { kind: 'bench', at: [12, 74], w: 56 },
        { kind: 'barbell', anchor: 'handN' },
      ],
      durationMs: 2800,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  'db-bench-press': (() => {
    const hip: Vec = [56, 71];
    const legs = feet(hip, 66, 64, 'up');
    return {
      keyframes: [
        { hip, torso: -90, head: 25, armN: [174, 6], armF: [170, 10], ...legs },
        { hip, torso: -90, head: 25, armN: [88, 92], armF: [84, 96], ...legs },
      ],
      props: [
        { kind: 'bench', at: [12, 74], w: 56 },
        { kind: 'dumbbell', anchor: 'hands' },
      ],
      durationMs: 2800,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // On the floor: the upper arms stop when the elbows touch down.
  'db-floor-press': (() => {
    const hip: Vec = [52, 89.3];
    const legs = feet(hip, 66, 64, 'up');
    return {
      keyframes: [
        { hip, torso: -90, head: 20, armN: [175, 5], armF: [171, 9], ...legs },
        { hip, torso: -90, head: 20, armN: [95, 85], armF: [91, 89], ...legs },
      ],
      props: [
        { kind: 'mat', at: [8, G], w: 84 },
        { kind: 'dumbbell', anchor: 'hands' },
      ],
      durationMs: 2800,
      hold: 0.1,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // Seated, leaning back against the incline. The bench seat is drawn; the back is the torso line.
  'incline-db-press': (() => {
    const hip: Vec = [44, 76];
    const legs = feet(hip, 60, 58, 'up');
    return {
      keyframes: [
        { hip, torso: -45, head: 10, armN: [135, 0], armF: [131, 4], ...legs },
        { hip, torso: -45, head: 10, armN: [80, 55], armF: [76, 59], ...legs },
      ],
      props: [
        { kind: 'bench', at: [33, 79.2], w: 22 },
        { kind: 'dumbbell', anchor: 'hands' },
      ],
      durationMs: 2800,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // --------------------------------------------------------- push, vertical
  'overhead-press': {
    keyframes: [
      { hip: STAND_HIP, torso: 0, armN: [20, 150], armF: [16, 154], ...STAND_FEET },
      { hip: STAND_HIP, torso: -3, armN: [168, 12], armF: [164, 16], ...STAND_FEET },
    ],
    props: [{ kind: 'barbell', anchor: 'handN' }],
    durationMs: 2800,
  },

  'db-shoulder-press': {
    keyframes: [
      { hip: STAND_HIP, torso: 0, armN: [35, 125], armF: [30, 130], ...STAND_FEET },
      { hip: STAND_HIP, torso: -2, armN: [172, 8], armF: [168, 12], ...STAND_FEET },
    ],
    props: [{ kind: 'dumbbell', anchor: 'hands' }],
    durationMs: 2800,
  },

  // Hips high in an upside-down V; the head goes down between the hands.
  'pike-pushup': (() => {
    const top: Vec = [46, 59.8];
    const low: Vec = [47, 62];
    const legs = (hip: Vec) => ({ legN: legTo(hip, [32.7, FL]), legF: legTo(hip, [33.5, FL]) });
    return {
      keyframes: [
        { hip: top, torso: 105, armN: armTo(top, 105, [69.2, FL], 'back'), armF: armTo(top, 105, [67.5, FL], 'back'), ...legs(top) },
        { hip: low, torso: 127, armN: armTo(low, 127, [69.2, FL], 'back'), armF: armTo(low, 127, [67.5, FL], 'back'), ...legs(low) },
      ],
      durationMs: 2600,
    } satisfies AnimationDef;
  })(),

  // ---------------------------------------------------------- pull, vertical
  // Dead hang to chin at the bar. Hanging, so the figure is placed by hand (grounded: false).
  pullup: (() => {
    const hang: Vec = [46, 63];
    const up: Vec = [44.6, 37.1];
    return {
      keyframes: [
        { hip: hang, torso: 0, armN: armTo(hang, 0, [50, 14], 'back'), armF: armTo(hang, 0, [49, 14], 'back'), legN: [3, 70], legF: [7, 66] },
        { hip: up, torso: -10, head: -20, armN: [25, 135], armF: [20, 140], legN: [8, 78], legF: [12, 74] },
      ],
      props: [{ kind: 'bar', at: [50, 14] }],
      durationMs: 3000,
      hold: 0.1,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  'lat-pulldown': (() => {
    const hip: Vec = [40, 74];
    const legs = { legN: legTo(hip, [58, FL], 'up'), legF: legTo(hip, [55, FL], 'up') };
    return {
      keyframes: [
        { hip, torso: -8, armN: armRel(hip, -8, [11, -22]), armF: armRel(hip, -8, [9, -22]), ...legs },
        { hip, torso: -14, armN: armRel(hip, -14, [8, 3]), armF: armRel(hip, -14, [6, 3]), ...legs },
      ],
      props: [
        { kind: 'bench', at: [28, 77.5], w: 22 },
        { kind: 'cable', at: [52, 3], anchor: 'handN' },
      ],
      durationMs: 2800,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  'band-pulldown': {
    keyframes: [
      { hip: STAND_HIP, torso: 0, armN: armRel(STAND_HIP, 0, [11, -22]), armF: armRel(STAND_HIP, 0, [9, -22]), ...STAND_FEET },
      { hip: STAND_HIP, torso: 2, armN: armRel(STAND_HIP, 2, [7, 3]), armF: armRel(STAND_HIP, 2, [5, 3]), ...STAND_FEET },
    ],
    props: [{ kind: 'band', at: [60, 3], anchor: 'handN' }],
    durationMs: 2800,
  },

  // Face down, arms reaching overhead along the floor; elbows sweep back to the ribs.
  'prone-lat-pull': (() => {
    const hip = PRONE_HIP;
    const legs = { legN: [-90, 0] as [number, number], legF: [-90, 0] as [number, number] };
    const sh = shoulderOf(hip, 72);
    return {
      keyframes: [
        { hip, torso: 90, head: -25, armN: [88, 0], armF: [90, 0], ...legs },
        { hip, torso: 72, head: -25, armN: armTo(hip, 72, [sh[0] + 4, 89], 'up'), armF: armTo(hip, 72, [sh[0] + 2, 89], 'up'), ...legs },
      ],
      props: [{ kind: 'mat', at: [2, G], w: 92 }],
      durationMs: 2800,
      hold: 0.12,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // ------------------------------------------------------ pull, horizontal
  'barbell-row': (() => {
    const hip: Vec = [44, 59];
    const t = 62;
    const legs = feet(hip, 52, 49);
    return {
      keyframes: [
        { hip, torso: t, head: -18, armN: armRel(hip, t, [-3, 24]), armF: armRel(hip, t, [-5, 24]), ...legs },
        { hip, torso: t, head: -18, armN: armRel(hip, t, [-13, 14], 'back'), armF: armRel(hip, t, [-15, 14], 'back'), ...legs },
      ],
      props: [{ kind: 'barbell', anchor: 'handN' }],
      durationMs: 2800,
    } satisfies AnimationDef;
  })(),

  // Free hand braced on the thigh, the working arm rows the dumbbell to the hip.
  'db-row': (() => {
    const hip: Vec = [44, 59];
    const t = 66;
    const legs = feet(hip, 52, 49);
    const brace = armTo(hip, t, [54, 73]);
    return {
      keyframes: [
        { hip, torso: t, head: -20, armN: armRel(hip, t, [-2, 24]), armF: brace, ...legs },
        { hip, torso: t, head: -20, armN: armRel(hip, t, [-13, 14], 'back'), armF: brace, ...legs },
      ],
      props: [{ kind: 'dumbbell', anchor: 'handN' }],
      durationMs: 2600,
    } satisfies AnimationDef;
  })(),

  'cable-row': (() => {
    const hip = SEAT_HIP;
    return {
      keyframes: [
        { hip, torso: 18, head: -10, armN: armRel(hip, 18, [22, 4]), armF: armRel(hip, 18, [21, 5]), ...SEAT_LEGS },
        { hip, torso: -3, armN: armRel(hip, -3, [7, 16], 'back'), armF: armRel(hip, -3, [6, 17], 'back'), ...SEAT_LEGS },
      ],
      props: [
        { kind: 'bench', at: [22, 89.4], w: 16 },
        { kind: 'cable', at: [92, 76], anchor: 'handN' },
      ],
      durationMs: 2800,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // Body hangs under the bar in a straight line, heels on the floor, chest pulls up to the bar.
  'inverted-row': (() => {
    const low: Vec = [43.9, 79.6];
    const top: Vec = [37.3, 68.4];
    const bar: Vec = [66.5, 46];
    return {
      keyframes: [
        { hip: low, torso: 70, armN: armTo(low, 70, bar), armF: armTo(low, 70, [bar[0] - 1, bar[1]]), legN: [-70, 0], legF: [-70, 0] },
        { hip: top, torso: 48, armN: armTo(top, 48, bar), armF: armTo(top, 48, [bar[0] - 1, bar[1]]), legN: [-48, 0], legF: [-48, 0] },
      ],
      props: [{ kind: 'bar', at: bar }],
      durationMs: 2800,
    } satisfies AnimationDef;
  })(),

  'band-row': (() => {
    const hip = SEAT_HIP;
    return {
      keyframes: [
        { hip, torso: 18, head: -10, armN: armRel(hip, 18, [22, 4]), armF: armRel(hip, 18, [21, 5]), ...SEAT_LEGS },
        { hip, torso: -3, armN: armRel(hip, -3, [7, 16], 'back'), armF: armRel(hip, -3, [6, 17], 'back'), ...SEAT_LEGS },
      ],
      props: [
        { kind: 'bench', at: [22, 89.4], w: 16 },
        { kind: 'band', at: [92, 76], anchor: 'handN' },
      ],
      durationMs: 2800,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // Face down, arms long on the floor, lift them into a Y.
  'prone-yt-raise': (() => {
    const hip = PRONE_HIP;
    const legs = { legN: [-90, 0] as [number, number], legF: [-90, 0] as [number, number] };
    return {
      keyframes: [
        { hip, torso: 90, head: -25, armN: [88, 0], armF: [90, 0], ...legs },
        { hip, torso: 80, head: -25, armN: [128, 0], armF: [132, 0], ...legs },
      ],
      props: [{ kind: 'mat', at: [2, G], w: 92 }],
      durationMs: 2800,
      hold: 0.2,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // ------------------------------------------------- arms, shoulders, calves
  'db-curl': {
    keyframes: [
      { hip: STAND_HIP, torso: 0, armN: [4, 0], armF: [-2, 0], ...STAND_FEET },
      { hip: STAND_HIP, torso: 0, armN: [6, 138], armF: [0, 140], ...STAND_FEET },
    ],
    props: [{ kind: 'dumbbell', anchor: 'hands' }],
    durationMs: 2600,
  },

  'band-curl': {
    keyframes: [
      { hip: STAND_HIP, torso: 0, armN: [4, 0], armF: [-2, 0], ...STAND_FEET },
      { hip: STAND_HIP, torso: 0, armN: [6, 138], armF: [0, 140], ...STAND_FEET },
    ],
    props: [{ kind: 'band', at: [52, FL], anchor: 'handN' }],
    durationMs: 2600,
  },

  'triceps-pushdown': {
    keyframes: [
      { hip: STAND_HIP, torso: 6, armN: [2, 107], armF: [-1, 110], ...STAND_FEET },
      { hip: STAND_HIP, torso: 6, armN: [2, -2], armF: [-1, 0], ...STAND_FEET },
    ],
    props: [{ kind: 'cable', at: [58, 4], anchor: 'handN' }],
    durationMs: 2400,
  },

  // Hands on the bench behind, legs out front; elbows bend back and the hips drop.
  'bench-dip': (() => {
    const top: Vec = [35, 73];
    const low: Vec = [35, 88];
    const hand: Vec = [29, 74.5];
    const legs = (hip: Vec) => ({ legN: legTo(hip, [62, FL], 'up'), legF: legTo(hip, [60, FL], 'up') });
    return {
      keyframes: [
        { hip: top, torso: -10, armN: armTo(top, -10, hand, 'back'), armF: armTo(top, -10, [hand[0] + 1, hand[1]], 'back'), ...legs(top) },
        { hip: low, torso: -10, armN: armTo(low, -10, hand, 'back'), armF: armTo(low, -10, [hand[0] + 1, hand[1]], 'back'), ...legs(low) },
      ],
      props: [{ kind: 'bench', at: [8, 76], w: 24 }],
      durationMs: 2600,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // Seen from the side the arms rise forward; sideways is not possible in a flat side view.
  'db-lateral-raise': {
    keyframes: [
      { hip: STAND_HIP, torso: 0, armN: [4, 0], armF: [-2, 0], ...STAND_FEET },
      { hip: STAND_HIP, torso: 0, armN: [84, -8], armF: [80, -6], ...STAND_FEET },
    ],
    props: [{ kind: 'dumbbell', anchor: 'hands' }],
    durationMs: 2600,
  },

  'face-pull': (() => {
    const t = -4;
    const s = shoulderOf(STAND_HIP, t);
    return {
      keyframes: [
        { hip: STAND_HIP, torso: t, armN: armTo(STAND_HIP, t, [s[0] + 25, s[1] - 1]), armF: armTo(STAND_HIP, t, [s[0] + 24, s[1] + 1]), ...STAND_FEET },
        { hip: STAND_HIP, torso: t, armN: armRel(STAND_HIP, t, [9, -7], 'back'), armF: armRel(STAND_HIP, t, [8, -5], 'back'), ...STAND_FEET },
      ],
      props: [{ kind: 'cable', at: [91, 30], anchor: 'handN' }],
      durationMs: 2600,
    } satisfies AnimationDef;
  })(),

  // Arms straight at shoulder height; the near arm swings down and the far arm up to show the spread.
  'band-pull-apart': {
    keyframes: [
      { hip: STAND_HIP, torso: 0, armN: [90, 0], armF: [91, 0], ...STAND_FEET },
      { hip: STAND_HIP, torso: 0, armN: [68, 0], armF: [112, 0], ...STAND_FEET },
    ],
    durationMs: 2400,
  },

  // Standing on a low step so the heel drop and rise reads clearly.
  'calf-raise': (() => {
    const low: Vec = [50, 51.2];
    const high: Vec = [50, 46.4];
    return {
      keyframes: [
        { hip: low, torso: 0, armN: [4, 0], armF: [-3, 0], legN: [0, 0], legF: [-1, 0] },
        { hip: high, torso: 0, armN: [4, 0], armF: [-3, 0], legN: [0, 0], legF: [-1, 0] },
      ],
      props: [{ kind: 'box', at: [38, 86], w: 24, h: 6 }],
      durationMs: 2400,
      hold: 0.14,
      grounded: false,
    } satisfies AnimationDef;
  })(),
};
