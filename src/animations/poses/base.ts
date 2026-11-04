// Animation definitions per animationId. See rig.ts for the angle conventions.
// Add new entries to this map; keep the same rig so every figure shares one style.
import { GROUND, type AnimationDef } from '../rig';

const G = GROUND;

export const BASE_ANIMATIONS: Record<string, AnimationDef> = {
  fallback: {
    keyframes: [
      { hip: [50, 58], torso: 0, armN: [8, 6], armF: [-6, 6], legN: [4, 2], legF: [-4, 2] },
    ],
  },

  // Bodyweight squat: hips back and down, arms reach forward for balance.
  'squat-bodyweight': {
    keyframes: [
      { hip: [48, 58], torso: 2, armN: [10, 4], armF: [6, 4], legN: [3, 2], legF: [-1, 2] },
      { hip: [40, 72], torso: 38, armN: [88, 0], armF: [84, 0], legN: [75, 118], legF: [71, 114] },
    ],
    durationMs: 2600,
  },

  // Push-up: body in a straight line, chest lowers between the hands.
  'pushup': {
    keyframes: [
      { hip: [44, 72], torso: 76, armN: [4, 0], armF: [0, 0], legN: [-76, 0], legF: [-78, 0] },
      { hip: [44, 80], torso: 84, armN: [-42, 80], armF: [-46, 84], legN: [-84, 0], legF: [-86, 0] },
    ],
    durationMs: 2400,
    props: [{ kind: 'mat', at: [12, G], w: 76 }],
  },
};
