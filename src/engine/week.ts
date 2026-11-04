import { getSport } from '../content/sports';
import { DEFAULT_MINUTES, LONG_RUN_CAP, MAX_TRAINING_DAYS, MIN_MINUTES, QUALITY_RUNS } from './constants';
import { DAY_LONG } from './dates';
import { weeklyRunMinutes } from './month';
import type {
  Block,
  DayIndex,
  GymDay,
  Goal,
  Phase,
  PlannedSlot,
  Profile,
  RunKind,
  Split,
  Targets,
  WeekAvailability,
  WeekFocus,
  WeekPlan,
  WeekWarning,
} from './types';

export interface WeekInput {
  block: Block;
  profile: Profile;
  weekIndex: number;
  weekStart: string;
  availability?: WeekAvailability;
  focus?: WeekFocus;
  /** Slots the user placed by hand; matched by id and kept on their day. */
  pinned?: PlannedSlot[];
}

export interface WeekPlanResult {
  recommended: WeekPlan;
  alternative: WeekPlan;
}

export const WEEK_FOCUS_LABEL: Record<WeekFocus, string> = {
  balanced: 'Balanced',
  legs: 'More legs',
  upper: 'More upper body',
  endurance: 'More endurance',
  strength: 'More strength',
  deload: 'Deload',
  sport: 'Sport week',
};

export const WEEK_FOCUS_HINT: Record<WeekFocus, string> = {
  balanced: 'The plan as set for this block.',
  legs: 'Shifts a gym day toward lower body.',
  upper: 'Shifts a gym day toward upper body.',
  endurance: 'Swaps a gym session for a run.',
  strength: 'Swaps a run for a gym session.',
  deload: 'Same sessions, easier and shorter. For tired or busy weeks.',
  sport: 'Tournament or big sport week: minimum gym, easy runs, extra mobility.',
};

// ---------------------------------------------------------------- session mix

export function weekTargets(block: Block, focus: WeekFocus): Targets {
  const t = { ...block.targets };
  if (focus === 'endurance' && t.gym >= 1) {
    t.gym -= 1;
    t.run += 1;
  } else if (focus === 'strength' && t.run >= 1) {
    t.run -= 1;
    t.gym += 1;
  } else if (focus === 'sport') {
    t.gym = Math.min(t.gym, 1);
    t.run = Math.min(t.run, 1);
    t.mobility += 1;
  }
  return t;
}

const GYM_TITLE: Record<GymDay, string> = {
  full: 'Full body',
  upper: 'Upper body',
  lower: 'Lower body',
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
};

export const GYM_INTENT: Record<GymDay, string[]> = {
  full: ['Squat and press', 'Hinge and pull', 'Single-leg and overhead'],
  upper: ['Bench and pull-ups', 'Overhead and rows'],
  lower: ['Squat and hinge', 'Hinge and single-leg'],
  push: ['Chest, shoulders, triceps', 'Shoulders and chest'],
  pull: ['Back and arms', 'Back, rear shoulders, grip'],
  legs: ['Quads, hamstrings, glutes', 'Glutes and single-leg'],
};

