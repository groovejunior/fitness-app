import { describe, expect, it } from 'vitest';
import { carlo, carloAvailability, emptyHistory } from './fixtures';
import { makeRealistic, realismCheck } from './block';
import { RuleCoach } from './coach';
import { addDays, mondayOf, weekdayOf } from './dates';
import { e1rm, suggestLoad } from './progression';
import { generateRun } from './running';
import { gymSplit, runKinds, RUN_VOLUME } from './week';
import { weekToIcs } from './ics';
import { getExercise } from './library';
import type { DayAvailability, History, PlannedSession, Profile, SetLog, StrengthItem, WeekPlan, Workout } from './types';

const coach = new RuleCoach();
const MONDAY = '2026-11-02';

function setup(profile: Profile = carlo(), weekIndex = 0, focus: WeekPlan['focus'] = 'balanced') {
  const proposal = coach.proposeBlock(profile, profile.wanted, profile.availability);
  const block = coach.createBlock(profile, proposal, 'recommended', MONDAY, emptyHistory());
  const week = coach.planWeek({
    block,
    profile,
    weekStart: addDays(MONDAY, weekIndex * 7),
    weekIndex,
    focus,
    availability: profile.availability,
    history: emptyHistory(),
  });
  return { proposal, block, week };
}

const strengthItems = (w: Workout) => w.blocks.flatMap((b) => b.items).filter((i): i is StrengthItem => i.kind === 'strength');
const dayOf = (s: PlannedSession) => weekdayOf(s.date);

