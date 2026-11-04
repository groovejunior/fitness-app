// Animations for calisthenics exercises (bars, bench/box, floor work). See rig.ts for angle
// conventions. Poses are built from target points (hip/foot/hand) with a small two-segment
// solver, the same approach as strength.ts.
import { GROUND, SEG, type AnimationDef, type Pose, type Vec } from '../rig';

const FL = GROUND - 0.8; // y of a foot or hand resting on the floor
const G = GROUND;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const pt = (from: Vec, a: number, len: number): Vec => [from[0] + len * Math.sin(rad(a)), from[1] + len * Math.cos(rad(a))];
const r1 = (n: number) => Math.round(n * 10) / 10;

type Side = 'fwd' | 'back' | 'up' | 'down';

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

function legTo(hip: Vec, foot: Vec, side: Side = 'fwd'): [number, number] {
  const [a1, a2] = twoLink(hip, foot, SEG.thigh, SEG.shin, side);
  return [r1(a1), r1(a1 - a2)];
}

const shoulderOf = (hip: Vec, torso: number): Vec => [hip[0] + SEG.torso * Math.sin(rad(torso)), hip[1] - SEG.torso * Math.cos(rad(torso))];

function armTo(hip: Vec, torso: number, hand: Vec, side: Side = 'down'): [number, number] {
  const [a1, a2] = twoLink(shoulderOf(hip, torso), hand, SEG.upperArm, SEG.forearm, side);
  return [r1(a1), r1(a2 - a1)];
}

const BODY = SEG.torso + SEG.thigh + SEG.shin; // shoulder to foot in a straight body line

/**
 * Push-up family. Hands stay planted at `hand`, feet at `footY` height; the body is a straight
 * line that pivots on the feet while the chest drops by `drop`.
 */
function pushup(hand: Vec, footY: number, drop: number, farHand: Vec = [hand[0] - 2, hand[1]], extra: { archer?: boolean } = {}): [Pose, Pose] {
  const sy = hand[1] - 24.8;
  const fx = hand[0] - Math.sqrt(BODY * BODY - (footY - sy) ** 2);
  const foot: Vec = [fx, footY];
  const frame = (S: Vec, far: Vec, farSide: Side): Pose => {
    const d = Math.hypot(foot[0] - S[0], foot[1] - S[1]);
    const u: Vec = [(foot[0] - S[0]) / d, (foot[1] - S[1]) / d];
    const hip: Vec = [S[0] + SEG.torso * u[0], S[1] + SEG.torso * u[1]];
    const torso = deg(Math.atan2(-u[0], u[1]));
    const leg = r1(deg(Math.atan2(u[0], u[1])));
    return {
      hip,
      torso,
      head: -15,
      armN: armTo(hip, torso, hand, 'back'),
      armF: armTo(hip, torso, far, farSide),
      legN: [leg, 0],
      legF: [leg - 2, 0],
    };
  };
  const top = frame([hand[0], sy], farHand, 'back');
  const ny = sy + drop;
  const nx = fx + Math.sqrt(BODY * BODY - (footY - ny) ** 2);
  let farB = farHand;
  if (extra.archer) {
    // straight arm reaching out toward the floor ahead
    const dx = 18;
    const dy = FL - ny;
    const n = Math.hypot(dx, dy);
    farB = [nx + (24.9 * dx) / n, ny + (24.9 * dy) / n];
  }
  const bottom = frame([nx, ny], farB, 'back');
  return [top, bottom];
}

// Hanging from a bar (grounded: false): shared hang pose for the three bar-hang moves.
const BAR_Y = 16;
const HANG_HIP: Vec = [46, 65];