export function gymDayPlan(split: Split, count: number, focus: WeekFocus): Array<{ gymDay: GymDay; variant: number }> {
  let days: Array<{ gymDay: GymDay; variant: number }> = [];
  if (count <= 0) return days;
  if (split === 'fullBody' || count === 1) {
    days = Array.from({ length: count }, (_, i) => ({ gymDay: 'full' as GymDay, variant: i % 3 }));
    if (focus === 'legs') days[days.length - 1] = { gymDay: 'lower', variant: 0 };
    if (focus === 'upper') days[days.length - 1] = { gymDay: 'upper', variant: 0 };
    return days;
  }
  if (split === 'upperLower') {
    const base: Array<{ gymDay: GymDay; variant: number }> = [
      { gymDay: 'upper', variant: 0 },
      { gymDay: 'lower', variant: 0 },
      { gymDay: 'upper', variant: 1 },
      { gymDay: 'lower', variant: 1 },
      { gymDay: 'full', variant: 0 },
      { gymDay: 'full', variant: 1 },
    ];
    days = count === 3 ? [base[0], base[1], base[4]] : base.slice(0, count);
  } else {
    const base: Array<{ gymDay: GymDay; variant: number }> = [
      { gymDay: 'push', variant: 0 },
      { gymDay: 'pull', variant: 0 },
      { gymDay: 'legs', variant: 0 },
      { gymDay: 'upper', variant: 0 },
      { gymDay: 'lower', variant: 0 },
      { gymDay: 'full', variant: 0 },
    ];
    days = count === 6 ? [base[0], base[1], base[2], { gymDay: 'push', variant: 1 }, { gymDay: 'pull', variant: 1 }, { gymDay: 'legs', variant: 1 }] : base.slice(0, count);
  }
  const isUpper = (g: GymDay) => g === 'upper' || g === 'push' || g === 'pull';
  const isLower = (g: GymDay) => g === 'lower' || g === 'legs';
  if (focus === 'legs') {
    const idx = lastIndex(days, (d) => isUpper(d.gymDay));
    const uppers = days.filter((d) => isUpper(d.gymDay)).length;
    if (idx >= 0) days[idx] = uppers > 1 ? { gymDay: 'lower', variant: 1 } : { gymDay: 'full', variant: 0 };
    // In PPL, a lone push or pull day left over becomes a full upper day.
    if (split === 'ppl') {
      const rest = days.filter((d) => d.gymDay === 'push' || d.gymDay === 'pull');
      if (rest.length === 1) rest[0].gymDay = 'upper';
    }
  }
  if (focus === 'upper') {
    const idx = lastIndex(days, (d) => isLower(d.gymDay));
    const lowers = days.filter((d) => isLower(d.gymDay)).length;
    if (idx >= 0) days[idx] = lowers > 1 ? { gymDay: 'upper', variant: 1 } : { gymDay: 'full', variant: 0 };
  }
  return days;
}

function lastIndex<T>(arr: T[], pred: (t: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) return i;
  return -1;
}

/**
 * Run types for the week. Beginners get one quality run; intermediate and advanced runners get two
 * once there is enough easy running around them (4+ runs, or 3 runs with at most one gym day).
 */
export function runKinds(runs: number, profile: Profile, phase: Phase, focus: WeekFocus, weekIndex: number, gymSessions = 2): RunKind[] {
  if (runs <= 0) return [];
  const easyWeek = phase === 'deload' || focus === 'deload' || focus === 'sport';
  if (runs === 1) return [profile.goal === 'endurance' && !easyWeek ? 'long' : 'easy'];
  const kinds: RunKind[] = ['long'];
  const room = runs >= 4 || (runs === 3 && gymSessions <= 1) ? 2 : 1;
  const q = easyWeek ? 0 : Math.min(QUALITY_RUNS[profile.experience.run], runs - 1, room);
  if (q === 1) kinds.push(weekIndex % 2 === 0 ? 'tempo' : 'intervals');
  if (q >= 2) kinds.push('tempo', 'intervals');
  while (kinds.length < runs) kinds.push(kinds.length >= 4 && !kinds.includes('recovery') ? 'recovery' : 'easy');
  return kinds;
}

const RUN_TITLE: Record<RunKind, string> = {
  easy: 'Easy run',
  recovery: 'Recovery run',
  tempo: 'Tempo run',
  intervals: 'Intervals',
  long: 'Long run',
};
const RUN_INTENT: Record<RunKind, string> = {
  easy: 'Conversational pace',
  recovery: 'Very easy, keep it short',
  tempo: 'Comfortably hard blocks',
  intervals: 'Short, hard repeats',
  long: 'Slow and steady, time on feet',
};
const RUN_WEIGHT: Record<RunKind, number> = { long: 1.5, tempo: 1, intervals: 1, easy: 1, recovery: 0.7 };

export function isHardRun(s: PlannedSlot): boolean {
  return s.type === 'run' && (s.runKind === 'tempo' || s.runKind === 'intervals' || s.runKind === 'long');
}

export function isHeavyLegs(s: PlannedSlot): boolean {
  return s.type === 'gym' && s.load === 'hard' && (s.gymDay === 'full' || s.gymDay === 'lower' || s.gymDay === 'legs');
}

