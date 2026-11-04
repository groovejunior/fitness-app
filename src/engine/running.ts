// Running sessions. Effort-based (talk test, Persinger/Foster 2004), with pace hints once there is history.
// Most running stays easy enough to talk (Seiler 2009). One harder session until there is enough easy running for a second.
// Weekly minutes rise gently, then the lighter week cuts them. That cap is a brake against a spike, not an injury law.
import type {
  EquipmentContext,
  Experience,
  History,
  Intensity,
  RunEffort,
  RunKind,
  RunStep,
  WeekPhase,
  Workout,
} from './types';
import type { SourceId } from './sources';

export interface RunInput {
  sessionId: string;
  kind: RunKind;
  durationMin: number;
  equipment: EquipmentContext;
  experience: Experience;
  phase: WeekPhase;
  weekIndex: number;
  history: History;
}

export const EFFORT_LABEL: Record<RunEffort, string> = {
  walk: 'Walk',
  easy: 'Easy',
  steady: 'Steady',
  tempo: 'Tempo',
  hard: 'Hard',
  stride: 'Stride',
};

/** Talk test, the simplest honest effort guide. */
export const EFFORT_HINT: Record<RunEffort, string> = {
  walk: 'Brisk walk, recover your breath.',
  easy: 'You can talk in full sentences.',
  steady: 'Short sentences only.',
  tempo: 'Comfortably hard. A few words at a time.',
  hard: 'Hard. You cannot talk.',
  stride: 'Fast and relaxed. Not a sprint.',
};

export const RUN_TITLE: Record<RunKind, string> = {
  easy: 'Easy run',
  recovery: 'Recovery run',
  long: 'Long run',
  tempo: 'Tempo run',
  intervals: 'Intervals',
  progression: 'Progression run',
  strides: 'Easy run + strides',
};

export const QUALITY_KINDS: RunKind[] = ['tempo', 'intervals', 'progression'];
export const isQuality = (k: RunKind) => QUALITY_KINDS.includes(k);

const step = (label: string, effort: RunEffort, minutes: number): RunStep => ({
  kind: 'run',
  label,
  effort,
  durationSec: Math.round(minutes * 60),
});

function repeat(n: number, work: RunStep, rec: RunStep | null): RunStep[] {
  const out: RunStep[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ ...work, label: `${work.label} ${i + 1}/${n}` });
    if (rec && i < n - 1) out.push(rec);
  }
  return out;
}

/** Average easy pace (sec/km) from logged easy/long runs, if any. */
export function easyPace(history: History): number | undefined {
  const runs = history.sessions.filter(
    (s) => s.type === 'run' && s.distanceKm && s.runTimeSec && ['easy', 'long', 'recovery', 'strides'].includes(s.intent),
  );
  const recent = runs.slice(-5);
  if (recent.length === 0) return undefined;
  const totalKm = recent.reduce((t, s) => t + s.distanceKm!, 0);
  const totalSec = recent.reduce((t, s) => t + s.runTimeSec!, 0);
  return totalKm > 0 ? totalSec / totalKm : undefined;
}

export function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

/** Rough pace guide relative to easy pace. */
export function paceFor(effort: RunEffort, easySec: number): string | undefined {
  const f: Partial<Record<RunEffort, number>> = { easy: 1, steady: 0.93, tempo: 0.87, hard: 0.8 };
  const k = f[effort];
  return k ? formatPace(easySec * k) : undefined;
}

function intervalsFor(exp: Experience, weekIndex: number): { reps: number; work: number; rec: number } {
  const w = Math.min(weekIndex, 2);
  if (exp === 'beginner') return [{ reps: 6, work: 1, rec: 2 }, { reps: 7, work: 1, rec: 2 }, { reps: 5, work: 2, rec: 2 }][w];
  if (exp === 'intermediate') return [{ reps: 6, work: 2, rec: 1.5 }, { reps: 7, work: 2, rec: 1.5 }, { reps: 5, work: 3, rec: 2 }][w];
  return [{ reps: 5, work: 3, rec: 2 }, { reps: 6, work: 3, rec: 2 }, { reps: 5, work: 4, rec: 2 }][w];
}

