// App-level actions: the only place screens change data. Talks to the engine
// through the CoachEngine interface and to storage through Dexie.
import { coach } from '../engine/coach';
import { adjustmentFor, type CheckIn } from '../engine/checkin';
import { addDays, daysBetween, mondayOf, toISO } from '../engine/dates';
import type {
  Block,
  BlockProposal,
  DayAvailability,
  History,
  ISODate,
  PlannedSession,
  Profile,
  SessionLog,
  SetLog,
  Targets,
  WeekFocus,
  WeekPlan,
  Workout,
  WorkoutOptions,
} from '../engine/types';
import { db } from './db';

// ---------------------------------------------------------------------------
// Today (overridable for tests and screenshots)

export function today(): ISODate {
  try {
    const o = localStorage.getItem('fitness.today');
    if (o && /^\d{4}-\d{2}-\d{2}$/.test(o)) return o;
  } catch {
    /* storage blocked */
  }
  return toISO(new Date());
}

// ---------------------------------------------------------------------------
// Profile

export async function getProfile(): Promise<Profile | undefined> {
  const row = await db.profile.get('me');
  if (!row) return undefined;
  const { id, ...p } = row;
  void id;
  return p;
}

export async function saveProfile(p: Profile): Promise<void> {
  await db.profile.put({ ...p, id: 'me' });
}

export async function getHistory(): Promise<History> {
  const [sets, sessions] = await Promise.all([db.sets.toArray(), db.sessionLogs.orderBy('date').toArray()]);
  return { sets, sessions };
}

// ---------------------------------------------------------------------------
// Blocks

export async function latestBlock(): Promise<Block | undefined> {
  return db.blocks.orderBy('startDate').last();
}

export async function blockFor(date: ISODate): Promise<Block | undefined> {
  const all = await db.blocks.orderBy('startDate').toArray();
  return [...all].reverse().find((b) => b.startDate <= date);
}

export function weekIndexIn(block: Block, weekStart: ISODate): number {
  return Math.floor(daysBetween(block.startDate, weekStart) / 7);
}

export function proposeBlock(profile: Profile, wanted?: Targets, availability?: DayAvailability[]): BlockProposal {
  return coach.proposeBlock(profile, wanted ?? profile.wanted, availability ?? profile.availability);
}

/** Start a new 4-week block this week. Re-plans this week, keeping anything already done. */
export async function startBlock(profile: Profile, proposal: BlockProposal, choice: 'recommended' | 'alternative'): Promise<Block> {
  const start = mondayOf(today());
  const history = await getHistory();
  const block = coach.createBlock(profile, proposal, choice, start, history);
  await db.transaction('rw', db.blocks, db.weeks, async () => {
    await db.blocks.put(block);
    // Future weeks belong to the new block now.
    const later = await db.weeks.where('weekStart').above(start).primaryKeys();
    await db.weeks.bulkDelete(later);
  });
  const existing = await db.weeks.get(start);
  await replanWeek(start, { availability: existing?.availability ?? profile.availability, focus: 'balanced' });
  return block;
}

/** Change which block option (recommended / alternative) is used. Re-plans the current week. */
export async function chooseBlockOption(blockId: string, choice: 'recommended' | 'alternative'): Promise<void> {
  const block = await db.blocks.get(blockId);
  if (!block) return;
  const profile = await getProfile();
  const history = await getHistory();
  const targets = block.options.find((o) => o.key === choice)!.targets;
  const updated: Block = { ...block, chosen: choice };
  if (profile) {
    const { baseRunMinutes } = await import('../engine/block');
    updated.baseRunMinutes = baseRunMinutes(profile, targets.run, history, block.startDate);
  }
  await db.blocks.put(updated);
  const weekStart = mondayOf(today());
  const later = await db.weeks.where('weekStart').above(weekStart).primaryKeys();
  await db.weeks.bulkDelete(later);
  const cur = await db.weeks.get(weekStart);
  await replanWeek(weekStart, { availability: cur?.availability, focus: cur?.focus });
}

// ---------------------------------------------------------------------------
// Weeks

async function context() {
  const profile = await getProfile();
  if (!profile) throw new Error('No profile yet');
  const history = await getHistory();
  return { profile, history };
}