function isLegHeavySport(s: PlannedSlot): boolean {
  return s.type === 'sport' && getSport(s.sportId).legHeavy && s.load !== 'easy';
}

/** Build the list of sessions for a week (days not yet assigned). */
export function buildSlots(input: WeekInput): PlannedSlot[] {
  const { block, profile, weekIndex } = input;
  const focus = input.focus ?? 'balanced';
  const phase = block.phases[weekIndex] ?? 'build';
  const deload = phase === 'deload' || focus === 'deload';
  const t = weekTargets(block, focus);
  const slots: PlannedSlot[] = [];

  // Sports first: fixed commitments.
  for (let i = 0; i < t.sport; i++) {
    const sport = getSport(profile.sports[i % Math.max(1, profile.sports.length)]);
    slots.push({
      id: `sport-${i}`,
      day: 0,
      type: 'sport',
      title: sport.name,
      intent: sport.load === 'hard' ? 'Counts as a hard day' : 'Counts as training load',
      minutes: sport.typicalMinutes,
      load: sport.load,
      sportId: sport.id,
    });
  }

  gymDayPlan(block.split, t.gym, focus).forEach((g, i) => {
    const lowerish = g.gymDay === 'full' || g.gymDay === 'lower' || g.gymDay === 'legs';
    const title = GYM_TITLE[g.gymDay] + (g.gymDay === 'full' ? ` ${'ABC'[g.variant]}` : g.variant > 0 ? ' B' : '');
    slots.push({
      id: `gym-${i}`,
      day: 0,
      type: 'gym',
      title,
      intent: GYM_INTENT[g.gymDay][g.variant % GYM_INTENT[g.gymDay].length],
      minutes: deload ? 45 : focus === 'sport' ? 40 : DEFAULT_MINUTES.gym,
      // Full body C (single-leg + overhead) is the lighter day of a full-body week.
      load: deload || focus === 'sport' ? 'moderate' : lowerish && !(g.gymDay === 'full' && g.variant === 2) ? 'hard' : 'moderate',
      gymDay: g.gymDay,
      variant: g.variant,
    });
  });

  const kinds = runKinds(t.run, profile, phase, focus, weekIndex, t.gym);
  if (kinds.length) {
    let total = weeklyRunMinutes(block, weekIndex);
    if (focus === 'endurance') total = Math.min(total * 1.1, (total / Math.max(1, block.targets.run)) * kinds.length);
    if (focus === 'strength' && block.targets.run > 0) total = (total * kinds.length) / block.targets.run;
    if (focus === 'sport') total *= 0.6;
    if (focus === 'deload' && phase !== 'deload') total *= 0.7;
    const wsum = kinds.reduce((s, k) => s + RUN_WEIGHT[k], 0);
    const quality = kinds.filter((k) => k === 'tempo' || k === 'intervals').length;
    const stridesOn = (deload && kinds.length >= 2) || (!deload && profile.experience.run !== 'beginner');
    let stridesGiven = false;
    let totalMinutes = 0;
    const runSlots: PlannedSlot[] = kinds.map((k, i) => {
      let minutes = (total * RUN_WEIGHT[k]) / wsum;
      if (k === 'long') minutes = Math.min(minutes, LONG_RUN_CAP[profile.experience.run]);
      minutes = Math.max(MIN_MINUTES.run, Math.round(minutes / 5) * 5);
      totalMinutes += minutes;
      const strides = stridesOn && !stridesGiven && k === 'easy';
      if (strides) stridesGiven = true;
      return {
        id: k === 'long' ? 'run-long' : `run-${k}-${i}`,
        day: 0 as DayIndex,
        type: 'run' as const,
        title: RUN_TITLE[k],
        intent: strides ? `${RUN_INTENT[k]}, strides at the end` : RUN_INTENT[k],
        minutes,
        load: k === 'tempo' || k === 'intervals' || k === 'long' ? ('hard' as const) : ('easy' as const),
        runKind: k,
        strides: strides || undefined,
      };
    });
    if (deload) for (const s of runSlots) if (s.runKind === 'long') s.load = 'moderate';
    // 80/20: hard running may use at most 20 % of the week's running time.
    const stridesSec = stridesGiven ? 120 : 0;
    const budget = Math.max(0, totalMinutes * 60 * 0.2 - stridesSec);
    for (const s of runSlots) if (s.runKind === 'tempo' || s.runKind === 'intervals') s.hardSec = Math.floor(budget / quality / 30) * 30;
    slots.push(...runSlots);
  }

  for (let i = 0; i < t.mobility; i++) {
    slots.push({ id: `mobility-${i}`, day: 0, type: 'mobility', title: 'Mobility', intent: 'Stretch and reset', minutes: DEFAULT_MINUTES.mobility, load: 'easy' });
  }
  return slots;
}

