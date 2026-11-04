// Week planning: turn targets + this week's availability into sessions on days.
// Placement is a small deterministic search: greedy start, then move/swap
// improvements against a penalty score built from recovery rules.
import { MIN_SESSION_MIN, PHASES, qualityRunsPerWeek } from './block';
import { addDays, weekDates, WEEKDAY_SHORT } from './dates';
import { RUN_TITLE, isQuality } from './running';
import { TEMPLATES } from './strength';
import type {
  Block,
  DayAvailability,
  GymFocus,
  History,
  Intensity,
  ISODate,
  PlannedSession,
  Profile,
  RunKind,
  SessionType,
  Targets,
  WeekFocus,
  WeekPhase,
  WeekPlan,
  WeekProposal,
  WeekWarning,
} from './types';

export interface WeekInput {
  block: Block;
  profile: Profile;
  weekStart: ISODate;
  weekIndex: number;
  focus: WeekFocus;
  availability: DayAvailability[];
  history: History;
  /** Sessions to keep as they are (already done, skipped or committed). */
  keep?: PlannedSession[];
  /** Days before this date are in the past and get no new sessions. */
  fromDate?: ISODate;
}

/** A session to place, before it has a day. */
interface Spec {
  key: string;
  type: SessionType;
  intent: string;
  title: string;
  durationMin: number;
  intensity: Intensity;
  emphasis?: 'lower' | 'upper';
  fixedDay?: number;
  preferredDays?: number[];
  /** Sessions the user should not lose first when trimming. */
  priority: number;
}

// ---------------------------------------------------------------------------
// Splits

export function gymSplit(n: number): GymFocus[] {
  switch (n) {
    case 0:
      return [];
    case 1:
      return ['full-a'];
    case 2:
      return ['full-a', 'full-b'];
    case 3:
      return ['full-a', 'full-b', 'full-c'];
    case 4:
      return ['upper', 'lower', 'upper', 'lower'];
    case 5:
      return ['upper', 'lower', 'push', 'pull', 'legs'];
    default:
      return ['push', 'pull', 'legs', 'push', 'pull', 'legs'].slice(0, n) as GymFocus[];
  }
}

const QUALITY_ROTATION: RunKind[][] = [
  ['intervals', 'tempo'],
  ['tempo', 'intervals'],
  ['intervals', 'progression'],
  ['tempo', 'intervals'],
];

export function runKinds(n: number, exp: Profile['experience']['run'], weekIndex: number, goal: Profile['goal']): RunKind[] {
  if (n === 0) return [];
  const q = qualityRunsPerWeek(exp, n);
  const kinds: RunKind[] = [];
  const rot = QUALITY_ROTATION[weekIndex % 4];
  for (let i = 0; i < q; i++) kinds.push(rot[i]);
  const hasLong = n >= 3 || (n === 2 && goal === 'endurance');
  if (hasLong) kinds.push('long');
  while (kinds.length < n) kinds.push(kinds.length === n - 1 && n >= 4 ? 'recovery' : exp === 'beginner' ? 'easy' : kinds.includes('strides') ? 'easy' : 'strides');
  if (n === 1) return [exp === 'beginner' ? 'easy' : 'strides'];
  return kinds;
}

/** Weekly run volume factor per block week: ≤ 10% growth, then deload. */
export const RUN_VOLUME = [1, 1.08, 1.16, 0.8];

