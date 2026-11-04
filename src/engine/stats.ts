import { getExercise } from '../content/exercises';
import { addDays, mondayOf } from './dates';
import { e1rm } from './progression';
import type { Muscle, SessionType } from './types';

/** Minimal shapes the stats need. The data layer's records satisfy these. */
export interface SessionLike {
  id: string;
  date: string;
  type: SessionType;
  status: 'planned' | 'committed' | 'in_progress' | 'done' | 'skipped';
  durationMin?: number;
  run?: { distanceKm?: number; durationSec?: number };
}

export interface SetLike {
  sessionId: string;
  date: string;
  exerciseId: string;
  weightKg: number | null;
  reps: number;
  done: boolean;
}

export interface PlannedWeekLike {
  weekStart: string;
  planned: number;
}

export interface AdherenceWeek {
  weekStart: string;
  planned: number;
  done: number;
}

export function adherence(weeks: PlannedWeekLike[], sessions: SessionLike[]): AdherenceWeek[] {
  return weeks
    .map((w) => ({
      weekStart: w.weekStart,
      planned: w.planned,
      done: sessions.filter((s) => s.status === 'done' && mondayOf(s.date) === w.weekStart).length,
    }))
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
}

/** Weeks in a row (ending with the current or last week) where at least one session was done. */
export function weekStreak(sessions: SessionLike[], today: string): number {
  const weeks = new Set(sessions.filter((s) => s.status === 'done').map((s) => mondayOf(s.date)));
  let w = mondayOf(today);
  if (!weeks.has(w)) w = addDays(w, -7);
  let n = 0;
  while (weeks.has(w)) {
    n++;
    w = addDays(w, -7);
  }
  return n;
}

/** Map date -> number of sessions done that day. */
export function doneByDay(sessions: SessionLike[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sessions) if (s.status === 'done') out[s.date] = (out[s.date] ?? 0) + 1;
  return out;
}

export interface PersonalRecord {
  exerciseId: string;
  bestE1rm: number;
  heaviestKg: number;
  heaviestReps: number;
  date: string;
  /** Bodyweight exercises: most reps in a set. */
  mostReps: number;
}

export function personalRecords(sets: SetLike[]): PersonalRecord[] {
  const by = new Map<string, PersonalRecord>();
  for (const s of sets) {
    if (!s.done || s.reps <= 0) continue;
    const slot = getExercise(s.exerciseId).slot;
    if (slot === 'warmup' || slot === 'mobility') continue;
    const cur = by.get(s.exerciseId) ?? { exerciseId: s.exerciseId, bestE1rm: 0, heaviestKg: 0, heaviestReps: 0, date: s.date, mostReps: 0 };
    const w = s.weightKg ?? 0;
    const est = w > 0 ? e1rm(w, s.reps) : 0;
    if (est > cur.bestE1rm) {
      cur.bestE1rm = Math.round(est * 10) / 10;
      cur.date = s.date;
    }
    if (w > cur.heaviestKg || (w === cur.heaviestKg && s.reps > cur.heaviestReps)) {
      cur.heaviestKg = w;
      cur.heaviestReps = s.reps;
    }
    if (s.reps > cur.mostReps) {
      cur.mostReps = s.reps;
      if (w === 0 && est === 0) cur.date = s.date;
    }
    by.set(s.exerciseId, cur);
  }
  return [...by.values()].sort((a, b) => b.bestE1rm - a.bestE1rm || b.mostReps - a.mostReps);
}

/** Best estimated 1RM per session date, oldest first. */
export function e1rmTrend(sets: SetLike[], exerciseId: string): Array<{ date: string; e1rm: number }> {
  const by = new Map<string, number>();
  for (const s of sets) {
    if (s.exerciseId !== exerciseId || !s.done || !s.weightKg) continue;
    by.set(s.date, Math.max(by.get(s.date) ?? 0, e1rm(s.weightKg, s.reps)));
  }
  return [...by.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, v]) => ({ date, e1rm: Math.round(v * 10) / 10 }));
}

export interface RunWeek {
  weekStart: string;
  km: number;
  /** Average pace in sec/km for the week, null without distance. */
  pace: number | null;
  runs: number;
}

export function runWeeks(sessions: SessionLike[]): RunWeek[] {
  const by = new Map<string, { km: number; sec: number; runs: number }>();
  for (const s of sessions) {
    if (s.type !== 'run' || s.status !== 'done') continue;
    const w = mondayOf(s.date);
    const cur = by.get(w) ?? { km: 0, sec: 0, runs: 0 };
    cur.km += s.run?.distanceKm ?? 0;
    cur.sec += s.run?.durationSec ?? (s.durationMin ?? 0) * 60;
    cur.runs += 1;
    by.set(w, cur);
  }
  return [...by.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([weekStart, v]) => ({ weekStart, km: Math.round(v.km * 10) / 10, pace: v.km > 0 ? Math.round(v.sec / v.km) : null, runs: v.runs }));
}

/**
 * Working sets per muscle group for the week starting `weekStart`.
 * Primary movers count 1 set, secondary muscles count half.
 */
export function weeklyMuscleVolume(sets: SetLike[], weekStart: string): Record<Muscle, number> {
  const out: Record<Muscle, number> = { quads: 0, hamstrings: 0, glutes: 0, calves: 0, chest: 0, back: 0, shoulders: 0, arms: 0, core: 0 };
  const end = addDays(weekStart, 7);
  for (const s of sets) {
    if (!s.done || s.date < weekStart || s.date >= end) continue;
    const ex = getExercise(s.exerciseId);
    if (ex.slot === 'warmup' || ex.slot === 'mobility') continue;
    ex.muscles.forEach((m, i) => (out[m] += i < ex.primary ? 1 : 0.5));
  }
  return out;
}