// ---------------------------------------------------------------- scoring

interface Scored {
  penalty: number;
  warnings: WeekWarning[];
}

const dayName = (d: number) => DAY_LONG[d];

function sameMuscles(a: PlannedSlot, b: PlannedSlot): boolean {
  if (a.type !== 'gym' || b.type !== 'gym') return false;
  const groups = (g: GymDay | undefined): string[] => {
    switch (g) {
      case 'full':
        return ['upper', 'lower', 'push', 'pull'];
      case 'upper':
        return ['upper', 'push', 'pull'];
      case 'push':
        return ['upper', 'push'];
      case 'pull':
        return ['upper', 'pull'];
      case 'lower':
      case 'legs':
        return ['lower'];
      default:
        return [];
    }
  };
  const ga = groups(a.gymDay);
  const gb = groups(b.gymDay);
  // push then pull is fine; anything sharing a specific group is not.
  if ((a.gymDay === 'push' && b.gymDay === 'pull') || (a.gymDay === 'pull' && b.gymDay === 'push')) return false;
  return ga.some((g) => gb.includes(g));
}

/**
 * Penalty and plain-language warnings for a laid-out week.
 * Lower penalty is better. Only warnings worth acting on are returned.
 */
export function scoreWeek(slots: PlannedSlot[], availability: WeekAvailability, profile: Profile): Scored {
  let penalty = 0;
  const warnings: WeekWarning[] = [];
  const byDay: PlannedSlot[][] = Array.from({ length: 7 }, () => []);
  for (const s of slots) byDay[s.day].push(s);
  const main = (d: number) => byDay[d].filter((s) => s.type !== 'mobility');

  for (const s of slots) {
    const av = availability[s.day];
    if (!av.available) {
      penalty += 50;
      warnings.push({ code: 'unavailableDay', message: `${s.title} is on ${dayName(s.day)}, which you marked as busy.`, days: [s.day] });
      continue;
    }
    if (av.minutes < MIN_MINUTES[s.type]) {
      penalty += 20;
      warnings.push({ code: 'tooLong', message: `${dayName(s.day)} has ${av.minutes} min. Too short for ${s.title.toLowerCase()}.`, days: [s.day] });
    } else if (s.minutes > av.minutes) {
      penalty += ((s.minutes - av.minutes) / 5) * (s.runKind === 'long' ? 2 : 1);
    }
  }

  for (let d = 0; d < 7; d++) {
    const m = main(d);
    if (m.length > 1) {
      penalty += 15;
      warnings.push({ code: 'doubleDay', message: `Two sessions on ${dayName(d)}: ${m.map((s) => s.title).join(' and ')}.`, days: [d as DayIndex] });
    }
  }

  for (let d = 0; d < 6; d++) {
    const today = main(d);
    const tomorrow = main(d + 1);
    for (const a of today) {
      for (const b of tomorrow) {
        if (isHeavyLegs(a) && isHardRun(b)) {
          penalty += 10;
          warnings.push({ code: 'legsBeforeHardRun', message: `${a.title} on ${dayName(d)} is the day before your ${b.title.toLowerCase()}. Tired legs make for a bad run.`, days: [d as DayIndex, (d + 1) as DayIndex] });
        } else if (isHardRun(a) && isHeavyLegs(b)) {
          penalty += 4;
        }
        if (sameMuscles(a, b) && (a.load === 'hard' || b.load === 'hard' || a.gymDay === b.gymDay)) {
          penalty += 12;
          warnings.push({ code: 'sameMusclesBackToBack', message: `${a.title} and ${b.title} work the same muscles on back-to-back days.`, days: [d as DayIndex, (d + 1) as DayIndex] });
        }
        if (isLegHeavySport(a) && isHeavyLegs(b)) {
          penalty += 4;
          warnings.push({ code: 'sportBeforeLegs', message: `${a.title} on ${dayName(d)}, then ${b.title.toLowerCase()} the next day. Your legs will still be tired.`, days: [d as DayIndex, (d + 1) as DayIndex] });
        } else if (isHeavyLegs(a) && isLegHeavySport(b)) {
          penalty += 3;
        } else if (isLegHeavySport(a) && isHardRun(b)) {
          penalty += 2;
        }
        if (isHardRun(a) && isHardRun(b)) {
          penalty += 6;
          warnings.push({ code: 'hardBackToBack', message: `${a.title} and ${b.title.toLowerCase()} on back-to-back days. Space your hard runs out.`, days: [d as DayIndex, (d + 1) as DayIndex] });
        }
        if (a.load === 'hard' && b.load === 'hard') penalty += 2;
      }
    }
  }

  // The week repeats: Sunday into next Monday still matters, at half weight and without a warning.
  for (const a of main(6)) {
    for (const b of main(0)) {
      if (isHeavyLegs(a) && isHardRun(b)) penalty += 5;
      if (sameMuscles(a, b)) penalty += 4;
      if (a.load === 'hard' && b.load === 'hard') penalty += 1;
    }
  }

  // Streaks of training days and of hard days.
  const trains = (d: number) => main(d).length > 0;
  const hard = (d: number) => main(d).some((s) => s.load === 'hard');
  const maxStreak = profile.experience.gym === 'beginner' ? 2 : 3;
  let run = 0;
  let hardRun = 0;
  for (let d = 0; d < 7; d++) {
    run = trains(d) ? run + 1 : 0;
    if (run > maxStreak) penalty += 3;
    hardRun = hard(d) ? hardRun + 1 : 0;
    if (hardRun === 3) {
      penalty += 6;
      warnings.push({ code: 'hardBackToBack', message: `Three hard days in a row, ${dayName(d - 2)} to ${dayName(d)}. Put an easy day in between if you can.`, days: [(d - 2) as DayIndex, (d - 1) as DayIndex, d as DayIndex] });
    }
  }
  const trainingDays = [0, 1, 2, 3, 4, 5, 6].filter(trains).length;
  if (trainingDays === 7) warnings.push({ code: 'noRestDay', message: 'No rest day this week. Take at least one.', days: [] });
  if (trainingDays > MAX_TRAINING_DAYS[profile.experience.gym]) penalty += 5;

  // Preferences: long run at the weekend, evenly spread week.
  for (const s of slots) if (s.runKind === 'long' && s.day < 5) penalty += 1.5;
  // Prefer the biggest session on the day with the most time.
  return { penalty, warnings: dedupe(warnings) };
}

