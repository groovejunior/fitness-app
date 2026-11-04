import { getSport } from '../content/sports';
import {
  DEFAULT_MINUTES,
  DEFAULT_RUN_MINUTES,
  FOCUS_LABEL,
  LOAD_CAPACITY,
  MAX_TRAINING_DAYS,
  MIN_MINUTES,
  PHASES,
  QUALITY_RUNS,
  RUN_VOLUME_FACTOR,
  splitFor,
} from './constants';
import { addDays, mondayOf } from './dates';
import type { Block, BlockOption, Experience, Goal, History, Profile, RealismReport, Targets, WeekAvailability } from './types';

export interface MonthInput {
  profile: Profile;
  requested: Targets;
  availability: WeekAvailability;
  /** Any date inside the first week; the block starts on that Monday. */
  startDate: string;
  history?: History;
  previousBlock?: Block;
}

const typeOrder = ['gym', 'run', 'sport', 'mobility'] as const;

/** Load points for a week of these targets. Sport load depends on which sports are played. */
export function weeklyLoad(t: Targets, profile: Profile): number {
  const quality = Math.min(QUALITY_RUNS[profile.experience.run], Math.max(0, t.run - 1));
  const long = t.run >= 2 ? 1 : 0;
  const easyRuns = Math.max(0, t.run - quality - long);
  let sport = 0;
  for (let i = 0; i < t.sport; i++) {
    const s = getSport(profile.sports[i % Math.max(1, profile.sports.length)]);
    sport += s.load === 'hard' ? 2 : s.load === 'moderate' ? 1.5 : 1;
  }
  return t.gym * 2 + quality * 2 + long * 1.5 + easyRuns * 1 + sport + t.mobility * 0.25;
}

function overallExperience(p: Profile): Experience {
  const r = { beginner: 0, intermediate: 1, advanced: 2 } as const;
  const v = Math.max(r[p.experience.gym], r[p.experience.run]);
  return (['beginner', 'intermediate', 'advanced'] as const)[v];
}

function sessionMinutes(type: (typeof typeOrder)[number], profile: Profile, i = 0): number {
  if (type === 'sport') return getSport(profile.sports[i % Math.max(1, profile.sports.length)]).typicalMinutes;
  return DEFAULT_MINUTES[type];
}

interface Fit {
  days: number;
  maxDays: number;
  availableDays: number;
  minutesNeeded: number;
  minutesAvailable: number;
  load: number;
  capacity: number;
  shortDays: number;
}

function measure(t: Targets, availability: WeekAvailability, profile: Profile): Fit {
  const exp = overallExperience(profile);
  const availableDays = availability.filter((d) => d.available).length;
  const minutesAvailable = availability.filter((d) => d.available).reduce((s, d) => s + d.minutes, 0);
  let minutesNeeded = 0;
  for (const type of typeOrder) {
    for (let i = 0; i < t[type]; i++) minutesNeeded += type === 'mobility' ? DEFAULT_MINUTES.mobility : Math.max(MIN_MINUTES[type] + 10, Math.min(sessionMinutes(type, profile, i), 45));
  }
  // Days that are too short for even a short gym session.
  const shortDays = availability.filter((d) => d.available && d.minutes < MIN_MINUTES.gym).length;
  return {
    days: t.gym + t.run + t.sport,
    maxDays: MAX_TRAINING_DAYS[exp],
    availableDays,
    minutesNeeded,
    minutesAvailable,
    load: weeklyLoad(t, profile),
    capacity: LOAD_CAPACITY[exp],
    shortDays,
  };
}

function fits(f: Fit): boolean {
  return f.days <= Math.min(f.availableDays, f.maxDays) && f.minutesNeeded <= f.minutesAvailable && f.load <= f.capacity;
}

/** Which session type to give up first, by goal. Sports are kept: you play them anyway. */
function dropOrder(goal: Goal): Array<keyof Targets> {
  switch (goal) {
    case 'endurance':
      return ['mobility', 'gym', 'run', 'sport'];
    case 'strength':
    case 'muscle':
      return ['mobility', 'run', 'gym', 'sport'];
    default:
      return ['mobility', 'run', 'gym', 'sport'];
  }
}

