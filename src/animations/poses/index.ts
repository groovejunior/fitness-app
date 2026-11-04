import type { AnimationDef } from '../rig';
import { BASE_ANIMATIONS } from './base';
import { STRENGTH_ANIMATIONS } from './strength';
import { CONDITIONING_ANIMATIONS } from './conditioning';

export const ANIMATIONS: Record<string, AnimationDef> = {
  ...BASE_ANIMATIONS,
  ...STRENGTH_ANIMATIONS,
  ...CONDITIONING_ANIMATIONS,
};
