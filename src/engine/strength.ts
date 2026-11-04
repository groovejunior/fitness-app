// Gym / strength workout generation.
// Structure: warm-up → (power) → main lifts → accessories → core → (finisher) → cool-down.
import { canDo, equipmentFor } from './equipment';
import { hash, rotate } from './hash';
import { EXERCISES } from './library';
import { suggestLoad } from './progression';
import type {
  EquipmentContext,
  Exercise,
  ExerciseRole,
  Experience,
  GymFocus,
  History,
  Intensity,
  ISODate,
  MovementPattern,
  Muscle,
  PrimaryGoal,
  Profile,
  RepTarget,
  StrengthItem,
  WeekPhase,
  Workout,
  WorkoutBlock,
} from './types';

export interface StrengthInput {
  sessionId: string;
  date: ISODate;
  focus: GymFocus;
  durationMin: number;
  equipment: EquipmentContext;
  intensity: Intensity;
  phase: WeekPhase;
  weekIndex: number;
  /** Seed for exercise choice. Main lifts stay the same for a whole block. */
  blockId: string;
  emphasis?: 'lower' | 'upper';
  profile: Pick<Profile, 'goal' | 'experience' | 'homeEquipment'>;
  history: History;
  /** Exercise swaps chosen by the user: original exercise id → replacement id. */
  swaps?: Record<string, string>;
}

interface Slot {
  key: string;
  role: 'main' | 'accessory' | 'core' | 'power';
  pattern: MovementPattern | MovementPattern[];
  plane?: 'horizontal' | 'vertical';
  /** Require this primary muscle. */
  muscle?: Muscle;
}

const S = (key: string, role: Slot['role'], pattern: Slot['pattern'], plane?: Slot['plane'], muscle?: Muscle): Slot => ({
  key,
  role,
  pattern,
  plane,
  muscle,
});

const POWER = S('power', 'power', 'plyo');
const CORE = S('core', 'core', ['core', 'carry']);

/** Main lifts first, then accessories in priority order (cut from the end when short on time). */
export const TEMPLATES: Record<GymFocus, { title: string; main: Slot[]; acc: Slot[]; lower: boolean }> = {
  'full-a': {
    title: 'Full body A',
    lower: true,
    main: [S('squat', 'main', 'squat'), S('push-h', 'main', 'push', 'horizontal'), S('pull-v', 'main', 'pull', 'vertical')],
    acc: [S('hinge', 'accessory', 'hinge'), S('pull-h', 'accessory', 'pull', 'horizontal'), S('push-v', 'accessory', 'push', 'vertical')],
  },
  'full-b': {
    title: 'Full body B',
    lower: true,
    main: [S('hinge', 'main', 'hinge'), S('push-v', 'main', 'push', 'vertical'), S('pull-h', 'main', 'pull', 'horizontal')],
    acc: [S('lunge', 'accessory', 'lunge'), S('push-h', 'accessory', 'push', 'horizontal'), S('pull-v', 'accessory', 'pull', 'vertical')],
  },
  'full-c': {
    title: 'Full body C',
    lower: true,
    main: [S('lunge', 'main', 'lunge'), S('push-h', 'main', 'push', 'horizontal'), S('pull-h', 'main', 'pull', 'horizontal')],
    acc: [
      S('squat', 'accessory', 'squat'),
      S('pull-v', 'accessory', 'pull', 'vertical'),
      S('biceps', 'accessory', 'pull', undefined, 'biceps'),
      S('triceps', 'accessory', 'push', undefined, 'triceps'),
    ],
  },
  upper: {
    title: 'Upper body',
    lower: false,
    main: [S('push-h', 'main', 'push', 'horizontal'), S('pull-h', 'main', 'pull', 'horizontal')],
    acc: [
      S('pull-v', 'accessory', 'pull', 'vertical'),
      S('push-v', 'accessory', 'push', 'vertical'),
      S('shoulders', 'accessory', ['push', 'pull'], undefined, 'shoulders'),
      S('biceps', 'accessory', 'pull', undefined, 'biceps'),
      S('triceps', 'accessory', 'push', undefined, 'triceps'),
    ],
  },
  lower: {
    title: 'Lower body',
    lower: true,
    main: [S('squat', 'main', 'squat'), S('hinge', 'main', 'hinge')],
    acc: [
      S('lunge', 'accessory', 'lunge'),
      S('glutes', 'accessory', 'hinge', undefined, 'glutes'),
      S('calves', 'accessory', 'squat', undefined, 'calves'),
    ],
  },
  push: {
    title: 'Push',
    lower: false,
    main: [S('push-h', 'main', 'push', 'horizontal'), S('push-v', 'main', 'push', 'vertical')],
    acc: [
      S('push-h2', 'accessory', 'push', 'horizontal'),
      S('shoulders', 'accessory', 'push', undefined, 'shoulders'),
      S('triceps', 'accessory', 'push', undefined, 'triceps'),
    ],
  },
  pull: {
    title: 'Pull',
    lower: false,
    main: [S('pull-v', 'main', 'pull', 'vertical'), S('pull-h', 'main', 'pull', 'horizontal')],
    acc: [
      S('pull-h2', 'accessory', 'pull', 'horizontal'),
      S('shoulders', 'accessory', 'pull', undefined, 'shoulders'),
      S('biceps', 'accessory', 'pull', undefined, 'biceps'),
    ],
  },
  legs: {
    title: 'Legs',
    lower: true,
    main: [S('squat', 'main', 'squat'), S('hinge', 'main', 'hinge')],
    acc: [
      S('lunge', 'accessory', 'lunge'),
      S('squat2', 'accessory', 'squat'),
      S('glutes', 'accessory', 'hinge', undefined, 'glutes'),
      S('calves', 'accessory', 'squat', undefined, 'calves'),
    ],
  },
};

