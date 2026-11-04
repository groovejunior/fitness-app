import type { Profile, WeekAvailability } from '../types';

export const carlo: Profile = {
  name: 'Carlo',
  goal: 'athletic',
  experience: { gym: 'intermediate', run: 'intermediate' },
  sports: ['tennis'],
  defaultEquipment: 'gym',
  gymAccess: true,
};

export const beginner: Profile = { ...carlo, experience: { gym: 'beginner', run: 'beginner' }, sports: [] };

export function avail(days: number[], minutes = 75): WeekAvailability {
  return Array.from({ length: 7 }, (_, i) => ({ available: days.includes(i), minutes, window: 'evening' as const }));
}

export const everyDay = avail([0, 1, 2, 3, 4, 5, 6], 90);
