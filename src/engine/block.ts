// Month-level planning: a 4-week block with a focus, targets and a realism check.
import { addDays, daysBetween } from './dates';
import type {
  BlockOption,
  BlockProposal,
  DayAvailability,
  Experience,
  History,
  ISODate,
  PrimaryGoal,
  Profile,
  RealismReport,
  Targets,
  WeekPhase,
} from './types';

export const PHASES: WeekPhase[] = ['build', 'build', 'peak', 'deload'];

const LEVEL: Record<Experience, number> = { beginner: 0, intermediate: 1, advanced: 2 };

export function trainingLevel(p: Pick<Profile, 'experience'>): Experience {
  const l = Math.round((LEVEL[p.experience.gym] + LEVEL[p.experience.run]) / 2);
  return (['beginner', 'intermediate', 'advanced'] as const)[l];
}

/** Sessions per week a body can recover from, not counting short mobility. */
export const MAX_SESSIONS: Record<Experience, number> = { beginner: 5, intermediate: 6, advanced: 7 };
/** Hard days (gym, quality runs, hard sport) per week. */
export const MAX_HARD: Record<Experience, number> = { beginner: 4, intermediate: 5, advanced: 6 };

export const MIN_SESSION_MIN = 20;

export function qualityRunsPerWeek(runExp: Experience, runs: number): number {
  // Two quality sessions only with enough easy running around them (80/20).
  if (runs <= 1) return 0;
  if (runExp === 'beginner' || runs <= 3) return 1;
  return 2;
}

export function typicalGymMinutes(availability: DayAvailability[]): number {
  const mins = availability.filter((d) => d.available && d.minutes >= MIN_SESSION_MIN).map((d) => d.minutes).sort((a, b) => a - b);
  if (mins.length === 0) return 45;
  const median = mins[Math.floor(mins.length / 2)];
  return Math.max(30, Math.min(75, Math.round(median / 5) * 5));
}

export function baseRunMinutes(profile: Pick<Profile, 'experience'>, runs: number, history: History, today: ISODate): number {
  if (runs === 0) return 0;
  const recent = history.sessions.filter((s) => s.type === 'run' && daysBetween(s.date, today) <= 14 && daysBetween(s.date, today) >= 0);
  const perRun: Record<Experience, number> = { beginner: 25, intermediate: 35, advanced: 45 };
  const fromLevel = runs * perRun[profile.experience.run];
  if (recent.length >= 2) {
    const weekly = recent.reduce((t, s) => t + s.durationMin, 0) / 2;
    // Don't jump from history: at most +10%, and not below a sensible floor.
    return Math.round(Math.max(runs * 20, Math.min(weekly * 1.1, fromLevel * 1.5)));
  }
  return fromLevel;
}

interface Need {
  sessions: number;
  hard: number;
  minutes: number;
}

function needOf(t: Targets, profile: Pick<Profile, 'experience' | 'sports'>, gymMin: number): Need {
  const sportMin = profile.sports.reduce((m, s) => m + s.durationMin * s.perWeek, 0) || t.sport * 60;
  const hardSport = profile.sports.filter((s) => s.intensity !== 'easy').reduce((n, s) => n + s.perWeek, 0);
  return {
    sessions: t.gym + t.run + t.sport,
    hard: t.gym + qualityRunsPerWeek(profile.experience.run, t.run) + Math.min(hardSport, t.sport),
    minutes: t.gym * gymMin + t.run * 35 + Math.min(sportMin, t.sport * 90) + t.mobility * 15,
  };
}

function capacity(availability: DayAvailability[]) {
  const days = availability.filter((d) => d.available && d.minutes >= MIN_SESSION_MIN);
  return {
    days: days.length,
    doubleDays: days.filter((d) => d.minutes >= 90).length,
    minutes: days.reduce((t, d) => t + d.minutes, 0),
  };
}

export function realismCheck(t: Targets, profile: Pick<Profile, 'experience' | 'sports' | 'goal'>, availability: DayAvailability[]): RealismReport {
  const level = trainingLevel(profile);
  const gymMin = typicalGymMinutes(availability);
  const cap = capacity(availability);
  const need = needOf(t, profile, gymMin);
  const issues: string[] = [];

  if (cap.days === 0) {
    return { ok: false, issues: ['No free days yet. Mark at least two days as free.'], suggested: { gym: 0, run: 0, sport: 0, mobility: 0 } };
  }
  if (need.sessions > cap.days + cap.doubleDays) {
    issues.push(`${need.sessions} sessions but only ${cap.days} free day${cap.days === 1 ? '' : 's'}.`);
  } else if (need.sessions > cap.days) {
    issues.push(`That needs ${need.sessions - cap.days} double day${need.sessions - cap.days === 1 ? '' : 's'}. Doable, but tiring.`);
  }
  if (need.sessions > MAX_SESSIONS[level]) {
    issues.push(`${need.sessions} sessions a week is a lot to recover from right now. ${MAX_SESSIONS[level]} is a better ceiling.`);
  }
  if (need.hard > MAX_HARD[level]) {
    issues.push(`${need.hard} hard days a week leaves little room to recover.`);
  }
  if (need.minutes > cap.minutes) {
    issues.push(`About ${Math.round(need.minutes / 60)} h of training, but ${Math.round(cap.minutes / 60)} h free.`);
  }
  if (need.sessions >= 7) issues.push('No rest day. Keep at least one.');

  const onlyDoubles = issues.length === 1 && need.sessions > cap.days && need.sessions <= cap.days + cap.doubleDays;
  if (issues.length === 0 || onlyDoubles) {
    return { ok: true, issues };
  }
  return { ok: false, issues, suggested: makeRealistic(t, profile, availability) };
}