// ---------------------------------------------------------------------------
// Rep schemes

interface Scheme {
  main: { min: number; max: number; rest: number };
  acc: { min: number; max: number; rest: number };
}

const SCHEMES: Record<PrimaryGoal, Scheme> = {
  strength: { main: { min: 4, max: 6, rest: 150 }, acc: { min: 8, max: 10, rest: 75 } },
  athletic: { main: { min: 6, max: 8, rest: 120 }, acc: { min: 8, max: 12, rest: 60 } },
  endurance: { main: { min: 8, max: 12, rest: 75 }, acc: { min: 12, max: 15, rest: 45 } },
  health: { main: { min: 8, max: 10, rest: 90 }, acc: { min: 10, max: 12, rest: 60 } },
};

function baseSets(exp: Experience, role: Slot['role']): number {
  if (role === 'main') return exp === 'advanced' ? 4 : 3;
  if (role === 'power') return 3;
  if (role === 'core') return 2;
  return exp === 'beginner' ? 2 : 3;
}

const MAX_DIFFICULTY: Record<Experience, number> = { beginner: 2, intermediate: 3, advanced: 3 };

// ---------------------------------------------------------------------------
// Exercise choice

/** How well an exercise's equipment suits a context for a main lift (higher = preferred). */
function equipmentScore(e: Exercise, ctx: EquipmentContext, exp: Experience): number {
  const eq = e.equipment;
  if (ctx === 'gym') {
    if (eq.includes('barbell')) return exp === 'beginner' ? 2 : 4;
    if (eq.includes('dumbbell') || eq.includes('kettlebell')) return 3;
    if (eq.includes('cable') || eq.includes('machine')) return exp === 'beginner' ? 3.5 : 2.5;
    if (eq.includes('pullup-bar')) return 3;
    return 1;
  }
  if (eq.includes('none') && eq.length === 1) return 1;
  return 2; // anything loaded beats bodyweight when it is available
}

function matches(e: Exercise, slot: Slot): boolean {
  const pats = Array.isArray(slot.pattern) ? slot.pattern : [slot.pattern];
  if (!pats.includes(e.pattern)) return false;
  if (slot.plane && e.plane !== slot.plane) return false;
  if (slot.muscle && e.muscles[0] !== slot.muscle) return false;
  // Isolation slots (muscle given) should not pick big compounds and vice versa.
  if (!slot.muscle && (e.muscles[0] === 'biceps' || e.muscles[0] === 'triceps' || e.muscles[0] === 'calves')) return false;
  return true;
}

