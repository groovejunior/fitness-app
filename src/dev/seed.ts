import { addDays, coach, mondayOf, type Profile, type WeekAvailability } from '../engine';
import { db } from '../data/db';
import { createBlock, ensureWeek, loadHistory, resetAll, saveProfile, saveSettings } from '../data/repo';
import type { SessionRecord, SetRecord } from '../data/types';
import { today } from '../lib/today';

export const DEMO_PROFILE: Profile = {
  name: 'Carlo',
  age: 21,
  bodyWeightKg: 76,
  goal: 'athletic',
  experience: { gym: 'intermediate', run: 'intermediate' },
  sports: ['tennis', 'waterski'],
  defaultEquipment: 'gym',
  gymAccess: true,
};

export const DEMO_AVAILABILITY: WeekAvailability = [
  { available: true, minutes: 75, window: 'evening' },
  { available: true, minutes: 60, window: 'morning' },
  { available: false, minutes: 60, window: 'evening' },
  { available: true, minutes: 90, window: 'evening' },
  { available: true, minutes: 60, window: 'evening' },
  { available: true, minutes: 120, window: 'morning' },
  { available: true, minutes: 90, window: 'morning' },
];

/**
 * Demo data: four finished weeks of history (a previous block) and a current block,
 * so every screen has something to show. Dev and screenshots only.
 */
export async function seedDemo(withHistory = true): Promise<void> {
  await resetAll();
  await saveProfile(DEMO_PROFILE);
  await saveSettings({ units: 'metric', theme: 'system' });
  const t = today();
  const thisWeek = mondayOf(t);
  const targets = { gym: 3, run: 2, sport: 1, mobility: 1 };
  if (withHistory) {
    const prevStart = addDays(thisWeek, -28);
    await createBlock(DEMO_PROFILE, targets, DEMO_AVAILABILITY, prevStart);
    for (let w = 0; w < 4; w++) {
      const weekStart = addDays(prevStart, w * 7);
      const week = await ensureWeek(weekStart);
      if (!week) continue;
      const history = await loadHistory();
      for (const slot of week.plan.slots) {
        // Miss about one session in six.
        if ((w * 7 + slot.day) % 6 === 5) continue;
        const date = addDays(weekStart, slot.day);
        const workout = coach.buildWorkouts({ slot, profile: DEMO_PROFILE, equipment: slot.type === 'run' ? 'outdoors' : 'gym', minutes: slot.minutes, intensity: 'normal', phase: week.plan.phase, weekIndex: w, history }).recommended;
        const id = `${weekStart}:${slot.id}`;
        const rec: SessionRecord = {
          id, weekStart, slotId: slot.id, date, type: slot.type, title: workout.title, status: 'done', slot, workout,
          durationMin: workout.estimatedMinutes, effort: 6 + ((w + slot.day) % 3), finishedAt: Date.now(),
        };
        if (slot.type === 'run' && workout.run) {
          const pace = 345 - w * 4 + (slot.runKind === 'long' ? 15 : 0);
          rec.run = { durationSec: workout.run.totalSec, distanceKm: Math.round((workout.run.totalSec / pace) * 10) / 10 };
        }
        await db.sessions.put(rec);
        const sets: SetRecord[] = [];
        for (const sec of workout.sections) {
          if (sec.kind === 'warmup' || sec.kind === 'cooldown' || sec.kind === 'prep') continue;
          for (const it of sec.items) {
            const kg = it.targetKg ?? (it.exerciseId === 'back-squat' ? 70 : it.exerciseId === 'bench-press' ? 55 : it.exerciseId === 'deadlift' ? 90 : it.exerciseId === 'overhead-press' ? 35 : null);
            for (let i = 0; i < it.sets; i++) {
              const reps = w === 0 ? it.repsMax - 1 : it.repsMax - (i === it.sets - 1 && w % 2 === 1 ? 1 : 0);
              sets.push({ sessionId: id, date, exerciseId: it.exerciseId, itemId: it.id, setIndex: i, weightKg: kg, reps, repsMin: it.repsMin, repsMax: it.repsMax, done: true });
            }
          }
        }
        await db.sets.bulkAdd(sets);
      }
    }
  }
  await createBlock(DEMO_PROFILE, targets, DEMO_AVAILABILITY, thisWeek);
  await ensureWeek(thisWeek);
}
