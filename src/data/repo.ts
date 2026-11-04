import { addDays, coach, daysBetween, mondayOf, type Block, type DayIndex, type History, type PlannedSlot, type Profile, type Targets, type WeekAvailability, type WeekFocus, type WeekPlan, type Workout } from '../engine';
import { today } from '../lib/today';
import { db } from './db';
import { DEFAULT_SETTINGS, type BlockRecord, type SessionRecord, type SetRecord, type Settings, type WeekRecord } from './types';

// ---------------------------------------------------------------- profile + settings

export async function getProfile(): Promise<Profile | undefined> {
  return (await db.kv.get('profile'))?.value as Profile | undefined;
}

export async function saveProfile(p: Profile): Promise<void> {
  await db.kv.put({ key: 'profile', value: p });
}

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...((await db.kv.get('settings'))?.value as Partial<Settings> | undefined) };
}

export async function saveSettings(s: Partial<Settings>): Promise<void> {
  const cur = await getSettings();
  await db.kv.put({ key: 'settings', value: { ...cur, ...s } });
}

// ---------------------------------------------------------------- history

/** Everything the engine needs to progress: logged sets and finished runs. */
export async function loadHistory(): Promise<History> {
  const [sets, sessions] = await Promise.all([db.sets.toArray(), db.sessions.where('status').equals('done').toArray()]);
  const groups = new Map<string, SetRecord[]>();
  for (const s of sets) {
    const k = `${s.sessionId}|${s.itemId}`;
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  const exercises = [...groups.values()].map((g) => {
    const sorted = g.sort((a, b) => a.setIndex - b.setIndex);
    return {
      date: sorted[0].date,
      exerciseId: sorted[0].exerciseId,
      repsMin: sorted[0].repsMin,
      repsMax: sorted[0].repsMax,
      sets: sorted.map((s) => ({ weightKg: s.weightKg, reps: s.reps, done: s.done })),
    };
  });
  const runs = sessions
    .filter((s) => s.type === 'run' && (s.run?.durationSec ?? 0) > 0)
    .map((s) => ({
      date: s.date,
      kind: s.workout?.run?.kind ?? s.slot.runKind ?? 'easy',
      distanceKm: s.run?.distanceKm ?? 0,
      durationSec: s.run?.durationSec ?? 0,
    }));
  return { exercises, runs };
}

// ---------------------------------------------------------------- blocks

export async function allBlocks(): Promise<BlockRecord[]> {
  return db.blocks.orderBy('startDate').toArray();
}

/** The block covering `date`, or the most recent one if it has ended. */
export async function blockFor(date = today()): Promise<BlockRecord | undefined> {
  const blocks = await allBlocks();
  const covering = blocks.filter((b) => b.startDate <= date && daysBetween(b.startDate, date) < 28);
  return covering[covering.length - 1] ?? blocks[blocks.length - 1];
}

export function blockIsOver(block: Block, date = today()): boolean {
  return daysBetween(block.startDate, date) >= 28;
}

export function weekIndexOf(block: Block, date = today()): number {
  return Math.max(0, Math.min(3, Math.floor(daysBetween(block.startDate, mondayOf(date)) / 7)));
}

export async function createBlock(profile: Profile, requested: Targets, availability: WeekAvailability, startDate = today()): Promise<BlockRecord> {
  const [history, blocks] = await Promise.all([loadHistory(), allBlocks()]);
  const start = mondayOf(startDate);
  const previousBlock = [...blocks].reverse().find((b) => b.startDate < start);
  const block = coach.planMonth({ profile, requested, availability, startDate: start, history, previousBlock });
  const rec: BlockRecord = { ...block, createdAt: Date.now(), input: { requested, availability } };
  await db.transaction('rw', db.blocks, db.weeks, async () => {
    await db.blocks.put(rec);
    // Weeks generated from an older version of this block are stale.
    const stale = await db.weeks.where('blockId').equals(rec.id).primaryKeys();
    await db.weeks.bulkDelete(stale);
  });
  return rec;
}

export async function chooseBlock(blockId: string, key: 'recommended' | 'alternative', profile: Profile): Promise<void> {
  const b = await db.blocks.get(blockId);
  if (!b) return;
  const history = await loadHistory();
  const next = coach.chooseBlockOption(b, key, { profile, history });
  await db.transaction('rw', db.blocks, db.weeks, async () => {
    await db.blocks.put({ ...b, ...next });
    // Re-plan weeks that have not started yet.
    const weeks = await db.weeks.where('blockId').equals(blockId).toArray();
    const cur = mondayOf(today());
    await db.weeks.bulkDelete(weeks.filter((w) => w.weekStart >= cur).map((w) => w.weekStart));
  });
}

// ---------------------------------------------------------------- weeks

function makeWeek(block: BlockRecord, profile: Profile, weekStart: string, opts: { focus?: WeekFocus; availability?: WeekAvailability; pinned?: PlannedSlot[] } = {}): WeekRecord {
  const weekIndex = Math.max(0, Math.min(3, Math.floor(daysBetween(block.startDate, weekStart) / 7)));
  const r = coach.planWeek({ block, profile, weekIndex, weekStart, focus: opts.focus, availability: opts.availability, pinned: opts.pinned });
  return { weekStart, blockId: block.id, plan: r.recommended, recommended: r.recommended, alternative: r.alternative };
}

/** Get a week's plan, generating and saving it on first visit. */
export async function ensureWeek(weekStart: string): Promise<WeekRecord | undefined> {
  const existing = await db.weeks.get(weekStart);
  if (existing) return existing;
  const [profile, block] = await Promise.all([getProfile(), blockFor(weekStart)]);
  if (!profile || !block || weekStart < block.startDate || daysBetween(block.startDate, weekStart) >= 28) return undefined;
  const rec = makeWeek(block, profile, weekStart);
  await db.weeks.put(rec);
  return rec;
}

/** Re-plan a week after availability or focus changes. Sessions the user moved stay put. */
export async function replanWeek(weekStart: string, changes: { focus?: WeekFocus; availability?: WeekAvailability }): Promise<void> {
  const cur = await db.weeks.get(weekStart);
  const [profile, block] = await Promise.all([getProfile(), cur ? db.blocks.get(cur.blockId) : blockFor(weekStart)]);
  if (!profile || !block) return;
  const focus = changes.focus ?? cur?.plan.focus;
  const availability = changes.availability ?? cur?.plan.availability;
  const pinned = (cur?.plan.slots ?? []).filter((s) => s.pinned);
  const rec = makeWeek(block, profile, weekStart, { focus, availability, pinned });
  await db.weeks.put(rec);
}

export async function chooseWeekOption(weekStart: string, key: 'recommended' | 'alternative'): Promise<void> {
  const cur = await db.weeks.get(weekStart);
  if (!cur) return;
  await db.weeks.put({ ...cur, plan: key === 'recommended' ? cur.recommended : cur.alternative });
}

export async function moveSlot(weekStart: string, slotId: string, toDay: DayIndex): Promise<void> {
  const [cur, profile] = await Promise.all([db.weeks.get(weekStart), getProfile()]);
  if (!cur || !profile) return;
  const plan = coach.moveSession(cur.plan, slotId, toDay, profile);
  await db.transaction('rw', db.weeks, db.sessions, async () => {
    await db.weeks.put({ ...cur, plan });
    // Keep dates of not-yet-done sessions in sync with the move.
    for (const s of plan.slots) {
      const id = `${weekStart}:${s.id}`;
      const rec = await db.sessions.get(id);
      if (rec && rec.status !== 'done') await db.sessions.update(id, { date: addDays(weekStart, s.day), slot: s });
    }
  });
}

// ---------------------------------------------------------------- sessions

export const sessionId = (weekStart: string, slotId: string) => `${weekStart}:${slotId}`;

/** "Today I'm doing this": save the chosen workout for the slot. */
export async function commitSession(weekStart: string, slot: PlannedSlot, workout: Workout): Promise<SessionRecord> {
  const id = sessionId(weekStart, slot.id);
  const existing = await db.sessions.get(id);
  const rec: SessionRecord = {
    ...(existing ?? {}),
    id,
    weekStart,
    slotId: slot.id,
    date: existing?.status === 'done' ? existing.date : addDays(weekStart, slot.day),
    type: slot.type,
    title: workout.title,
    status: existing?.status === 'in_progress' ? 'in_progress' : 'committed',
    slot,
    workout,
  };
  await db.sessions.put(rec);
  return rec;
}

export async function startSession(id: string): Promise<void> {
  const s = await db.sessions.get(id);
  if (!s) return;
  // A session done on another day than planned counts on the day it was done.
  await db.sessions.update(id, { status: 'in_progress', startedAt: s.startedAt ?? Date.now(), date: today() });
}

export async function saveCursor(id: string, cursor: number): Promise<void> {
  await db.sessions.update(id, { cursor });
}

export async function updateWorkout(id: string, workout: Workout): Promise<void> {
  await db.sessions.update(id, { workout });
}

export async function logSet(s: Omit<SetRecord, 'id'>): Promise<void> {
  const existing = await db.sets.where('[sessionId+itemId+setIndex]').equals([s.sessionId, s.itemId, s.setIndex]).first();
  if (existing?.id !== undefined) await db.sets.update(existing.id, s);
  else await db.sets.add(s);
}

export async function unlogSet(sessionId: string, itemId: string, setIndex: number): Promise<void> {
  const existing = await db.sets.where('[sessionId+itemId+setIndex]').equals([sessionId, itemId, setIndex]).first();
  if (existing?.id !== undefined) await db.sets.update(existing.id, { done: false });
}

export async function finishSession(id: string, data: { effort?: number; notes?: string; durationMin?: number; run?: SessionRecord['run'] }): Promise<void> {
  const s = await db.sessions.get(id);
  if (!s) return;
  const finishedAt = Date.now();
  const durationMin = data.durationMin ?? (s.startedAt ? Math.max(1, Math.round((finishedAt - s.startedAt) / 60000)) : s.workout?.estimatedMinutes);
  await db.sessions.update(id, { status: 'done', finishedAt, durationMin, effort: data.effort, notes: data.notes, run: data.run ?? s.run, date: s.date || today() });
}

/** Log a session as done without the active mode (sport, or a workout done elsewhere). */
export async function quickLog(weekStart: string, slot: PlannedSlot, workout: Workout, data: { durationMin: number; effort?: number; run?: SessionRecord['run'] }): Promise<void> {
  await commitSession(weekStart, slot, workout);
  const id = sessionId(weekStart, slot.id);
  await db.sessions.update(id, { status: 'done', finishedAt: Date.now(), durationMin: data.durationMin, effort: data.effort, run: data.run, date: today() });
}

export async function skipSession(weekStart: string, slot: PlannedSlot): Promise<void> {
  const id = sessionId(weekStart, slot.id);
  const existing = await db.sessions.get(id);
  await db.sessions.put({
    ...(existing ?? { id, weekStart, slotId: slot.id, type: slot.type, title: slot.title, slot }),
    date: addDays(weekStart, slot.day),
    status: 'skipped',
  } as SessionRecord);
}

export async function unskipSession(id: string): Promise<void> {
  const s = await db.sessions.get(id);
  if (!s) return;
  if (s.workout) await db.sessions.update(id, { status: 'committed' });
  else await db.sessions.delete(id);
}

// ---------------------------------------------------------------- backup

export interface Backup {
  app: 'fitness';
  version: 1;
  exportedAt: string;
  data: {
    kv: Array<{ key: string; value: unknown }>;
    blocks: BlockRecord[];
    weeks: WeekRecord[];
    sessions: SessionRecord[];
    sets: SetRecord[];
  };
}

export async function exportBackup(): Promise<Backup> {
  const [kv, blocks, weeks, sessions, sets] = await Promise.all([db.kv.toArray(), db.blocks.toArray(), db.weeks.toArray(), db.sessions.toArray(), db.sets.toArray()]);
  return { app: 'fitness', version: 1, exportedAt: new Date().toISOString(), data: { kv, blocks, weeks, sessions, sets } };
}

export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const b = raw as Partial<Backup>;
  if (!b || b.app !== 'fitness' || b.version !== 1 || !b.data) throw new Error("That file isn't a backup from this app.");
  for (const k of ['kv', 'blocks', 'weeks', 'sessions', 'sets'] as const) if (!Array.isArray(b.data[k])) throw new Error(`The backup is missing ${k}.`);
  return b as Backup;
}

/** Replace everything with the backup's contents. */
export async function importBackup(b: Backup): Promise<void> {
  await db.transaction('rw', [db.kv, db.blocks, db.weeks, db.sessions, db.sets], async () => {
    await Promise.all([db.kv.clear(), db.blocks.clear(), db.weeks.clear(), db.sessions.clear(), db.sets.clear()]);
    await db.kv.bulkPut(b.data.kv);
    await db.blocks.bulkPut(b.data.blocks);
    await db.weeks.bulkPut(b.data.weeks);
    await db.sessions.bulkPut(b.data.sessions);
    await db.sets.bulkPut(b.data.sets);
  });
}

export async function resetAll(): Promise<void> {
  await db.transaction('rw', [db.kv, db.blocks, db.weeks, db.sessions, db.sets], async () => {
    await Promise.all([db.kv.clear(), db.blocks.clear(), db.weeks.clear(), db.sessions.clear(), db.sets.clear()]);
  });
}

export type { WeekPlan };
