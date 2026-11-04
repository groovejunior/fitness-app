import type { Block, PlannedSlot, Profile, SessionType, Targets, WeekAvailability, WeekPlan, Workout } from '../engine';
import type { ThemePref } from '../lib/theme';

export type SessionStatus = 'committed' | 'in_progress' | 'done' | 'skipped';

export interface SessionRecord {
  /** `${weekStart}:${slotId}` */
  id: string;
  weekStart: string;
  slotId: string;
  date: string;
  type: SessionType;
  title: string;
  status: SessionStatus;
  slot: PlannedSlot;
  workout?: Workout;
  startedAt?: number;
  finishedAt?: number;
  durationMin?: number;
  /** Perceived effort 1–10. */
  effort?: number;
  notes?: string;
  run?: { distanceKm?: number; durationSec?: number; stepsDone?: number; stepsTotal?: number };
  /** Where the active workout was left, to resume. */
  cursor?: number;
}

export interface SetRecord {
  id?: number;
  sessionId: string;
  date: string;
  exerciseId: string;
  itemId: string;
  setIndex: number;
  weightKg: number | null;
  reps: number;
  repsMin: number;
  repsMax: number;
  done: boolean;
}

export interface BlockRecord extends Block {
  createdAt: number;
  /** What was asked for at planning time, to re-plan later. */
  input: { requested: Targets; availability: WeekAvailability };
}

export interface WeekRecord {
  weekStart: string;
  blockId: string;
  /** The plan in use (after any moves). */
  plan: WeekPlan;
  recommended: WeekPlan;
  alternative: WeekPlan;
}

export interface Settings {
  units: 'metric' | 'imperial';
  theme: ThemePref;
}

export const DEFAULT_SETTINGS: Settings = { units: 'metric', theme: 'system' };

export interface KV {
  key: string;
  value: unknown;
}

export type { Profile };