/** Trim targets until they fit. Trims what matters least for the goal first. */
export function makeRealistic(t: Targets, profile: Pick<Profile, 'experience' | 'sports' | 'goal'>, availability: DayAvailability[]): Targets {
  const level = trainingLevel(profile);
  const gymMin = typicalGymMinutes(availability);
  const cap = capacity(availability);
  const out = { ...t };
  const fits = () => {
    const n = needOf(out, profile, gymMin);
    return (
      n.sessions <= Math.min(cap.days, MAX_SESSIONS[level], 6) &&
      n.hard <= MAX_HARD[level] &&
      n.minutes <= cap.minutes
    );
  };
  const order: (keyof Targets)[] =
    profile.goal === 'endurance' || profile.goal === 'health' ? ['gym', 'run', 'sport'] : ['run', 'gym', 'sport'];
  let guard = 30;
  while (!fits() && guard-- > 0) {
    // Reduce the biggest category (ties broken by the goal order), keeping 1 of anything wanted.
    const cands = order.filter((k) => out[k] > 1);
    if (cands.length === 0) {
      const any = order.find((k) => out[k] > 0);
      if (!any) break;
      out[any] -= 1;
      continue;
    }
    cands.sort((a, b) => out[b] - out[a] || order.indexOf(a) - order.indexOf(b));
    out[cands[0]] -= 1;
  }
  if (out.mobility > 2 && cap.days < 4) out.mobility = 2;
  return out;
}

function describe(t: Targets): string {
  const parts: string[] = [];
  if (t.gym) parts.push(`${t.gym} gym`);
  if (t.run) parts.push(`${t.run} run${t.run > 1 ? 's' : ''}`);
  if (t.sport) parts.push(`${t.sport} sport`);
  if (t.mobility) parts.push(`${t.mobility} mobility`);
  return parts.join(' + ') || 'Rest';
}

export function focusText(goal: PrimaryGoal, t: Targets): string {
  const runs = t.run > 0;
  const gym = t.gym > 0;
  switch (goal) {
    case 'athletic':
      return runs && gym ? 'Build an aerobic base and all-round strength' : gym ? 'All-round strength and power' : 'Build an aerobic base';
    case 'strength':
      return runs ? 'Get stronger on the main lifts, keep runs easy' : 'Get stronger on the main lifts';
    case 'endurance':
      return gym ? 'Build running volume, with strength to stay healthy' : 'Build running volume';
    case 'health':
      return 'Move often, build the habit, feel good';
  }
}

export interface BlockInput {
  profile: Profile;
  wanted: Targets;
  availability: DayAvailability[];
}

export function proposeBlock(input: BlockInput): BlockProposal {
  const { profile, availability } = input;
  const realism = realismCheck(input.wanted, profile, availability);
  const rec: Targets = realism.suggested ?? { ...input.wanted };

  // Alternative: shift one session between gym and running, away from the goal's bias.
  let alt: Targets;
  let altLabel: string;
  let altDesc: string;
  if (profile.goal === 'endurance' && rec.run >= 2) {
    alt = { ...rec, run: rec.run - 1, gym: rec.gym + 1 };
    altLabel = 'Strength bias';
    altDesc = 'One run swapped for a gym session.';
  } else if (rec.gym >= 2) {
    alt = { ...rec, gym: rec.gym - 1, run: rec.run + 1 };
    altLabel = 'Endurance bias';
    altDesc = 'One gym session swapped for a run.';
  } else if (rec.run >= 2) {
    alt = { ...rec, run: rec.run - 1, gym: rec.gym + 1 };
    altLabel = 'Strength bias';
    altDesc = 'One run swapped for a gym session.';
  } else {
    alt = { ...rec, mobility: rec.mobility + 1 };
    altLabel = 'Plus mobility';
    altDesc = 'Same sessions, plus a short mobility day.';
  }
  if (!realismCheck(alt, profile, availability).ok && realism.ok) {
    const lighter = { ...rec };
    if (lighter.gym >= lighter.run && lighter.gym > 1) lighter.gym -= 1;
    else if (lighter.run > 1) lighter.run -= 1;
    alt = lighter;
    altLabel = 'Lighter';
    altDesc = 'One session fewer. More room for study weeks.';
  }

  const recommended: BlockOption = {
    key: 'recommended',
    label: realism.suggested ? 'Realistic version' : 'As planned',
    description: describe(rec),
    targets: rec,
  };
  const alternative: BlockOption = {
    key: 'alternative',
    label: altLabel,
    description: `${describe(alt)}. ${altDesc}`,
    targets: alt,
  };

  return { focus: focusText(profile.goal, rec), phases: PHASES, realism, recommended, alternative };
}

export function blockWeekStart(blockStart: ISODate, weekIndex: number): ISODate {
  return addDays(blockStart, weekIndex * 7);
}
