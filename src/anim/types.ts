/**
 * Line-art figure animation format.
 *
 * Coordinates: 100 x 100 box, y grows downward. Feet on the floor sit at y = 92 (ground line drawn just below).
 * Angles in degrees, absolute (not relative to the parent limb):
 *   0 = pointing straight down, 90 = pointing forward (to the right, the way the figure faces),
 *   180 = straight up, -90 (or 270) = pointing backward (to the left).
 * Segment lengths are fixed (see SEGMENTS), so poses only describe angles.
 */
export type Vec = [number, number];

export interface Pose {
  /** Hip position. Only used when the clip anchor is 'hip'; otherwise computed from the anchor. */
  hip?: Vec;
  /** Hip -> shoulder direction. Standing upright = 180. */
  torso: number;
  /** Shoulder -> head direction. Defaults to `torso`. */
  head?: number;
  /** [upper arm, forearm] */
  armNear: [number, number];
  armFar?: [number, number];
  /** [thigh, shin] */
  legNear: [number, number];
  legFar?: [number, number];
  /** Ankle -> toe direction. Defaults to 90 (flat foot pointing forward). */
  footNear?: number;
  footFar?: number;
}

export type Joint =
  | 'hip'
  | 'neck'
  | 'head'
  | 'elbowNear'
  | 'wristNear'
  | 'elbowFar'
  | 'wristFar'
  | 'kneeNear'
  | 'ankleNear'
  | 'toeNear'
  | 'kneeFar'
  | 'ankleFar'
  | 'toeFar';

export type Prop =
  /** End-on barbell plate at a joint (usually a wrist, or the neck for a back squat). */
  | { kind: 'barbell'; at: Joint; offset?: Vec }
  /** Small dumbbell end at a joint. */
  | { kind: 'dumbbell'; at: Joint; offset?: Vec }
  /** Kettlebell hanging from a joint. */
  | { kind: 'kettlebell'; at: Joint; offset?: Vec }
  /** Static flat bench: top surface from x1 to x2 at height y. */
  | { kind: 'bench'; x1: number; x2: number; y: number }
  /** Static box/step: x, top y, width (bottom is the ground). */
  | { kind: 'box'; x: number; y: number; w: number }
  /** Static bar seen end-on (pull-up bar, dip bar, low bar). */
  | { kind: 'bar'; at: Vec }
  /** Elastic band from a fixed point to a joint. */
  | { kind: 'band'; from: Vec; to: Joint }
  /** Cable from a pulley point to a joint. */
  | { kind: 'cable'; from: Vec; to: Joint };

export interface Keyframe {
  pose: Pose;
  /** ms to stay on this pose. Default 300. */
  hold?: number;
  /** ms to move from this pose to the next. Default 900. */
  move?: number;
}

export interface Clip {
  id: string;
  /** 'side' (default): near limbs solid, far limbs faint. 'front': both sides solid, shoulders and hips get width. */
  view?: 'side' | 'front';
  /** Joint kept fixed at `at` throughout the movement. 'hip' means use pose.hip. */
  anchor: { joint: Joint; at: Vec };
  keyframes: Keyframe[];
  /** 'pingpong' plays 0..n then back; 'loop' plays 0..n then jumps back via keyframe n's move. Default pingpong. */
  loop?: 'pingpong' | 'loop';
  props?: Prop[];
  /** Keyframe index to show when not animating (thumbnails, reduced motion). Default: last keyframe. */
  still?: number;
}
