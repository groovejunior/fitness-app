// JSON backup: export everything, import (replace) everything.
import { db, TABLES, type FitnessDB } from './db';

export const BACKUP_VERSION = 1;

export interface Backup {
  app: 'fitness';
  version: number;
  exportedAt: string;
  data: Record<string, unknown[]>;
}

export async function exportBackup(d: FitnessDB = db): Promise<Backup> {
  const data: Record<string, unknown[]> = {};
  for (const t of TABLES) data[t] = await d.table(t).toArray();
  return { app: 'fitness', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
}

export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const b = raw as Partial<Backup>;
  if (!b || b.app !== 'fitness' || typeof b.version !== 'number' || typeof b.data !== 'object' || !b.data) {
    throw new Error("That doesn't look like a backup from this app.");
  }
  if (b.version > BACKUP_VERSION) throw new Error('This backup is from a newer version of the app.');
  for (const t of TABLES) {
    if (b.data[t] !== undefined && !Array.isArray(b.data[t])) throw new Error(`Backup is damaged (${t}).`);
  }
  return b as Backup;
}

export async function importBackup(backup: Backup, d: FitnessDB = db): Promise<void> {
  await d.transaction('rw', TABLES.map((t) => d.table(t)), async () => {
    for (const t of TABLES) {
      await d.table(t).clear();
      const rows = backup.data[t] ?? [];
      if (rows.length) await d.table(t).bulkPut(rows);
    }
  });
}

export async function resetAll(d: FitnessDB = db): Promise<void> {
  await d.transaction('rw', TABLES.map((t) => d.table(t)), async () => {
    for (const t of TABLES) await d.table(t).clear();
  });
}

export function backupFileName(date = new Date()): string {
  return `fitness-backup-${date.toISOString().slice(0, 10)}.json`;
}