describe('dates', () => {
  it('finds Monday and weekdays', () => {
    expect(mondayOf('2026-11-04')).toBe('2026-11-02');
    expect(mondayOf('2026-11-08')).toBe('2026-11-02');
    expect(weekdayOf('2026-11-08')).toBe(6);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('block proposal + realism', () => {
  it('accepts a realistic ask as planned', () => {
    const { proposal } = setup();
    expect(proposal.realism.ok).toBe(true);
    expect(proposal.recommended.targets).toEqual({ gym: 3, run: 2, sport: 1, mobility: 0 });
    expect(proposal.phases).toEqual(['build', 'build', 'peak', 'deload']);
  });

  it('trims 3 gym + 3 runs + tennis to 3 gym + 2 runs + tennis for an athletic goal', () => {
    const p = carlo({ wanted: { gym: 3, run: 3, sport: 1, mobility: 0 } });
    const proposal = coach.proposeBlock(p, p.wanted, p.availability);
    expect(proposal.realism.ok).toBe(false);
    expect(proposal.recommended.targets).toEqual({ gym: 3, run: 2, sport: 1, mobility: 0 });
    expect(proposal.alternative.label).toBe('Endurance bias');
    expect(proposal.alternative.targets).toEqual({ gym: 2, run: 3, sport: 1, mobility: 0 });
  });

  it('offers an alternative with a different bias', () => {
    const { proposal } = setup();
    const r = proposal.recommended.targets;
    const a = proposal.alternative.targets;
    expect(a).not.toEqual(r);
    expect(a.gym + a.run).toBeLessThanOrEqual(r.gym + r.run);
  });

  it('flags an unrealistic ask and suggests a version that fits', () => {
    const avail: DayAvailability[] = carloAvailability().map((d, i) => (i < 3 ? d : { ...d, available: false }));
    const p = carlo({ availability: avail, sports: [] });
    const report = realismCheck({ gym: 4, run: 4, sport: 0, mobility: 0 }, p, avail);
    expect(report.ok).toBe(false);
    expect(report.issues.length).toBeGreaterThan(0);
    const s = report.suggested!;
    expect(s.gym + s.run).toBeLessThanOrEqual(2);
    expect(s.gym).toBeGreaterThanOrEqual(1);
    expect(s.run).toBeGreaterThanOrEqual(1);
  });

  it('never suggests more than a beginner can recover from', () => {
    const p = carlo({ experience: { gym: 'beginner', run: 'beginner' }, sports: [] });
    const t = makeRealistic({ gym: 5, run: 5, sport: 0, mobility: 0 }, p, p.availability);
    expect(t.gym + t.run).toBeLessThanOrEqual(5);
  });
});

describe('week planning', () => {
  it('places every session on a free day, with at least one rest day', () => {
    const { week } = setup();
    const s = week.recommended.sessions;
    expect(s.filter((x) => x.type === 'gym')).toHaveLength(3);
    expect(s.filter((x) => x.type === 'run')).toHaveLength(2);
    expect(s.filter((x) => x.type === 'sport')).toHaveLength(1);
    for (const x of s) expect(carloAvailability()[dayOf(x)].available, x.title).toBe(true);
    const used = new Set(s.map(dayOf));
    // Wednesday is not free, so it is the rest day at least.
    expect(used.has(2)).toBe(false);
  });

  it('keeps tennis on its fixed day (Thursday)', () => {
    const { week } = setup();
    const tennis = week.recommended.sessions.find((x) => x.type === 'sport')!;
    expect(dayOf(tennis)).toBe(3);
    expect(tennis.fixed).toBe(true);
  });

  it('never puts a hard run the day after heavy legs', () => {
    const p = carlo({ wanted: { gym: 4, run: 3, sport: 0, mobility: 0 }, sports: [], experience: { gym: 'intermediate', run: 'intermediate' } });
    p.availability = p.availability.map((d) => ({ ...d, available: true, minutes: 90 }));
    const { week } = setup(p);
    const s = week.recommended.sessions;
    for (const legs of s.filter((x) => x.type === 'gym' && (x.intent === 'lower' || x.intent === 'legs'))) {
      const next = s.filter((x) => dayOf(x) === dayOf(legs) + 1);
      for (const n of next) expect(['tempo', 'intervals', 'progression', 'long']).not.toContain(n.intent);
    }
  });

  it('puts the long run on a long day', () => {
    const { week } = setup(carlo({ wanted: { gym: 2, run: 3, sport: 1, mobility: 0 } }));
    const long = week.recommended.sessions.find((x) => x.intent === 'long')!;
    expect(long).toBeDefined();
    expect(carloAvailability()[dayOf(long)].minutes).toBeGreaterThanOrEqual(90);
  });

  it('is deterministic', () => {
    const a = setup().week.recommended.sessions.map((s) => `${s.date}:${s.intent}`);
    const b = setup().week.recommended.sessions.map((s) => `${s.date}:${s.intent}`);
    expect(a).toEqual(b);
  });

  it('gives a lighter alternative', () => {
    const { week } = setup();
    expect(week.alternative.sessions.length).toBe(week.recommended.sessions.length - 1);
    expect(week.alternativeLabel).toMatch(/Lighter/);
  });

  it('warns when the user moves a session somewhere bad', () => {
    const { week } = setup();
    const run = week.recommended.sessions.find((x) => x.type === 'run')!;
    const moved = coach.moveSession(week.recommended, run.id, addDays(MONDAY, 2)); // Wednesday, not free
    expect(moved.warnings.some((w) => w.message.includes("Wed isn't marked as free"))).toBe(true);
  });

  it('turns quality runs into strides in the deload week, and cuts volume', () => {
    const w0 = setup(carlo(), 0).week.recommended.sessions.filter((s) => s.type === 'run');
    const w3 = setup(carlo(), 3).week.recommended.sessions.filter((s) => s.type === 'run');
    expect(w3.every((s) => !['tempo', 'intervals', 'progression'].includes(s.intent))).toBe(true);
    const sum = (l: PlannedSession[]) => l.reduce((t, s) => t + s.durationMin, 0);
    expect(sum(w3)).toBeLessThan(sum(w0));
  });

  it('weekly run volume grows by at most 10% a week in build weeks', () => {
    for (let i = 1; i < 3; i++) expect(RUN_VOLUME[i] / RUN_VOLUME[i - 1]).toBeLessThanOrEqual(1.1);
  });

  it('keeps done sessions when re-planning mid-week', () => {
    const { block, week } = setup();
    const first = { ...week.recommended.sessions[0], status: 'done' as const };
    const again = coach.planWeek({
      block,
      profile: carlo(),
      weekStart: MONDAY,
      weekIndex: 0,
      focus: 'balanced',
      availability: carloAvailability(),
      history: emptyHistory(),
      keep: [first],
      fromDate: addDays(MONDAY, 3),
    });
    const s = again.recommended.sessions;
    expect(s.find((x) => x.id === first.id)?.status).toBe('done');
    const rest = s.filter((x) => x.id !== first.id);
    for (const x of rest) expect(x.date >= addDays(MONDAY, 3)).toBe(true);
    // Four free days left (Thu–Sun): no cramming, one session a day at most.
    expect(rest.length).toBeLessThanOrEqual(4);
    expect(new Set(rest.map((x) => x.date)).size).toBe(rest.length);
    expect(rest.some((x) => x.type === 'sport')).toBe(true);
  });

  it('chooses a split by sessions per week', () => {
    expect(gymSplit(2)).toEqual(['full-a', 'full-b']);
    expect(gymSplit(4)).toEqual(['upper', 'lower', 'upper', 'lower']);
    expect(gymSplit(6)).toHaveLength(6);
  });

  it('gives beginners one quality run and intermediates two', () => {
    expect(runKinds(3, 'beginner', 0, 'athletic').filter((k) => ['tempo', 'intervals', 'progression'].includes(k))).toHaveLength(1);
    expect(runKinds(4, 'intermediate', 0, 'athletic').filter((k) => ['tempo', 'intervals', 'progression'].includes(k))).toHaveLength(2);
  });

  it('a legs-focus week adds leg emphasis', () => {
    const { week } = setup(carlo(), 0, 'legs');
    const gym = week.recommended.sessions.filter((s) => s.type === 'gym');
    expect(gym.every((g) => g.emphasis === 'lower')).toBe(true);
  });
});

describe('workouts', () => {
  const ctx = () => {
    const { block, week } = setup();
    return { profile: carlo(), block, week: week.recommended, history: emptyHistory() };
  };

  it('builds a full gym workout in the right order', () => {
    const c = ctx();
    const gym = c.week.sessions.find((s) => s.type === 'gym')!;
    const { recommended, alternative } = coach.generateWorkout(gym, c);
    const kinds = recommended.blocks.map((b) => b.kind);
    expect(kinds[0]).toBe('warmup');
    expect(kinds.at(-1)).toBe('cooldown');
    expect(kinds).toContain('main');
    expect(kinds.indexOf('main')).toBeLessThan(kinds.indexOf('accessory'));
    expect(alternative.title).not.toBe(recommended.title);
  });

  it('cuts accessories first when time is short, keeps main lifts', () => {
    const c = ctx();
    const gym = c.week.sessions.find((s) => s.type === 'gym')!;
    const long = coach.generateWorkout({ ...gym, durationMin: 75 }, c).recommended;
    const short = coach.generateWorkout({ ...gym, durationMin: 25 }, c).recommended;
    const mains = (w: Workout) => w.blocks.find((b) => b.kind === 'main')!.items.length;
    const acc = (w: Workout) => w.blocks.find((b) => b.kind === 'accessory')?.items.length ?? 0;
    expect(mains(short)).toBe(mains(long));
    expect(acc(short)).toBeLessThan(acc(long));
    expect(short.durationMin).toBeLessThanOrEqual(30);
  });

  it('only uses equipment available in the chosen context', () => {
    const c = ctx();
    const gym = c.week.sessions.find((s) => s.type === 'gym')!;
    for (const equipment of ['bodyweight', 'home'] as const) {
      const w = coach.generateWorkout({ ...gym, equipment }, c).recommended;
      const allowed = equipment === 'bodyweight' ? ['none'] : ['none', 'dumbbell', 'band'];
      for (const it of strengthItems(w)) {
        const ex = getExercise(it.exerciseId);
        for (const eq of ex.equipment) expect(allowed, `${ex.id} in ${equipment}`).toContain(eq);
      }
    }
  });

  it('keeps main lifts the same across weeks of a block', () => {
    const p = carlo();
    const proposal = coach.proposeBlock(p, p.wanted, p.availability);
    const block = coach.createBlock(p, proposal, 'recommended', MONDAY, emptyHistory());
    const mainsFor = (wi: number) => {
      const week = coach.planWeek({ block, profile: p, weekStart: addDays(MONDAY, wi * 7), weekIndex: wi, focus: 'balanced', availability: p.availability, history: emptyHistory() }).recommended;
      const s = week.sessions.find((x) => x.intent === 'full-a')!;
      const w = coach.generateWorkout(s, { profile: p, block, week, history: emptyHistory() }).recommended;
      return w.blocks.find((b) => b.kind === 'main')!.items.map((i) => (i as StrengthItem).exerciseId);
    };
    expect(mainsFor(1)).toEqual(mainsFor(0));
  });

  it('swaps an exercise when asked', () => {
    const c = ctx();
    const gym = c.week.sessions.find((s) => s.type === 'gym')!;
    const w = coach.generateWorkout(gym, c).recommended;
    const first = w.blocks.find((b) => b.kind === 'main')!.items[0] as StrengthItem;
    const sub = getExercise(first.exerciseId).substitutions[0];
    const w2 = coach.generateWorkout(gym, { ...c, swaps: { [first.exerciseId]: sub } }).recommended;
    expect((w2.blocks.find((b) => b.kind === 'main')!.items[0] as StrengthItem).exerciseId).toBe(sub);
  });

  it('builds a run with warm-up, intervals and cool-down', () => {
    const w = generateRun({ sessionId: 'x', kind: 'intervals', durationMin: 40, equipment: 'outdoors', experience: 'intermediate', phase: 'build', weekIndex: 0, history: emptyHistory() });
    const steps = w.blocks[0].items;
    expect(steps[0].kind === 'run' && steps[0].effort).toBe('easy');
    expect(steps.filter((s) => s.kind === 'run' && s.effort === 'hard').length).toBeGreaterThanOrEqual(3);
    expect(Math.abs(w.durationMin - 40)).toBeLessThanOrEqual(5);
  });

  it('beginner easy runs are run/walk; alternative is continuous', () => {
    const base = { sessionId: 'x', kind: 'easy' as const, durationMin: 30, equipment: 'outdoors' as const, experience: 'beginner' as const, phase: 'build' as const, weekIndex: 0, history: emptyHistory() };
    const rec = generateRun(base, 'recommended');
    const alt = generateRun(base, 'alternative');
    expect(rec.blocks[0].items.some((s) => s.kind === 'run' && s.effort === 'walk')).toBe(true);
    expect(alt.blocks[0].items).toHaveLength(1);
  });

  it('uses a treadmill title in the gym', () => {
    const w = generateRun({ sessionId: 'x', kind: 'tempo', durationMin: 40, equipment: 'gym', experience: 'intermediate', phase: 'build', weekIndex: 0, history: emptyHistory() });
    expect(w.title.startsWith('Treadmill')).toBe(true);
  });

  it('sport sessions have a prep routine and an alternative', () => {
    const c = ctx();
    const tennis = c.week.sessions.find((s) => s.type === 'sport')!;
    const o = coach.generateWorkout(tennis, c);
    expect(o.recommended.blocks[0].items.length).toBeGreaterThan(0);
    expect(o.alternative.title).toMatch(/conditioning/);
  });
});

describe('training style', () => {
  const gymWorkout = (style: Profile['style'], exp: Profile['experience']['gym'] = 'intermediate') => {
    const p = carlo({ style, experience: { gym: exp, run: 'beginner' } });
    const { block, week } = setup(p);
    const out: Workout[] = [];
    for (const s of week.recommended.sessions.filter((x) => x.type === 'gym')) {
      const o = coach.generateWorkout(s, { profile: p, block, week: week.recommended, history: emptyHistory() });
      out.push(o.recommended, o.alternative);
    }
    return out;
  };

  it('calisthenics (the default) never uses machines or cables', () => {
    for (const w of gymWorkout(undefined)) {
      for (const it of strengthItems(w)) {
        const e = getExercise(it.exerciseId);
        expect(e.equipment, e.id).not.toContain('machine');
        expect(e.equipment, e.id).not.toContain('cable');
      }
    }
  });

  it('calisthenics: loaded lifts are only the few classics', () => {
    for (const w of gymWorkout('calisthenics')) {
      for (const it of strengthItems(w)) {
        const e = getExercise(it.exerciseId);
        const loaded = e.equipment.some((x) => ['barbell', 'dumbbell', 'kettlebell'].includes(x));
        if (loaded) expect(e.classic, e.id).toBe(true);
      }
    }
  });

  it('calisthenics: upper-body main lifts are bodyweight, leg main lifts are classic barbell', () => {
    const w = gymWorkout('calisthenics')[0];
    const mains = (w.blocks.find((b) => b.kind === 'main')!.items as StrengthItem[]).map((i) => getExercise(i.exerciseId));
    for (const e of mains) {
      if (e.pattern === 'push' || e.pattern === 'pull') expect(e.equipment.some((x) => ['barbell', 'dumbbell'].includes(x)), e.id).toBe(false);
      if (e.pattern === 'squat' || e.pattern === 'hinge') expect(e.equipment, e.id).toContain('barbell');
    }
  });

  it('"anything" style may use machines', () => {
    const ids = gymWorkout('all').flatMap((w) => strengthItems(w).map((i) => getExercise(i.exerciseId)));
    expect(ids.some((e) => e.equipment.includes('machine') || e.equipment.includes('cable'))).toBe(true);
  });
});

describe('progression', () => {
  const ex = () => getExercise('goblet-squat');
  const log = (reps: number[], w: number, date = '2026-11-02'): SetLog[] =>
    reps.map((r, i) => ({ id: `s${i}`, sessionId: 'sess1', exerciseId: 'goblet-squat', date, setIndex: i, weightKg: w, reps: r, done: true }));
  const h = (sets: SetLog[]): History => ({ sets, sessions: [] });
  const range = { kind: 'reps' as const, min: 8, max: 12 };

  it('adds load when every set hits the top of the range', () => {
    const s = suggestLoad(ex(), range, h(log([12, 12, 12], 20)));
    expect(s.weightKg).toBe(22);
  });

  it('keeps the load and adds reps otherwise', () => {
    const s = suggestLoad(ex(), range, h(log([12, 10, 9], 20)));
    expect(s.weightKg).toBe(20);
    expect(s.reps).toBe(12);
  });

  it('drops the load if most sets fell short', () => {
    const s = suggestLoad(ex(), range, h(log([6, 5, 7], 20)));
    expect(s.weightKg).toBeLessThan(20);
  });

  it('lightens in deload weeks', () => {
    const s = suggestLoad(ex(), range, h(log([10, 10, 10], 20)), { phase: 'deload' });
    expect(s.weightKg).toBeLessThan(20);
  });

  it('asks for a working weight the first time', () => {
    const s = suggestLoad(ex(), range, h([]));
    expect(s.weightKg).toBeUndefined();
    expect(s.reason).toMatch(/First time/);
  });

  it('estimates 1RM with Epley', () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(Math.round(e1rm(100, 10))).toBe(133);
  });
});

describe('calendar export', () => {
  it('writes one event per session', () => {
    const { week } = setup();
    const ics = weekToIcs(week.recommended.sessions, carloAvailability(), new Date('2026-11-01T00:00:00Z'));
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(week.recommended.sessions.length);
    expect(ics).toContain('DTSTART:20261105T18');
  });
});
