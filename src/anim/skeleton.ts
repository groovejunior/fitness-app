import type { Clip, Joint, Pose, Vec } from './types';

export const SEGMENTS = {
  torso: 26,
  neck: 8,
  headR: 5,
  upperArm: 15,
  forearm: 14,
  thigh: 21,
  shin: 20,
  foot: 7,
  /** Front view only: half shoulder width and half hip width. */
  shoulderHalf: 7,
  hipHalf: 4.5,
};

/** Feet rest at this y (ankle and toe). The ground line is drawn just below. */
export const GROUND_Y = 92;

const rad = (d: number) => (d * Math.PI) / 180;
export const dir = (deg: number): Vec => [Math.sin(rad(deg)), Math.cos(rad(deg))];
const add = (a: Vec, b: Vec, k = 1): Vec => [a[0] + b[0] * k, a[1] + b[1] * k];

export type Joints = Record<Joint, Vec> & { shoulderNear: Vec; shoulderFar: Vec; hipNear: Vec; hipFar: Vec };

/** Forward kinematics from a hip position. */
export function solve(p: Pose, hip: Vec, view: 'side' | 'front' = 'side'): Joints {
  const neck = add(hip, dir(p.torso), SEGMENTS.torso);
  const head = add(neck, dir(p.head ?? p.torso), SEGMENTS.neck);
  const front = view === 'front';
  const shoulderNear: Vec = front ? [neck[0] + SEGMENTS.shoulderHalf, neck[1] + 1] : neck;
  const shoulderFar: Vec = front ? [neck[0] - SEGMENTS.shoulderHalf, neck[1] + 1] : neck;
  const hipNear: Vec = front ? [hip[0] + SEGMENTS.hipHalf, hip[1]] : hip;
  const hipFar: Vec = front ? [hip[0] - SEGMENTS.hipHalf, hip[1]] : hip;
  const armFar = p.armFar ?? p.armNear;
  const legFar = p.legFar ?? p.legNear;
  const elbowNear = add(shoulderNear, dir(p.armNear[0]), SEGMENTS.upperArm);
  const wristNear = add(elbowNear, dir(p.armNear[1]), SEGMENTS.forearm);
  const elbowFar = add(shoulderFar, dir(armFar[0]), SEGMENTS.upperArm);
  const wristFar = add(elbowFar, dir(armFar[1]), SEGMENTS.forearm);
  const kneeNear = add(hipNear, dir(p.legNear[0]), SEGMENTS.thigh);
  const ankleNear = add(kneeNear, dir(p.legNear[1]), SEGMENTS.shin);
  const toeNear = add(ankleNear, dir(p.footNear ?? 90), SEGMENTS.foot);
  const kneeFar = add(hipFar, dir(legFar[0]), SEGMENTS.thigh);
  const ankleFar = add(kneeFar, dir(legFar[1]), SEGMENTS.shin);
  const toeFar = add(ankleFar, dir(p.footFar ?? p.footNear ?? 90), SEGMENTS.foot);
  return { hip, neck, head, elbowNear, wristNear, elbowFar, wristFar, kneeNear, ankleNear, toeNear, kneeFar, ankleFar, toeFar, shoulderNear, shoulderFar, hipNear, hipFar };
}

/** Solve a pose so the clip's anchor joint lands on the anchor point. */
export function solveAnchored(clip: Clip, p: Pose): Joints {
  const view = clip.view ?? 'side';
  if (clip.anchor.joint === 'hip') return solve(p, p.hip ?? clip.anchor.at, view);
  const probe = solve(p, [0, 0], view);
  const j = probe[clip.anchor.joint];
  return solve(p, [clip.anchor.at[0] - j[0], clip.anchor.at[1] - j[1]], view);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp2 = (a: [number, number], b: [number, number], t: number): [number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

export function blend(a: Pose, b: Pose, t: number): Pose {
  return {
    hip: a.hip && b.hip ? lerp2(a.hip, b.hip, t) : (a.hip ?? b.hip),
    torso: lerp(a.torso, b.torso, t),
    head: lerp(a.head ?? a.torso, b.head ?? b.torso, t),
    armNear: lerp2(a.armNear, b.armNear, t),
    armFar: lerp2(a.armFar ?? a.armNear, b.armFar ?? b.armNear, t),
    legNear: lerp2(a.legNear, b.legNear, t),
    legFar: lerp2(a.legFar ?? a.legNear, b.legFar ?? b.legNear, t),
    footNear: lerp(a.footNear ?? 90, b.footNear ?? 90, t),
    footFar: lerp(a.footFar ?? a.footNear ?? 90, b.footFar ?? b.footNear ?? 90, t),
  };
}

const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);

interface Segment {
  from: number;
  to: number;
  start: number;
  hold: number;
  move: number;
}

/** Build the timeline once; returns total duration and a sampler. */
export function timeline(clip: Clip): { duration: number; at: (ms: number) => Pose } {
  const k = clip.keyframes;
  const order: number[] = [];
  if (k.length === 1) order.push(0);
  else if ((clip.loop ?? 'pingpong') === 'pingpong') {
    for (let i = 0; i < k.length; i++) order.push(i);
    for (let i = k.length - 2; i >= 1; i--) order.push(i);
  } else for (let i = 0; i < k.length; i++) order.push(i);
  const segs: Segment[] = [];
  let t = 0;
  for (let i = 0; i < order.length; i++) {
    const from = order[i];
    const to = order[(i + 1) % order.length];
    const hold = k[from].hold ?? 300;
    const move = (clip.loop ?? 'pingpong') === 'pingpong' && i >= k.length - 1 ? (k[to].move ?? 900) : (k[from].move ?? 900);
    segs.push({ from, to, start: t, hold, move });
    t += hold + move;
  }
  const duration = Math.max(1, t);
  return {
    duration,
    at(ms: number) {
      const m = ((ms % duration) + duration) % duration;
      const s = segs.find((x) => m < x.start + x.hold + x.move) ?? segs[segs.length - 1];
      const local = m - s.start;
      if (local <= s.hold || s.move === 0) return k[s.from].pose;
      return blend(k[s.from].pose, k[s.to].pose, ease((local - s.hold) / s.move));
    },
  };
}