function runDurations(kinds: RunKind[], weeklyMin: number, exp: Profile['experience']['run']): number[] {
  const qMin = exp === 'beginner' ? 30 : exp === 'intermediate' ? 40 : 50;
  const durations: number[] = kinds.map((k) => (isQuality(k) ? qMin : 0));
  const longIdx = kinds.indexOf('long');
  const qualityTotal = durations.reduce((a, b) => a + b, 0);
  const rest = kinds.map((k, i) => (!isQuality(k) && k !== 'long' ? i : -1)).filter((i) => i >= 0);
  if (longIdx >= 0) durations[longIdx] = Math.min(110, Math.round(weeklyMin * 0.35));
  const left = weeklyMin - qualityTotal - (longIdx >= 0 ? durations[longIdx] : 0);
  for (const i of rest) {
    const share = rest.length ? left / rest.length : 0;
    const base = kinds[i] === 'recovery' ? Math.min(share, 30) : share;
    durations[i] = Math.max(20, Math.min(60, base));
  }
  // The long run is the longest run of the week, by a clear margin.
  if (longIdx >= 0) {
    const others = durations.filter((_, i) => i !== longIdx);
    durations[longIdx] = Math.min(120, Math.max(durations[longIdx], (others.length ? Math.max(...others) : 0) + 10, 35));
  }
  return durations.map((d) => Math.round(d / 5) * 5);
}

// ---------------------------------------------------------------------------
// Focus adjustments

function adjustTargets(t: Targets, focus: WeekFocus): Targets {
  const out = { ...t };
  if (focus === 'endurance' && out.gym >= 2) {
    out.gym -= 1;
    out.run += 1;
  }
  if (focus === 'sport') {
    out.gym = Math.min(out.gym, 2);
    out.run = Math.min(out.run, 1);
    out.mobility = Math.max(out.mobility, 1);
  }
  return out;
}

function adjustSplit(split: GymFocus[], focus: WeekFocus): { focus: GymFocus; emphasis?: 'lower' | 'upper' }[] {
  if (focus === 'legs') {
    if (split.every((s) => s.startsWith('full'))) return split.map((f) => ({ focus: f, emphasis: 'lower' as const }));
    const i = split.lastIndexOf('upper') >= 0 ? split.lastIndexOf('upper') : split.lastIndexOf('push');
    return split.map((f, j) => ({ focus: j === i && split.length >= 3 ? 'legs' : f }));
  }
  if (focus === 'upper' || focus === 'sport') {
    if (split.every((s) => s.startsWith('full'))) return split.map((f) => ({ focus: f, emphasis: 'upper' as const }));
    const i = split.lastIndexOf('lower') >= 0 ? split.lastIndexOf('lower') : split.lastIndexOf('legs');
    return split.map((f, j) => ({ focus: j === i && split.length >= 3 ? 'upper' : f }));
  }
  return split.map((f) => ({ focus: f }));
}

// ---------------------------------------------------------------------------
// Specs

