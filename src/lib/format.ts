import { DAY_LONG, DAY_SHORT, parseISODate } from '../engine';

export type Units = 'metric' | 'imperial';
const LB = 2.20462;
const MI = 0.621371;

export function weightLabel(units: Units): string {
  return units === 'imperial' ? 'lb' : 'kg';
}

/** kg -> display number in the user's unit, rounded sensibly. */
export function toDisplayWeight(kg: number, units: Units): number {
  return units === 'imperial' ? Math.round(kg * LB) : Math.round(kg * 2) / 2;
}

export function fromDisplayWeight(v: number, units: Units): number {
  return units === 'imperial' ? Math.round((v / LB) * 10) / 10 : v;
}

export function formatWeight(kg: number | null | undefined, units: Units): string {
  if (kg === null || kg === undefined) return '';
  return `${toDisplayWeight(kg, units)} ${weightLabel(units)}`;
}

export function distanceLabel(units: Units): string {
  return units === 'imperial' ? 'mi' : 'km';
}

export function toDisplayDistance(km: number, units: Units): number {
  return Math.round((units === 'imperial' ? km * MI : km) * 10) / 10;
}

export function fromDisplayDistance(v: number, units: Units): number {
  return units === 'imperial' ? v / MI : v;
}

/** sec per km -> "5:30 /km" or per mile. */
export function formatPace(secPerKm: number | null, units: Units): string {
  if (!secPerKm) return '–';
  const s = units === 'imperial' ? secPerKm / MI : secPerKm;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${r === 60 ? m + 1 : m}:${String(r === 60 ? 0 : r).padStart(2, '0')} /${distanceLabel(units)}`;
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function dayShort(i: number): string {
  return DAY_SHORT[i];
}

export function dayLong(i: number): string {
  return DAY_LONG[i];
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  return parseISODate(iso).toLocaleDateString('en-AU', opts);
}

/** "Wednesday 4 November" */
export function formatLongDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** "3 × 8–12" or "3 × 30–45 s" etc. */
export function formatPrescription(sets: number, min: number, max: number, unit: 'reps' | 'sec' | 'repsPerSide' | 'secPerSide' | 'meters'): string {
  const range = min === max ? `${min}` : `${min}–${max}`;
  const suffix = unit === 'sec' ? ' s' : unit === 'secPerSide' ? ' s each side' : unit === 'repsPerSide' ? ' each side' : unit === 'meters' ? ' m' : '';
  return sets > 1 ? `${sets} × ${range}${suffix}` : `${range}${suffix}`;
}
