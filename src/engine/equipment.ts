import type { Equipment, EquipmentContext, Exercise, Profile } from './types';

export const ALL_EQUIPMENT: Equipment[] = [
  'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bench', 'pullup-bar', 'band', 'box', 'none',
];

export const DEFAULT_HOME_EQUIPMENT: Equipment[] = ['dumbbell', 'band'];

/** What equipment is at hand in a context. */
export function equipmentFor(ctx: EquipmentContext, profile?: Pick<Profile, 'homeEquipment'>): Equipment[] {
  switch (ctx) {
    case 'gym':
      return ALL_EQUIPMENT;
    case 'home':
      return [...new Set<Equipment>([...(profile?.homeEquipment ?? DEFAULT_HOME_EQUIPMENT), 'none'])];
    case 'bodyweight':
      return ['none'];
    case 'outdoors':
      // A park: a bar, a bench, a step. Nothing else.
      return ['none', 'pullup-bar', 'bench', 'box'];
  }
}

export function canDo(e: Exercise, available: Equipment[]): boolean {
  return e.equipment.every((x) => available.includes(x));
}

export const CONTEXT_LABEL: Record<EquipmentContext, string> = {
  gym: 'Gym',
  home: 'Home',
  bodyweight: 'Bodyweight',
  outdoors: 'Outdoors',
};
