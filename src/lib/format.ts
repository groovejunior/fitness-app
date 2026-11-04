import { fromISO, WEEKDAY_LONG, WEEKDAY_SHORT, weekdayOf } from '../engine/dates';
import type { ISODate, RepTarget } from '../engine/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const dayShort = (d: ISODate) => WEEKDAY_SHORT[weekdayOf(d)];
export const dayLong = (d: ISODate) => WEEKDAY_LONG[weekdayOf(d)];
export const dateShort = (d: ISODate) => `${fromISO(d).getDate()} ${MONTHS[fromISO(d).getMonth()]}`;
export const dayAndDate = (d: ISODate) => `${dayLong(d)}, ${dateShort(d)}`;

export function minutes(n: number): string {
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function clock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function targetText(t: RepTarget, unilateral?: boolean): string {
  const side = unilateral ? ' / side' : '';
  if (t.kind === 'time') return `${t.seconds}s${side}`;
  return t.min === t.max ? `${t.min}${side}` : `${t.min}–${t.max}${side}`;
}

export function kg(n: number | undefined, units: 'metric' | 'imperial' = 'metric'): string {
  if (n === undefined) return '';
  if (units === 'imperial') return `${Math.round(n * 2.20462)} lb`;
  return `${Number.isInteger(n) ? n : n.toFixed(1)} kg`;
}

export function km(n: number, units: 'metric' | 'imperial' = 'metric'): string {
  if (units === 'imperial') return `${(n * 0.621371).toFixed(1)} mi`;
  return `${n.toFixed(1)} km`;
}

/** Download a text file (backup JSON, .ics). */
export function downloadFile(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
