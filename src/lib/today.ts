import { toISODate } from '../engine';

/** Today's date. A debug override (localStorage "fitness.debugToday") helps tests and screenshots. */
export function today(): string {
  try {
    const o = localStorage.getItem('fitness.debugToday');
    if (o && /^\d{4}-\d{2}-\d{2}$/.test(o)) return o;
  } catch {
    /* ignore */
  }
  return toISODate(new Date());
}
