// Progressive overload: double progression (ACSM 2009).
// Work inside a rep range. When every working set hits the top, add load.
// The step is about 2–10% (the usual plate jump when that sits inside the range).
// Stop with reps in reserve. Grinding to failure is not the rule.
// A harder bodyweight variation (Kotarsky 2018) is offered once every set tops out.
import { findExercise } from './library';
import type { Exercise, History, ISODate, RepTarget, SetLog, WeekPhase } from './types';

export interface LoadSuggestion {
  weightKg?: number;
  /** Reps to pre-fill for each set. */
  reps?: number;
  /** Plain explanation, e.g. "You hit 3×10 last time, so add 2.5 kg." */
  reason: string;
  last?: { date: ISODate; summary: string };
  /** Every set hit the top of a bodyweight range, and this is not a lighter week. */
  readyForHarder?: boolean;
}

/**
 * Harder bodyweight variations of the same movement pattern.
 * Loaded lifts are never the next step: a push-up does not become a bench press on its own.
 * Split squat is a lunge, so a squat does not step into it.
 */
const HARDER_BODYWEIGHT: Record<string, readonly string[]> = {
  'incline-pushup': ['pushup'],
  pushup: ['decline-pushup', 'diamond-pushup'],
  'decline-pushup': ['archer-pushup'],
  'diamond-pushup': ['archer-pushup'],
  'negative-pullup': ['pullup', 'chin-up'],
  'inverted-row': ['wide-inverted-row'],
  'bodyweight-squat': ['box-pistol-squat'],
  'split-squat': ['bulgarian-split-squat'],
  'glute-bridge': ['single-leg-glute-bridge'],
  'bench-dip': ['dip'],
};

/** Next bodyweight variation the person can actually do, if one exists. */
export function nextBodyweight(id: string, ok: (e: Exercise) => boolean): Exercise | undefined {
  const current = findExercise(id);
  if (!current || current.load !== 'bodyweight') return undefined;
  for (const nextId of HARDER_BODYWEIGHT[id] ?? []) {
    const e = findExercise(nextId);
    if (!e || e.load !== 'bodyweight' || e.pattern !== current.pattern) continue;
    if (ok(e)) return e;
  }
  return undefined;
}