/** Make the targets fit the availability and recovery capacity, dropping sessions by goal priority. */
export function makeRealistic(requested: Targets, availability: WeekAvailability, profile: Profile): Targets {
  const t = { ...requested };
  const order = dropOrder(profile.goal);
  const [a, b] = order.filter((k): k is 'gym' | 'run' => k === 'gym' || k === 'run');
  const focused = profile.goal === 'endurance' || profile.goal === 'strength' || profile.goal === 'muscle';
  let guard = 50;
  while (guard-- > 0) {
    const f = measure(t, availability, profile);
    if (fits(f)) break;
    const daysOk = f.days <= Math.min(f.availableDays, f.maxDays) && f.load <= f.capacity;
    let pick: keyof Targets | undefined;
    if (daysOk && t.mobility > 0) pick = 'mobility';
    // Focused goals give up the other type first. Balanced goals trim the bigger of gym/run.
    else if (focused && t[a] > 1) pick = a;
    else if (t[a] > 1 && t[a] >= t[b]) pick = a;
    else if (t[b] > 1) pick = b;
    else if (t[a] > 1) pick = a;
    else if (t.mobility > 0) pick = 'mobility';
    else if (t.sport > 1) pick = 'sport';
    else if (t[a] > 0) pick = a;
    else if (t[b] > 0) pick = b;
    else if (t.sport > 0) pick = 'sport';
    if (!pick) break;
    t[pick] -= 1;
  }
  return t;
}

export function checkRealism(requested: Targets, availability: WeekAvailability, profile: Profile): RealismReport {
  const f = measure(requested, availability, profile);
  const issues: string[] = [];
  if (f.availableDays === 0) issues.push('No free days are marked yet. Pick at least two.');
  if (f.days > f.availableDays && f.availableDays > 0)
    issues.push(`${f.days} sessions need ${f.days} days, but you're free on ${f.availableDays}.`);
  else if (f.days > f.maxDays)
    issues.push(`${f.days} training days leaves too little rest. ${f.maxDays} is the most that recovers well at your level.`);
  if (f.minutesNeeded > f.minutesAvailable && f.availableDays > 0)
    issues.push(`These sessions take about ${Math.round(f.minutesNeeded / 5) * 5} min a week. You have about ${f.minutesAvailable}.`);
  if (f.load > f.capacity)
    issues.push('That is a lot of hard training for one week. Progress comes from recovering, too.');
  if (f.shortDays > 0) issues.push(`${f.shortDays === 1 ? 'One free day is' : `${f.shortDays} free days are`} under ${MIN_MINUTES.gym} minutes. Fine for a short run or mobility.`);

  const suggestion = makeRealistic(requested, availability, profile);
  const changed = typeOrder.some((k) => suggestion[k] !== requested[k]);
  const ok = fits(f);
  const tight = ok && (f.days === Math.min(f.availableDays, f.maxDays) || f.load > f.capacity * 0.85 || f.minutesNeeded > f.minutesAvailable * 0.85);
  const level: RealismReport['level'] = !ok || changed ? 'over' : tight ? 'tight' : 'ok';
  if (level === 'tight' && issues.length === 0) issues.push('Expect some weeks to need moving things around.');
  return { level, issues: level === 'ok' ? [] : issues, suggestion };
}

function alternativeTargets(base: Targets, goal: Goal): { targets: Targets; label: string; why: string } | null {
  const t = { ...base };
  if (goal === 'endurance') {
    if (t.run >= 2) {
      t.run -= 1;
      t.gym += 1;
      return { targets: t, label: 'Strength bias', why: 'One run becomes a gym session. More strength, a bit less mileage.' };
    }
  } else {
    if (t.gym >= 2) {
      t.gym -= 1;
      t.run += 1;
      return { targets: t, label: 'Endurance bias', why: 'One gym session becomes a run. Better engine, slightly slower strength gains.' };
    }
    if (t.run >= 2) {
      t.run -= 1;
      t.gym += 1;
      return { targets: t, label: 'Strength bias', why: 'One run becomes a gym session. More strength, a bit less running.' };
    }
  }
  if (t.mobility === 0) {
    t.mobility = 1;
    return { targets: t, label: 'Plus mobility', why: 'Same training with a short mobility session. Helps recovery and range.' };
  }
  if (t.mobility > 0) {
    t.mobility -= 1;
    return { targets: t, label: 'Leaner week', why: 'Skip the mobility session and keep the rest.' };
  }
  return null;
}

