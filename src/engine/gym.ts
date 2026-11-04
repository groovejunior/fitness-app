import { CONTEXT_EQUIPMENT, EXERCISES, fitsStyle, getExercise, isAvailable, isCalisthenics } from '../content/exercises';
import { suggestLoad } from './progression';
import type {
  EquipmentContext,
  Exercise,
  Experience,
  GymDay,
  Goal,
  History,
  Intensity,
  Phase,
  PlannedSlot,
  Profile,
  Slot,
  TrainingStyle,
  Workout,
  WorkoutItem,
  WorkoutSection,
} from './types';

export interface WorkoutRequest {
  slot: PlannedSlot;
  profile: Profile;
  equipment: EquipmentContext;
  minutes: number;
  intensity: Intensity;
  phase: Phase;
  weekIndex: number;
  history: History;
}

export type Role = 'main' | 'accessory' | 'core' | 'finisher';
interface TemplateSlot {
  slot: Slot;
  role: Role;
}

const T = (main: Slot[], accessory: Slot[], core: Slot[], finisher: Slot[]): TemplateSlot[] => [
  ...main.map((slot) => ({ slot, role: 'main' as const })),
  ...accessory.map((slot) => ({ slot, role: 'accessory' as const })),
  ...core.map((slot) => ({ slot, role: 'core' as const })),
  ...finisher.map((slot) => ({ slot, role: 'finisher' as const })),
];

/** Session templates. Accessories are listed in priority order: the last ones are cut first. */
export const TEMPLATES: Record<GymDay, TemplateSlot[][]> = {
  full: [
    T(['squat', 'pushH'], ['pullH', 'hinge', 'shoulderHealth'], ['core'], ['plyo']),
    T(['hinge', 'pullV'], ['pushV', 'lunge', 'calves'], ['antiRotation'], ['conditioning']),
    T(['lunge', 'pushV'], ['pullV', 'pushH', 'hinge'], ['core'], ['carry']),
  ],
  upper: [
    T(['pushH', 'pullV'], ['pushV', 'pullH', 'shoulderHealth'], ['core'], ['carry']),
    T(['pushV', 'pullH'], ['pushH', 'pullV', 'shoulderHealth'], ['antiRotation'], ['conditioning']),
  ],
  lower: [
    T(['squat', 'hinge'], ['lunge', 'calves'], ['core'], ['plyo']),
    T(['hinge', 'lunge'], ['squat', 'calves'], ['antiRotation'], ['carry']),
  ],
  push: [
    T(['pushH', 'pushV'], ['pushH', 'shoulderHealth'], ['core'], ['conditioning']),
    T(['pushV', 'pushH'], ['pushV', 'shoulderHealth'], ['antiRotation'], ['conditioning']),
  ],
  pull: [
    T(['pullV', 'pullH'], ['pullH', 'shoulderHealth', 'carry'], ['core'], []),
    T(['pullH', 'pullV'], ['pullV', 'shoulderHealth', 'carry'], ['antiRotation'], []),
  ],
  legs: [
    T(['squat', 'hinge'], ['lunge', 'calves', 'plyo'], ['antiRotation'], []),
    T(['hinge', 'squat'], ['lunge', 'calves'], ['core'], ['plyo']),
  ],
};

/** Extra work to add when there is more time than the template fills. */
const EXTRAS: Slot[] = ['shoulderHealth', 'carry', 'antiRotation', 'calves', 'conditioning', 'core'];

/** When nothing in a slot is available with this equipment, try these instead. */
const FALLBACK: Partial<Record<Slot, Slot[]>> = {
  pullV: ['pullH'],
  pullH: ['pullV'],
  shoulderHealth: ['pullH'],
  antiRotation: ['core'],
  carry: ['core'],
  calves: ['plyo'],
};

const LEG_SLOTS: Slot[] = ['squat', 'hinge'];

