import { addDays } from './dates';
import type { PlannedSlot, TimeWindow, WeekPlan } from './types';

const START_HOUR: Record<TimeWindow, number> = { morning: 7, midday: 12, evening: 18, any: 17 };

function stamp(date: string, hour: number, minute: number): string {
  return `${date.replace(/-/g, '')}T${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}00`;
}

function escape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;');
}

/** iCalendar file (floating local time) with one event per planned session. */
export function weekToIcs(plan: WeekPlan, now: Date = new Date()): string {
  const dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fitness//Week plan//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const perDay = new Map<number, number>();
  for (const s of plan.slots) {
    const date = addDays(plan.weekStart, s.day);
    const window = plan.availability[s.day]?.window ?? 'any';
    const offset = perDay.get(s.day) ?? 0;
    const startMin = START_HOUR[window] * 60 + offset;
    perDay.set(s.day, offset + s.minutes + 15);
    const endMin = startMin + s.minutes;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${plan.weekStart}-${s.id}@fitness.local`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${stamp(date, Math.floor(startMin / 60), startMin % 60)}`,
      `DTEND:${stamp(date, Math.floor(endMin / 60), endMin % 60)}`,
      `SUMMARY:${escape(s.title)}`,
      `DESCRIPTION:${escape(describe(s))}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

function describe(s: PlannedSlot): string {
  return `${s.intent}. About ${s.minutes} min.`;
}
