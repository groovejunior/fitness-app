import type { Experience, Goal, Phase, SessionType, Split, Targets, WeekAvailability } from './types';

export const PHASES: Phase[] = ['build', 'build', 'peak', 'deload'];

/** Weekly run volume relative to week 1. Each step is under +10 %. Week 4 is a deload. */
export const RUN_VOLUME_FACTOR = [1.0, 1.08, 1.16, 0.7];

/** Default minutes per session type, before fitting to the day. */
export const DEFAULT_MINUTES: Record<SessionType, number> = { gym: 55, run: 40, sport: 75, mobility: 20 };

/** Shortest session that is still worth doing. */
export const MIN_MINUTES: Record<SessionType, number> = { gym: 25, run: 20, sport: 30, mobility: 10 };

/** Weekly training load points the body can recover from, by experience. */
export const LOAD_CAPACITY: Record<Experience, number> = { beginner: 9, intermediate: 12, advanced: 14 };

/** Maximum training days (main sessions) per week. Always keep at least one full rest day. */
export const MAX_TRAINING_DAYS: Record<Experience, number> = { beginner: 5, intermediate: 6, advanced: 6 };

/** Easy pace guess (sec per km) when there is no run history. */
export const DEFAULT_EASY_PACE: Record<Experience, number> = { beginner: 420, intermediate: 360, advanced: 315 };

/** Minutes of running per run session in week 1 of a first block. */
export const DEFAULT_RUN_MINUTES: Record<Experience, number> = { beginner: 25, intermediate: 35, advanced: 45 };

export const QUALITY_RUNS: Record<Experience, number> = { beginner: 1, intermediate: 2, advanced: 2 };

export const LONG_RUN_CAP: Record<Experience, number> = { beginner: 60, intermediate: 90, advanced: 120 };

export const EXPERIENCE_RANK: Record<Experience, number> = { beginner: 0, intermediate: 1, advanced: 2 };

export const GOAL_LABEL: Record<Goal, string> = {
  athletic: 'Athletic build',
  strength: 'Strength',
  muscle: 'Build muscle',
  endurance: 'Endurance',
  health: 'General health',
};

export const FOCUS_LABEL: Record<Goal, string> = {
  athletic: 'Athletic base: strength plus engine',
  strength: 'Get stronger on the big lifts',
  muscle: 'Build muscle, upper and lower',
  endurance: 'Build your aerobic base',
  health: 'Move well, feel good, stay consistent',
};

export function splitFor(gymSessions: number, experience: Experience, goal: Goal): Split {
  if (gymSessions <= 2) return 'fullBody';
  if (gymSessions === 3) return goal === 'muscle' && experience !== 'beginner' ? 'ppl' : 'fullBody';
  if (gymSessions === 4) return 'upperLower';
  return 'ppl';
}

export function emptyAvailability(): WeekAvailability {
  return Array.from({ length: 7 }, () => ({ available: false, minutes: 60, window: 'evening' as const }));
}

export function totalSessions(t: Targets): number {
  return t.gym + t.run + t.sport + t.mobility;
}
