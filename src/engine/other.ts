import { CONTEXT_EQUIPMENT, getExercise, isAvailable } from '../content/exercises';
import { getSport } from '../content/sports';
import { estimateMinutes, prescribe, type WorkoutRequest } from './gym';
import type { Workout, WorkoutItem, WorkoutSection } from './types';

function light(id: string, prefix: string, i: number, sets = 1): WorkoutItem {
  const ex = getExercise(id);
  const sec = ex.unit === 'sec' || ex.unit === 'secPerSide';
  return {
    id: `${prefix}-${i}-${id}`,
    exerciseId: id,
    sets,
    repsMin: sec ? 30 : ex.unit === 'repsPerSide' ? 5 : 8,
    repsMax: sec ? 45 : ex.unit === 'repsPerSide' ? 6 : 10,
    restSec: sets > 1 ? 20 : 0,
    targetKg: null,
  };
}

/** Sport day: a short prep routine, the sport itself, and an optional conditioning add-on. */
export function buildSportWorkout(req: WorkoutRequest, variant: 'recommended' | 'alternative'): Workout {
  const sport = getSport(req.slot.sportId);
  const prepIds = sport.prep.filter((id) => isAvailable(getExercise(id), req.equipment === 'gym' ? 'gym' : 'bodyweight')).slice(0, 5);
  const sections: WorkoutSection[] = [{ kind: 'prep', title: 'Prep', items: prepIds.map((id, i) => light(id, 'prep', i)) }];
  const prepMin = estimateMinutes(sections);
  let condMin = 0;
  if (variant === 'alternative') {
    const ctx = req.equipment;
    const ids = sport.conditioning.filter((id) => isAvailable(getExercise(id), ctx)).slice(0, 3);
    const items: WorkoutItem[] = ids.map((id, i) => {
      const ex = getExercise(id);
      const rx = prescribe(ex, 'accessory', req.profile, req.intensity, req.phase);
      return { id: `conditioning-${i}-${id}`, exerciseId: id, sets: Math.min(3, rx.sets), repsMin: rx.repsMin, repsMax: rx.repsMax, restSec: 45, targetKg: null };
    });
    if (items.length) {
      const sec: WorkoutSection = { kind: 'conditioning', title: `${sport.name} conditioning`, items };
      sections.push(sec);
      condMin = estimateMinutes([sec]);
    }
  }
  sections.push({ kind: 'cooldown', title: 'Cool-down', items: ['hip-flexor-stretch', 'open-book'].map((id, i) => light(id, 'cooldown', i)) });
  return {
    id: `${req.slot.id}:${variant}`,
    type: 'sport',
    variant,
    title: sport.name,
    label: variant === 'recommended' ? 'Recommended' : 'Plus conditioning',
    why:
      variant === 'recommended'
        ? `${prepMin} min prep, then play. It counts toward this week's load.`
        : `Prep, play, then ${condMin} min of ${sport.name.toLowerCase()}-specific strength.`,
    equipment: req.equipment,
    intensity: req.intensity,
    targetMinutes: req.minutes,
    estimatedMinutes: req.minutes + estimateMinutes(sections),
    sections,
    sportId: sport.id,
  };
}

const FLOW = ['cat-cow', 'open-book', 'worlds-greatest-stretch', 'hip-flexor-stretch', 'leg-swing', 'glute-bridge', 'dead-bug'];
const CORE_FLOW = ['dead-bug', 'plank', 'side-plank', 'pallof-press', 'glute-bridge', 'cat-cow', 'hip-flexor-stretch'];

export function buildMobilityWorkout(req: WorkoutRequest, variant: 'recommended' | 'alternative'): Workout {
  const ids = (variant === 'recommended' ? FLOW : CORE_FLOW).filter((id) => getExercise(id).equipment.every((q) => CONTEXT_EQUIPMENT[req.equipment].includes(q)));
  let rounds = 1;
  const make = (r: number): WorkoutSection[] => [
    { kind: 'main', title: variant === 'recommended' ? 'Flow' : 'Core and mobility', items: ids.map((id, i) => ({ ...light(id, 'flow', i, r), restSec: r > 1 ? 15 : 0 })) },
  ];
  // Add rounds until the time is filled.
  while (rounds < 3 && mobilityMinutes(make(rounds + 1)) <= req.minutes + 2) rounds++;
  let sections = make(rounds);
  // Too long: drop items from the end.
  while (mobilityMinutes(sections) > req.minutes + 2 && sections[0].items.length > 3) sections = [{ ...sections[0], items: sections[0].items.slice(0, -1) }];
  return {
    id: `${req.slot.id}:${variant}`,
    type: 'mobility',
    variant,
    title: 'Mobility',
    label: variant === 'recommended' ? 'Recommended' : 'Core and mobility',
    why: variant === 'recommended' ? 'Slow flow for hips, spine and shoulders. Breathe into each position.' : 'Adds easy core work to the stretches.',
    equipment: req.equipment,
    intensity: req.intensity,
    targetMinutes: req.minutes,
    estimatedMinutes: mobilityMinutes(sections),
    sections,
  };
}

function mobilityMinutes(sections: WorkoutSection[]): number {
  // estimateMinutes adds lifting warm-up time to "main" sections; mobility has none.
  return Math.max(1, estimateMinutes(sections.map((s) => ({ ...s, kind: 'prep' as const }))));
}