function buildSpecs(input: WeekInput, phase: WeekPhase, targets: Targets): Spec[] {
  const { profile, block, focus } = input;
  const specs: Spec[] = [];
  const deload = phase === 'deload';

  const gym = adjustSplit(gymSplit(targets.gym), focus);
  gym.forEach((g, i) =>
    specs.push({
      key: `gym${i}`,
      type: 'gym',
      intent: g.focus,
      title: TEMPLATES[g.focus].title + (g.emphasis === 'lower' ? ', legs focus' : g.emphasis === 'upper' ? ', upper focus' : ''),
      durationMin: deload ? Math.max(30, block.gymMinutes - 15) : block.gymMinutes,
      intensity: deload || focus === 'sport' ? 'easy' : phase === 'peak' ? 'hard' : 'moderate',
      emphasis: g.emphasis,
      priority: i === 0 ? 9 : 6 - i,
    }),
  );

  let kinds = runKinds(targets.run, profile.experience.run, input.weekIndex, profile.goal);
  if (deload || focus === 'sport') kinds = kinds.map((k) => (isQuality(k) ? 'strides' : k === 'long' && focus === 'sport' ? 'easy' : k));
  const weeklyMin = Math.round(block.baseRunMinutes * RUN_VOLUME[Math.min(input.weekIndex, 3)] * (focus === 'deload' && phase !== 'deload' ? 0.8 : 1));
  const durations = runDurations(kinds, weeklyMin, profile.experience.run);
  kinds.forEach((k, i) =>
    specs.push({
      key: `run${i}`,
      type: 'run',
      intent: k,
      title: RUN_TITLE[k],
      durationMin: durations[i],
      intensity: isQuality(k) ? 'hard' : k === 'long' ? 'moderate' : 'easy',
      priority: k === 'long' ? 8 : isQuality(k) ? 7 : 3 - i * 0.1,
    }),
  );

  // Sports: from the profile, up to the target count.
  let sportLeft = targets.sport;
  for (const sp of profile.sports) {
    for (let j = 0; j < sp.perWeek && sportLeft > 0; j++, sportLeft--) {
      const day = sp.days?.[j];
      specs.push({
        key: `sport-${sp.name}-${j}`,
        type: 'sport',
        intent: sp.name,
        title: sp.name.charAt(0).toUpperCase() + sp.name.slice(1),
        durationMin: sp.durationMin,
        intensity: sp.intensity,
        fixedDay: day,
        priority: 10,
      });
    }
  }
  for (let j = 0; sportLeft > 0; j++, sportLeft--) {
    specs.push({ key: `sport-x${j}`, type: 'sport', intent: 'sport', title: 'Sport', durationMin: 60, intensity: 'moderate', priority: 10 });
  }

  for (let i = 0; i < targets.mobility; i++) {
    specs.push({ key: `mob${i}`, type: 'mobility', intent: 'mobility', title: 'Mobility', durationMin: 20, intensity: 'easy', priority: 1 });
  }
  return specs;
}

// ---------------------------------------------------------------------------
// Scoring

interface Placed {
  type: SessionType;
  intent: string;
  durationMin: number;
  intensity: Intensity;
  day: number;
  fixed?: boolean;
  preferredDays?: number[];
  label: string;
  id?: string;
}

const legLoad = (p: Placed): number =>
  p.type !== 'gym' ? 0 : p.intent === 'lower' || p.intent === 'legs' ? 2 : p.intent.startsWith('full') ? 1 : 0;
const upperGroup = (p: Placed): string | null =>
  p.type !== 'gym' ? null : p.intent === 'upper' ? 'upper' : p.intent === 'push' ? 'push' : p.intent === 'pull' ? 'pull' : p.intent.startsWith('full') ? 'full' : null;
const hardRun = (p: Placed) => p.type === 'run' && (isQuality(p.intent as RunKind) || p.intent === 'long');
const isHard = (p: Placed) =>
  (p.type === 'gym' && p.intensity !== 'easy') || hardRun(p) || (p.type === 'sport' && p.intensity !== 'easy');

interface Rule {
  score: number;
  message?: string;
  id?: string;
}