function runBaseMinutes(input: MonthInput, runs: number): number {
  const exp = input.profile.experience.run;
  let base = DEFAULT_RUN_MINUTES[exp] * runs;
  if (input.previousBlock && input.previousBlock.targets.run > 0) {
    // Start the new block a little above the previous one, scaled to the new run count.
    const prevPerRun = input.previousBlock.runBaseMinutes / input.previousBlock.targets.run;
    base = prevPerRun * 1.08 * runs;
  }
  const runs3w = recentRunMinutesPerWeek(input.history, input.startDate);
  if (runs3w !== null && runs3w > 0) {
    // Never plan more than 10 % above what was actually run recently.
    base = Math.min(base, runs3w * 1.1);
    base = Math.max(base, Math.min(DEFAULT_RUN_MINUTES[exp] * runs, runs3w));
  }
  return Math.max(20 * runs, Math.round(base / 5) * 5);
}

/** Average weekly run minutes over the last 3 full weeks before `date`, or null without history. */
export function recentRunMinutesPerWeek(history: History | undefined, date: string): number | null {
  if (!history || history.runs.length === 0) return null;
  const end = mondayOf(date);
  const startIso = addDays(end, -21);
  const recent = history.runs.filter((r) => r.date >= startIso && r.date < end);
  if (recent.length === 0) return null;
  return recent.reduce((s, r) => s + r.durationSec / 60, 0) / 3;
}

export function planMonth(input: MonthInput): Block {
  const { profile, requested, availability } = input;
  const realism = checkRealism(requested, availability, profile);
  const recTargets = realism.suggestion;
  const exp = profile.experience.gym;
  const rec: BlockOption = {
    key: 'recommended',
    label: 'Recommended',
    why: realism.level === 'over' ? 'Trimmed to fit your week and leave room to recover.' : 'What you asked for. It fits your week.',
    targets: recTargets,
    split: splitFor(recTargets.gym, exp, profile.goal),
  };
  const options: BlockOption[] = [rec];
  const alt = alternativeTargets(recTargets, profile.goal);
  if (alt) {
    const altFit = makeRealistic(alt.targets, availability, profile);
    options.push({ key: 'alternative', label: alt.label, why: alt.why, targets: altFit, split: splitFor(altFit.gym, exp, profile.goal) });
  }
  const startDate = mondayOf(input.startDate);
  return {
    id: `block-${startDate}`,
    startDate,
    focus: profile.goal,
    focusLabel: FOCUS_LABEL[profile.goal],
    targets: rec.targets,
    split: rec.split,
    phases: [...PHASES],
    availability: availability.map((d) => ({ ...d })),
    runBaseMinutes: runBaseMinutes(input, rec.targets.run),
    chosen: 'recommended',
    options,
    requested: { ...requested },
    realism,
  };
}

/** Switch a block to one of its options (one tap in the UI). */
export function chooseBlockOption(block: Block, key: 'recommended' | 'alternative', input: Pick<MonthInput, 'profile' | 'history' | 'previousBlock'>): Block {
  const opt = block.options.find((o) => o.key === key);
  if (!opt) return block;
  return {
    ...block,
    chosen: key,
    targets: { ...opt.targets },
    split: opt.split,
    runBaseMinutes: runBaseMinutes({ ...input, requested: opt.targets, availability: block.availability, startDate: block.startDate }, opt.targets.run),
  };
}

/** Planned weekly run minutes for a week of the block. */
export function weeklyRunMinutes(block: Block, weekIndex: number): number {
  return Math.round(block.runBaseMinutes * RUN_VOLUME_FACTOR[Math.min(3, Math.max(0, weekIndex))]);
}
