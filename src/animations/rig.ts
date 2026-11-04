// A tiny 2D stick-figure rig. Every exercise animation is a set of poses for this
// one figure, which is what keeps all illustrations in the same line-art style.
//
// Coordinate system: viewBox 0 0 100 100, y grows downwards, the figure faces +x
// (to the right). Ground line is at y = GROUND.
//
// Angles are in degrees and are ABSOLUTE (world space):
//   limbs:  0 = pointing straight down, 90 = pointing forward (+x),
//           180 = straight up, -90 = pointing backward (-x).
//   torso:  0 = upright (shoulders straight above hips), 90 = leaning fully
//           forward (shoulders in front of hips, horizontal), -90 = lying back.
// Elbow / knee values are bends relative to the upper segment:
//   elbow:  forearm angle = upperArm + elbow   (positive bends the hand forward/up)
//   knee:   shin angle    = thigh - knee       (positive bends the foot backward)
//
// Handy rules:
//   - A straight body line (plank, push-up top): legs = -torso, knee 0.
//   - Arms hanging: armN ≈ [0..10, 0..10]. Arms overhead: [170..180, 0].
//   - Hands at the chest in a front squat / press start: upperArm ≈ 30–60, elbow ≈ 110–140.
//   - With grounded (default) you do not need to get hip.y exact; only x and angles matter.

export const GROUND = 92;

export const SEG = {
  torso: 24,
  neck: 3,
  head: 5.2,
  upperArm: 13,
  forearm: 12,
  thigh: 17,
  shin: 17,
} as const;

export type Vec = [number, number];

export interface Pose {
  /** Hip joint position. */
  hip: Vec;
  torso: number;
  /** Head tilt relative to torso. Default 0. */
  head?: number;
  /** [upperArm angle, elbow bend] near side. */
  armN: [number, number];
  /** Far side arm (drawn fainter). */
  armF: [number, number];
  /** [thigh angle, knee bend] near side. */
  legN: [number, number];
  legF: [number, number];
}

export type PropKind =
  | 'barbell' // bar seen end-on: a plate circle + short bar, at an anchor
  | 'dumbbell'
  | 'kettlebell'
  | 'plate'
  | 'bench' // static, flat bench: at = left end of pad, w = length
  | 'box' // static: at = top-left corner, w = width, h = height
  | 'bar' // static pull-up bar: at = centre
  | 'cable' // line from `at` (pulley) to the anchor (hand)
  | 'band' // dashed line from `at` to the anchor (hand)
  | 'mat'; // static floor mat: at = left end, w = length

export type Anchor = 'handN' | 'handF' | 'hands' | 'shoulder' | 'hip' | 'footN' | 'footF';

export interface Prop {
  kind: PropKind;
  /** Moving props follow a body anchor. */
  anchor?: Anchor;
  /** Static props, or the fixed end of cable/band. */
  at?: Vec;
  w?: number;
  h?: number;
}

export interface AnimationDef {
  /** Usually 2 poses (start, end). The loop plays 0 → 1 → … → n-1 → … → 0. */
  keyframes: Pose[];
  props?: Prop[];
  /** Milliseconds for one full rep (there and back). Default 2400. */
  durationMs?: number;
  /** Hold the end pose a moment (isometric exercises, pauses). 0–0.4 of the cycle. */
  hold?: number;
  /**
   * Default true: each frame is shifted vertically so the lowest body point touches the
   * ground. Set false for hanging (pull-up) or when you place the hip exactly yourself.
   */
  grounded?: boolean;
}

export interface Skeleton {
  hip: Vec;
  shoulder: Vec;
  neck: Vec;
  headC: Vec;
  elbowN: Vec;
  handN: Vec;
  elbowF: Vec;
  handF: Vec;
  kneeN: Vec;
  footN: Vec;
  kneeF: Vec;
  footF: Vec;
}

const rad = (d: number) => (d * Math.PI) / 180;

