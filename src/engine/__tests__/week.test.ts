import { describe, expect, it } from 'vitest';
import { planMonth } from '../month';
import { buildRunWorkout } from '../run';
import { gymDayPlan, isHardRun, isHeavyLegs, moveSession, planWeek, runKinds } from '../week';
import { avail, beginner, carlo, everyDay } from './fixtures';
import type { Block, Profile, Targets, WeekAvailability, WeekFocus } from '../types';
import { EMPTY_HISTORY } from '../types';

const mkBlock = (targets: Targets, availability: WeekAvailability = everyDay, profile: Profile = carlo): Block =>
  planMonth({ profile, requested: targets, availability, startDate: '2026-11-02' });

const week = (block: Block, weekIndex = 0, focus: WeekFocus = 'balanced', profile: Profile = carlo, availability?: WeekAvailability) =>
  planWeek({ block, profile, weekIndex, weekStart: '2026-11-02', focus, availability }).recommended;

const patterns: number[][] = [
  [0, 1, 2, 3, 4, 5, 6],
  [0, 1, 2, 3, 4, 5],
  [0, 2, 3, 5, 6],
  [1, 2, 4, 5, 6],
  [0, 1, 3, 4, 6],
];

describe('week distribution', () => {
  it('puts every session on a free day, one main session per day', () => {
    for (const days of patterns) {
      const a = avail(days);
      const b = mkBlock({ gym: 2, run: 2, sport: 1, mobility: 1 }, a);
      const w = week(b, 0, 'balanced', carlo, a);
      for (const s of w.slots) expect(days).toContain(s.day);
      const mainDays = w.slots.filter((s) => s.type !== 'mobility').map((s) => s.day);
      expect(new Set(mainDays).size).toBe(mainDays.length);
    }
  });

  it('matches the block targets', () => {
    const b = mkBlock({ gym: 3, run: 2, sport: 1, mobility: 0 });
    const w = week(b);
    const count = (t: string) => w.slots.filter((s) => s.type === t).length;
    expect(count('gym')).toBe(3);
    expect(count('run')).toBe(2);
    expect(count('sport')).toBe(1);
  });

  it('never puts heavy legs the day before a hard run, nor the same muscles back to back, when there is room', () => {
    for (const days of patterns) {
      for (const t of [
        { gym: 3, run: 2, sport: 0, mobility: 0 },
        { gym: 2, run: 3, sport: 0, mobility: 1 },
        { gym: 2, run: 2, sport: 1, mobility: 0 },
      ]) {
        const a = avail(days);
        const b = mkBlock(t, a);
        const w = week(b, 0, 'balanced', carlo, a);
        const codes = w.warnings.map((x) => x.code);
        expect(codes).not.toContain('legsBeforeHardRun');
        expect(codes).not.toContain('sameMusclesBackToBack');
        for (const s of w.slots) {
          const next = w.slots.filter((n) => n.day === s.day + 1);
          if (isHeavyLegs(s)) expect(next.some(isHardRun)).toBe(false);
        }
      }
    }
  });

  it('is deterministic', () => {
    const b = mkBlock({ gym: 3, run: 3, sport: 1, mobility: 1 });
    expect(week(b)).toEqual(week(b));
  });

  it('prefers the long run at the weekend', () => {
    const b = mkBlock({ gym: 2, run: 3, sport: 0, mobility: 0 });
    const long = week(b).slots.find((s) => s.runKind === 'long');
    expect(long && long.day >= 5).toBe(true);
  });

  it('leaves out lower-priority sessions when there are too few days, keeping sport', () => {
    const b = mkBlock({ gym: 3, run: 2, sport: 1, mobility: 0 });
    const a = avail([1, 4, 6]);
    const w = week(b, 0, 'balanced', carlo, a);
    expect(w.slots.filter((s) => s.type !== 'mobility')).toHaveLength(3);
    expect(w.slots.some((s) => s.type === 'sport')).toBe(true);
    expect(w.warnings[0].code).toBe('droppedSessions');
  });

  it('shortens sessions to fit the day', () => {
    const b = mkBlock({ gym: 2, run: 0, sport: 0, mobility: 0 });
    const a = avail([0, 3], 40);
    const w = week(b, 0, 'balanced', carlo, a);
    for (const s of w.slots) expect(s.minutes).toBeLessThanOrEqual(40);
  });
});

describe('running inside the week', () => {
  it('gives beginners one quality run and intermediates two', () => {
    expect(runKinds(3, beginner, 'build', 'balanced', 0).filter((k) => k === 'tempo' || k === 'intervals')).toHaveLength(1);
    expect(runKinds(3, carlo, 'build', 'balanced', 0, 2).filter((k) => k === 'tempo' || k === 'intervals')).toHaveLength(1);
    expect(runKinds(3, carlo, 'build', 'balanced', 0, 1).filter((k) => k === 'tempo' || k === 'intervals')).toHaveLength(2);
    expect(runKinds(4, carlo, 'build', 'balanced', 0).filter((k) => k === 'tempo' || k === 'intervals')).toHaveLength(2);
    expect(runKinds(4, carlo, 'build', 'balanced', 0)).toContain('easy');
  });

  it('keeps the week about 80/20 easy to hard', () => {
    for (const profile of [carlo, beginner, { ...carlo, experience: { gym: 'advanced' as const, run: 'advanced' as const } }]) {
      for (const runs of [2, 3, 4, 5]) {
        const b = mkBlock({ gym: 2, run: runs, sport: 0, mobility: 0 }, everyDay, profile);
        for (let wi = 0; wi < 4; wi++) {
          const w = week(b, wi, 'balanced', profile);
          let total = 0;
          let hard = 0;
          for (const s of w.slots.filter((x) => x.type === 'run')) {
            const r = buildRunWorkout({ slot: s, profile, equipment: 'outdoors', minutes: s.minutes, intensity: 'normal', phase: w.phase, weekIndex: wi, history: EMPTY_HISTORY }, 'recommended').run!;
            total += r.totalSec;
            hard += r.hardSec;
          }
          if (total > 0) expect(hard / total).toBeLessThanOrEqual(0.21);
        }
      }
    }
  });

  it('deload week has no tempo or intervals and less running', () => {
    const b = mkBlock({ gym: 2, run: 3, sport: 0, mobility: 0 });
    const peak = week(b, 2);
    const deload = week(b, 3);
    expect(deload.phase).toBe('deload');
    expect(deload.slots.some((s) => s.runKind === 'tempo' || s.runKind === 'intervals')).toBe(false);
    const mins = (w: typeof peak) => w.slots.filter((s) => s.type === 'run').reduce((x, s) => x + s.minutes, 0);
    expect(mins(deload)).toBeLessThan(mins(peak));
  });
});