export const CALISTHENICS_ANIMATIONS: Record<string, AnimationDef> = {
  // Palms toward you, narrower grip: elbows stay closer in and the chest rises to the bar.
  'chin-up': (() => {
    const bar: Vec = [50, BAR_Y];
    const topHip: Vec = [46.1, 38.6];
    return {
      keyframes: [
        { hip: HANG_HIP, torso: 0, armN: armTo(HANG_HIP, 0, bar, 'back'), armF: armTo(HANG_HIP, 0, [49, BAR_Y], 'back'), legN: [3, 70], legF: [7, 66] },
        { hip: topHip, torso: -6, head: -20, armN: [12, 150], armF: [8, 154], legN: [8, 78], legF: [12, 74] },
      ],
      props: [{ kind: 'bar', at: bar }],
      durationMs: 3000,
      hold: 0.1,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // Starts with the chin over the bar and lowers slowly to a dead hang.
  'negative-pullup': (() => {
    const bar: Vec = [50, BAR_Y];
    const topHip: Vec = [44.6, 39.1];
    return {
      keyframes: [
        { hip: topHip, torso: -10, head: -20, armN: [25, 135], armF: [20, 140], legN: [8, 78], legF: [12, 74] },
        { hip: HANG_HIP, torso: 0, armN: armTo(HANG_HIP, 0, bar, 'back'), armF: armTo(HANG_HIP, 0, [49, BAR_Y], 'back'), legN: [3, 70], legF: [7, 66] },
      ],
      props: [{ kind: 'bar', at: bar }],
      durationMs: 4400,
      hold: 0.1,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // Same body-under-the-bar row as the inverted row, with the elbows flared high.
  'wide-inverted-row': (() => {
    const low: Vec = [43.9, 79.6];
    const top: Vec = [37.3, 68.4];
    const bar: Vec = [66.5, 46];
    return {
      keyframes: [
        { hip: low, torso: 70, armN: armTo(low, 70, bar, 'up'), armF: [r1(armTo(low, 70, bar, 'up')[0] - 3), armTo(low, 70, bar, 'up')[1]], legN: [-70, 0], legF: [-70, 0] },
        { hip: top, torso: 48, armN: armTo(top, 48, bar, 'up'), armF: [r1(armTo(top, 48, bar, 'up')[0] - 3), armTo(top, 48, bar, 'up')[1]], legN: [-48, 0], legF: [-48, 0] },
      ],
      props: [{ kind: 'bar', at: bar }],
      durationMs: 2800,
    } satisfies AnimationDef;
  })(),

  // Supported between the bars on straight arms; lower until the elbows bend to 90 degrees.
  dip: (() => {
    const hand: Vec = [48, 54];
    const top: Vec = [39.8, 51.8];
    const low: Vec = [32.2, 62.9];
    return {
      keyframes: [
        { hip: top, torso: 20, armN: armTo(top, 20, hand, 'back'), armF: armTo(top, 20, [hand[0] - 1, hand[1]], 'back'), legN: [5, 80], legF: [9, 75] },
        { hip: low, torso: 35, head: -18, armN: armTo(low, 35, hand, 'back'), armF: armTo(low, 35, [hand[0] - 1, hand[1]], 'back'), legN: [5, 80], legF: [9, 75] },
      ],
      props: [{ kind: 'bar', at: [48, 55] }],
      durationMs: 2800,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  'diamond-pushup': (() => {
    const [a, b] = pushup([68, FL], FL, 15, [67, FL]);
    return { keyframes: [a, b], props: [{ kind: 'mat', at: [4, G], w: 90 }], durationMs: 2400 } satisfies AnimationDef;
  })(),

  // Feet up on the bench behind, so the body slopes down toward the hands.
  'decline-pushup': (() => {
    const [a, b] = pushup([70, FL], 76.2, 14);
    return {
      keyframes: [a, b],
      props: [{ kind: 'bench', at: [4, 78], w: 18 }, { kind: 'mat', at: [26, G], w: 66 }],
      durationMs: 2600,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // One arm bends deep while the other stays straight out to the side.
  'archer-pushup': (() => {
    const [a, b] = pushup([62, FL], FL, 17, [61, FL], { archer: true });
    return { keyframes: [a, b], props: [{ kind: 'mat', at: [4, G], w: 90 }], durationMs: 3000 } satisfies AnimationDef;
  })(),

  // Hands on the bench: an easier slope.
  'incline-pushup': (() => {
    const [a, b] = pushup([72, 77], FL, 12, [71, 77]);
    return {
      keyframes: [a, b],
      props: [{ kind: 'bench', at: [62, 78], w: 20 }],
      durationMs: 2400,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // Sit back to the box on one leg, other leg held out front, then stand.
  'box-pistol-squat': (() => {
    const top: Vec = [49, 57.8];
    const low: Vec = [36, 74];
    return {
      keyframes: [
        { hip: top, torso: 2, armN: [20, 0], armF: [16, 0], legN: legTo(top, [50, FL]), legF: [62, 0] },
        { hip: low, torso: 28, head: -10, armN: [88, 0], armF: [84, 0], legN: legTo(low, [50, FL]), legF: [86, 0] },
      ],
      props: [{ kind: 'box', at: [22, 76], w: 22 }],
      durationMs: 3000,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // Wide stance, shift down over one leg while the other stays long. (A side movement, so this
  // flat side view shows the straight leg reaching forward.)
  'cossack-squat': (() => {
    const top: Vec = [57, 59.5];
    const low: Vec = [40, 74];
    return {
      keyframes: [
        { hip: top, torso: 4, armN: [60, 40], armF: [56, 44], legN: legTo(top, [46, FL]), legF: legTo(top, [70, FL]) },
        { hip: low, torso: 20, head: -8, armN: [80, 20], armF: [76, 24], legN: legTo(low, [46, FL]), legF: legTo(low, [70, FL]) },
      ],
      durationMs: 3000,
    } satisfies AnimationDef;
  })(),

  'split-squat': (() => {
    const top: Vec = [45, 61];
    const low: Vec = [45, 74];
    const rear: Vec = [30, 89];
    return {
      keyframes: [
        { hip: top, torso: 3, armN: [5, 0], armF: [1, 0], legN: legTo(top, [60, FL]), legF: legTo(top, rear, 'down') },
        { hip: low, torso: 5, armN: [5, 0], armF: [1, 0], legN: legTo(low, [60, FL]), legF: legTo(low, rear, 'down') },
      ],
      durationMs: 2800,
    } satisfies AnimationDef;
  })(),

  // Glute bridge with one leg held straight in line with the working thigh.
  'single-leg-glute-bridge': (() => {
    const low: Vec = [54, 89.5];
    const top: Vec = [50.2, 76.5];
    const tLow = -90;
    const tTop = -122.8;
    const hand = (hip: Vec, t: number): Vec => [shoulderOf(hip, t)[0] + 22, 90.3];
    const pose = (hip: Vec, t: number, head: number): Pose => {
      const legN = legTo(hip, [68, FL], 'up');
      return { hip, torso: t, head, armN: armTo(hip, t, hand(hip, t), 'up'), armF: armTo(hip, t, [hand(hip, t)[0] - 2, 90.3], 'up'), legN, legF: [legN[0], 0] };
    };
    return {
      keyframes: [pose(low, tLow, 20), pose(top, tTop, 53)],
      props: [{ kind: 'mat', at: [18, G], w: 72 }],
      durationMs: 2800,
      hold: 0.14,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // Hips stay up in a bridge while the heels slide out and back in along the floor.
  'sliding-leg-curl': (() => {
    const hip: Vec = [50.2, 76.5];
    const t = -122.8;
    const sh = shoulderOf(hip, t);
    const hand: Vec = [sh[0] + 22, 90.3];
    const arms = { armN: armTo(hip, t, hand, 'up'), armF: armTo(hip, t, [hand[0] - 2, 90.3], 'up') };
    return {
      keyframes: [
        { hip, torso: t, head: 53, ...arms, legN: legTo(hip, [80.5, FL], 'up'), legF: legTo(hip, [79, FL], 'up') },
        { hip, torso: t, head: 53, ...arms, legN: legTo(hip, [66, FL], 'up'), legF: legTo(hip, [64.5, FL], 'up') },
      ],
      props: [{ kind: 'mat', at: [10, G], w: 84 }],
      durationMs: 3000,
      hold: 0.1,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // Dead hang, then legs swing up straight to horizontal.
  'hanging-leg-raise': (() => {
    const bar: Vec = [50, 8];
    const low: Vec = [46, 57];
    const up: Vec = [47.3, 56.8];
    return {
      keyframes: [
        { hip: low, torso: 0, armN: armTo(low, 0, bar, 'back'), armF: armTo(low, 0, [49, 8], 'back'), legN: [2, 6], legF: [-1, 6] },
        { hip: up, torso: -8, armN: armTo(up, -8, bar, 'back'), armF: armTo(up, -8, [49, 8], 'back'), legN: [86, 4], legF: [84, 4] },
      ],
      props: [{ kind: 'bar', at: bar }],
      durationMs: 3000,
      hold: 0.1,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // Support on the bars with straight arms, legs out in an L. Starts tucked, then extends.
  'l-sit': (() => {
    const hip: Vec = [48, 61];
    const t = -3;
    const hand: Vec = [48, 62];
    const arms = { armN: armTo(hip, t, hand, 'back'), armF: armTo(hip, t, [47, 62], 'back') };
    return {
      keyframes: [
        { hip, torso: t, ...arms, legN: [95, 100], legF: [93, 98] },
        { hip, torso: t, ...arms, legN: [90, 0], legF: [92, 0] },
      ],
      props: [{ kind: 'bar', at: [48, 63] }],
      durationMs: 3000,
      hold: 0.3,
      grounded: false,
    } satisfies AnimationDef;
  })(),

  // Hollow body on the floor, rocking between long and tight.
  'hollow-rock': (() => {
    const hip: Vec = [56, 88.5];
    return {
      keyframes: [
        { hip, torso: -75, armN: [255, 0], armF: [253, 0], legN: [100, 0], legF: [102, 0] },
        { hip, torso: -55, armN: [80, 0], armF: [78, 0], legN: [125, 0], legF: [127, 0] },
      ],
      props: [{ kind: 'mat', at: [10, G], w: 80 }],
      durationMs: 2000,
      hold: 0.05,
      grounded: false,
    } satisfies AnimationDef;
  })(),
};
