import type { Exercise } from '../types';
import { STRENGTH_EXERCISES } from './strength';
import { CONDITIONING_EXERCISES } from './conditioning';

export const EXERCISES: Exercise[] = [...STRENGTH_EXERCISES, ...CONDITIONING_EXERCISES];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise {
  const e = BY_ID.get(id);
  if (!e) throw new Error(`Unknown exercise: ${id}`);
  return e;
}

export function findExercise(id: string): Exercise | undefined {
  return BY_ID.get(id);
}