function dedupe(ws: WeekWarning[]): WeekWarning[] {
  const seen = new Set<string>();
  return ws.filter((w) => (seen.has(w.message) ? false : (seen.add(w.message), true)));
}

// ---------------------------------------------------------------- layout

function priority(s: PlannedSlot, goal: Goal): number {
  const idx = Number(s.id.split('-').pop()) || 0;
  if (s.type === 'sport') return 100 - idx;
  if (s.type === 'mobility') return 0;
  const gym = 85 - idx * 5;
  const q = s.runKind === 'long' ? 75 : s.runKind === 'tempo' || s.runKind === 'intervals' ? 70 : s.runKind === 'recovery' ? 30 : 50 - idx;
  if (goal === 'endurance') return s.type === 'gym' ? gym - 25 : q + 15;
  if (goal === 'strength' || goal === 'muscle') return s.type === 'gym' ? gym + 5 : q - 15;
  return s.type === 'gym' ? gym : q;
}

interface Layout {
  slots: PlannedSlot[];
  dropped: PlannedSlot[];
  penalty: number;
  warnings: WeekWarning[];
}

/** Fit session minutes to the day (gym and runs can shrink, sport cannot). */
function fitMinutes(s: PlannedSlot, availability: WeekAvailability): PlannedSlot {
  const av = availability[s.day];
  if (!av?.available || s.type === 'sport') return s;
  if (av.minutes >= MIN_MINUTES[s.type] && s.minutes > av.minutes) return { ...s, minutes: Math.floor(av.minutes / 5) * 5 };
  return s;
}

