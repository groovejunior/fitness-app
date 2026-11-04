import { describe, expect, it } from 'vitest';
import { weekToIcs } from '../ics';
import { adherence, doneByDay, e1rmTrend, personalRecords, runWeeks, weekStreak, weeklyMuscleVolume, type SessionLike, type SetLike } from '../stats';
import type { WeekPlan } from '../types';
import { everyDay } from './fixtures';

const sessions: SessionLike[] = [
  { id: 'a', date: '2026-10-19', type: 'gym', status: 'done' },
  { id: 'b', date: '2026-10-21', type: 'run', status: 'done', run: { distanceKm: 5, durationSec: 1800 } },
  { id: 'c', date: '2026-10-27', type: 'run', status: 'done', run: { distanceKm: 8, durationSec: 2880 } },
  { id: 'd', date: '2026-10-29', type: 'gym', status: 'skipped' },
  { id: 'e', date: '2026-11-03', type: 'gym', status: 'done' },
];
const sets: SetLike[] = [
  { sessionId: 'a', date: '2026-10-19', exerciseId: 'back-squat', weightKg: 80, reps: 8, done: true },
  { sessionId: 'a', date: '2026-10-19', exerciseId: 'back-squat', weightKg: 80, reps: 6, done: true },
  { sessionId: 'e', date: '2026-11-03', exerciseId: 'back-squat', weightKg: 85, reps: 6, done: true },
  { sessionId: 'e', date: '2026-11-03', exerciseId: 'push-up', weightKg: null, reps: 20, done: true },
  { sessionId: 'e', date: '2026-11-03', exerciseId: 'bench-press', weightKg: 60, reps: 5, done: false },
];

describe('progress stats', () => {
  it('adherence counts done sessions per planned week', () => {
    const a = adherence([{ weekStart: '2026-10-26', planned: 3 }, { weekStart: '2026-10-19', planned: 2 }], sessions);
    expect(a).toEqual([
      { weekStart: '2026-10-19', planned: 2, done: 2 },
      { weekStart: '2026-10-26', planned: 3, done: 1 },
    ]);
  });
  it('counts a streak of active weeks', () => {
    expect(weekStreak(sessions, '2026-11-04')).toBe(3);
    expect(weekStreak(sessions, '2026-11-20')).toBe(0);
  });
  it('maps done sessions per day', () => {
    expect(doneByDay(sessions)['2026-10-21']).toBe(1);
    expect(doneByDay(sessions)['2026-10-29']).toBeUndefined();
  });
  it('finds personal records and ignores undone sets', () => {
    const prs = personalRecords(sets);
    const sq = prs.find((p) => p.exerciseId === 'back-squat')!;
    expect(sq.heaviestKg).toBe(85);
    expect(sq.bestE1rm).toBeCloseTo(102, 0);
    expect(prs.find((p) => p.exerciseId === 'push-up')!.mostReps).toBe(20);
    expect(prs.find((p) => p.exerciseId === 'bench-press')).toBeUndefined();
  });
  it('builds an e1RM trend, oldest first', () => {
    const t = e1rmTrend(sets, 'back-squat');
    expect(t.map((x) => x.date)).toEqual(['2026-10-19', '2026-11-03']);
    expect(t[0].e1rm).toBeCloseTo(101.3, 1);
  });
  it('sums run distance and pace by week', () => {
    const w = runWeeks(sessions);
    expect(w).toEqual([
      { weekStart: '2026-10-19', km: 5, pace: 360, runs: 1 },
      { weekStart: '2026-10-26', km: 8, pace: 360, runs: 1 },
    ]);
  });
  it('counts weekly sets per muscle, secondary at half', () => {
    const v = weeklyMuscleVolume(sets, '2026-11-02');
    expect(v.quads).toBe(1);
    expect(v.hamstrings).toBe(0.5);
    expect(v.chest).toBe(1);
  });
});

describe('calendar export', () => {
  it('writes one event per session with local times', () => {
    const plan: WeekPlan = {
      weekStart: '2026-11-02', blockId: 'b', weekIndex: 0, phase: 'build', focus: 'balanced', availability: everyDay,
      slots: [
        { id: 'gym-0', day: 0, type: 'gym', title: 'Full body A', intent: 'Squat, press', minutes: 55, load: 'hard' },
        { id: 'run-long', day: 6, type: 'run', title: 'Long run', intent: 'Easy', minutes: 60, load: 'hard' },
      ],
      warnings: [], chosen: 'recommended', label: '', why: '',
    };
    const ics = weekToIcs(plan, new Date('2026-11-01T00:00:00Z'));
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART:20261102T180000');
    expect(ics).toContain('DTEND:20261102T185500');
    expect(ics).toContain('DTSTART:20261108T180000');
    expect(ics).toContain('SUMMARY:Full body A');
    expect(ics).toContain('Squat\\, press');
  });
});

describe('bodyweight trend', () => {
  it('tracks best reps per day', async () => {
    const { repsTrend } = await import('../stats');
    const t = repsTrend(
      [
        { sessionId: 'a', date: '2026-10-01', exerciseId: 'pull-up', weightKg: null, reps: 5, done: true },
        { sessionId: 'a', date: '2026-10-01', exerciseId: 'pull-up', weightKg: null, reps: 7, done: true },
        { sessionId: 'b', date: '2026-10-08', exerciseId: 'pull-up', weightKg: null, reps: 8, done: true },
      ],
      'pull-up',
    );
    expect(t).toEqual([{ date: '2026-10-01', reps: 7 }, { date: '2026-10-08', reps: 8 }]);
  });
});
