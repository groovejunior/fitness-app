import { describe, expect, it } from 'vitest';
import { getExercise, isAvailable } from '../../content/exercises';
import { buildGymWorkout, TEMPLATES, type WorkoutRequest } from '../gym';
import { buildRunWorkout } from '../run';
import { buildWorkouts, substitutes, swapExercise } from '../workout';
import { beginner, carlo } from './fixtures';
import { EMPTY_HISTORY, type EquipmentContext, type GymDay, type History, type PlannedSlot, type RunKind, type Workout } from '../types';

const gymSlot = (gymDay: GymDay = 'full', variant = 0): PlannedSlot => ({ id: 'gym-0', day: 0, type: 'gym', title: 'Full body A', intent: '', minutes: 55, load: 'hard', gymDay, variant });
const req = (over: Partial<WorkoutRequest> = {}): WorkoutRequest => ({
  slot: gymSlot(),
  profile: carlo,
  equipment: 'gym',
  minutes: 55,
  intensity: 'normal',
  phase: 'build',
  weekIndex: 0,
  history: EMPTY_HISTORY,
  ...over,
});
const items = (w: Workout) => w.sections.flatMap((s) => s.items);
const mainIds = (w: Workout) => w.sections.find((s) => s.kind === 'main')!.items.map((i) => i.exerciseId);
const totalSets = (w: Workout) => items(w).reduce((s, i) => s + i.sets, 0);