export function candidatesFor(
  slot: Slot,
  ctx: EquipmentContext,
  profile: StrengthInput['profile'],
  exclude: Set<string>,
): Exercise[] {
  const available = equipmentFor(ctx, profile);
  const maxD = MAX_DIFFICULTY[profile.experience.gym];
  const roleOrder: ExerciseRole[] = slot.role === 'main' ? ['main', 'accessory'] : slot.role === 'accessory' ? ['accessory', 'main'] : [slot.role];
  for (const role of roleOrder) {
    const list = EXERCISES.filter(
      (e) => e.roles.includes(role) && matches(e, slot) && canDo(e, available) && e.difficulty <= maxD && !exclude.has(e.id),
    );
    if (list.length > 0) {
      // Stable order: preferred equipment first, then by id.
      return list.sort(
        (a, b) =>
          equipmentScore(b, ctx, profile.experience.gym) - equipmentScore(a, ctx, profile.experience.gym) ||
          (a.id < b.id ? -1 : 1),
      );
    }
  }
  return [];
}

/**
 * Main lifts: keep the same choice for the whole block so progression is visible
 * (choose between the top candidates by block). Accessories: rotate every two weeks.
 */
function choose(slot: Slot, list: Exercise[], input: StrengthInput, alt: boolean): Exercise | undefined {
  if (list.length === 0) return undefined;
  if (slot.role === 'main') {
    const top = list.slice(0, Math.min(2, list.length));
    const i = (hash(`${input.blockId}:${slot.key}`) + (alt ? 1 : 0)) % top.length;
    // If the alternative is asked and only one candidate exists in the top two, take the next one.
    return alt && top.length === 1 && list.length > 1 ? list[1] : top[i];
  }
  const period = Math.floor(input.weekIndex / 2);
  const rotated = rotate(list, hash(`${input.blockId}:${input.focus}:${slot.key}`) + period + (alt ? 1 : 0));
  return rotated[0];
}

// ---------------------------------------------------------------------------
// Time budget (seconds)

function workSeconds(e: Exercise, t: RepTarget): number {
  const base = t.kind === 'time' ? t.seconds : Math.round(((t.min + t.max) / 2) * 3.5);
  return e.unilateral ? base * 2 : base;
}

export function itemSeconds(e: Exercise, item: Pick<StrengthItem, 'sets' | 'target' | 'restSec'>): number {
  return item.sets * workSeconds(e, item.target) + (item.sets - 1) * item.restSec + 60;
}

function drillBlock(
  kind: 'warmup' | 'cooldown',
  seconds: number,
  input: { blockId: string; weekIndex: number; focus: string; lowerBias: boolean },
  ctx: EquipmentContext,
  profile: StrengthInput['profile'],
): WorkoutBlock {
  const available = equipmentFor(ctx, profile);
  const pool = EXERCISES.filter((e) => e.roles.includes(kind) && canDo(e, available));
  const lowerMuscles: Muscle[] = ['hips', 'hamstrings', 'glutes', 'quads', 'calves'];
  const scored = [...pool].sort((a, b) => {
    const sa = lowerMuscles.includes(a.muscles[0]) === input.lowerBias ? 0 : 1;
    const sb = lowerMuscles.includes(b.muscles[0]) === input.lowerBias ? 0 : 1;
    return sa - sb || (a.id < b.id ? -1 : 1);
  });
  // Take a mix: mostly biased drills, plus one general one, rotated weekly.
  const per = kind === 'warmup' ? 45 : 50;
  const count = Math.max(2, Math.min(5, Math.round(seconds / (per + 10))));
  const biased = scored.filter((e) => lowerMuscles.includes(e.muscles[0]) === input.lowerBias);
  const other = scored.filter((e) => !biased.includes(e));
  const seed = hash(`${input.blockId}:${input.focus}:${kind}`) + input.weekIndex;
  const chosen = [...rotate(biased, seed).slice(0, count - 1), ...rotate(other, seed).slice(0, 1)];
  const fill = rotate(scored, seed).filter((e) => !chosen.includes(e));
  while (chosen.length < count && fill.length) chosen.push(fill.shift()!);
  return {
    kind,
    title: kind === 'warmup' ? 'Warm-up' : 'Cool-down',
    items: chosen.map<StrengthItem>((e) => ({
      kind: 'strength',
      exerciseId: e.id,
      sets: 1,
      target: e.load === 'timed' || kind === 'cooldown' ? { kind: 'time', seconds: per } : { kind: 'reps', min: 8, max: 10 },
      restSec: 0,
    })),
  };
}

export { drillBlock };

// ---------------------------------------------------------------------------

