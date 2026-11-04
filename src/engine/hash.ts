// Deterministic "randomness": the same inputs always give the same plan.

/** FNV-1a 32-bit string hash. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Pick one item deterministically from a list, given a seed string. */
export function pick<T>(items: readonly T[], seed: string): T {
  return items[hash(seed) % items.length];
}

/** Rotate a list by a seed-derived offset (keeps order, changes start). */
export function rotate<T>(items: readonly T[], offset: number): T[] {
  if (items.length === 0) return [];
  const k = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(k), ...items.slice(0, k)];
}

export function makeId(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}-${parts.join('-')}`;
}
