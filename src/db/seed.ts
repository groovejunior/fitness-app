// Demo data for development, screenshots and tests. Exposed as window.fitnessDev.
import { coach } from '../engine/coach';
import { addDays, mondayOf } from '../engine/dates';
import { carlo } from '../engine/fixtures';
import type { SessionLog, SetLog } from '../engine/types';
import { resetAll } from './backup';
import { db } from './db';
import { saveProfile, startBlock, today } from './repo';

/** Profile + current block + this week. With history: two past weeks of logs. */
export async function seed(opts: { history?: boolean } = {}) {
  await resetAll();
  const profile = carlo();
  await saveProfile(profile);
  if (opts.history !== false) await seedHistory();
  const proposal = coach.proposeBlock(profile, profile.wanted, profile.availability);
  await startBlock(profile, proposal, 'recommended');
}

async function seedHistory() {
  const monday = mondayOf(today());
  const sets: SetLog[] = [];
  const logs: SessionLog[] = [];
  const lift = (sid: string, date: string, ex: string, w: number, reps: number[]) =>
    reps.forEach((r, i) => sets.push({ id: `${sid}-${ex}-${i}`, sessionId: sid, exerciseId: ex, date, setIndex: i, weightKg: w, reps: r, done: true }));
  const reps = (sid: string, date: string, ex: string, rs: number[]) =>
    rs.forEach((r, i) => sets.push({ id: `${sid}-${ex}-${i}`, sessionId: sid, exerciseId: ex, date, setIndex: i, reps: r, done: true }));
  for (let wk = 3; wk >= 1; wk--) {
    const m = addDays(monday, -7 * wk);
    const k = 3 - wk; // 0, 1, 2 → progressing
    const g1 = `past-${m}-g1`;
    lift(g1, addDays(m, 1), 'back-squat', 60 + k * 5, [8, 8, 7 + (k > 0 ? 1 : 0)]);
    reps(g1, addDays(m, 1), 'decline-pushup', [12, 11, 10 + k]);
    reps(g1, addDays(m, 1), 'pullup', [6, 5 + (k > 0 ? 1 : 0), 5 + k]);
    logs.push({ sessionId: g1, date: addDays(m, 1), type: 'gym', title: 'Full body A', intent: 'full-a', durationMin: 62, effort: 7, completedAt: `${addDays(m, 1)}T19:00:00.000Z` });
    const g2 = `past-${m}-g2`;
    lift(g2, addDays(m, 4), 'romanian-deadlift', 60 + k * 5, [8, 8, 8]);
    lift(g2, addDays(m, 4), 'overhead-press', 32.5 + k * 2.5, [8, 7, 6]);
    reps(g2, addDays(m, 4), 'dip', [8, 8, 7 + k]);
    reps(g2, addDays(m, 4), 'inverted-row', [10, 10, 9 + k]);
    logs.push({ sessionId: g2, date: addDays(m, 4), type: 'gym', title: 'Full body B', intent: 'full-b', durationMin: 55, effort: 7, completedAt: `${addDays(m, 4)}T08:00:00.000Z` });
    const r1 = `past-${m}-r1`;
    logs.push({ sessionId: r1, date: addDays(m, 5), type: 'run', title: 'Easy run', intent: 'easy', durationMin: 32 + k * 3, distanceKm: 5 + k * 0.5, runTimeSec: (32 + k * 3) * 60, effort: 4, completedAt: `${addDays(m, 5)}T08:00:00.000Z` });
    const r2 = `past-${m}-r2`;
    logs.push({ sessionId: r2, date: addDays(m, 0), type: 'run', title: 'Intervals', intent: 'intervals', durationMin: 38, distanceKm: 6, runTimeSec: 38 * 60, effort: 8, completedAt: `${addDays(m, 0)}T18:00:00.000Z` });
    if (wk !== 2) {
      const t1 = `past-${m}-t1`;
      logs.push({ sessionId: t1, date: addDays(m, 3), type: 'sport', title: 'Tennis', intent: 'tennis', durationMin: 90, effort: 7, completedAt: `${addDays(m, 3)}T20:00:00.000Z` });
    }
  }
  await db.sets.bulkPut(sets);
  await db.sessionLogs.bulkPut(logs);
}

export function installDevTools() {
  (window as unknown as { fitnessDev: unknown }).fitnessDev = {
    seed,
    reset: resetAll,
    setToday: (d: string | null) => (d ? localStorage.setItem('fitness.today', d) : localStorage.removeItem('fitness.today')),
  };
}
