import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { coach, mondayOf, toISODate } from '../engine';
import { carlo, everyDay } from '../engine/__tests__/fixtures';
import { db } from './db';
import * as repo from './repo';

const todayIso = toISODate(new Date());
const weekStart = mondayOf(todayIso);

async function setup() {
  await repo.resetAll();
  await repo.saveProfile(carlo);
  await repo.createBlock(carlo, { gym: 3, run: 2, sport: 1, mobility: 0 }, everyDay, todayIso);
  return (await repo.ensureWeek(weekStart))!;
}

describe('data layer', () => {
  beforeEach(async () => {
    await db.open();
  });

  it('creates a block and generates the current week once', async () => {
    const w = await setup();
    expect(w.plan.slots.length).toBeGreaterThan(0);
    const again = await repo.ensureWeek(weekStart);
    expect(again).toEqual(w);
  });

  it('logs a workout and feeds the history back to the engine', async () => {
    const w = await setup();
    const slot = w.plan.slots.find((s) => s.type === 'gym')!;
    const history = await repo.loadHistory();
    const workout = coach.buildWorkouts({ slot, profile: carlo, equipment: 'gym', minutes: 55, intensity: 'normal', phase: 'build', weekIndex: 0, history }).recommended;
    const rec = await repo.commitSession(weekStart, slot, workout);
    await repo.startSession(rec.id);
    const item = workout.sections.find((s) => s.kind === 'main')!.items[0];
    for (let i = 0; i < item.sets; i++) {
      await repo.logSet({ sessionId: rec.id, date: todayIso, exerciseId: item.exerciseId, itemId: item.id, setIndex: i, weightKg: 60, reps: item.repsMax, repsMin: item.repsMin, repsMax: item.repsMax, done: true });
    }
    await repo.finishSession(rec.id, { effort: 7 });
    const done = await db.sessions.get(rec.id);
    expect(done?.status).toBe('done');
    const h = await repo.loadHistory();
    expect(h.exercises).toHaveLength(1);
    const next = coach.suggestLoad((await import('../content/exercises')).getExercise(item.exerciseId), item.repsMin, item.repsMax, h, 'build');
    expect(next.kg).toBeGreaterThan(60);
  });

  it('updates a logged set instead of duplicating it', async () => {
    await setup();
    const base = { sessionId: 's', date: todayIso, exerciseId: 'push-up', itemId: 'main-0-push-up', setIndex: 0, weightKg: null, reps: 10, repsMin: 8, repsMax: 12, done: true };
    await repo.logSet(base);
    await repo.logSet({ ...base, reps: 12 });
    const sets = await db.sets.where('sessionId').equals('s').toArray();
    expect(sets).toHaveLength(1);
    expect(sets[0].reps).toBe(12);
  });

  it('moves a session and keeps it pinned on re-plan', async () => {
    const w = await setup();
    const slot = w.plan.slots.find((s) => s.type === 'gym')!;
    const target = ((slot.day + 1) % 7) as 0;
    await repo.moveSlot(weekStart, slot.id, target);
    await repo.replanWeek(weekStart, { focus: 'balanced' });
    const after = await db.weeks.get(weekStart);
    expect(after!.plan.slots.find((s) => s.id === slot.id)!.day).toBe(target);
  });

  it('round-trips a JSON backup', async () => {
    await setup();
    const backup = await repo.exportBackup();
    const text = JSON.stringify(backup);
    await repo.resetAll();
    expect(await repo.getProfile()).toBeUndefined();
    await repo.importBackup(repo.parseBackup(text));
    expect(await repo.getProfile()).toEqual(carlo);
    expect(await db.weeks.count()).toBe(backup.data.weeks.length);
  });

  it('rejects files that are not backups', () => {
    expect(() => repo.parseBackup('nope')).toThrow(/valid JSON/);
    expect(() => repo.parseBackup('{"app":"other"}')).toThrow(/backup from this app/);
  });
});
