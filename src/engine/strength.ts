// Gym / strength workout generation.
// Structure: warm-up → (power) → main lifts → accessories → core → (finisher) → cool-down.
import { canDo, equipmentFor, fitsStyle, isCalisthenics, styleOf } from './equipment';
import { hash, rotate } from './hash';
import { EXERCISES } from './library';
import { nextBodyweight, suggestLoad } from './progression';
import type { SourceId } from './sources';
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
  TrainingStyle,
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
  profile: Pick<Profile, 'goal' | 'experience' | 'homeEquipment' | 'style'>;
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

/**
 * Rest between sets (Grgic 2017, Singer 2024).
 * Beginners stay at or under 2 minutes. Past beginner, strength and athletic
 * main lifts rest at least 2 minutes. Accessories have a 60s floor, except
 * the short-rest superset alternative. Power stays near 90s. Core near 45s.
 */
function restSeconds(role: Slot['role'], schemeRest: number, exp: Experience, goal: PrimaryGoal, alt: boolean): number {
  let rest: number;
  if (role === 'power') rest = 90;
  else if (role === 'core') rest = 45;
  else if (role === 'main') {
    if (exp === 'beginner') rest = Math.min(schemeRest, 120);
    else if (goal === 'strength' || goal === 'athletic') rest = Math.max(schemeRest, 120);
    else rest = schemeRest;
  } else {
    rest = Math.max(schemeRest, 60);
  }
  if (alt && (role === 'accessory' || role === 'core')) rest = Math.min(rest, 45);
  return rest;
}

function baseSets(exp: Experience, role: Slot['role']): number {
  if (role === 'main') return exp === 'advanced' ? 4 : 3;
  if (role === 'power') return 3;
  if (role === 'core') return 2;
  return exp === 'beginner' ? 2 : 3;
}

const MAX_DIFFICULTY: Record<Experience, number> = { beginner: 2, intermediate: 3, advanced: 3 };

// ---------------------------------------------------------------------------
// Exercise choice

const DIFFICULTY_TARGET: Record<Experience, number> = { beginner: 1, intermediate: 2, advanced: 3 };
const LOWER: MovementPattern[] = ['squat', 'hinge'];

/**
 * How well an exercise suits a slot in this context and training style (higher = preferred).
 * Calisthenics style: bodyweight moves lead everywhere except the big leg lifts, where a
 * classic barbell (or goblet squat for beginners) does the job bodyweight can't.
 * Leg strength stays on a bar once a bodyweight squat is easy (Lopez 2021):
 * size can come from any hard set, strength prefers a heavier load.
 */
