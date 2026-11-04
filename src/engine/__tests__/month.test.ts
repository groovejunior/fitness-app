import { describe, expect, it } from 'vitest';
import { checkRealism, chooseBlockOption, makeRealistic, planMonth, weeklyRunMinutes } from '../month';
import { avail, beginner, carlo, everyDay } from './fixtures';
import type { History } from '../types';

describe('realism check', () => {
  it('passes a plan that fits', () => {
    const r = checkRealism({ gym: 3, run: 2, sport: 0, mobility: 0 }, avail([0, 1, 2, 3, 4, 5], 75), carlo);
    expect(r.level).not.toBe('over');
    expect(r.suggestion).toEqual({ gym: 3, run: 2, sport: 0, mobility: 0 });
  });

  it('flags more sessions than free days and suggests a version that fits', () => {
    const r = checkRealism({ gym: 3, run: 3, sport: 0, mobility: 0 }, avail([0, 2, 4]), carlo);
    expect(r.level).toBe('over');
    expect(r.issues.join(' ')).toMatch(/free on 3/);
    const s = r.suggestion;
    expect(s.gym + s.run + s.sport).toBeLessThanOrEqual(3);
    expect(s.gym).toBeGreaterThanOrEqual(1);
    expect(s.run).toBeGreaterThanOrEqual(1);
  });

  it('respects recovery capacity even when every day is free', () => {
    const r = checkRealism({ gym: 4, run: 3, sport: 0, mobility: 0 }, everyDay, beginner);
    expect(r.level).toBe('over');
    const s = r.suggestion;
    expect(s.gym + s.run).toBeLessThanOrEqual(5);
  });

  it('flags too few minutes', () => {
    const r = checkRealism({ gym: 3, run: 2, sport: 0, mobility: 2 }, avail([0, 1, 2, 3, 4], 30), carlo);
    expect(r.issues.join(' ')).toMatch(/min a week/);
  });

  it('keeps sports and trims by goal', () => {
    const tight = avail([0, 2, 4, 6]);
    const athletic = makeRealistic({ gym: 3, run: 3, sport: 1, mobility: 0 }, tight, carlo);
    expect(athletic.sport).toBe(1);
    const endurance = makeRealistic({ gym: 3, run: 3, sport: 0, mobility: 0 }, tight, { ...carlo, goal: 'endurance' });
    const strength = makeRealistic({ gym: 3, run: 3, sport: 0, mobility: 0 }, tight, { ...carlo, goal: 'strength' });
    expect(endurance.run).toBeGreaterThan(endurance.gym);
    expect(strength.gym).toBeGreaterThan(strength.run);
  });

  it('is deterministic', () => {
    const a = checkRealism({ gym: 4, run: 4, sport: 1, mobility: 1 }, avail([1, 3, 5]), carlo);
    const b = checkRealism({ gym: 4, run: 4, sport: 1, mobility: 1 }, avail([1, 3, 5]), carlo);
    expect(a).toEqual(b);
  });
});

describe('month block', () => {
  const block = planMonth({ profile: carlo, requested: { gym: 3, run: 2, sport: 1, mobility: 0 }, availability: everyDay, startDate: '2026-11-04' });

  it('starts on a Monday and runs build, build, peak, deload', () => {
    expect(block.startDate).toBe('2026-11-02');
    expect(block.phases).toEqual(['build', 'build', 'peak', 'deload']);
  });

  it('offers a recommendation and a different alternative', () => {
    expect(block.options.map((o) => o.key)).toEqual(['recommended', 'alternative']);
    expect(block.options[1].targets).not.toEqual(block.options[0].targets);
    expect(block.options[1].label).toMatch(/bias|mobility|Leaner/);
  });

  it('switches to the alternative in one step', () => {
    const alt = chooseBlockOption(block, 'alternative', { profile: carlo });
    expect(alt.chosen).toBe('alternative');
    expect(alt.targets).toEqual(block.options[1].targets);
  });

  it('picks a split from gym sessions per week', () => {
    const mk = (gym: number, goal = carlo.goal) =>
      planMonth({ profile: { ...carlo, goal }, requested: { gym, run: 0, sport: 0, mobility: 0 }, availability: everyDay, startDate: '2026-11-02' }).split;
    expect(mk(2)).toBe('fullBody');
    expect(mk(3)).toBe('fullBody');
    expect(mk(3, 'muscle')).toBe('ppl');
    expect(mk(4)).toBe('upperLower');
  });

  it('progresses run volume by at most 10 % a week and deloads in week 4', () => {
    const v = [0, 1, 2, 3].map((w) => weeklyRunMinutes(block, w));
    expect(v[1] / v[0]).toBeLessThanOrEqual(1.1);
    expect(v[2] / v[1]).toBeLessThanOrEqual(1.1);
    expect(v[3]).toBeLessThan(v[2] * 0.8);
  });

  it('never plans more than 10 % above recent actual running', () => {
    const history: History = {
      exercises: [],
      runs: [
        { date: '2026-10-13', kind: 'easy', distanceKm: 5, durationSec: 30 * 60 },
        { date: '2026-10-20', kind: 'easy', distanceKm: 5, durationSec: 30 * 60 },
        { date: '2026-10-27', kind: 'easy', distanceKm: 5, durationSec: 30 * 60 },
      ],
    };
    const b = planMonth({ profile: carlo, requested: { gym: 2, run: 3, sport: 0, mobility: 0 }, availability: everyDay, startDate: '2026-11-02', history });
    expect(b.runBaseMinutes).toBeLessThanOrEqual(Math.max(60, 30 * 1.1));
  });

  it('builds on the previous block', () => {
    const next = planMonth({ profile: carlo, requested: { gym: 3, run: 2, sport: 1, mobility: 0 }, availability: everyDay, startDate: '2026-11-30', previousBlock: block });
    expect(next.runBaseMinutes).toBeGreaterThan(block.runBaseMinutes);
    expect(next.runBaseMinutes).toBeLessThanOrEqual(block.runBaseMinutes * 1.1 + 5);
  });
});
