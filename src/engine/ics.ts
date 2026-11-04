// Calendar export: one .ics file with the week's sessions.
import type { DayAvailability, PlannedSession } from './types';
import { weekdayOf } from './dates';

const START_HOUR: Record<DayAvailability['window'], number> = { morning: 7, midday: 12, evening: 18 };

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function stamp(date: string, minutes: number): string {
  const [y, m, d] = date.split('-');
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  return `${y}${m}${d}T${String(h).padStart(2, '0')}${String(min).padStart(2, '0')}00`;
}

/** Fold long lines at 75 octets as RFC 5545 asks. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ' ' + rest.slice(74);
  }
  out.push(rest);
  return out.join('\r\n');
}

export function weekToIcs(sessions: PlannedSession[], availability: DayAvailability[], now = new Date()): string {
  const dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fitness PWA//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  // Sessions on the same day are stacked one after another.
  const offset = new Map<string, number>();
  for (const s of sessions) {
    if (s.status === 'skipped') continue;
    const window = availability[weekdayOf(s.date)]?.window ?? 'evening';
    const start = START_HOUR[window] * 60 + (offset.get(s.date) ?? 0);
    offset.set(s.date, (offset.get(s.date) ?? 0) + s.durationMin + 15);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${s.id}@fitness.local`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${stamp(s.date, start)}`,
      `DTEND:${stamp(s.date, start + s.durationMin)}`,
      fold(`SUMMARY:${esc(s.title)}`),
      fold(`DESCRIPTION:${esc(`${s.durationMin} min. Open the app for the full workout.`)}`),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