function rank(ex: Exercise, role: Role, exp: Experience, style: TrainingStyle): number {
  let r = 0;
  // Bodyweight first: calisthenics moves lead, except the squat and hinge main lifts,
  // which stay classic barbell work because bodyweight alone stops being enough for legs.
  if (style === 'calisthenics' && !LEG_SLOTS.includes(ex.slot) && isCalisthenics(ex)) r += role === 'main' ? 4 : 2;
  if (role === 'main') {
    r += ex.compound ? 3 : 0;
    r += ex.loaded ? 2 : 0;
    const fit: Record<Experience, Record<number, number>> = {
      beginner: { 1: 1, 2: 0, 3: -4 },
      intermediate: { 1: -1, 2: 1, 3: 1 },
      advanced: { 1: -1, 2: 1, 3: 2 },
    };
    r += fit[exp][ex.difficulty];
  } else {
    r += ex.loaded ? 1 : 0;
    r += ex.compound ? 1 : 0;
    r -= ex.equipment.includes('barbell') ? 1 : 0;
    r -= ex.difficulty === 3 ? (exp === 'beginner' ? 3 : 1) : 0;
  }
  return r;
}

/** Ranked exercises for a slot. `strict` drops moves that don't fit the style; otherwise they are a last resort. */
export function candidates(slot: Slot, role: Role, ctx: EquipmentContext, exp: Experience, style: TrainingStyle = 'calisthenics', strict = false): Exercise[] {
  const available = EXERCISES.filter((e) => e.slot === slot && isAvailable(e, ctx));
  const styled = available.filter((e) => fitsStyle(e, style));
  const list = styled.length || strict ? styled : available;
  // Stable sort by rank, then library order.
  return list
    .map((e, i) => ({ e, i, r: rank(e, role, exp, style) }))
    .sort((a, b) => b.r - a.r || a.i - b.i)
    .map((x) => x.e);
}

function pick(slot: Slot, role: Role, ctx: EquipmentContext, exp: Experience, used: Set<string>, offset: number, style: TrainingStyle): Exercise | null {
  const tryList = [slot, ...(FALLBACK[slot] ?? [])];
  // First anything that fits the training style (in the slot, then its fallbacks), then anything at all.
  for (const strict of [true, false]) {
    for (const s of tryList) {
      const c = candidates(s, role, ctx, exp, style, strict).filter((e) => !used.has(e.id));
      if (c.length) return c[Math.min(offset, c.length - 1)];
    }
  }
  return null;
}

// ---------------------------------------------------------------- prescriptions

type Rx = { sets: number; repsMin: number; repsMax: number; restSec: number };

const BASE: Record<'main' | 'accessory', Record<Goal, Rx>> = {
  main: {
    strength: { sets: 4, repsMin: 4, repsMax: 6, restSec: 150 },
    athletic: { sets: 4, repsMin: 5, repsMax: 8, restSec: 120 },
    muscle: { sets: 3, repsMin: 8, repsMax: 12, restSec: 90 },
    endurance: { sets: 3, repsMin: 8, repsMax: 12, restSec: 75 },
    health: { sets: 3, repsMin: 8, repsMax: 12, restSec: 90 },
  },
  accessory: {
    strength: { sets: 3, repsMin: 8, repsMax: 10, restSec: 90 },
    athletic: { sets: 3, repsMin: 8, repsMax: 12, restSec: 75 },
    muscle: { sets: 3, repsMin: 10, repsMax: 15, restSec: 60 },
    endurance: { sets: 2, repsMin: 12, repsMax: 15, restSec: 45 },
    health: { sets: 3, repsMin: 10, repsMax: 12, restSec: 60 },
  },
};

