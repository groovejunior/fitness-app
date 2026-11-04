import type { AnimationDef } from '../rig';
import { BASE_ANIMATIONS } from './base';
import { STRENGTH_ANIMATIONS } from './strength';
import { CONDITIONING_ANIMATIONS } from './conditioning';
import { CALISTHENICS_ANIMATIONS } from './calisthenics';

export const ANIMATIONS: Record<string, AnimationDef> = {
  ...BASE_ANIMATIONS,
  ...STRENGTH_ANIMATIONS,
  ...CALISTHENICS_ANIMATIONS,
  ...CONDITIONING_ANIMATIONS,
};