/** Get the week plan, generating it (and rolling into a new block) if needed. */
export async function ensureWeek(weekStart: ISODate): Promise<WeekPlan | undefined> {
  const existing = await db.weeks.get(weekStart);
  if (existing) return existing;
  const profile = await getProfile();
  if (!profile) return undefined;
  let block = await blockFor(weekStart);
  if (!block) return undefined;
  if (weekIndexIn(block, weekStart) >= 4) {
    // Block finished: roll into the next one with the same choice.
    const history = await getHistory();
    const proposal = coach.proposeBlock(profile, profile.wanted, profile.availability);
    block = coach.createBlock(profile, proposal, block.chosen, weekStart, history);
    await db.blocks.put(block);
  }
  return replanWeek(weekStart, { availability: profile.availability, focus: 'balanced' });
}

export interface ReplanOptions {
  availability?: DayAvailability[];
  focus?: WeekFocus;
  variant?: 'recommended' | 'alternative';
}

/** (Re)generate a week. Sessions in the past or already started/done are kept. */
export async function replanWeek(weekStart: ISODate, opts: ReplanOptions = {}): Promise<WeekPlan> {
  const { profile, history } = await context();
  const block = await blockFor(weekStart);
  if (!block) throw new Error('No block');
  const existing = await db.weeks.get(weekStart);
  const t = today();
  const fromDate = t > weekStart ? t : weekStart;
  const keep = (existing?.sessions ?? []).filter(
    (s) => s.date < fromDate || s.status === 'done' || s.status === 'in_progress' || s.status === 'committed',
  );
  const proposal = coach.planWeek({
    block,
    profile,
    weekStart,
    weekIndex: Math.min(3, Math.max(0, weekIndexIn(block, weekStart))),
    focus: opts.focus ?? existing?.focus ?? 'balanced',
    availability: opts.availability ?? existing?.availability ?? profile.availability,
    history,
    keep,
    fromDate,
    adjust: await adjustmentOf(weekStart),
  });
  const variant = opts.variant ?? 'recommended';
  const plan: WeekPlan = { ...proposal[variant], variant, alternativeLabel: proposal.alternativeLabel };
  await db.weeks.put(plan);
  return plan;
}

/** Preview both week options without saving (for the "recommended vs alternative" switch). */
export async function previewWeek(weekStart: ISODate) {
  const { profile, history } = await context();
  const block = await blockFor(weekStart);
  const existing = await db.weeks.get(weekStart);
  if (!block || !existing) return undefined;
  const t = today();
  const fromDate = t > weekStart ? t : weekStart;
  const keep = existing.sessions.filter(
    (s) => s.date < fromDate || s.status === 'done' || s.status === 'in_progress' || s.status === 'committed',
  );
  return coach.planWeek({
    block,
    profile,
    weekStart,
    weekIndex: Math.min(3, Math.max(0, weekIndexIn(block, weekStart))),
    focus: existing.focus,
    availability: existing.availability,
    history,
    keep,
    fromDate,
    adjust: await adjustmentOf(weekStart),
  });
}

// ---------------------------------------------------------------------------
// Weekly check-in

async function adjustmentOf(weekStart: ISODate) {
  const c = await db.checkIns.get(weekStart);
  return c ? adjustmentFor(c) : undefined;
}

export async function getCheckIn(weekStart: ISODate): Promise<CheckIn | undefined> {
  return db.checkIns.get(weekStart);
}

/** Save the check-in and re-plan the week it is for (keeping anything already done). */
export async function saveCheckIn(c: Omit<CheckIn, 'date'>): Promise<WeekPlan | undefined> {
  await db.checkIns.put({ ...c, date: today() });
  const existing = await ensureWeek(c.weekStart);
  if (!existing) return undefined;
  return replanWeek(c.weekStart, { availability: existing.availability, focus: existing.focus === 'deload' && existing.adjustment?.focus ? 'balanced' : existing.focus });
}

export async function moveSession(sessionId: string, date: ISODate): Promise<WeekPlan | undefined> {
  const week = await weekOfSession(sessionId);
  if (!week) return undefined;
  const plan = coach.moveSession(week, sessionId, date);
  await db.weeks.put(plan);
  return plan;
}