function equipmentScore(e: Exercise, ctx: EquipmentContext, exp: Experience, style: TrainingStyle = 'all', slot?: Slot): number {
  const eq = e.equipment;
  const fit = -0.3 * Math.abs(e.difficulty - DIFFICULTY_TARGET[exp]);
  if (style === 'calisthenics') {
    const lowerMain = slot?.role === 'main' && LOWER.includes(e.pattern);
    // Bar work (pull-ups, dips, rows on a bar) is the backbone of calisthenics: prefer it when there's a bar.
    const bar = eq.includes('pullup-bar') || eq.includes('dip-bars') ? 0.5 : 0;
    const band = eq.includes('band') ? -0.4 : 0;
    if (isCalisthenics(e)) return (lowerMain ? 2 : 4) + fit + bar + band;
    if (e.classic) {
      if (lowerMain) return eq.includes('barbell') ? (exp === 'beginner' ? 3 : 4) : exp === 'beginner' ? 4 : 3;
      return 2.5;
    }
    return 0;
  }
  if (ctx === 'gym') {
    if (eq.includes('barbell')) return exp === 'beginner' ? 2 : 4;
    if (eq.includes('dumbbell') || eq.includes('kettlebell')) return 3;
    if (eq.includes('cable') || eq.includes('machine')) return exp === 'beginner' ? 3.5 : 2.5;
    if (eq.includes('pullup-bar') || eq.includes('dip-bars')) return 3;
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
  const style = styleOf(profile);
  const maxD = MAX_DIFFICULTY[profile.experience.gym];
  const roleOrder: ExerciseRole[] = slot.role === 'main' ? ['main', 'accessory'] : slot.role === 'accessory' ? ['accessory', 'main'] : [slot.role];
  for (const role of roleOrder) {
    const list = EXERCISES.filter(
      (e) =>
        e.roles.includes(role) &&
        matches(e, slot) &&
        canDo(e, available) &&
        fitsStyle(e, style) &&
        e.difficulty <= maxD &&
        !exclude.has(e.id),
    );
    if (list.length > 0) {
      // Stable order: best suited first, then by id.
      const sc = (e: Exercise) => equipmentScore(e, ctx, profile.experience.gym, style, slot);
      return list.sort((a, b) => sc(b) - sc(a) || (a.id < b.id ? -1 : 1));
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
    // Best-suited equipment first; vary only between equally suited lifts (by block).
    const sc = (e: Exercise) => equipmentScore(e, input.equipment, input.profile.experience.gym, styleOf(input.profile), slot);
    const best = sc(list[0]);
    const top = list.filter((e) => Math.abs(sc(e) - best) < 1e-9);
    const i = hash(`${input.blockId}:${slot.key}`) % top.length;
    if (!alt) return top[i];
    // Alternative: the next lift in line.
    return top.length > 1 ? top[(i + 1) % top.length] : (list[1] ?? list[0]);
  }
  const period = Math.floor(input.weekIndex / 2);
  // Rotate for variety, but only among the well-suited options.
  const scA = (e: Exercise) => equipmentScore(e, input.equipment, input.profile.experience.gym, styleOf(input.profile), slot);
  const bestA = scA(list[0]);
  const good = list.filter((e) => scA(e) >= bestA - 0.6);
  const pool = styleOf(input.profile) === 'calisthenics' && good.length >= 2 ? good : list;
  const rotated = rotate(pool, hash(`${input.blockId}:${input.focus}:${slot.key}`) + period + (alt ? 1 : 0));
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
  const pool = EXERCISES.filter((e) => e.roles.includes(kind) && canDo(e, available) && fitsStyle(e, styleOf(profile)));
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
  let progressed = false;

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

  const repTarget = (slot: Slot, e: Exercise): RepTarget => {
    if (slot.role === 'power') return { kind: 'reps', min: 3, max: 5 };
    if (slot.role === 'core') {
      return e.load === 'timed' ? { kind: 'time', seconds: exp === 'beginner' ? 30 : 40 } : { kind: 'reps', min: 8, max: 12 };
    }
    const r = slot.role === 'main' ? scheme.main : scheme.acc;
    if (e.load === 'timed') return { kind: 'time', seconds: 40 };
    if (e.load === 'bodyweight') {
      // Hard pulls and dips stay in a lower range. Everything else goes higher.
      const hard = (e.pattern === 'pull' && e.plane === 'vertical') || e.id.includes('dip') || e.difficulty === 3;
      return slot.role === 'main'
        ? hard
          ? { kind: 'reps', min: 5, max: 8 }
          : { kind: 'reps', min: 8, max: 12 }
        : hard
          ? { kind: 'reps', min: 6, max: 10 }
          : { kind: 'reps', min: 10, max: 15 };
    }
    return { kind: 'reps', min: r.min, max: r.max };
  };

  const makeItem = (slot: Slot, start: Exercise): StrengthItem => {
    let sets = baseSets(exp, slot.role);
    let lift = start;
    let target = repTarget(slot, lift);
    const schemeRest = slot.role === 'main' ? scheme.main.rest : slot.role === 'accessory' ? scheme.acc.rest : 0;
    let restSec = restSeconds(slot.role, schemeRest, exp, profile.goal, alt);
    if (phase === 'peak' && slot.role === 'main') sets += 1;
    if (deload) sets = Math.max(2, sets - 1);
    if (easy) sets = Math.max(2, sets - 1);

    let sugg = suggestLoad(lift, target, input.history, { phase, before: input.date });
    if (sugg.readyForHarder) {
      const available = equipmentFor(input.equipment, profile);
      const style = styleOf(profile);
      const harder = nextBodyweight(
        lift.id,
        (n) => canDo(n, available) && fitsStyle(n, style) && n.difficulty <= MAX_DIFFICULTY[exp] && !used.has(n.id),
      );
      if (harder) {
        progressed = true;
        used.add(harder.id);
        const from = lift.name;
        lift = harder;
        target = repTarget(slot, lift);
        sugg = suggestLoad(lift, target, input.history, { phase, before: input.date });
        sugg = { ...sugg, reason: `You topped out ${from}. ${harder.name} is the harder version.` };
      }
    }
    return {
      kind: 'strength',
      exerciseId: lift.id,
      sets,
      target,
      restSec,
      weightKg: lift.load === 'weighted' ? sugg.weightKg : undefined,
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
    for (const m of mains) m.item.restSec = Math.max(60, Math.min(m.item.restSec, 90));
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
    const pool = EXERCISES.filter(
      (e) => e.roles.includes('conditioning') && canDo(e, available) && fitsStyle(e, styleOf(profile)) && !used.has(e.id),
    ).sort(
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
      ? 'Lighter week: fewer sets, a bit less weight. This keeps the month from only going up.'
      : phase === 'peak'
        ? 'Peak week: an extra set on the main lifts.'
        : summaryFor(profile.goal, tpl.lower);

  const source: SourceId = deload ? 'ioc-2016' : progressed ? 'kotarsky-2018' : 'currier-2023';

  return {
    sessionId: input.sessionId,
    type: 'gym',
    variant,
    title: alt ? `${title}, alternative` : title,
    summary,
    source,
    durationMin: Math.max(15, Math.round(Math.min(spent, budget) / 60 / 5) * 5),
    equipment: input.equipment,
    intensity: deload || easy ? 'easy' : input.intensity,
    blocks,
  };
}

function summaryFor(goal: PrimaryGoal, lower: boolean): string {
  switch (goal) {
    case 'strength':
      return 'Heavy main lifts first, longer rests. Add a little weight when every set hits the top. Stop before form breaks.';
    case 'athletic':
      return lower
        ? 'Jump first while fresh, then the big lifts. Stop with a couple of reps still in you.'
        : 'Big presses and pulls first. Stop before form breaks.';
    case 'endurance':
      return 'Higher reps, short rests. Strength that supports your running. Stop before form breaks.';
    case 'health':
      return 'Full range, steady tempo. Leave a couple of reps in the tank.';
  }
}