/** Find the lowest-penalty placement. Deterministic: ties keep the first found. */
export function layoutWeek(all: PlannedSlot[], availability: WeekAvailability, profile: Profile, pinned: PlannedSlot[] = []): { best: Layout; second: Layout | null } {
  const free = availability.map((d, i) => (d.available ? i : -1)).filter((i) => i >= 0);
  const pinnedById = new Map(pinned.filter((p) => availability[p.day]?.available).map((p) => [p.id, p.day]));
  const mainAll = all.filter((s) => s.type !== 'mobility').sort((a, b) => priority(b, profile.goal) - priority(a, profile.goal));
  const mobility = all.filter((s) => s.type === 'mobility');

  const capacity = free.length;
  const kept = mainAll.slice(0, capacity);
  const dropped = mainAll.slice(capacity);

  const fixed = kept.filter((s) => pinnedById.has(s.id)).map((s) => ({ ...s, day: pinnedById.get(s.id)! as DayIndex, pinned: true }));
  const fixedDays = new Set(fixed.map((s) => s.day));
  const toPlace = kept.filter((s) => !pinnedById.has(s.id));
  // Two pinned slots on the same day keep that; others go to free days.
  const openDays = free.filter((d) => !fixedDays.has(d as DayIndex));

  let best: Layout | null = null;
  let second: Layout | null = null;
  const signature = (slots: PlannedSlot[]) => slots.map((s) => `${s.id}@${s.day}`).sort().join('|');
  const current: PlannedSlot[] = [];
  const used = new Set<number>();

  const consider = (placed: PlannedSlot[]) => {
    const withMobility = placeMobility([...fixed, ...placed], mobility, availability, pinnedById);
    const fitted = withMobility.map((s) => fitMinutes(s, availability));
    const { penalty, warnings } = scoreWeek(fitted, availability, profile);
    const layout: Layout = { slots: fitted, dropped, penalty, warnings };
    if (!best || penalty < best.penalty) {
      if (best && signature(best.slots) !== signature(fitted)) second = best;
      best = layout;
    } else if ((!second || penalty < second.penalty) && signature(best.slots) !== signature(fitted)) {
      second = layout;
    }
  };

  const dfs = (i: number) => {
    if (i === toPlace.length) {
      consider(current);
      return;
    }
    const s = toPlace[i];
    for (const d of openDays) {
      if (used.has(d)) continue;
      used.add(d);
      current.push({ ...s, day: d as DayIndex });
      dfs(i + 1);
      current.pop();
      used.delete(d);
    }
  };
  dfs(0);

  if (!best) {
    // Nothing to place (no main sessions).
    consider([]);
  }
  const b = best as unknown as Layout;
  if (dropped.length) {
    b.warnings = [
      { code: 'droppedSessions', message: `Not enough free days for everything. Left out: ${dropped.map((s) => s.title.toLowerCase()).join(', ')}.`, days: [] },
      ...b.warnings,
    ];
  }
  return { best: b, second };
}

function placeMobility(main: PlannedSlot[], mobility: PlannedSlot[], availability: WeekAvailability, pinned: Map<string, number>): PlannedSlot[] {
  const out = [...main];
  const taken = new Set(main.map((s) => s.day as number));
  for (const m of mobility) {
    const p = pinned.get(m.id);
    if (p !== undefined) {
      out.push({ ...m, day: p as DayIndex, pinned: true });
      continue;
    }
    const free = availability.map((d, i) => ({ d, i })).filter(({ d }) => d.available && d.minutes >= MIN_MINUTES.mobility);
    // Prefer an otherwise empty free day after a hard day, then any empty free day, then an easy day.
    const hardDays = new Set(main.filter((s) => s.load === 'hard').map((s) => s.day as number));
    const empty = free.filter(({ i }) => !taken.has(i));
    const pick =
      empty.find(({ i }) => hardDays.has(i - 1)) ??
      empty[0] ??
      free.find(({ i }) => !hardDays.has(i)) ??
      free[0] ??
      { i: 6 };
    taken.add(pick.i);
    out.push({ ...m, day: pick.i as DayIndex });
  }
  return out;
}