function evaluate(placed: Placed[], avail: DayAvailability[], opts: { blocked?: Set<number> } = {}): Rule[] {
  const out: Rule[] = [];
  const byDay: Placed[][] = Array.from({ length: 7 }, () => []);
  for (const p of placed) byDay[p.day].push(p);
  const D = WEEKDAY_SHORT;

  // Availability and minutes.
  for (let d = 0; d < 7; d++) {
    const list = byDay[d];
    if (list.length === 0) continue;
    const a = avail[d];
    const free = a.available ? a.minutes : 0;
    for (const p of list) {
      if (opts.blocked?.has(d) && !p.fixed) out.push({ score: 1000 });
      if (!a.available || a.minutes < MIN_SESSION_MIN) {
        out.push({ score: p.fixed ? 0 : 400, message: `${D[d]} isn't marked as free.`, id: p.id });
      }
    }
    const total = list.reduce((t, p) => t + p.durationMin, 0);
    if (a.available && total > free) {
      const over = total - free;
      // Sessions shrink to fit, so this is soft, but long runs and gym sessions lose the most.
      out.push({
        score: over * 1.2 + (list.some((p) => p.intent === 'long') ? over : 0),
        message: over >= 15 ? `${D[d]} has ${free} min free, the plan needs ${total}.` : undefined,
        id: list[0].id,
      });
    }
    const main = list.filter((p) => p.type !== 'mobility');
    if (main.filter((p) => p.type === 'gym').length >= 2) out.push({ score: 150 });
    if (main.filter((p) => p.type === 'run').length >= 2) out.push({ score: 150 });
    if (main.length >= 2) {
      out.push({ score: 90 + (main.filter(isHard).length >= 2 ? 40 : 0), message: `Two sessions on ${D[d]}.`, id: main[1].id });
      if (main.some(hardRun) && main.some((p) => legLoad(p) > 0)) out.push({ score: 50 });
    } else if (list.length >= 2) {
      out.push({ score: 3 });
    }
    // Sports: preferred days.
    for (const p of list) if (p.preferredDays && !p.preferredDays.includes(d)) out.push({ score: 30 });
  }

  // Day-to-day recovery rules.
  for (let d = 0; d < 6; d++) {
    const today = byDay[d];
    const next = byDay[d + 1];
    for (const a of today) {
      for (const b of next) {
        if (legLoad(a) > 0 && hardRun(b)) {
          out.push({
            score: 30 * legLoad(a),
            message: legLoad(a) >= 2 ? `${b.label} the day after a heavy leg day (${D[d]}). Swap them if you can.` : undefined,
            id: b.id,
          });
        }
        if (hardRun(a) && legLoad(b) > 0) out.push({ score: 12 * legLoad(b) });
        if (legLoad(a) > 0 && legLoad(b) > 0) {
          out.push({
            score: 25 * (legLoad(a) + legLoad(b)),
            message: legLoad(a) + legLoad(b) >= 3 ? `Legs on ${D[d]} and ${D[d + 1]} back to back.` : undefined,
            id: b.id,
          });
        }
        const ua = upperGroup(a);
        const ub = upperGroup(b);
        if (ua && ub && (ua === ub || (ua === 'upper' && ub !== 'full') || (ub === 'upper' && ua !== 'full'))) {
          out.push({ score: ua === ub ? 45 : 20, message: ua === ub && ua !== 'full' ? `Same muscles on ${D[d]} and ${D[d + 1]}.` : undefined, id: b.id });
        }
        if (a.type === 'run' && b.type === 'run' && isQuality(a.intent as RunKind) && isQuality(b.intent as RunKind)) {
          out.push({ score: 60, message: `Two hard runs back to back (${D[d]}, ${D[d + 1]}).`, id: b.id });
        }
        if (a.type === 'sport' && a.intensity === 'hard' && legLoad(b) >= 2) out.push({ score: 15 });
        if (legLoad(a) >= 1 && b.type === 'sport' && b.intensity === 'hard') out.push({ score: 25 });
        if (a.type === b.type && a.type !== 'mobility') out.push({ score: 6 });
      }
    }
  }

  // Hard days in a row.
  const hardDay = byDay.map((l) => l.some(isHard));
  for (let d = 0; d < 6; d++) if (hardDay[d] && hardDay[d + 1]) out.push({ score: 10 });
  // Runs of 3+ hard days: penalise each extra day, warn once per run.
  for (let d = 0; d < 7; ) {
    if (!hardDay[d]) {
      d++;
      continue;
    }
    let e = d;
    while (e + 1 < 7 && hardDay[e + 1]) e++;
    const len = e - d + 1;
    if (len >= 3) {
      const words = ['', '', '', 'Three', 'Four', 'Five', 'Six', 'Seven'];
      out.push({ score: 30 * (len - 2), message: `${words[len]} hard days in a row (${D[d]}–${D[e]}).` });
    }
    d = e + 1;
  }

  // Rest day.
  const restDays = byDay.filter((l) => l.every((p) => p.type === 'mobility')).length;
  if (restDays === 0) out.push({ score: 60, message: 'No rest day this week.' });

  // Long run on a long day, preferably the weekend.
  for (const p of placed) {
    if (p.intent === 'long') {
      if (p.day >= 5) out.push({ score: -6 });
      const maxFree = Math.max(...avail.map((a) => (a.available ? a.minutes : 0)));
      if (avail[p.day].minutes < maxFree) out.push({ score: (maxFree - avail[p.day].minutes) * 0.15 });
    }
  }

  // Even spread for each type with 2+ sessions.
  for (const t of ['gym', 'run'] as SessionType[]) {
    const days = placed.filter((p) => p.type === t).map((p) => p.day).sort((a, b) => a - b);
    for (let i = 1; i < days.length; i++) if (days[i] === days[i - 1]) out.push({ score: 30 });
  }

  // Tie-breaker: prefer earlier days slightly for the first sessions (stable layout).
  for (const p of placed) out.push({ score: p.day * 0.01 });

  return out;
}

