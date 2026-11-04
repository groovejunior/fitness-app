import { describe, expect, it } from 'vitest';
import { getExercise } from '../../content/exercises';
import { e1rm, suggestLoad } from '../progression';
import type { ExercisePerformance, History } from '../types';

const squat = getExercise('back-squat');
const perf = (date: string, w: number, reps: number[], range: [number, number] = [5, 8]): ExercisePerformance => ({
  date,
  exerciseId: 'back-squat',
  repsMin: range[0],
  repsMax: range[1],
  sets: reps.map((r) => ({ weightKg: w, reps: r, done: true })),
});
const hist = (...p: ExercisePerformance[]): History => ({ exercises: p, runs: [] });

describe('double progression', () => {
  it('has no number without history', () => {
    expect(suggestLoad(squat, 5, 8, hist(), 'build').kg).toBeNull();
  });
  it('adds the increment when every set hit the top of the range', () => {
    expect(suggestLoad(squat, 5, 8, hist(perf('2026-10-01', 80, [8, 8, 8])), 'build').kg).toBe(85);
  });
  it('keeps the weight inside the range', () => {
    const s = suggestLoad(squat, 5, 8, hist(perf('2026-10-01', 80, [8, 7, 6])), 'build');
    expect(s.kg).toBe(80);
    expect(s.note).toMatch(/Add a rep/);
  });
  it('keeps the weight after one bad day and drops ~10 % after two', () => {
    expect(suggestLoad(squat, 5, 8, hist(perf('2026-10-08', 80, [5, 4, 3])), 'build').kg).toBe(80);
    expect(suggestLoad(squat, 5, 8, hist(perf('2026-10-08', 80, [5, 4, 3]), perf('2026-10-01', 80, [5, 4, 4])), 'build').kg).toBe(70);
  });
  it('uses the most recent session', () => {
    expect(suggestLoad(squat, 5, 8, hist(perf('2026-10-01', 60, [8, 8, 8]), perf('2026-10-08', 80, [6, 6, 6])), 'build').kg).toBe(80);
  });
  it('backs off in a deload', () => {
    expect(suggestLoad(squat, 5, 8, hist(perf('2026-10-01', 100, [8, 8, 8])), 'deload').kg).toBe(90);
  });
  it('converts through e1RM when the rep range moves a lot', () => {
    const kg = suggestLoad(squat, 3, 5, hist(perf('2026-10-01', 80, [10, 10, 10], [8, 12])), 'peak').kg!;
    expect(kg).toBeGreaterThan(80);
    expect(kg % 5).toBe(0);
  });
  it('bodyweight exercises aim for more reps', () => {
    const pu = getExercise('push-up');
    const h: History = { exercises: [{ date: '2026-10-01', exerciseId: 'push-up', repsMin: 8, repsMax: 15, sets: [{ weightKg: null, reps: 10, done: true }] }], runs: [] };
    expect(suggestLoad(pu, 8, 15, h, 'build').aimReps).toBe(11);
  });
  it('estimates 1RM with Epley', () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(100, 10)).toBeCloseTo(133.3, 1);
  });
});
