// Sport sessions (tennis, water skiing, …) and mobility sessions.
import { canDo, equipmentFor } from './equipment';
import { hash, rotate } from './hash';
import { EXERCISES } from './library';
import type { EquipmentContext, Intensity, Profile, StrengthItem, Workout, WorkoutBlock } from './types';
import { drillBlock } from './strength';

export interface SportInput {
  sessionId: string;
  sport: string;
  durationMin: number;
  intensity: Intensity;
  equipment: EquipmentContext;
  weekIndex: number;
  blockId: string;
  profile: Pick<Profile, 'goal' | 'experience' | 'homeEquipment'>;
}

/** Conditioning that carries over to a sport, by pattern / muscle preference. */
const SPORT_FOCUS: Record<string, { patterns: string[]; note: string }> = {
  tennis: { patterns: ['plyo', 'lunge', 'core', 'cardio'], note: 'Quick feet, lateral power and trunk rotation.' },
  'water skiing': { patterns: ['pull', 'carry', 'hinge', 'core'], note: 'Grip, back and legs that hold a position.' },
  running: { patterns: ['lunge', 'hinge', 'plyo', 'core'], note: 'Single-leg strength and stiffness.' },
};

function focusFor(sport: string) {
  const key = sport.trim().toLowerCase();
  return SPORT_FOCUS[key] ?? { patterns: ['plyo', 'lunge', 'core', 'cardio'], note: 'General athletic conditioning.' };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function generateSport(input: SportInput, variant: 'recommended' | 'alternative' = 'recommended'): Workout {
  const seedInput = { blockId: input.blockId, weekIndex: input.weekIndex, focus: input.sport, lowerBias: true };
  const name = cap(input.sport);
  if (variant === 'recommended') {
    const warm = drillBlock('warmup', 300, seedInput, 'bodyweight', input.profile);
    const cool = drillBlock('cooldown', 180, seedInput, 'bodyweight', input.profile);
    return {
      sessionId: input.sessionId,
      type: 'sport',
      variant,
      title: name,
      summary: 'Counts as a training day. Five minutes of prep before you play helps.',
      durationMin: input.durationMin,
      equipment: 'outdoors',
      intensity: input.intensity,
      blocks: [
        { ...warm, title: 'Prep before you play' },
        { kind: 'main', title: `Play ${input.sport}`, items: [] },
        { ...cool, title: 'After' },
      ],
    };
  }

  // Alternative: can't play today → sport-specific conditioning at home or the gym.
  const f = focusFor(input.sport);
  const ctx = input.equipment === 'outdoors' ? 'bodyweight' : input.equipment;
  const available = equipmentFor(ctx, input.profile);
  const items: StrengthItem[] = [];
  const used = new Set<string>();
  for (const p of f.patterns) {
    const pool = EXERCISES.filter(
      (e) => e.pattern === p && canDo(e, available) && !used.has(e.id) && e.roles.some((r) => r !== 'warmup' && r !== 'cooldown'),
    ).sort((a, b) => (a.id < b.id ? -1 : 1));
    const e = rotate(pool, hash(`${input.blockId}:${input.sport}:${p}`) + input.weekIndex)[0];
    if (!e) continue;
    used.add(e.id);
    items.push({
      kind: 'strength',
      exerciseId: e.id,
      sets: 3,
      target: e.load === 'timed' || p === 'cardio' ? { kind: 'time', seconds: 30 } : { kind: 'reps', min: 6, max: 10 },
      restSec: 45,
    });
  }
  const warm = drillBlock('warmup', 300, seedInput, ctx, input.profile);
  const cool = drillBlock('cooldown', 180, seedInput, ctx, input.profile);
  return {
    sessionId: input.sessionId,
    type: 'sport',
    variant,
    title: `${name} conditioning`,
    summary: `Can't play today? ${f.note}`,
    durationMin: Math.min(input.durationMin, 40),
    equipment: ctx,
    intensity: 'moderate',
    blocks: [warm, { kind: 'conditioning', title: 'Circuit, 3 rounds', items }, cool],
  };
}

export interface MobilityInput {
  sessionId: string;
  durationMin: number;
  equipment: EquipmentContext;
  weekIndex: number;
  blockId: string;
  profile: Pick<Profile, 'homeEquipment'>;
}

export function generateMobility(input: MobilityInput, variant: 'recommended' | 'alternative' = 'recommended'): Workout {
  const available = equipmentFor('bodyweight', input.profile);
  const pool = EXERCISES.filter(
    (e) => e.pattern === 'mobility' && (e.roles.includes('cooldown') || e.roles.includes('warmup')) && canDo(e, available),
  ).sort((a, b) => (a.id < b.id ? -1 : 1));
  const per = 60;
  const count = Math.max(4, Math.min(pool.length, Math.floor((input.durationMin * 60) / (per + 10))));
  const seed = hash(`${input.blockId}:mobility`) + input.weekIndex + (variant === 'alternative' ? 3 : 0);
  const chosen = rotate(pool, seed).slice(0, count);
  const block: WorkoutBlock = {
    kind: 'main',
    title: variant === 'alternative' ? 'Flow, two rounds' : 'Mobility',
    items: chosen.map<StrengthItem>((e) => ({
      kind: 'strength',
      exerciseId: e.id,
      sets: variant === 'alternative' ? 2 : 1,
      target: { kind: 'time', seconds: variant === 'alternative' ? 30 : per },
      restSec: 10,
    })),
  };
  return {
    sessionId: input.sessionId,
    type: 'mobility',
    variant,
    title: variant === 'alternative' ? 'Mobility flow' : 'Mobility',
    summary:
      variant === 'alternative'
        ? 'Shorter holds, two rounds. Good on a stiff day.'
        : 'Slow, easy breathing. Ease into each position.',
    durationMin: input.durationMin,
    equipment: 'bodyweight',
    intensity: 'easy',
    blocks: [block],
  };
}