const scoreOf = (rules: Rule[]) => rules.reduce((t, r) => t + r.score, 0);

function place(specs: Spec[], kept: Placed[], avail: DayAvailability[], blocked: Set<number>, avoid?: Map<string, number>): Map<string, number> {
  const toPlaced = (s: Spec, day: number): Placed => ({
    type: s.type,
    intent: s.intent,
    durationMin: s.durationMin,
    intensity: s.intensity,
    day,
    fixed: s.fixedDay !== undefined,
    preferredDays: s.preferredDays,
    label: s.title,
  });
  const extra = (a: Map<string, number>) => {
    if (!avoid) return 0;
    let n = 0;
    for (const [k, d] of a) if (avoid.get(k) === d) n += 20;
    return n;
  };
  const total = (a: Map<string, number>) => {
    const placed = [...kept, ...specs.filter((s) => a.has(s.key)).map((s) => toPlaced(s, a.get(s.key)!))];
    return scoreOf(evaluate(placed, avail, { blocked })) + extra(a);
  };

  // Most constrained first.
  const rank = (s: Spec) =>
    s.fixedDay !== undefined ? 0 : s.intent === 'long' ? 1 : s.type === 'run' && isQuality(s.intent as RunKind) ? 2 : s.type === 'gym' ? 3 : s.type === 'sport' ? 4 : s.type === 'run' ? 5 : 6;
  const base = [...specs].sort((a, b) => rank(a) - rank(b) || (a.key < b.key ? -1 : 1));
  const movable = base.filter((s) => s.fixedDay === undefined);
  const fixed = base.filter((s) => s.fixedDay !== undefined);

  const greedy = (order: Spec[]) => {
    const assign = new Map<string, number>();
    for (const s of fixed) assign.set(s.key, s.fixedDay!);
    for (const s of order) {
      let best = 0;
      let bestScore = Infinity;
      for (let d = 0; d < 7; d++) {
        assign.set(s.key, d);
        const sc = total(assign);
        if (sc < bestScore - 1e-9) {
          bestScore = sc;
          best = d;
        }
      }
      assign.set(s.key, best);
    }
    return assign;
  };

  const improve = (assign: Map<string, number>) => {
    let current = total(assign);
    for (let pass = 0; pass < 40; pass++) {
      let improved = false;
      for (const s of movable) {
        const orig = assign.get(s.key)!;
        for (let d = 0; d < 7; d++) {
          if (d === orig) continue;
          assign.set(s.key, d);
          const sc = total(assign);
          if (sc < current - 1e-9) {
            current = sc;
            improved = true;
            break;
          }
          assign.set(s.key, orig);
        }
      }
      for (let i = 0; i < movable.length; i++) {
        for (let j = i + 1; j < movable.length; j++) {
          const a = movable[i];
          const b = movable[j];
          const da = assign.get(a.key)!;
          const db = assign.get(b.key)!;
          if (da === db) continue;
          assign.set(a.key, db);
          assign.set(b.key, da);
          const sc = total(assign);
          if (sc < current - 1e-9) {
            current = sc;
            improved = true;
          } else {
            assign.set(a.key, da);
            assign.set(b.key, db);
          }
        }
      }
      if (!improved) break;
    }
    return { assign, score: current };
  };

  // Several deterministic starts (rotations of the greedy order); keep the best.
  let best: { assign: Map<string, number>; score: number } | null = null;
  const starts = Math.min(Math.max(movable.length, 1), 8);
  for (let k = 0; k < starts; k++) {
    const order = [...movable.slice(k), ...movable.slice(0, k)];
    const r = improve(greedy(order));
    if (!best || r.score < best.score - 1e-9) best = r;
  }
  return best!.assign;
}