export function prescribe(ex: Exercise, role: Role, profile: Profile, intensity: Intensity, phase: Phase): Rx {
  let rx: Rx;
  if (role === 'main' || role === 'accessory') rx = { ...BASE[role][profile.goal] };
  else if (role === 'core') rx = { sets: 3, repsMin: 10, repsMax: 15, restSec: 45 };
  else rx = ex.slot === 'plyo' ? { sets: 3, repsMin: 5, repsMax: 6, restSec: 60 } : { sets: 3, repsMin: 30, repsMax: 40, restSec: 30 };

  // Units other than plain reps.
  if (ex.unit === 'sec') rx = { ...rx, repsMin: 30, repsMax: ex.slot === 'carry' ? 40 : 45 };
  else if (ex.unit === 'secPerSide') rx = { ...rx, repsMin: 20, repsMax: 30 };
  else if (!ex.loaded && ex.slot !== 'plyo' && (role === 'main' || role === 'accessory')) {
    // Bodyweight progression is reps-based: 5–8 for pull-ups and dips, 8–12 for other main moves.
    const hard = ex.slot === 'pullV' || ex.id === 'dip' || ex.id === 'pike-push-up';
    if (ex.id === 'negative-pull-up') rx = { ...rx, repsMin: 3, repsMax: 5 };
    else if (hard) rx = { ...rx, repsMin: profile.experience.gym === 'beginner' ? 3 : 5, repsMax: 8 };
    else if (role === 'main') rx = { ...rx, repsMin: 8, repsMax: 12 };
    else rx = { ...rx, repsMin: 10, repsMax: 15 };
  }
  if (ex.unit === 'repsPerSide' && rx.repsMax > 12) rx = { ...rx, repsMin: Math.min(rx.repsMin, 8), repsMax: 12 };

  if (role === 'main' && profile.experience.gym === 'beginner') rx.sets = Math.min(rx.sets, 3);
  if (intensity === 'easy') rx.sets = Math.max(2, rx.sets - 1);
  if (intensity === 'hard' && role === 'main') rx.sets = Math.min(5, rx.sets + 1);
  if (phase === 'peak' && role === 'main' && ex.unit === 'reps' && ex.loaded) {
    rx = { ...rx, repsMin: Math.max(3, rx.repsMin - 2), repsMax: Math.max(5, rx.repsMax - 2), restSec: rx.restSec + 30 };
  }
  if (phase === 'deload') rx.sets = Math.max(2, Math.ceil(rx.sets * 0.6));
  return rx;
}

// ---------------------------------------------------------------- time estimate

export function itemSeconds(item: WorkoutItem, ex: Exercise = getExercise(item.exerciseId)): number {
  const avg = (item.repsMin + item.repsMax) / 2;
  const sides = ex.unit === 'repsPerSide' || ex.unit === 'secPerSide' ? 2 : 1;
  const work = ex.unit === 'sec' || ex.unit === 'secPerSide' ? avg * sides + 10 : avg * 4 * sides + 15;
  return item.sets * (work + item.restSec);
}

export function sectionSeconds(sec: WorkoutSection): number {
  // Superset pairs share one rest.
  let total = 0;
  const grouped = new Map<string, WorkoutItem[]>();
  for (const it of sec.items) {
    if (it.group) grouped.set(it.group, [...(grouped.get(it.group) ?? []), it]);
    else total += itemSeconds(it);
  }
  for (const items of grouped.values()) {
    const rest = Math.max(...items.map((i) => i.restSec));
    const sets = Math.max(...items.map((i) => i.sets));
    total += items.reduce((s, i) => s + itemSeconds({ ...i, restSec: 0 }), 0) + sets * rest;
  }
  // Warm-up sets before the first heavy lift.
  if (sec.kind === 'main') total += 90 + (sec.items.length - 1) * 45;
  return total;
}

export function estimateMinutes(sections: WorkoutSection[]): number {
  return Math.round(sections.reduce((s, sec) => s + sectionSeconds(sec), 0) / 60);
}

// ---------------------------------------------------------------- builder

interface Planned {
  ex: Exercise;
  role: Role;
  rx: Rx;
}

function warmupFor(gymDay: GymDay, ctx: EquipmentContext, short: boolean): string[] {
  const lower = gymDay === 'full' || gymDay === 'lower' || gymDay === 'legs';
  const list = ['jumping-jack', 'worlds-greatest-stretch', lower ? 'leg-swing' : 'cat-cow'];
  if (!lower && CONTEXT_EQUIPMENT[ctx].includes('band')) list[2] = 'face-pull';
  return short ? list.slice(0, 2) : list;
}

function cooldownFor(gymDay: GymDay, short: boolean): string[] {
  const lower = gymDay === 'full' || gymDay === 'lower' || gymDay === 'legs';
  const list = lower ? ['hip-flexor-stretch', 'open-book'] : ['open-book', 'cat-cow'];
  return short ? list.slice(0, 1) : list;
}