function lighterSlots(slots: PlannedSlot[], goal: Goal): PlannedSlot[] {
  const main = slots.filter((s) => s.type !== 'mobility' && s.type !== 'sport');
  if (main.length === 0) return slots;
  const drop = [...main].sort((a, b) => priority(a, goal) - priority(b, goal))[0];
  return slots.filter((s) => s.id !== drop.id);
}

export function planWeek(input: WeekInput): WeekPlanResult {
  const { block, profile, weekIndex } = input;
  const availability = (input.availability ?? block.availability).map((d) => ({ ...d }));
  const focus = input.focus ?? 'balanced';
  const phase = block.phases[weekIndex] ?? 'build';
  const slots = buildSlots(input);
  const { best, second } = layoutWeek(slots, availability, profile, input.pinned);

  const base = {
    weekStart: input.weekStart,
    blockId: block.id,
    weekIndex,
    phase,
    focus,
    availability,
  };
  const recommended: WeekPlan = {
    ...base,
    slots: sortSlots(best.slots),
    warnings: best.warnings,
    chosen: 'recommended',
    label: 'Recommended',
    why: phase === 'deload' ? 'Deload week: same rhythm, less work. You come back stronger.' : 'Spaced so hard days are followed by easier ones.',
  };

  const mainCount = best.slots.filter((s) => s.type !== 'mobility').length;
  let alternative: WeekPlan;
  if (mainCount >= 4) {
    const lighter = lighterSlots(best.slots, profile.goal);
    const removed = best.slots.find((s) => !lighter.some((l) => l.id === s.id));
    const lay = layoutWeek(lighter, availability, profile, input.pinned).best;
    alternative = {
      ...base,
      slots: sortSlots(lay.slots),
      warnings: lay.warnings,
      chosen: 'alternative',
      label: 'Lighter week',
      why: `Drops the ${removed?.title.toLowerCase() ?? 'least important session'}. More recovery for a busy week.`,
    };
  } else if (second) {
    const s2 = second as Layout;
    alternative = {
      ...base,
      slots: sortSlots(s2.slots),
      warnings: s2.warnings,
      chosen: 'alternative',
      label: 'Other days',
      why: 'Same sessions on different days.',
    };
  } else {
    alternative = { ...recommended, chosen: 'alternative', label: 'Same as recommended', why: 'Only one sensible layout fits your free days.' };
  }
  return { recommended, alternative };
}

export function sortSlots(slots: PlannedSlot[]): PlannedSlot[] {
  const order = { sport: 0, gym: 1, run: 2, mobility: 3 } as const;
  return [...slots].sort((a, b) => a.day - b.day || order[a.type] - order[b.type]);
}

/** Re-check a week after any change, refitting minutes to availability. */
export function revalidateWeek(plan: WeekPlan, profile: Profile): WeekPlan {
  const slots = plan.slots.map((s) => fitMinutes(s, plan.availability));
  const { warnings } = scoreWeek(slots, plan.availability, profile);
  return { ...plan, slots: sortSlots(slots), warnings };
}

/**
 * Move a session to another day. A main session already on that day swaps places with it.
 * Both end up pinned so re-planning keeps them where the user put them.
 */
export function moveSession(plan: WeekPlan, slotId: string, toDay: DayIndex, profile: Profile): WeekPlan {
  const moving = plan.slots.find((s) => s.id === slotId);
  if (!moving || moving.day === toDay) return plan;
  const from = moving.day;
  const occupant = moving.type !== 'mobility' ? plan.slots.find((s) => s.day === toDay && s.type !== 'mobility' && s.id !== slotId) : undefined;
  const slots = plan.slots.map((s) => {
    if (s.id === slotId) return { ...s, day: toDay, pinned: true };
    if (occupant && s.id === occupant.id) return { ...s, day: from, pinned: true };
    return s;
  });
  return revalidateWeek({ ...plan, slots }, profile);
}