// ---------------------------------------------------------------------------

function toPlacedSession(s: PlannedSession, weekStart: ISODate): Placed {
  const dates = weekDates(weekStart);
  return {
    type: s.type,
    intent: s.intent,
    durationMin: s.durationMin,
    intensity: s.intensity,
    day: Math.max(0, dates.indexOf(s.date)),
    fixed: true,
    label: s.title,
    id: s.id,
  };
}

/** Recovery and availability warnings for a set of sessions. */
export function validateWeek(sessions: PlannedSession[], availability: DayAvailability[], weekStart: ISODate): WeekWarning[] {
  const active = sessions.filter((s) => s.status !== 'skipped');
  const placed = active.map((s) => ({ ...toPlacedSession(s, weekStart), fixed: false }));
  const seen = new Set<string>();
  const out: WeekWarning[] = [];
  for (const r of evaluate(placed, availability)) {
    if (!r.message || seen.has(r.message)) continue;
    seen.add(r.message);
    out.push({ sessionId: r.id, message: r.message });
  }
  return out;
}

function materialise(
  input: WeekInput,
  phase: WeekPhase,
  specs: Spec[],
  assign: Map<string, number>,
  variant: 'recommended' | 'alternative',
): WeekPlan {
  const dates = weekDates(input.weekStart);
  const typeOrder: Record<SessionType, number> = { sport: 0, gym: 1, run: 2, mobility: 3 };
  const byDay = new Map<number, Spec[]>();
  for (const s of specs) {
    const d = assign.get(s.key)!;
    byDay.set(d, [...(byDay.get(d) ?? []), s]);
  }
  const sessions: PlannedSession[] = [...(input.keep ?? [])];
  for (let d = 0; d < 7; d++) {
    const list = (byDay.get(d) ?? []).sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
    const a = input.availability[d];
    const free = a.available ? a.minutes : 60;
    const keptMin = (input.keep ?? []).filter((k) => k.date === dates[d]).reduce((t, k) => t + k.durationMin, 0);
    const want = list.reduce((t, s) => t + s.durationMin, 0);
    const scale = want + keptMin > free && want > 0 ? Math.max(0.4, (free - keptMin) / want) : 1;
    list.forEach((s) => {
      const dur = s.type === 'sport' ? s.durationMin : Math.max(15, Math.round((s.durationMin * scale) / 5) * 5);
      sessions.push({
        id: `${input.weekStart}-${s.key}`,
        date: dates[d],
        type: s.type,
        intent: s.intent,
        title: s.title,
        durationMin: dur,
        intensity: s.intensity,
        equipment:
          s.type === 'gym'
            ? input.profile.defaultEquipment === 'outdoors'
              ? 'bodyweight'
              : input.profile.defaultEquipment
            : s.type === 'run' || s.type === 'sport'
              ? 'outdoors'
              : 'bodyweight',
        status: 'planned',
        fixed: s.fixedDay !== undefined,
        emphasis: s.emphasis,
      });
    });
  }
  sessions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : typeOrder[a.type] - typeOrder[b.type]));
  return {
    weekStart: input.weekStart,
    blockId: input.block.id,
    weekIndex: input.weekIndex,
    phase,
    focus: input.focus,
    availability: input.availability,
    sessions,
    warnings: validateWeek(sessions, input.availability, input.weekStart),
    variant,
  };
}