function prepItem(id: string, prefix: string, i: number): WorkoutItem {
  const ex = getExercise(id);
  const sec = ex.unit === 'sec' || ex.unit === 'secPerSide';
  return {
    id: `${prefix}-${i}-${id}`,
    exerciseId: id,
    sets: 1,
    repsMin: sec ? 30 : ex.unit === 'repsPerSide' ? 5 : 8,
    repsMax: sec ? 45 : ex.unit === 'repsPerSide' ? 6 : 10,
    restSec: 0,
    targetKg: null,
  };
}

export function buildGymWorkout(req: WorkoutRequest, variant: 'recommended' | 'alternative'): Workout {
  const { slot, profile, equipment, intensity, phase } = req;
  const gymDay = slot.gymDay ?? 'full';
  const templates = TEMPLATES[gymDay];
  const template = templates[(slot.variant ?? 0) % templates.length];
  const exp = profile.experience.gym;
  const style = profile.style ?? 'calisthenics';
  const offset = variant === 'alternative' ? 1 : 0;
  const superset = variant === 'alternative';

  const used = new Set<string>();
  const planned: Planned[] = [];
  for (const ts of template) {
    const ex = pick(ts.slot, ts.role, equipment, exp, used, ts.role === 'main' && variant === 'recommended' ? 0 : offset, style);
    if (!ex) continue;
    used.add(ex.id);
    planned.push({ ex, role: ts.role, rx: prescribe(ex, ts.role, profile, intensity, phase) });
  }

  let warm = warmupFor(gymDay, equipment, false);
  let cool = cooldownFor(gymDay, false);
  const target = req.minutes;

  const build = (): WorkoutSection[] => sections(planned, warm, cool, superset, req);
  const est = () => estimateMinutes(build());

  // ---- shrink: keep main lifts, cut accessories first.
  const removeLast = (role: Role, keep = 0) => {
    const idx = lastIdx(planned, (p) => p.role === role);
    if (idx >= 0 && planned.filter((p) => p.role === role).length > keep) {
      planned.splice(idx, 1);
      return true;
    }
    return false;
  };
  const shrinkSteps: Array<() => boolean> = [
    () => removeLast('finisher'),
    () => removeLast('accessory', 2),
    () => setSets('accessory', 2),
    () => setSets('core', 2),
    () => (warm.length > 2 || cool.length > 1 ? ((warm = warm.slice(0, 2)), (cool = cool.slice(0, 1)), true) : false),
    () => removeLast('accessory', 1),
    () => setSets('main', 3),
    () => removeLast('accessory'),
    () => setSets('main', 2),
    () => removeLast('core'),
    () => (cool.length ? ((cool = []), true) : false),
    () => (warm.length > 1 ? ((warm = warm.slice(0, 1)), true) : false),
  ];
  function setSets(role: Role, n: number): boolean {
    let changed = false;
    for (const p of planned) if (p.role === role && p.rx.sets > n) ((p.rx = { ...p.rx, sets: n }), (changed = true));
    return changed;
  }
  for (const step of shrinkSteps) {
    if (est() <= target) break;
    while (est() > target && step()) {
      /* keep applying this step while it helps */
    }
  }

  // ---- extend: add accessories/conditioning, then sets.
  if (est() < target - 5) {
    const extras = [...template.filter((t) => t.role === 'finisher').map((t) => t.slot), ...EXTRAS];
    for (const s of extras) {
      if (est() >= target - 5) break;
      if (planned.some((p) => p.ex.slot === s)) continue;
      const role: Role = s === 'core' || s === 'antiRotation' ? 'core' : s === 'conditioning' || s === 'plyo' ? 'finisher' : 'accessory';
      const ex = pick(s, role, equipment, exp, used, offset, style);
      if (!ex) continue;
      const trial: Planned = { ex, role, rx: prescribe(ex, role, profile, intensity, phase) };
      planned.push(trial);
      used.add(ex.id);
      if (est() > target + 3) {
        planned.pop();
        used.delete(ex.id);
      }
    }
    const grow = (role: Role, max: number) => {
      for (const p of planned) {
        if (est() >= target - 3) return;
        if (p.role === role && p.rx.sets < max) {
          p.rx = { ...p.rx, sets: p.rx.sets + 1 };
          if (est() > target + 3) p.rx = { ...p.rx, sets: p.rx.sets - 1 };
        }
      }
    };
    if (phase !== 'deload') {
      grow('accessory', 4);
      grow('main', 5);
    }
  }

  const finalSections = build();
  const mainNames = planned.filter((p) => p.role === 'main').map((p) => p.ex.name.toLowerCase());
  return {
    id: `${slot.id}:${variant}`,
    type: 'gym',
    variant,
    title: slot.title,
    label: variant === 'recommended' ? 'Recommended' : 'Supersets',
    why:
      variant === 'recommended'
        ? `Built around ${joinWords(mainNames)}. Main lifts first while you're fresh.`
        : 'Different exercises for the same muscles, paired up to cut waiting time.',
    equipment,
    intensity,
    targetMinutes: target,
    estimatedMinutes: estimateMinutes(finalSections),
    sections: finalSections,
  };
}

