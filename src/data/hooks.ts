import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { mondayOf, type Profile } from '../engine';
import { today } from '../lib/today';
import { db } from './db';
import { blockFor, ensureWeek, getProfile, getSettings, loadHistory } from './repo';
import { DEFAULT_SETTINGS, type BlockRecord, type SessionRecord, type SetRecord, type Settings, type WeekRecord } from './types';

/** undefined while loading, null when there is no profile yet. */
export function useProfile(): Profile | null | undefined {
  return useLiveQuery(async () => (await getProfile()) ?? null, []);
}

export function useSettings(): Settings {
  return useLiveQuery(() => getSettings(), []) ?? DEFAULT_SETTINGS;
}

export function useBlock(date = today()): BlockRecord | null | undefined {
  return useLiveQuery(async () => (await blockFor(date)) ?? null, [date]);
}

export function useAllBlocks(): BlockRecord[] | undefined {
  return useLiveQuery(() => db.blocks.orderBy('startDate').toArray(), []);
}

/** The week plan, generated on first visit. null if the week is outside any block. */
export function useWeek(weekStart: string = mondayOf(today())): WeekRecord | null | undefined {
  const rec = useLiveQuery(async () => (await db.weeks.get(weekStart)) ?? null, [weekStart]);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    setMissing(false);
    if (rec === null) {
      ensureWeek(weekStart).then((r) => {
        if (!r) setMissing(true);
      });
    }
  }, [rec, weekStart]);
  if (rec === undefined) return undefined;
  if (rec === null) return missing ? null : undefined;
  return rec;
}

export function useWeekSessions(weekStart: string): SessionRecord[] | undefined {
  return useLiveQuery(() => db.sessions.where('weekStart').equals(weekStart).toArray(), [weekStart]);
}

export function useSession(id: string | undefined): SessionRecord | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.sessions.get(id)) ?? null) : null), [id]);
}

export function useSessionSets(id: string | undefined): SetRecord[] | undefined {
  return useLiveQuery(() => (id ? db.sets.where('sessionId').equals(id).toArray() : []), [id]);
}

export function useAllSessions(): SessionRecord[] | undefined {
  return useLiveQuery(() => db.sessions.orderBy('date').toArray(), []);
}

export function useAllSets(): SetRecord[] | undefined {
  return useLiveQuery(() => db.sets.toArray(), []);
}

export function useAllWeeks(): WeekRecord[] | undefined {
  return useLiveQuery(() => db.weeks.orderBy('weekStart').toArray(), []);
}

export function useHistory() {
  return useLiveQuery(() => loadHistory(), []);
}