describe('weekly focus', () => {
  const b = mkBlock({ gym: 3, run: 2, sport: 0, mobility: 0 });
  const count = (w: ReturnType<typeof week>, t: string) => w.slots.filter((s) => s.type === t).length;

  it('endurance swaps a gym session for a run, strength the opposite', () => {
    expect(count(week(b, 0, 'endurance'), 'run')).toBe(3);
    expect(count(week(b, 0, 'endurance'), 'gym')).toBe(2);
    expect(count(week(b, 0, 'strength'), 'gym')).toBe(4);
    expect(count(week(b, 0, 'strength'), 'run')).toBe(1);
  });

  it('sport week keeps gym to one and runs easy, plus mobility', () => {
    const w = week(b, 0, 'sport');
    expect(count(w, 'gym')).toBe(1);
    expect(w.slots.filter((s) => s.type === 'run').every((s) => !isHardRun(s) || s.runKind === 'long')).toBe(true);
    expect(count(w, 'mobility')).toBe(1);
  });

  it('legs focus adds lower-body days', () => {
    expect(gymDayPlan('upperLower', 4, 'legs').filter((d) => d.gymDay === 'lower').length).toBe(3);
    expect(gymDayPlan('fullBody', 3, 'legs').some((d) => d.gymDay === 'lower')).toBe(true);
    expect(gymDayPlan('upperLower', 4, 'upper').filter((d) => d.gymDay === 'upper').length).toBe(3);
  });
});

describe('moving sessions', () => {
  const b = mkBlock({ gym: 3, run: 2, sport: 0, mobility: 0 });
  const w = week(b);

  it('swaps with the session already on that day and pins both', () => {
    const [a, c] = w.slots.filter((s) => s.type !== 'mobility');
    const moved = moveSession(w, a.id, c.day, carlo);
    const ma = moved.slots.find((s) => s.id === a.id)!;
    const mc = moved.slots.find((s) => s.id === c.id)!;
    expect(ma.day).toBe(c.day);
    expect(mc.day).toBe(a.day);
    expect(ma.pinned && mc.pinned).toBe(true);
  });

  it('warns when a move puts heavy legs right before a hard run', () => {
    const legs = w.slots.find(isHeavyLegs)!;
    const hard = w.slots.find(isHardRun)!;
    const target = hard.day === 0 ? 1 : hard.day - 1;
    // Clear the target day first by moving legs there.
    const moved = moveSession(w, legs.id, target as 0, carlo);
    const hardNow = moved.slots.find((s) => s.id === hard.id)!;
    const legsNow = moved.slots.find((s) => s.id === legs.id)!;
    if (legsNow.day + 1 === hardNow.day) expect(moved.warnings.map((x) => x.code)).toContain('legsBeforeHardRun');
  });

  it('keeps pinned sessions on their day when re-planning', () => {
    const slot = w.slots.find((s) => s.type === 'gym')!;
    const pinned = [{ ...slot, day: 3 as const, pinned: true }];
    const re = planWeek({ block: b, profile: carlo, weekIndex: 0, weekStart: '2026-11-02', pinned }).recommended;
    expect(re.slots.find((s) => s.id === slot.id)!.day).toBe(3);
  });

  it('moves sessions off a day that becomes busy', () => {
    const busy = w.slots.find((s) => s.type !== 'mobility')!.day;
    const a = everyDay.map((d, i) => (i === busy ? { ...d, available: false } : d));
    const re = planWeek({ block: b, profile: carlo, weekIndex: 0, weekStart: '2026-11-02', availability: a, pinned: w.slots }).recommended;
    expect(re.slots.some((s) => s.day === busy)).toBe(false);
  });
});

describe('week alternative', () => {
  it('offers a lighter week when there are four or more sessions', () => {
    const b = mkBlock({ gym: 3, run: 2, sport: 0, mobility: 0 });
    const r = planWeek({ block: b, profile: carlo, weekIndex: 0, weekStart: '2026-11-02' });
    expect(r.alternative.label).toBe('Lighter week');
    expect(r.alternative.slots.length).toBe(r.recommended.slots.length - 1);
  });

  it('offers other days for a small week', () => {
    const b = mkBlock({ gym: 1, run: 1, sport: 0, mobility: 0 });
    const r = planWeek({ block: b, profile: carlo, weekIndex: 0, weekStart: '2026-11-02' });
    expect(r.alternative.label).toBe('Other days');
    expect(r.alternative.slots.map((s) => s.day)).not.toEqual(r.recommended.slots.map((s) => s.day));
  });
});
