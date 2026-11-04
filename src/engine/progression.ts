// Progressive overload: double progression.
// Work inside a rep range. When every working set hits the top of the range,
// add load next time. Until then keep the load and add reps.
import type { Exercise, History, ISODate, RepTarget, SetLog, WeekPhase } from './types';

export interface LoadSuggestion {
  weightKg?: number;
  /** Reps to pre-fill for each set. */
  reps?: number;
  /** Plain explanation, e.g. "You hit 3×10 last time, so add 2.5 kg." */
  reason: string;
  last?: { date: ISODate; summary: string };
}

/** Epley estimate of a one-rep max. */
export function e1rm(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function increment(e: Exercise): number {
  const lower = e.pattern === 'squat' || e.pattern === 'hinge' || e.pattern === 'lunge';
  if (e.equipment.includes('barbell')) return lower ? 5 : 2.5;
  if (e.equipment.includes('kettlebell')) return 4;
  if (e.equipment.includes('dumbbell')) return 2;
  return 2.5;
}

function roundTo(e: Exercise, kg: number): number {
  const step = e.equipment.includes('dumbbell') ? 1 : e.equipment.includes('kettlebell') ? 2 : 2.5;
  return Math.max(step, Math.round(kg / step) * step);
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
        reason: 'First time: pick a weight you could lift 2–3 more reps with.',
      };
    }
    return { reps: target.kind === 'reps' ? target.max : undefined, reason: 'First time: smooth, controlled reps.' };
  }

  const lastInfo = { date: last[0].date, summary: summarise(last, e) };

  if (target.kind === 'time') {
    return { reason: 'Hold steady. Stop when form slips.', last: lastInfo };
  }

  if (e.load !== 'weighted') {
    const best = Math.max(...last.map((s) => s.reps ?? 0));
    const reps = deload ? target.min : Math.min(best + 1, target.max);
    const reason =
      best >= target.max
        ? 'You hit the top of the range. Slow the lowering to make it harder.'
        : `Last best was ${best}. Aim for ${reps}.`;
    return { reps, reason, last: lastInfo };
  }

  const weighted = last.filter((s) => (s.weightKg ?? 0) > 0);
  if (weighted.length === 0) {
    return { reps: target.max, reason: 'Pick a weight you could lift 2–3 more reps with.', last: lastInfo };
  }
  const w = Math.max(...weighted.map((s) => s.weightKg!));
  const atW = weighted.filter((s) => s.weightKg === w);
  const allTop = atW.length >= 2 && atW.every((s) => (s.reps ?? 0) >= target.max);
  const mostlyShort = atW.filter((s) => (s.reps ?? 0) < target.min).length > atW.length / 2;

  let next = w;
  let reason: string;
  let reps: number;
  if (allTop) {
    next = roundTo(e, w + increment(e));
    reps = target.min;
    reason = `You hit ${target.max} on every set. Add ${next - w} kg.`;
  } else if (mostlyShort) {
    next = roundTo(e, w * 0.9);
    reps = target.min;
    reason = `Last time was below ${target.min} reps. Drop a little and build back.`;
  } else {
    const bestReps = Math.max(...atW.map((s) => s.reps ?? 0));
    reps = Math.min(bestReps + 1, target.max);
    reason = `Same weight. Try for ${reps} reps.`;
  }

  if (deload) {
    next = roundTo(e, next * 0.85);
    reps = target.min;
    reason = 'Deload week: lighter, smooth reps, leave plenty in the tank.';
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