// ---------------------------------------------------------------------------
// Sessions

/** Session ids start with the week's Monday (yyyy-mm-dd). */
export function weekStartOfSession(sessionId: string): ISODate {
  return sessionId.slice(0, 10);
}

export async function weekOfSession(sessionId: string): Promise<WeekPlan | undefined> {
  return db.weeks.get(weekStartOfSession(sessionId));
}

export async function getSession(sessionId: string): Promise<PlannedSession | undefined> {
  const w = await weekOfSession(sessionId);
  return w?.sessions.find((s) => s.id === sessionId);
}

export async function updateSession(sessionId: string, patch: Partial<PlannedSession>): Promise<void> {
  const w = await weekOfSession(sessionId);
  if (!w) return;
  const sessions = w.sessions.map((s) => (s.id === sessionId ? { ...s, ...patch } : s));
  await db.weeks.put({ ...w, sessions, warnings: coach.validateWeek({ ...w, sessions }) });
}

export async function getSwaps(sessionId: string): Promise<Record<string, string>> {
  return (await db.swaps.get(sessionId))?.swaps ?? {};
}

export async function swapExercise(sessionId: string, fromId: string, toId: string): Promise<void> {
  const cur = await getSwaps(sessionId);
  // If fromId is itself a replacement, re-point the original.
  const original = Object.entries(cur).find(([, v]) => v === fromId)?.[0] ?? fromId;
  const next = { ...cur, [original]: toId };
  if (original === toId) delete next[original];
  await db.swaps.put({ sessionId, swaps: next });
}

export async function workoutOptions(session: PlannedSession): Promise<WorkoutOptions | undefined> {
  const { profile, history } = await context();
  const week = await weekOfSession(session.id);
  const block = await blockFor(session.date);
  if (!week || !block) return undefined;
  const swaps = await getSwaps(session.id);
  return coach.generateWorkout(session, { profile, block, week, history, swaps });
}

export async function committedWorkout(sessionId: string): Promise<Workout | undefined> {
  return (await db.workouts.get(sessionId))?.workout;
}

export async function commitSession(sessionId: string, workout: Workout): Promise<void> {
  await db.workouts.put({ sessionId, workout, committedAt: new Date().toISOString() });
  await updateSession(sessionId, { status: 'committed', chosenOption: workout.variant });
}

export async function uncommitSession(sessionId: string): Promise<void> {
  await db.workouts.delete(sessionId);
  await updateSession(sessionId, { status: 'planned' });
}

export async function startSession(sessionId: string): Promise<void> {
  await updateSession(sessionId, { status: 'in_progress' });
}

export async function skipSession(sessionId: string): Promise<void> {
  await updateSession(sessionId, { status: 'skipped' });
}

export async function restoreSession(sessionId: string): Promise<void> {
  const committed = await db.workouts.get(sessionId);
  await updateSession(sessionId, { status: committed ? 'committed' : 'planned' });
}

export async function logSet(set: SetLog): Promise<void> {
  await db.sets.put(set);
}

export async function deleteSet(id: string): Promise<void> {
  await db.sets.delete(id);
}

export async function setsForSession(sessionId: string): Promise<SetLog[]> {
  return db.sets.where('sessionId').equals(sessionId).toArray();
}

export async function finishSession(
  sessionId: string,
  log: Omit<SessionLog, 'sessionId' | 'completedAt' | 'date' | 'type' | 'title' | 'intent'>,
): Promise<void> {
  const s = await getSession(sessionId);
  if (!s) return;
  const workout = log.workout ?? (await committedWorkout(sessionId));
  await db.sessionLogs.put({
    ...log,
    workout,
    sessionId,
    date: s.date,
    type: s.type,
    title: workout?.title ?? s.title,
    intent: s.intent,
    completedAt: new Date().toISOString(),
  });
  await updateSession(sessionId, { status: 'done' });
}

export async function sessionLog(sessionId: string): Promise<SessionLog | undefined> {
  return db.sessionLogs.get(sessionId);
}

export function newId(prefix: string): string {
  const r = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}-${r}`;
}

export { addDays, mondayOf };