export function generateStrength(input: StrengthInput, variant: 'recommended' | 'alternative' = 'recommended'): Workout {
  const { profile, phase, focus } = input;
  const tpl = TEMPLATES[focus];
  const alt = variant === 'alternative';
  const exp = profile.experience.gym;
  const scheme = SCHEMES[profile.goal];
  const deload = phase === 'deload';
  const easy = input.intensity === 'easy';
  const budget = input.durationMin * 60;

  const warmSec = input.durationMin <= 30 ? 240 : 420;
  const coolSec = input.durationMin <= 30 ? 120 : 240;
  const warmup = drillBlock('warmup', warmSec, { ...input, lowerBias: tpl.lower }, input.equipment, profile);
  const cooldown = drillBlock('cooldown', coolSec, { ...input, lowerBias: tpl.lower }, input.equipment, profile);

  const used = new Set<string>();
  const swap = (e: Exercise): Exercise => {
    const to = input.swaps?.[e.id];
    const found = to ? EXERCISES.find((x) => x.id === to) : undefined;
    return found ?? e;
  };

  const makeItem = (slot: Slot, e: Exercise): StrengthItem => {
    let sets = baseSets(exp, slot.role);
    let target: RepTarget;
    let restSec: number;
    if (slot.role === 'power') {
      target = { kind: 'reps', min: 3, max: 5 };
      restSec = 75;
    } else if (slot.role === 'core') {
      target = e.load === 'timed' ? { kind: 'time', seconds: exp === 'beginner' ? 30 : 40 } : { kind: 'reps', min: 8, max: 12 };
      restSec = 40;
    } else {
      const r = slot.role === 'main' ? scheme.main : scheme.acc;
      target = e.load === 'timed' ? { kind: 'time', seconds: 40 } : { kind: 'reps', min: r.min, max: r.max };
      restSec = r.rest;
      if (e.load === 'bodyweight' && target.kind === 'reps') target = { kind: 'reps', min: Math.max(r.min, 8), max: Math.max(r.max, 12) };
    }
    if (alt && (slot.role === 'accessory' || slot.role === 'core')) restSec = Math.min(restSec, 45);
    if (phase === 'peak' && slot.role === 'main') sets += 1;
    if (deload) sets = Math.max(2, sets - 1);
    if (easy) sets = Math.max(2, sets - 1);

    const sugg = suggestLoad(e, target, input.history, { phase, before: input.date });
    return {
      kind: 'strength',
      exerciseId: e.id,
      sets,
      target,
      restSec,
      weightKg: e.load === 'weighted' ? sugg.weightKg : undefined,
      note: sugg.reason,
    };
  };

  const pickFor = (slot: Slot): Exercise | undefined => {
    const e = choose(slot, candidatesFor(slot, input.equipment, profile, used), input, alt);
    if (!e) return undefined;
    const s = swap(e);
    used.add(e.id);
    used.add(s.id);
    return s;
  };

  // Accessory priority, adjusted for emphasis.
  let accSlots = [...tpl.acc];
  if (input.emphasis === 'lower') {
    accSlots = [S('lunge-x', 'accessory', 'lunge'), S('hinge-x', 'accessory', 'hinge', undefined, 'glutes'), ...accSlots];
  } else if (input.emphasis === 'upper') {
    accSlots = [S('pull-x', 'accessory', 'pull', 'horizontal'), S('push-x', 'accessory', 'push', 'vertical'), ...accSlots];
  }

  const powerOk = tpl.lower && !deload && !easy && (profile.goal === 'athletic' || exp !== 'beginner') && input.durationMin >= 45;

  let spent = warmSec + coolSec;
  const blocks: WorkoutBlock[] = [warmup];

  // Main lifts always stay. If time is very short, trim sets (not lifts).
  const mains: { slot: Slot; item: StrengthItem; e: Exercise }[] = [];
  for (const slot of tpl.main) {
    const e = pickFor(slot);
    if (e) mains.push({ slot, e, item: makeItem(slot, e) });
  }
  let mainSec = mains.reduce((t, m) => t + itemSeconds(m.e, m.item), 0);
  while (spent + mainSec > budget && mains.some((m) => m.item.sets > 2)) {
    const m = [...mains].reverse().find((x) => x.item.sets > 2)!;
    m.item.sets -= 1;
    mainSec = mains.reduce((t, x) => t + itemSeconds(x.e, x.item), 0);
  }
  if (spent + mainSec > budget) {
    // Still over: shorten rests on mains.
    for (const m of mains) m.item.restSec = Math.min(m.item.restSec, 90);
    mainSec = mains.reduce((t, x) => t + itemSeconds(x.e, x.item), 0);
  }

  if (powerOk) {
    const e = pickFor(POWER);
    if (e) {
      const item = makeItem(POWER, e);
      const sec = itemSeconds(e, item);
      if (spent + mainSec + sec <= budget - 300) {
        blocks.push({ kind: 'power', title: 'Power', items: [item] });
        spent += sec;
      }
    }
  }
  blocks.push({ kind: 'main', title: 'Main lifts', items: mains.map((m) => m.item) });
  spent += mainSec;

  const accItems: { e: Exercise; item: StrengthItem }[] = [];
  for (const slot of accSlots) {
    const list = candidatesFor(slot, input.equipment, profile, used);
    const e0 = choose(slot, list, input, alt);
    if (!e0) continue;
    const e = swap(e0);
    const item = makeItem(slot, e);
    const sec = itemSeconds(e, item);
    if (spent + sec > budget - 150) continue; // keep room for core
    used.add(e0.id);
    used.add(e.id);
    accItems.push({ e, item });
    spent += sec;
  }

  const coreItems: StrengthItem[] = [];
  const coreCount = input.durationMin >= 50 ? 2 : 1;
  for (let i = 0; i < coreCount; i++) {
    const e = pickFor({ ...CORE, key: `core${i}` });
    if (!e) break;
    const item = makeItem(CORE, e);
    const sec = itemSeconds(e, item);
    if (spent + sec > budget && i > 0) break;
    coreItems.push(item);
    spent += sec;
  }

  // Extra time: add a set to accessories (up to 4), then a short conditioning finisher.
  for (const a of accItems) {
    const extra = workSeconds(a.e, a.item.target) + a.item.restSec;
    if (a.item.sets < 4 && spent + extra <= budget - 360 && !deload) {
      a.item.sets += 1;
      spent += extra;
    }
  }

  if (accItems.length) {
    blocks.push({
      kind: 'accessory',
      title: alt ? 'Accessories (supersets)' : 'Accessories',
      items: accItems.map((a) => a.item),
    });
  }
  if (coreItems.length) blocks.push({ kind: 'core', title: 'Core', items: coreItems });

  const remaining = budget - spent;
  if (remaining >= 360 && !deload) {
    const available = equipmentFor(input.equipment, profile);
    const pool = EXERCISES.filter((e) => e.roles.includes('conditioning') && canDo(e, available) && !used.has(e.id)).sort(
      (a, b) => (a.id < b.id ? -1 : 1),
    );
    if (pool.length) {
      const rounds = Math.min(6, Math.floor(remaining / 60));
      const picks = rotate(pool, hash(`${input.blockId}:${input.focus}:fin`) + input.weekIndex).slice(0, 2);
      blocks.push({
        kind: 'conditioning',
        title: 'Finisher',
        items: picks.map((e) => ({
          kind: 'strength',
          exerciseId: e.id,
          sets: Math.ceil(rounds / picks.length),
          target: { kind: 'time', seconds: 30 },
          restSec: 30,
          note: 'Hard but steady. Keep moving between rounds.',
        })),
      });
      spent += rounds * 60;
    }
  }

  blocks.push(cooldown);

  const title = tpl.title + (input.emphasis === 'lower' ? ', legs focus' : input.emphasis === 'upper' ? ', upper focus' : '');
  const summary = alt
    ? 'Same muscles, different lifts. Accessories as supersets with short rests.'
    : deload
      ? 'Deload: fewer sets and lighter loads. Move well, leave fresh.'
      : phase === 'peak'
        ? 'Peak week: an extra set on the main lifts.'
        : summaryFor(profile.goal, tpl.lower);

  return {
    sessionId: input.sessionId,
    type: 'gym',
    variant,
    title: alt ? `${title}, alternative` : title,
    summary,
    durationMin: Math.max(15, Math.round(Math.min(spent, budget) / 60 / 5) * 5),
    equipment: input.equipment,
    intensity: deload || easy ? 'easy' : input.intensity,
    blocks,
  };
}

function summaryFor(goal: PrimaryGoal, lower: boolean): string {
  switch (goal) {
    case 'strength':
      return 'Heavy main lifts, long rests. Add weight when you hit the top of the range.';
    case 'athletic':
      return lower ? 'Jump first while fresh, then lift. Quality over quantity.' : 'Solid pressing and pulling, with good shoulder balance.';
    case 'endurance':
      return 'Higher reps, shorter rests. Strength that supports your running.';
    case 'health':
      return 'Full range, steady tempo. Leave a couple of reps in the tank.';
  }
}
