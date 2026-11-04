import { EXERCISE_BY_ID } from '../content/exercises';
import type { Exercise, ExercisePerformance, History, Phase } from './types';

/** Epley estimated one-rep max. */
export function e1rm(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function roundTo(x: number, step: number): number {
  return Math.round(x / step) * step;
}

export function floorTo(x: number, step: number): number {
  return Math.floor(x / step + 1e-9) * step;
}

export function performancesFor(history: History, exerciseId: string): ExercisePerformance[] {
  return history.exercises
    .filter((p) => p.exerciseId === exerciseId && p.sets.some((s) => s.done))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export interface LoadSuggestion {
  kg: number | null;
  note: string;
  /** For bodyweight work: the rep target to aim for. */
  aimReps?: number;
  /** Bodyweight work at the top of its range: id of the harder variation to move to. */
  harder?: string;
}

function topWeight(p: ExercisePerformance): number | null {
  const ws = p.sets.filter((s) => s.done && s.weightKg !== null).map((s) => s.weightKg as number);
  return ws.length ? Math.max(...ws) : null;
}

function hitTop(p: ExercisePerformance, w: number | null): boolean {
  const atW = p.sets.filter((s) => s.done && (w === null || s.weightKg === w));
  return atW.length > 0 && p.sets.every((s) => s.done) && atW.every((s) => s.reps >= p.repsMax);
}

function missed(p: ExercisePerformance): boolean {
  return p.sets.some((s) => !s.done || s.reps < p.repsMin);
}

/**
 * Double progression. Work inside the rep range at one weight; when every set reaches the top
 * of the range, add the smallest increment and start again at the bottom.
 */
export function suggestLoad(ex: Exercise, repsMin: number, repsMax: number, history: History, phase: Phase): LoadSuggestion {
  const perf = performancesFor(history, ex.id);
  const last = perf[0];
  if (!ex.loaded) {
    if (!last) return { kg: null, note: '' };
    const best = Math.max(...last.sets.filter((s) => s.done).map((s) => s.reps));
    if (hitTop(last, null)) {
      const next = ex.harder ? EXERCISE_BY_ID[ex.harder] : undefined;
      return next
        ? { kg: null, note: `You hit ${best} on every set last time. Ready for ${next.name.toLowerCase()}: swap to it.`, aimReps: repsMax, harder: next.id }
        : { kg: null, note: `You hit ${best} last time. Slow the lowering to make it harder.`, aimReps: repsMax };
    }
    return { kg: null, note: `Last time: best set ${best}. Beat it by one.`, aimReps: Math.min(repsMax, best + 1) };
  }
  if (!last) return { kg: null, note: 'First time: pick a weight you could lift 2–3 more times.' };
  const w = topWeight(last);
  if (w === null) return { kg: null, note: 'Pick a weight you could lift 2–3 more times.' };
  const inc = ex.increment ?? 2.5;

  if (phase === 'deload') {
    const kg = Math.max(inc, floorTo(w * 0.9, inc));
    return { kg, note: `Deload: ${kg} kg, stop well short of failure.` };
  }

  // Rep range moved a lot (e.g. peak week): convert through estimated 1RM.
  const lastMid = (last.repsMin + last.repsMax) / 2;
  const mid = (repsMin + repsMax) / 2;
  if (Math.abs(lastMid - mid) >= 3) {
    const best = Math.max(...last.sets.filter((s) => s.done && s.weightKg === w).map((s) => e1rm(w, s.reps)));
    const kg = Math.max(inc, floorTo(best / (1 + (repsMax + 1) / 30), inc));
    return { kg, note: `${kg} kg for ${repsMin}–${repsMax}, based on your last ${w} kg.` };
  }

  if (hitTop(last, w)) {
    const kg = w + inc;
    return { kg, note: `Up ${inc} kg. You hit ${last.repsMax} on every set last time.` };
  }
  if (missed(last)) {
    const prev = perf[1];
    if (prev && topWeight(prev) === w && missed(prev)) {
      const kg = Math.max(inc, floorTo(w * 0.9, inc));
      return { kg, note: `Down to ${kg} kg to rebuild. Two tough sessions in a row at ${w} kg.` };
    }
    return { kg: w, note: `Same ${w} kg. Aim to get every set to ${repsMin}+.` };
  }
  return { kg: w, note: `Same ${w} kg. Add a rep or two per set.` };
}

/** Best estimated 1RM in one performance. */
export function bestE1rm(p: ExercisePerformance): number {
  return Math.max(0, ...p.sets.filter((s) => s.done && s.weightKg).map((s) => e1rm(s.weightKg as number, s.reps)));
}
