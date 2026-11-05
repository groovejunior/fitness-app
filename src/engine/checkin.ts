// Weekly check-in: three quick answers about the week that was and the week ahead,
// turned into a small, explainable adjustment of next week's plan.
// Follows the IOC 2016 load consensus: short self-reports (how hard it felt, sleep,
// life stress) are a sound way to steer load, and load should not jump.
import { addDays, mondayOf, weekdayOf } from './dates';
import type { SourceId } from './sources';
import type { ISODate, WeekFocus } from './types';

export type FeltAnswer = 'too-easy' | 'right' | 'too-hard';
export type SleepAnswer = 'good' | 'ok' | 'poor';
export type AheadAnswer = 'normal' | 'busy' | 'very-busy';

export interface CheckIn {
  /** Monday of the week this check-in plans (the week ahead). */
  weekStart: ISODate;
  date: ISODate;
  felt: FeltAnswer;
  sleep: SleepAnswer;
  ahead: AheadAnswer;
}

export interface WeekAdjustment {
  /** Multiplier on session lengths and weekly run minutes. 0.75–1.05. */
  volume: number;
  /** Fewer sessions this many (0–2). Fixed sport days are never dropped. */
  dropSessions: number;
  /** Override the week focus (only ever towards lighter). */
  focus?: WeekFocus;
  /** Keep hard runs and heavy days out (intensity capped at moderate). */
  easier: boolean;
  /** One plain line per change, shown to the user. */
  notes: string[];
  source: SourceId;
}

export const NO_ADJUSTMENT: WeekAdjustment = { volume: 1, dropSessions: 0, easier: false, notes: [], source: 'ioc-2016' };

/** Deterministic rules. Never adds sessions; the only "more" is a +5% nudge. */
export function adjustmentFor(c: Pick<CheckIn, 'felt' | 'sleep' | 'ahead'>): WeekAdjustment {
  const notes: string[] = [];
  let volume = 1;
  let dropSessions = 0;
  let focus: WeekFocus | undefined;
  let easier = false;

  // Run down: it felt too hard and sleep was poor. Take a lighter week now.
  if (c.felt === 'too-hard' && c.sleep === 'poor') {
    focus = 'deload';
    volume = 0.8;
    notes.push('Hard week and poor sleep, so this one is lighter. Same habits, less load.');
  } else {
    if (c.felt === 'too-hard') {
      volume *= 0.9;
      easier = true;
      notes.push('Last week felt too hard, so sessions are a bit shorter and nothing is all-out.');
    }
    if (c.sleep === 'poor') {
      volume *= 0.9;
      easier = true;
      notes.push('Sleep was poor. Hard runs become easy ones until it settles.');
    }
  }

  if (c.ahead === 'very-busy') {
    dropSessions = 2;
    volume *= 0.85;
    notes.push('A very busy week ahead: two sessions fewer and shorter ones. Keep the habit, not the volume.');
  } else if (c.ahead === 'busy') {
    dropSessions = 1;
    notes.push('A busy week ahead: one session fewer.');
  }

  if (c.felt === 'too-easy' && c.sleep !== 'poor' && c.ahead === 'normal') {
    volume *= 1.05;
    notes.push('Last week felt easy, so sessions are a little longer. Small steps, so the load does not jump.');
  }

  if (notes.length === 0) notes.push('All steady. The plan stays as it is.');

  return {
    volume: Math.round(Math.min(1.05, Math.max(0.75, volume)) * 100) / 100,
    dropSessions,
    focus,
    easier,
    notes,
    source: 'ioc-2016',
  };
}

/**
 * Which week a check-in done today plans. From Friday on it plans next week;
 * Monday to Thursday it plans the rest of this week.
 */
export function checkInTarget(today: ISODate): ISODate {
  const monday = mondayOf(today);
  return weekdayOf(today) >= 4 ? addDays(monday, 7) : monday;
}

/** Show the check-in prompt at the weekend, and on Monday/Tuesday if it wasn't done. */
export function checkInDue(today: ISODate, doneFor: (weekStart: ISODate) => boolean): ISODate | undefined {
  const target = checkInTarget(today);
  const wd = weekdayOf(today);
  if (wd >= 5) return doneFor(target) ? undefined : target; // Sat–Sun
  if (wd <= 1) return doneFor(target) ? undefined : target; // Mon–Tue catch-up
  return undefined;
}
