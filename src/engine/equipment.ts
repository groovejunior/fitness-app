import type { Equipment, EquipmentContext, Exercise, Profile, TrainingStyle } from './types';

export const ALL_EQUIPMENT: Equipment[] = [
  'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bench', 'pullup-bar', 'dip-bars', 'band', 'box', 'none',
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
      return ['none', 'pullup-bar', 'dip-bars', 'bench', 'box'];
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

/** Equipment that never needs a gym machine: bodyweight tools. */
const CALISTHENICS_EQUIPMENT: Equipment[] = ['none', 'pullup-bar', 'dip-bars', 'bench', 'box', 'band'];

export function styleOf(profile?: Pick<Profile, 'style'>): TrainingStyle {
  return profile?.style ?? 'calisthenics';
}

export function isCalisthenics(e: Exercise): boolean {
  return e.equipment.every((x) => CALISTHENICS_EQUIPMENT.includes(x));
}

/** Does the person's training style allow this exercise at all? */
export function fitsStyle(e: Exercise, style: TrainingStyle): boolean {
  if (style === 'all') return true;
  if (e.equipment.includes('machine') || e.equipment.includes('cable')) return false;
  if (style === 'free-weights') return true;
  return isCalisthenics(e) || !!e.classic;
}

export const STYLE_LABEL: Record<TrainingStyle, string> = {
  calisthenics: 'Bodyweight first',
  'free-weights': 'Free weights',
  all: 'Anything',
};
