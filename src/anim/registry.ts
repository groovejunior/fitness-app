import type { Clip } from './types';
import { backSquat, jumpingJack, pushUp } from './poses/reference';

const modules = import.meta.glob<Record<string, Clip>>('./poses/*.ts', { eager: true });

const CLIPS: Record<string, Clip> = {};
for (const mod of Object.values(modules)) {
  for (const value of Object.values(mod)) {
    if (value && typeof value === 'object' && 'keyframes' in value && 'id' in value) CLIPS[(value as Clip).id] = value as Clip;
  }
}
// Make sure the references are present even if the glob is not available (tests).
CLIPS[backSquat.id] ??= backSquat;
CLIPS[pushUp.id] ??= pushUp;
CLIPS[jumpingJack.id] ??= jumpingJack;

export function getClip(id: string): Clip | undefined {
  return CLIPS[id];
}

export function allClipIds(): string[] {
  return Object.keys(CLIPS).sort();
}
