import Dexie, { type Table } from 'dexie';
import type { BlockRecord, KV, SessionRecord, SetRecord, WeekRecord } from './types';

export class FitnessDB extends Dexie {
  kv!: Table<KV, string>;
  blocks!: Table<BlockRecord, string>;
  weeks!: Table<WeekRecord, string>;
  sessions!: Table<SessionRecord, string>;
  sets!: Table<SetRecord, number>;

  constructor(name = 'fitness') {
    super(name);
    this.version(1).stores({
      kv: 'key',
      blocks: 'id, startDate',
      weeks: 'weekStart, blockId',
      sessions: 'id, date, weekStart, status, type',
      sets: '++id, sessionId, exerciseId, date, [sessionId+itemId+setIndex]',
    });
  }
}

export const db = new FitnessDB();
