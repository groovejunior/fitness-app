// Shared test fixtures (also used by e2e seeding and the dev gallery).
import type { DayAvailability, History, Profile } from './types';

export const carloAvailability = (): DayAvailability[] => [
  { available: true, minutes: 60, window: 'evening' }, // Mon
  { available: true, minutes: 75, window: 'evening' }, // Tue
  { available: false, minutes: 0, window: 'evening' }, // Wed (uni late)
  { available: true, minutes: 90, window: 'evening' }, // Thu (tennis)
  { available: true, minutes: 45, window: 'morning' }, // Fri
  { available: true, minutes: 120, window: 'morning' }, // Sat
  { available: true, minutes: 90, window: 'morning' }, // Sun
];

export const carlo = (over: Partial<Profile> = {}): Profile => ({
  name: 'Carlo',
  experience: { gym: 'intermediate', run: 'beginner' },
  goal: 'athletic',
  sports: [{ name: 'tennis', perWeek: 1, durationMin: 90, intensity: 'hard', days: [3] }],
  defaultEquipment: 'gym',
  homeEquipment: ['dumbbell', 'band'],
  wanted: { gym: 3, run: 2, sport: 1, mobility: 0 },
  availability: carloAvailability(),
  units: 'metric',
  theme: 'system',
  createdAt: '2026-11-01T00:00:00.000Z',
  ...over,
});

export const emptyHistory = (): History => ({ sets: [], sessions: [] });