/** Epley estimate of a one-rep max. */
export function e1rm(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** Plate jumps, largest first. The largest one inside 2–10% is the step we take. */
function jumps(e: Exercise): number[] {
  const lower = e.pattern === 'squat' || e.pattern === 'hinge' || e.pattern === 'lunge';
  if (e.equipment.includes('barbell')) return lower ? [5, 2.5] : [2.5, 1.25];
  if (e.equipment.includes('kettlebell')) return [4, 2];
  if (e.equipment.includes('dumbbell')) return [2, 1];
  return [2.5, 1.25];
}

function roundTo(e: Exercise, kg: number): number {
  const step = jumps(e).at(-1)!;
  const units = Math.round(kg / step);
  return Math.max(step, Math.round(units * step * 4) / 4);
}

function kgText(n: number): string {
  const r = Math.round(n * 4) / 4;
  return String(r);
}

/**
 * Kilograms to add. Prefer the usual (largest) jump when it is inside 2–10%.
 * If that jump is over 10%, take the largest smaller jump that still fits.
 * If even the small jump is over 10%, add nothing.
 * If one jump is under 2% (a very heavy bar), take that one jump anyway.
 */
function addedKg(e: Exercise, w: number): { kg: number; tooBig: boolean } {
  const options = jumps(e);
  const pct = (jump: number) => jump / w;
  const fits = (jump: number) => pct(jump) >= 0.02 - 1e-9 && pct(jump) <= 0.1 + 1e-9;
  const standard = options[0];
  if (fits(standard) || pct(standard) < 0.02) return { kg: standard, tooBig: false };
  const smaller = options.filter(fits);
  if (smaller.length) return { kg: Math.max(...smaller), tooBig: false };
  return { kg: 0, tooBig: true };
}

/** Sets of the most recent session in which this exercise was done. */
export function lastSessionSets(exerciseId: string, sets: SetLog[], before?: ISODate): SetLog[] {
  const mine = sets.filter((s) => s.exerciseId === exerciseId && s.done && (!before || s.date < before));
  if (mine.length === 0) return [];
  const lastDate = mine.reduce((m, s) => (s.date > m ? s.date : m), mine[0].date);
  const lastSession = mine.filter((s) => s.date === lastDate).map((s) => s.sessionId);
  const sid = lastSession[lastSession.length - 1];
  return mine.filter((s) => s.sessionId === sid).sort((a, b) => a.setIndex - b.setIndex);
}

function summarise(sets: SetLog[], e: Exercise): string {
  if (e.load === 'timed') return sets.map((s) => `${s.timeSec ?? 0}s`).join(', ');
  const reps = sets.map((s) => s.reps ?? 0).join(', ');
  const w = Math.max(...sets.map((s) => s.weightKg ?? 0));
  return w > 0 ? `${w} kg × ${reps}` : `${reps} reps`;
}

export function suggestLoad(
  e: Exercise,
  target: RepTarget,
  history: History,
  opts: { phase?: WeekPhase; before?: ISODate } = {},
): LoadSuggestion {
  const last = lastSessionSets(e.id, history.sets, opts.before);
  const deload = opts.phase === 'deload';

  if (last.length === 0) {
    if (e.load === 'weighted') {
      return {
        reps: target.kind === 'reps' ? target.max : undefined,
        reason: 'First time: pick a weight you could lift 2–3 more reps with. Stop before form breaks.',
      };
    }
    return { reps: target.kind === 'reps' ? target.max : undefined, reason: 'First time: smooth, controlled reps. Stop before form breaks.' };
  }

  const lastInfo = { date: last[0].date, summary: summarise(last, e) };

  if (target.kind === 'time') {
    return { reason: 'Hold steady. Stop when form slips.', last: lastInfo };
  }

  if (e.load !== 'weighted') {
    const repsList = last.map((s) => s.reps ?? 0);
    const best = Math.max(...repsList);
    const allTop = repsList.length >= 2 && repsList.every((r) => r >= target.max);
    const reps = deload ? target.min : Math.min(best + 1, target.max);
    const reason = deload
      ? 'Lighter week: fewer reps, smooth and easy.'
      : allTop
        ? 'You hit the top of the range. Slow the lowering. Stop before form breaks.'
        : best >= target.max
          ? `Last best was ${best}. Get every set there.`
          : `Last best was ${best}. Aim for ${reps}.`;
    return {
      reps,
      reason,
      last: lastInfo,
      ...(allTop && !deload ? { readyForHarder: true as const } : {}),
    };
  }

  const weighted = last.filter((s) => (s.weightKg ?? 0) > 0);
  if (weighted.length === 0) {
    return {
      reps: target.max,
      reason: 'Pick a weight you could lift 2–3 more reps with. Stop before form breaks.',
      last: lastInfo,
    };
  }
  const w = Math.max(...weighted.map((s) => s.weightKg!));
  const atW = weighted.filter((s) => s.weightKg === w);
  const allTop = atW.length >= 2 && atW.every((s) => (s.reps ?? 0) >= target.max);
  const mostlyShort = atW.filter((s) => (s.reps ?? 0) < target.min).length > atW.length / 2;

  let next = w;
  let reason: string;
  let reps: number;
  if (allTop) {
    const add = addedKg(e, w);
    if (add.tooBig) {
      next = w;
      reps = target.max;
      reason = 'You hit the top of the range, but the next jump is too big. Same weight. Slow the lowering.';
    } else {
      next = roundTo(e, w + add.kg);
      reps = target.min;
      reason = `You hit ${target.max} on every set. Add ${kgText(next - w)} kg.`;
    }
  } else if (mostlyShort) {
    next = roundTo(e, w * 0.9);
    reps = target.min;
    reason = `Last time was below ${target.min} reps. Drop a little and build back.`;
  } else {
    const bestReps = Math.max(...atW.map((s) => s.reps ?? 0));
    reps = Math.min(bestReps + 1, target.max);
    reason = bestReps >= target.max ? `Same weight. Get every set to ${target.max}.` : `Same weight. Try for ${reps} reps.`;
  }

  if (deload) {
    next = roundTo(e, next * 0.85);
    reps = target.min;
    reason = 'Lighter week: a bit less weight, so the month does not only go up.';
  }

  return { weightKg: next, reps, reason, last: lastInfo };
}

export interface ExerciseRecord {
  exerciseId: string;
  bestE1rm: number;
  bestWeight: number;
  bestReps: number;
  date: ISODate;
}

/** Best estimated 1RM per date for an exercise (for the trend chart). */
export function e1rmTrend(exerciseId: string, sets: SetLog[]): { date: ISODate; value: number }[] {
  const byDate = new Map<ISODate, number>();
  for (const s of sets) {
    if (s.exerciseId !== exerciseId || !s.done || !s.weightKg || !s.reps) continue;
    const v = e1rm(s.weightKg, s.reps);
    byDate.set(s.date, Math.max(byDate.get(s.date) ?? 0, v));
  }
  return [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, value]) => ({ date, value: Math.round(value * 10) / 10 }));
}

export function personalRecords(sets: SetLog[]): ExerciseRecord[] {
  const out = new Map<string, ExerciseRecord>();
  for (const s of sets) {
    if (!s.done) continue;
    const cur = out.get(s.exerciseId) ?? { exerciseId: s.exerciseId, bestE1rm: 0, bestWeight: 0, bestReps: 0, date: s.date };
    const v = s.weightKg && s.reps ? e1rm(s.weightKg, s.reps) : 0;
    if (v > cur.bestE1rm) {
      cur.bestE1rm = Math.round(v * 10) / 10;
      cur.date = s.date;
    }
    if ((s.weightKg ?? 0) > cur.bestWeight) cur.bestWeight = s.weightKg!;
    if (!s.weightKg && (s.reps ?? 0) > cur.bestReps) {
      cur.bestReps = s.reps!;
      if (cur.bestE1rm === 0) cur.date = s.date;
    }
    out.set(s.exerciseId, cur);
  }
  return [...out.values()];
}
