// On-device storage (IndexedDB via Dexie). No backend, no login.
import Dexie, { type EntityTable } from 'dexie';
import type { Block, Profile, SessionLog, SetLog, WeekPlan, Workout } from '../engine/types';
import type { CheckIn } from '../engine/checkin';

export interface ProfileRow extends Profile {
  id: 'me';
}

/** The workout the user committed to for a session (frozen so it doesn't change under them). */
export interface CommittedWorkout {
  sessionId: string;
  workout: Workout;
  committedAt: string;
}

export interface SwapRow {
  sessionId: string;
  swaps: Record<string, string>;
}

export class FitnessDB extends Dexie {
  profile!: EntityTable<ProfileRow, 'id'>;
  blocks!: EntityTable<Block, 'id'>;
  weeks!: EntityTable<WeekPlan, 'weekStart'>;
  workouts!: EntityTable<CommittedWorkout, 'sessionId'>;
  swaps!: EntityTable<SwapRow, 'sessionId'>;
  sets!: EntityTable<SetLog, 'id'>;
  sessionLogs!: EntityTable<SessionLog, 'sessionId'>;
  checkIns!: EntityTable<CheckIn, 'weekStart'>;

  constructor(name = 'fitness') {
    super(name);
    this.version(1).stores({
      profile: 'id',
      blocks: 'id, startDate',
      weeks: 'weekStart, blockId',
      workouts: 'sessionId',
      swaps: 'sessionId',
      sets: 'id, sessionId, exerciseId, date',
      sessionLogs: 'sessionId, date, type',
    });
    // v2: weekly check-ins, keyed by the week they plan.
    this.version(2).stores({ checkIns: 'weekStart, date' });
  }
}

export const db = new FitnessDB();

export const TABLES = ['profile', 'blocks', 'weeks', 'workouts', 'swaps', 'sets', 'sessionLogs', 'checkIns'] as const;
export type TableName = (typeof TABLES)[number];