describe('gym workouts', () => {
  it('runs warm-up, main lifts, accessories, core, cool-down in that order', () => {
    const kinds = buildGymWorkout(req(), 'recommended').sections.map((s) => s.kind);
    expect(kinds[0]).toBe('warmup');
    expect(kinds[1]).toBe('main');
    expect(kinds.indexOf('accessory')).toBeGreaterThan(kinds.indexOf('main'));
    expect(kinds[kinds.length - 1]).toBe('cooldown');
  });

  it('fits the time asked for, from 20 to 90 minutes', () => {
    for (const minutes of [20, 30, 45, 60, 75, 90]) {
      for (const equipment of ['gym', 'home', 'bodyweight', 'outdoors'] as EquipmentContext[]) {
        const w = buildGymWorkout(req({ minutes, equipment }), 'recommended');
        expect(w.estimatedMinutes, `${minutes} min ${equipment}`).toBeLessThanOrEqual(minutes + 5);
        if (minutes >= 30) expect(w.estimatedMinutes, `${minutes} min ${equipment}`).toBeGreaterThanOrEqual(minutes - 12);
      }
    }
  });

  it('keeps the main lifts when time is cut and adds work when there is more', () => {
    const short = buildGymWorkout(req({ minutes: 30 }), 'recommended');
    const normal = buildGymWorkout(req({ minutes: 55 }), 'recommended');
    const long = buildGymWorkout(req({ minutes: 90 }), 'recommended');
    expect(mainIds(short)).toEqual(mainIds(normal));
    expect(totalSets(short)).toBeLessThan(totalSets(normal));
    expect(totalSets(long)).toBeGreaterThan(totalSets(normal));
    expect(short.sections.some((s) => s.kind === 'accessory' && s.items.length >= 3)).toBe(false);
  });

  it('only uses exercises the equipment allows, for every template', () => {
    for (const [gymDay, list] of Object.entries(TEMPLATES)) {
      list.forEach((_, variant) => {
        for (const equipment of ['gym', 'home', 'bodyweight', 'outdoors'] as EquipmentContext[]) {
          for (const v of ['recommended', 'alternative'] as const) {
            const w = buildGymWorkout(req({ slot: gymSlot(gymDay as GymDay, variant), equipment }), v);
            for (const it of items(w)) expect(isAvailable(getExercise(it.exerciseId), equipment), `${it.exerciseId} in ${equipment}`).toBe(true);
            expect(w.sections.find((s) => s.kind === 'main')?.items.length ?? 0).toBeGreaterThanOrEqual(1);
          }
        }
      });
    }
  });

  it('never repeats an exercise inside one workout', () => {
    for (const gymDay of Object.keys(TEMPLATES) as GymDay[]) {
      const w = buildGymWorkout(req({ slot: gymSlot(gymDay), minutes: 90 }), 'recommended');
      const ids = items(w).filter((i) => !i.id.startsWith('warmup') && !i.id.startsWith('cooldown')).map((i) => i.exerciseId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('chooses barbell lifts for intermediates and simpler ones for beginners', () => {
    expect(mainIds(buildGymWorkout(req(), 'recommended'))).toContain('back-squat');
    expect(mainIds(buildGymWorkout(req({ profile: beginner }), 'recommended'))).toContain('goblet-squat');
  });

  it('alternative changes exercises and pairs accessories into supersets', () => {
    const r = buildWorkouts(req());
    const a = items(r.alternative).filter((i) => !i.id.startsWith('warmup') && !i.id.startsWith('cooldown'));
    const rec = new Set(items(r.recommended).map((i) => i.exerciseId));
    const changed = a.filter((i) => !rec.has(i.exerciseId)).length;
    expect(changed / a.length).toBeGreaterThanOrEqual(0.5);
    expect(a.some((i) => i.group === 'A')).toBe(true);
    expect(r.alternative.label).toBe('Supersets');
  });

  it('scales with intensity and deloads', () => {
    const easy = buildGymWorkout(req({ intensity: 'easy', minutes: 90 }), 'recommended');
    const hard = buildGymWorkout(req({ intensity: 'hard', minutes: 90 }), 'recommended');
    const mainSets = (w: Workout) => w.sections.find((s) => s.kind === 'main')!.items[0].sets;
    expect(mainSets(easy)).toBeLessThan(mainSets(hard));
    const deload = buildGymWorkout(req({ phase: 'deload' }), 'recommended');
    expect(mainSets(deload)).toBeLessThanOrEqual(3);
  });

  it('uses lower reps in the peak week', () => {
    const build = buildGymWorkout(req(), 'recommended').sections.find((s) => s.kind === 'main')!.items[0];
    const peak = buildGymWorkout(req({ phase: 'peak' }), 'recommended').sections.find((s) => s.kind === 'main')!.items[0];
    expect(peak.repsMax).toBeLessThan(build.repsMax);
  });

  it('suggests weight from history', () => {
    const history: History = {
      exercises: [{ date: '2026-10-28', exerciseId: 'back-squat', repsMin: 5, repsMax: 8, sets: [1, 2, 3, 4].map(() => ({ weightKg: 80, reps: 8, done: true })) }],
      runs: [],
    };
    const w = buildGymWorkout(req({ history }), 'recommended');
    const squat = items(w).find((i) => i.exerciseId === 'back-squat')!;
    expect(squat.targetKg).toBe(85);
  });

  it('is deterministic', () => {
    expect(buildWorkouts(req())).toEqual(buildWorkouts(req()));
  });
});

describe('substitutions', () => {
  it('lists same-slot swaps first, all usable with the equipment', () => {
    const subs = substitutes('back-squat', 'home');
    expect(subs[0].slot).toBe('squat');
    expect(subs.every((s) => isAvailable(s, 'home'))).toBe(true);
    expect(subs.some((s) => s.id === 'back-squat')).toBe(false);
  });

  it('every exercise has at least one swap in the gym', () => {
    for (const id of ['bench-press', 'pull-up', 'plank', 'deadlift', 'face-pull', 'farmers-carry']) expect(substitutes(id, 'gym').length).toBeGreaterThan(0);
  });

  it('swapping keeps the slot and recomputes the prescription', () => {
    const w = buildGymWorkout(req(), 'recommended');
    const squat = items(w).find((i) => i.exerciseId === 'back-squat')!;
    const swapped = swapExercise(w, squat.id, 'bodyweight-squat', { profile: carlo, history: EMPTY_HISTORY, phase: 'build' });
    const now = items(swapped).find((i) => i.exerciseId === 'bodyweight-squat')!;
    expect(now.sets).toBe(squat.sets);
    expect(now.targetKg).toBeNull();
    expect(now.repsMax).toBeGreaterThan(squat.repsMax);
    expect(items(swapped)).toHaveLength(items(w).length);
  });
});

describe('runs', () => {
  const runSlot = (runKind: RunKind, minutes = 40, hardSec?: number): PlannedSlot => ({ id: `run-${runKind}`, day: 2, type: 'run', title: runKind, intent: '', minutes, load: 'hard', runKind, hardSec });
  const run = (kind: RunKind, over: Partial<WorkoutRequest> = {}, v: 'recommended' | 'alternative' = 'recommended', hardSec?: number) =>
    buildRunWorkout(req({ slot: runSlot(kind, over.minutes ?? 40, hardSec), equipment: 'outdoors', minutes: 40, ...over }), v).run!;

  it('easy and long runs stay easy', () => {
    for (const k of ['easy', 'long', 'recovery'] as RunKind[]) {
      const r = run(k);
      expect(r.hardSec).toBe(0);
      expect(r.steps.every((s) => s.zone <= 2)).toBe(true);
    }
  });

  it('quality runs have a warm-up and cool-down and match the duration', () => {
    for (const k of ['tempo', 'intervals'] as RunKind[]) {
      const r = run(k, { minutes: 45 });
      expect(r.steps[0].label).toBe('Warm-up');
      expect(r.steps[r.steps.length - 1].label).toBe('Cool-down');
      expect(Math.abs(r.totalSec - 45 * 60)).toBeLessThanOrEqual(5 * 60);
      expect(r.hardSec).toBeGreaterThan(0);
    }
  });

  it('respects the hard-work budget', () => {
    const r = run('intervals', { minutes: 45 }, 'recommended', 600);
    expect(r.hardSec).toBeLessThanOrEqual(600);
  });

  it('progresses intervals across the block', () => {
    const w0 = run('intervals', { weekIndex: 0, minutes: 50 }, 'recommended', 3000);
    const w1 = run('intervals', { weekIndex: 1, minutes: 50 }, 'recommended', 3000);
    expect(w1.hardSec).toBeGreaterThan(w0.hardSec);
  });

  it('has treadmill and hill variants as alternatives', () => {
    expect(buildRunWorkout(req({ slot: runSlot('intervals'), equipment: 'gym', minutes: 40 }), 'alternative').label).toBe('Incline repeats');
    expect(buildRunWorkout(req({ slot: runSlot('intervals'), equipment: 'outdoors', minutes: 40 }), 'alternative').label).toBe('Hill repeats');
    expect(buildRunWorkout(req({ slot: runSlot('tempo'), equipment: 'outdoors', minutes: 40 }), 'alternative').label).toBe('Fartlek');
    expect(run('easy', {}, 'alternative').steps.some((s) => s.effort === 'walk')).toBe(true);
  });

  it('gives pace targets once there is run history', () => {
    const history: History = { exercises: [], runs: [{ date: '2026-10-30', kind: 'easy', distanceKm: 6, durationSec: 6 * 330 }] };
    const r = run('tempo', { history });
    expect(r.paceHint).toMatch(/5:30/);
    expect(r.steps.find((s) => s.effort === 'tempo')!.hint).toMatch(/\/km/);
  });
});

describe('sport and mobility', () => {
  const sportSlot: PlannedSlot = { id: 'sport-0', day: 3, type: 'sport', title: 'Tennis', intent: '', minutes: 90, load: 'hard', sportId: 'tennis' };
  it('sport days get prep; the alternative adds conditioning', () => {
    const r = buildWorkouts(req({ slot: sportSlot, minutes: 90 }));
    expect(r.recommended.sections[0].kind).toBe('prep');
    expect(r.recommended.sections.some((s) => s.kind === 'conditioning')).toBe(false);
    expect(r.alternative.sections.some((s) => s.kind === 'conditioning')).toBe(true);
  });

  it('mobility fits the time', () => {
    const slot: PlannedSlot = { id: 'mobility-0', day: 1, type: 'mobility', title: 'Mobility', intent: '', minutes: 20, load: 'easy' };
    for (const minutes of [10, 20, 30]) {
      const w = buildWorkouts(req({ slot, minutes, equipment: 'bodyweight' })).recommended;
      expect(w.estimatedMinutes).toBeLessThanOrEqual(minutes + 2);
    }
  });
});

describe('training style', () => {
  const allItems = (w: Workout) => w.sections.flatMap((s) => s.items).map((i) => getExercise(i.exerciseId));
  const days: Array<[GymDay, number]> = [['full', 0], ['full', 1], ['full', 2], ['upper', 0], ['upper', 1], ['lower', 0], ['push', 0], ['pull', 0], ['legs', 0]];

  it('bodyweight first is the default: no machines or cables, only classic loaded lifts', () => {
    for (const [gymDay, variant] of days) {
      for (const v of ['recommended', 'alternative'] as const) {
        const w = buildGymWorkout(req({ slot: gymSlot(gymDay, variant), minutes: 75 }), v);
        for (const ex of allItems(w)) {
          expect(ex.equipment.includes('cable'), ex.id).toBe(false);
          if (ex.loaded) expect(ex.classic, `${ex.id} in ${gymDay}${variant}`).toBe(true);
        }
      }
    }
  });

  it('upper-body main moves are bodyweight, leg main lifts stay barbell', () => {
    const upper = buildGymWorkout(req({ slot: gymSlot('upper', 0) }), 'recommended');
    expect(mainIds(upper).every((id) => !getExercise(id).loaded)).toBe(true);
    const lower = buildGymWorkout(req({ slot: gymSlot('lower', 0) }), 'recommended');
    expect(mainIds(lower)).toEqual(['back-squat', 'deadlift']);
  });

  it('pull-ups and dips use 5–8 reps', () => {
    const upper = buildGymWorkout(req({ slot: gymSlot('upper', 0) }), 'recommended');
    const pu = items(upper).find((i) => i.exerciseId === 'pull-up')!;
    expect([pu.repsMin, pu.repsMax]).toEqual([5, 8]);
  });

  it('"anything" can use machines, "free weights" cannot', () => {
    const anyIds = items(buildGymWorkout(req({ profile: { ...carlo, style: 'all' }, slot: gymSlot('full', 2) }), 'recommended')).map((i) => i.exerciseId);
    expect(anyIds).toContain('lat-pulldown');
    const fw = buildGymWorkout(req({ profile: { ...carlo, style: 'freeWeights' }, slot: gymSlot('upper', 0) }), 'recommended');
    expect(allItems(fw).some((e) => e.equipment.includes('cable'))).toBe(false);
    expect(mainIds(fw)).toContain('bench-press');
  });

  it('swaps that fit the style come first', () => {
    const subs = substitutes('bench-press', 'gym', 'calisthenics');
    expect(subs[0].id).toBe('push-up');
  });
});