/** Point at distance `len` from `from`, along a limb angle (0 = down, 90 = forward). */
function limb(from: Vec, angle: number, len: number): Vec {
  return [from[0] + len * Math.sin(rad(angle)), from[1] + len * Math.cos(rad(angle))];
}

/** Shift a skeleton vertically so its lowest point sits on the ground line. */
export function groundSkeleton(s: Skeleton): Skeleton {
  const ys = [s.hip, s.shoulder, s.elbowN, s.handN, s.elbowF, s.handF, s.kneeN, s.footN, s.kneeF, s.footF].map((v) => v[1]);
  const lowest = Math.max(...ys, s.headC[1] + SEG.head);
  const dy = GROUND - lowest - 0.8;
  const out = {} as Skeleton;
  for (const k of Object.keys(s) as (keyof Skeleton)[]) out[k] = [s[k][0], s[k][1] + dy];
  return out;
}

export function solve(p: Pose): Skeleton {
  const hip = p.hip;
  // torso: 0 = up. Reuse limb() with angle 180 - torso (180 = up, lean forward → +x).
  const shoulder = limb(hip, 180 - p.torso, SEG.torso);
  const headAngle = 180 - p.torso - (p.head ?? 0);
  const neck = limb(shoulder, headAngle, SEG.neck);
  const headC = limb(neck, headAngle, SEG.head);

  const elbowN = limb(shoulder, p.armN[0], SEG.upperArm);
  const handN = limb(elbowN, p.armN[0] + p.armN[1], SEG.forearm);
  const elbowF = limb(shoulder, p.armF[0], SEG.upperArm);
  const handF = limb(elbowF, p.armF[0] + p.armF[1], SEG.forearm);

  const kneeN = limb(hip, p.legN[0], SEG.thigh);
  const footN = limb(kneeN, p.legN[0] - p.legN[1], SEG.shin);
  const kneeF = limb(hip, p.legF[0], SEG.thigh);
  const footF = limb(kneeF, p.legF[0] - p.legF[1], SEG.shin);

  return { hip, shoulder, neck, headC, elbowN, handN, elbowF, handF, kneeN, footN, kneeF, footF };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpV = (a: Vec, b: Vec, t: number): Vec => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const lerp2 = (a: [number, number], b: [number, number], t: number): [number, number] => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
];

export function blend(a: Pose, b: Pose, t: number): Pose {
  return {
    hip: lerpV(a.hip, b.hip, t),
    torso: lerp(a.torso, b.torso, t),
    head: lerp(a.head ?? 0, b.head ?? 0, t),
    armN: lerp2(a.armN, b.armN, t),
    armF: lerp2(a.armF, b.armF, t),
    legN: lerp2(a.legN, b.legN, t),
    legF: lerp2(a.legF, b.legF, t),
  };
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * Pose at a point of the cycle. phase 0..1. Plays forward through keyframes then back,
 * with an optional hold at the far end.
 */
export function poseAt(def: AnimationDef, phase: number): Pose {
  const kf = def.keyframes;
  if (kf.length === 1) return kf[0];
  const hold = Math.min(Math.max(def.hold ?? 0.08, 0), 0.4);
  const move = (1 - hold * 2) / 2; // forward and back movement portions
  let t: number; // 0..1 along the keyframe path
  const p = ((phase % 1) + 1) % 1;
  if (p < hold) t = 0;
  else if (p < hold + move) t = (p - hold) / move;
  else if (p < hold * 2 + move) t = 1;
  else t = 1 - (p - hold * 2 - move) / move;
  const segs = kf.length - 1;
  const x = easeInOut(t) * segs;
  const i = Math.min(Math.floor(x), segs - 1);
  return blend(kf[i], kf[i + 1], x - i);
}

/** Standing neutral pose, handy as a base for authoring. */
export const STAND: Pose = {
  hip: [50, 58],
  torso: 0,
  armN: [8, 6],
  armF: [-6, 6],
  legN: [4, 2],
  legF: [-4, 2],
};