function tempoFor(exp: Experience, weekIndex: number): { reps: number; work: number; rec: number; effort: RunEffort } {
  const w = Math.min(weekIndex, 2);
  if (exp === 'beginner') return [{ reps: 3, work: 4, rec: 2, effort: 'steady' as const }, { reps: 3, work: 5, rec: 2, effort: 'steady' as const }, { reps: 2, work: 8, rec: 2, effort: 'steady' as const }][w];
  if (exp === 'intermediate') return [{ reps: 2, work: 8, rec: 2, effort: 'tempo' as const }, { reps: 2, work: 10, rec: 2, effort: 'tempo' as const }, { reps: 3, work: 8, rec: 2, effort: 'tempo' as const }][w];
  return [{ reps: 2, work: 12, rec: 2, effort: 'tempo' as const }, { reps: 3, work: 10, rec: 2, effort: 'tempo' as const }, { reps: 1, work: 25, rec: 0, effort: 'tempo' as const }][w];
}

/** Fit `reps` of (work+rec) into `available` minutes, never below `minReps`. */
function fitReps(reps: number, work: number, rec: number, available: number, minReps = 2): number {
  let n = reps;
  while (n > minReps && n * work + (n - 1) * rec > available) n--;
  return n;
}

function buildSteps(input: RunInput, kind: RunKind, alt: boolean): { steps: RunStep[]; summary: string } {
  const D = Math.max(15, input.durationMin);
  const exp = input.experience;
  const wu = D >= 35 ? 10 : 8;
  const minCd = 5;

  switch (kind) {
    case 'easy':
    case 'recovery': {
      const effort: RunEffort = 'easy';
      if ((exp === 'beginner' && !alt) || (exp !== 'beginner' && alt && kind === 'easy')) {
        if (exp === 'beginner') {
          // Run/walk keeps it easy and builds the habit.
          const run = input.weekIndex >= 2 ? 6 : 4;
          const n = Math.max(2, Math.floor((D - 5) / (run + 1)));
          const used = n * run + (n - 1) * 1;
          return {
            steps: [
              step('Walk to warm up', 'walk', 3),
              ...repeat(n, step('Run easy', 'easy', run), step('Walk', 'walk', 1)),
              step('Walk to cool down', 'walk', Math.max(2, D - 3 - used)),
            ],
            summary: 'Run/walk. Keep every run part easy enough to chat.',
          };
        }
        // Alternative for experienced runners: fartlek, loosely structured.
        const n = Math.max(4, Math.min(8, Math.floor((D - 15) / 3)));
        const used = n * 1 + n * 2;
        return {
          steps: [
            step('Easy start', 'easy', 8),
            ...repeat(n, step('Pick it up', 'steady', 1), step('Easy', 'easy', 2)),
            step('Easy finish', 'easy', Math.max(3, D - 8 - used)),
          ],
          summary: 'Fartlek: mostly easy with short pick-ups. Play with it.',
        };
      }
      return {
        steps: [step(kind === 'recovery' ? 'Very easy' : 'Easy, conversational', effort, D)],
        summary: kind === 'recovery' ? 'Short and very easy. It should feel too slow.' : 'Easy aerobic running. This is where the base is built.',
      };
    }
    case 'strides': {
      const n = exp === 'beginner' ? 4 : 6;
      const easy = Math.max(10, D - n * 1.5);
      return {
        steps: [
          step('Easy, conversational', 'easy', easy),
          ...repeat(n, step('Stride', 'stride', 1 / 3), step('Walk back', 'walk', 1)),
          step('Easy jog', 'easy', 2),
        ],
        summary: 'Easy run, then a few relaxed fast strides to keep your legs quick.',
      };
    }
    case 'long': {
      if (alt) {
        const finish = Math.min(15, Math.round(D * 0.2));
        return {
          steps: [step('Easy', 'easy', D - finish), step('Steady finish', 'steady', finish)],
          summary: 'Long and easy, finishing the last stretch at a steady effort.',
        };
      }
      return {
        steps: [step('Long and easy', 'easy', D)],
        summary: 'Your longest run of the week. Slow is fine. Time on feet is the goal.',
      };
    }
    case 'progression': {
      const third = D / 3;
      return {
        steps: [step('Easy', 'easy', third), step('Steady', 'steady', third), step('Tempo', 'tempo', third)],
        summary: 'Start easy and finish strong. Each third a little quicker.',
      };
    }
    case 'tempo':
    case 'intervals': {
      // The alternative swaps the format: tempo ↔ intervals, same purpose.
      const format = alt ? (kind === 'tempo' ? 'intervals' : 'tempo') : kind;
      const main = Math.max(8, D - wu - minCd);
      if (format === 'tempo') {
        const t = tempoFor(exp, input.weekIndex);
        const n = fitReps(t.reps, t.work, t.rec, main, 1);
        const used = n * t.work + Math.max(0, n - 1) * t.rec;
        return {
          steps: [
            step('Warm up easy', 'easy', wu),
            ...repeat(n, step(t.effort === 'tempo' ? 'Tempo' : 'Steady', t.effort, t.work), t.rec > 0 ? step('Easy jog', 'easy', t.rec) : null),
            step('Cool down easy', 'easy', Math.max(minCd, D - wu - used)),
          ],
          summary:
            t.effort === 'tempo'
              ? 'Sustained, comfortably hard running. Even effort, no racing.'
              : 'Steady blocks to get used to running a little faster.',
        };
      }
      const iv = intervalsFor(exp, input.weekIndex);
      const n = fitReps(iv.reps, iv.work, iv.rec, main, 3);
      const used = n * iv.work + (n - 1) * iv.rec;
      return {
        steps: [
          step('Warm up easy', 'easy', wu),
          ...repeat(n, step('Hard', 'hard', iv.work), step('Easy jog', 'easy', iv.rec)),
          step('Cool down easy', 'easy', Math.max(minCd, D - wu - used)),
        ],
        summary: `${n} × ${iv.work} min hard. Run the last one as fast as the first.`,
      };
    }
  }
}