function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? 'the main lifts';
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

function lastIdx<T>(arr: T[], pred: (t: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) return i;
  return -1;
}

function sections(planned: Planned[], warm: string[], cool: string[], superset: boolean, req: WorkoutRequest): WorkoutSection[] {
  const out: WorkoutSection[] = [];
  if (warm.length) out.push({ kind: 'warmup', title: 'Warm-up', items: warm.map((id, i) => prepItem(id, 'warmup', i)) });
  const toItem = (p: Planned, i: number, kind: string): WorkoutItem => {
    const load = suggestLoad(p.ex, p.rx.repsMin, p.rx.repsMax, req.history, req.phase);
    let note = load.note || undefined;
    if (kind === 'main' && i === 0) note = [note, 'Do 2–3 lighter warm-up sets first.'].filter(Boolean).join(' ');
    if (req.intensity === 'easy' && kind === 'main') note = [note, 'Easy day: stop 3–4 reps short.'].filter(Boolean).join(' ');
    if (req.intensity === 'hard' && kind === 'main') note = [note, 'Hard day: last set close to failure.'].filter(Boolean).join(' ');
    return {
      id: `${kind}-${i}-${p.ex.id}`,
      exerciseId: p.ex.id,
      sets: p.rx.sets,
      repsMin: p.rx.repsMin,
      repsMax: p.rx.repsMax,
      restSec: p.rx.restSec,
      targetKg: load.kg,
      note,
    };
  };
  const main = planned.filter((p) => p.role === 'main');
  const acc = planned.filter((p) => p.role === 'accessory');
  const core = planned.filter((p) => p.role === 'core');
  const fin = planned.filter((p) => p.role === 'finisher');

  if (main.length)
    out.push({
      kind: 'main',
      title: 'Main lifts',
      items: main.map((p, i) => {
        const it = toItem(p, i, 'main');
        return superset ? { ...it, restSec: Math.min(it.restSec, 120) } : it;
      }),
    });
  if (acc.length) {
    const items = acc.map((p, i) => toItem(p, i, 'accessory'));
    if (superset) pair(items, ['A', 'B', 'C']);
    out.push({ kind: 'accessory', title: superset ? 'Supersets' : 'Accessories', items });
  }
  if (core.length) out.push({ kind: 'core', title: 'Core', items: core.map((p, i) => toItem(p, i, 'core')) });
  if (fin.length) out.push({ kind: 'conditioning', title: 'Finisher', items: fin.map((p, i) => toItem(p, i, 'finisher')) });
  if (cool.length) out.push({ kind: 'cooldown', title: 'Cool-down', items: cool.map((id, i) => prepItem(id, 'cooldown', i)) });
  return out;
}

function pair(items: WorkoutItem[], labels: string[]): void {
  for (let i = 0; i + 1 < items.length; i += 2) {
    const g = labels[i / 2] ?? String(i / 2);
    items[i].group = g;
    items[i + 1].group = g;
    items[i].restSec = 15;
    items[i + 1].restSec = Math.max(60, items[i + 1].restSec);
  }
}
