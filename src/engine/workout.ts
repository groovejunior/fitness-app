import { EXERCISES, getExercise, isAvailable } from '../content/exercises';
import { buildGymWorkout, prescribe, type Role, type WorkoutRequest } from './gym';
import { buildMobilityWorkout, buildSportWorkout } from './other';
import { suggestLoad } from './progression';
import { buildRunWorkout } from './run';
import type { EquipmentContext, Exercise, History, Phase, Profile, Workout, WorkoutItem } from './types';

export interface WorkoutResult {
  recommended: Workout;
  alternative: Workout;
}

export function buildWorkouts(req: WorkoutRequest): WorkoutResult {
  const make = (v: 'recommended' | 'alternative') => {
    switch (req.slot.type) {
      case 'gym':
        return buildGymWorkout(req, v);
      case 'run':
        return buildRunWorkout(req, v);
      case 'sport':
        return buildSportWorkout(req, v);
      case 'mobility':
        return buildMobilityWorkout(req, v);
    }
  };
  return { recommended: make('recommended'), alternative: make('alternative') };
}

/**
 * Exercises that can replace this one with the given equipment: same slot first
 * (listed substitutions in order), then the same coarse movement pattern.
 */
export function substitutes(exerciseId: string, ctx: EquipmentContext): Exercise[] {
  const ex = getExercise(exerciseId);
  const ok = (e: Exercise) => e.id !== ex.id && isAvailable(e, ctx);
  const listed = ex.substitutions.map(getExercise).filter(ok);
  const sameSlot = EXERCISES.filter((e) => e.slot === ex.slot && ok(e) && !listed.includes(e));
  const samePattern = EXERCISES.filter((e) => e.pattern === ex.pattern && e.slot !== ex.slot && ok(e) && !listed.includes(e) && e.slot !== 'warmup' && e.slot !== 'mobility');
  return [...listed, ...sameSlot, ...samePattern];
}

function roleOfItem(item: WorkoutItem): Role {
  const kind = item.id.split('-')[0];
  if (kind === 'main') return 'main';
  if (kind === 'core') return 'core';
  if (kind === 'finisher' || kind === 'conditioning') return 'finisher';
  return 'accessory';
}

/** Replace one exercise in a workout, keeping its place, set count and rest. */
export function swapExercise(workout: Workout, itemId: string, newExerciseId: string, ctx: { profile: Profile; history: History; phase: Phase }): Workout {
  const next = getExercise(newExerciseId);
  return {
    ...workout,
    sections: workout.sections.map((sec) => ({
      ...sec,
      items: sec.items.map((it) => {
        if (it.id !== itemId) return it;
        const old = getExercise(it.exerciseId);
        const prep = sec.kind === 'warmup' || sec.kind === 'cooldown' || sec.kind === 'prep';
        let repsMin = it.repsMin;
        let repsMax = it.repsMax;
        if (old.unit !== next.unit || old.loaded !== next.loaded) {
          if (prep) {
            const sec2 = next.unit === 'sec' || next.unit === 'secPerSide';
            repsMin = sec2 ? 30 : next.unit === 'repsPerSide' ? 5 : 8;
            repsMax = sec2 ? 45 : next.unit === 'repsPerSide' ? 6 : 10;
          } else {
            const rx = prescribe(next, roleOfItem(it), ctx.profile, workout.intensity, ctx.phase);
            repsMin = rx.repsMin;
            repsMax = rx.repsMax;
          }
        }
        const load = prep ? { kg: null, note: '' } : suggestLoad(next, repsMin, repsMax, ctx.history, ctx.phase);
        return { ...it, id: it.id.replace(it.exerciseId, next.id), exerciseId: next.id, repsMin, repsMax, targetKg: load.kg, note: load.note || undefined };
      }),
    })),
  };
}
