// Pure helpers for the Progress screen.
import { addDays, findExercise, mondayOf, type History, type ISODate, type Muscle, type SessionLog, type SetLog, type WeekPlan } from '../../engine';

export const MUSCLE_NAME: Record<Muscle, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  hips: 'Hips',
  full: 'Full body',
};

export function exerciseName(id: string): string {
  const e = findExercise(id);
  if (e) return e.name;
  const s = id.replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface HeatCell {
  date: ISODate;
  planned: number;
  done: number;
  future: boolean;
}

/** 12 weeks (oldest first), each 7 cells Mon–Sun. */
export function buildHeatmap(weeks: WeekPlan[], logs: SessionLog[], todayISO: ISODate, count = 12): HeatCell[][] {
  const thisMonday = mondayOf(todayISO);
  const planned = new Map<ISODate, number>();
  for (const w of weeks) for (const s of w.sessions) planned.set(s.date, (planned.get(s.date) ?? 0) + 1);
  const done = new Map<ISODate, number>();
  for (const l of logs) done.set(l.date, (done.get(l.date) ?? 0) + 1);
  const out: HeatCell[][] = [];
  for (let w = count - 1; w >= 0; w--) {
    const monday = addDays(thisMonday, -7 * w);
    out.push(
      Array.from({ length: 7 }, (_, d) => {
        const date = addDays(monday, d);
        return { date, planned: planned.get(date) ?? 0, done: done.get(date) ?? 0, future: date > todayISO };
      }),
    );
  }
  return out;
}

function weekCounts(monday: ISODate, weeks: WeekPlan[], logs: SessionLog[]) {
  const end = addDays(monday, 6);
  const plan = weeks.find((w) => w.weekStart === monday);
  const done = logs.filter((l) => l.date >= monday && l.date <= end).length;
  return { planned: plan?.sessions.length ?? 0, done };
}

export function thisWeekCount(weeks: WeekPlan[], logs: SessionLog[], todayISO: ISODate) {
  const c = weekCounts(mondayOf(todayISO), weeks, logs);
  return { done: c.done, planned: Math.max(c.planned, c.done) };
}

export function doneInLastDays(logs: SessionLog[], todayISO: ISODate, days: number): number {
  const from = addDays(todayISO, -(days - 1));
  return logs.filter((l) => l.date >= from && l.date <= todayISO).length;
}

/** Consecutive weeks, ending this or last week, with >= 75% of planned sessions done. */
export function weekStreak(weeks: WeekPlan[], logs: SessionLog[], todayISO: ISODate): number {
  const thisMonday = mondayOf(todayISO);
  const ok = (monday: ISODate) => {
    const { planned, done } = weekCounts(monday, weeks, logs);
    return planned > 0 ? done / planned >= 0.75 : done >= 2;
  };
  let start = thisMonday;
  if (!ok(start)) start = addDays(start, -7);
  let n = 0;
  for (let i = 0; i < 104 && ok(addDays(start, -7 * i)); i++) n++;
  return n;
}

export function weeklyRunKm(logs: SessionLog[], todayISO: ISODate, count = 8): { monday: ISODate; km: number }[] {
  const thisMonday = mondayOf(todayISO);
  return Array.from({ length: count }, (_, i) => {
    const monday = addDays(thisMonday, -7 * (count - 1 - i));
    const end = addDays(monday, 6);
    const km = logs.filter((l) => l.type === 'run' && l.distanceKm && l.date >= monday && l.date <= end).reduce((a, l) => a + (l.distanceKm ?? 0), 0);
    return { monday, km };
  });
}

/** Seconds per km for each run with distance and time. */
export function paceSeries(logs: SessionLog[]): { date: ISODate; value: number }[] {
  return logs
    .filter((l) => l.type === 'run' && l.distanceKm && l.distanceKm > 0 && l.runTimeSec && l.runTimeSec > 0)
    .map((l) => ({ date: l.date, value: l.runTimeSec! / l.distanceKm! }));
}

export function paceText(secPerKm: number, units: 'metric' | 'imperial'): string {
  const s = Math.round(units === 'imperial' ? secPerKm * 1.609344 : secPerKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} /${units === 'imperial' ? 'mi' : 'km'}`;
}

/** Working sets per primary muscle from Monday up to today. */
export function muscleVolume(history: History, todayISO: ISODate): { muscle: Muscle; sets: number }[] {
  const monday = mondayOf(todayISO);
  const m = new Map<Muscle, number>();
  for (const s of history.sets) {
    if (!s.done || s.date < monday || s.date > todayISO) continue;
    const ex = findExercise(s.exerciseId);
    if (!ex) continue;
    if (ex.roles.every((r) => r === 'warmup' || r === 'cooldown')) continue;
    const mu = ex.muscles[0];
    if (mu) m.set(mu, (m.get(mu) ?? 0) + 1);
  }
  return [...m.entries()].map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets);
}

/** Strength exercises with logged sets (weighted or bodyweight reps), most recently trained first. */
export function weightedExercises(sets: SetLog[]): string[] {
  const last = new Map<string, ISODate>();
  for (const s of sets) {
    if (!s.done || !s.reps) continue;
    const ex = findExercise(s.exerciseId);
    if (ex && (ex.load === 'timed' || ex.roles.every((r) => r === 'warmup' || r === 'cooldown' || r === 'conditioning'))) continue;
    if ((last.get(s.exerciseId) ?? '') < s.date) last.set(s.exerciseId, s.date);
  }
  return [...last.entries()].sort((a, b) => (a[1] < b[1] ? 1 : -1)).map(([id]) => id);
}

/** Did this exercise get logged with a weight? (Otherwise it's tracked by reps.) */
export function isWeighted(exerciseId: string, sets: SetLog[]): boolean {
  return sets.some((s) => s.exerciseId === exerciseId && s.done && (s.weightKg ?? 0) > 0);
}

/** Most reps in one set, per session date (bodyweight progress). */
export function bestRepsTrend(exerciseId: string, sets: SetLog[]): { date: ISODate; value: number }[] {
  const by = new Map<ISODate, number>();
  for (const s of sets) {
    if (s.exerciseId !== exerciseId || !s.done || !s.reps) continue;
    by.set(s.date, Math.max(by.get(s.date) ?? 0, s.reps));
  }
  return [...by.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, value]) => ({ date, value }));
}

export interface RecentSession {
  date: ISODate;
  /** [weightKg, reps[]] groups in order. */
  groups: { weightKg: number; reps: number[] }[];
}

export function recentSessions(exerciseId: string, sets: SetLog[], limit = 5): RecentSession[] {
  const byDate = new Map<ISODate, SetLog[]>();
  for (const s of sets) {
    if (s.exerciseId !== exerciseId || !s.done || !s.reps) continue;
    byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);
  }
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, limit)
    .map(([date, list]) => {
      list.sort((a, b) => a.setIndex - b.setIndex);
      const groups: RecentSession['groups'] = [];
      for (const s of list) {
        const g = groups[groups.length - 1];
        const w = s.weightKg ?? 0;
        if (g && g.weightKg === w) g.reps.push(s.reps!);
        else groups.push({ weightKg: w, reps: [s.reps!] });
      }
      return { date, groups };
    });
}