export function generateRun(input: RunInput, variant: 'recommended' | 'alternative' = 'recommended'): Workout {
  const alt = variant === 'alternative';
  // Lighter week: no quality, just easy + strides, so the load does not jump.
  const kind: RunKind = input.phase === 'deload' && isQuality(input.kind) ? 'strides' : input.kind;
  const { steps, summary } = buildSteps(input, kind, alt);
  const treadmill = input.equipment === 'gym' || input.equipment === 'home';
  const pace = easyPace(input.history);
  const paceLine = pace ? ` Easy is about ${formatPace(pace)} for you.` : '';
  const total = steps.reduce((t, s) => t + s.durationSec, 0);
  const intensity: Intensity = isQuality(kind) ? 'hard' : kind === 'long' ? 'moderate' : 'easy';

  let title = RUN_TITLE[kind];
  if (alt) {
    if (kind === 'tempo') title = 'Intervals instead';
    else if (kind === 'intervals') title = 'Tempo instead';
    else if (kind === 'easy') title = input.experience === 'beginner' ? 'Easy run, continuous' : 'Fartlek';
    else if (kind === 'long') title = 'Long run, steady finish';
    else title = `${title}, alternative`;
  }
  if (treadmill) title = `Treadmill: ${title.charAt(0).toLowerCase()}${title.slice(1)}`;

  return {
    sessionId: input.sessionId,
    type: 'run',
    variant,
    title,
    summary: summary + (treadmill ? ' Set the incline to 1%.' : '') + paceLine,
    source: (input.phase === 'deload' ? 'ioc-2016' : 'seiler-2009') satisfies SourceId,
    durationMin: Math.round(total / 60),
    equipment: input.equipment,
    intensity,
    blocks: [{ kind: 'run', title: 'Run', items: steps }],
  };
}
