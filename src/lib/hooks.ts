// Live data hooks: screens re-render automatically when IndexedDB changes.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Block, History, PlannedSession, Profile, SessionLog, SetLog, WeekPlan } from '../engine/types';

export function useProfile(): Profile | null | undefined {
  // undefined = loading, null = no profile yet
  return useLiveQuery(async () => {
    const row = await db.profile.get('me');
    if (!row) return null;
    const { id, ...p } = row;
    void id;
    return p as Profile;
  }, []);
}

export function useWeek(weekStart: string | undefined): WeekPlan | null | undefined {
  return useLiveQuery(async () => (weekStart ? ((await db.weeks.get(weekStart)) ?? null) : null), [weekStart]);
}

export function useBlocks(): Block[] | undefined {
  return useLiveQuery(() => db.blocks.orderBy('startDate').toArray(), []);
}

export function useSession(sessionId: string | undefined): PlannedSession | null | undefined {
  return useLiveQuery(async () => {
    if (!sessionId) return null;
    const w = await db.weeks.get(sessionId.slice(0, 10));
    return w?.sessions.find((s) => s.id === sessionId) ?? null;
  }, [sessionId]);
}

export function useSessionSets(sessionId: string | undefined): SetLog[] | undefined {
  return useLiveQuery(async () => (sessionId ? db.sets.where('sessionId').equals(sessionId).toArray() : []), [sessionId]);
}

export function useSessionLogs(): SessionLog[] | undefined {
  return useLiveQuery(() => db.sessionLogs.orderBy('date').toArray(), []);
}

export function useAllWeeks(): WeekPlan[] | undefined {
  return useLiveQuery(() => db.weeks.orderBy('weekStart').toArray(), []);
}

export function useHistory(): History | undefined {
  return useLiveQuery(async () => {
    const [sets, sessions] = await Promise.all([db.sets.toArray(), db.sessionLogs.orderBy('date').toArray()]);
    return { sets, sessions };
  }, []);
}