export function planWeek(input: WeekInput): WeekProposal {
  const blockPhase = input.block.phases[input.weekIndex] ?? PHASES[Math.min(input.weekIndex, 3)];
  const phase: WeekPhase = input.focus === 'deload' ? 'deload' : blockPhase;
  const option = input.block.options.find((o) => o.key === input.block.chosen) ?? input.block.options[0];
  const targets = adjustTargets(option.targets, input.focus);
  let specs = buildSpecs(input, phase, targets);

  // Remove specs already covered by kept sessions.
  const keep = input.keep ?? [];
  for (const k of keep) {
    const i = specs.findIndex((s) => s.type === k.type && s.intent === k.intent);
    const j = i >= 0 ? i : specs.findIndex((s) => s.type === k.type);
    if (j >= 0) specs = specs.filter((_, x) => x !== j);
  }

  const dates = weekDates(input.weekStart);
  const blocked = new Set<number>();
  if (input.fromDate) dates.forEach((d, i) => d < input.fromDate! && blocked.add(i));
  // Fixed sport days that are already in the past are dropped, not moved.
  specs = specs.filter((s) => s.fixedDay === undefined || !blocked.has(s.fixedDay));
  const kept = keep.map((k) => toPlacedSession(k, input.weekStart));

  // Starting mid-week: don't cram. Keep as many sessions as there are free days left
  // (minus one rest day if the week still has room for it), dropping the least important.
  if (blocked.size > 0) {
    const freeLeft = input.availability.filter((a, i) => !blocked.has(i) && a.available && a.minutes >= MIN_SESSION_MIN).length;
    const keptDays = new Set(kept.filter((k) => !blocked.has(k.day)).map((k) => k.day)).size;
    const room = Math.max(0, freeLeft - keptDays);
    const main = specs.filter((s) => s.type !== 'mobility');
    if (main.length > room) {
      const drop = new Set(
        [...main]
          .filter((s) => s.fixedDay === undefined)
          .sort((a, b) => a.priority - b.priority || (a.key < b.key ? 1 : -1))
          .slice(0, main.length - room)
          .map((s) => s.key),
      );
      specs = specs.filter((s) => !drop.has(s.key));
    }
  }

  const assign = place(specs, kept, input.availability, blocked);
  const recommended = materialise(input, phase, specs, assign, 'recommended');

  // Alternative: one session fewer (lighter week). With very few sessions, different days instead.
  const trimmable = specs.filter((s) => s.fixedDay === undefined);
  let alternativeLabel: string;
  let altSpecs: Spec[];
  let altAssign: Map<string, number>;
  if (trimmable.length >= 3) {
    const drop = [...trimmable].sort((a, b) => a.priority - b.priority || (a.key < b.key ? 1 : -1))[0];
    altSpecs = specs.filter((s) => s !== drop);
    altAssign = place(altSpecs, kept, input.availability, blocked);
    alternativeLabel = `Lighter week, without ${drop.title.toLowerCase().replace(/ ([abc])$/, (m) => m.toUpperCase())}`;
  } else {
    altSpecs = specs;
    altAssign = place(specs, kept, input.availability, blocked, assign);
    alternativeLabel = 'Same sessions, different days';
  }
  const alternative = materialise(input, phase, altSpecs, altAssign, 'alternative');
  return { recommended, alternative, alternativeLabel };
}

/** Move a session to another date and re-check the week. */
export function moveSession(plan: WeekPlan, sessionId: string, date: ISODate): WeekPlan {
  const sessions = plan.sessions.map((s) => (s.id === sessionId ? { ...s, date } : s));
  sessions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { ...plan, sessions, warnings: validateWeek(sessions, plan.availability, plan.weekStart) };
}

export function weekDateOf(weekStart: ISODate, day: number): ISODate {
  return addDays(weekStart, day);
}

