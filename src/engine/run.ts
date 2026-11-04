import { DEFAULT_EASY_PACE } from './constants';
import type { WorkoutRequest } from './gym';
import type { Effort, Experience, History, RunKind, RunPlan, RunStep, Workout } from './types';

const ZONE: Record<Effort, RunStep['zone']> = { walk: 1, easy: 2, steady: 3, tempo: 4, hard: 5, stride: 5 };
const PACE_FACTOR: Record<Effort, number> = { walk: 0, easy: 1, steady: 0.93, tempo: 0.88, hard: 0.82, stride: 0.75 };
const EFFORT_HINT: Record<Effort, string> = {
  walk: 'Walk or the slowest jog',
  easy: 'You can talk in full sentences',
  steady: 'Steady. Short sentences only',
  tempo: 'Comfortably hard. A few words at a time',
  hard: 'Hard but controlled. Keep the last rep as fast as the first',
  stride: 'Quick and relaxed, about 90 % speed',
};

export function isHardEffort(e: Effort): boolean {
  return e === 'steady' || e === 'tempo' || e === 'hard' || e === 'stride';
}

export function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`;
}

/** Median easy pace (sec/km) from recent easy and long runs, or null. */
export function easyPaceFromHistory(history: History): number | null {
  const runs = history.runs
    .filter((r) => (r.kind === 'easy' || r.kind === 'long' || r.kind === 'recovery') && r.distanceKm > 0.5 && r.durationSec > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6)
    .map((r) => r.durationSec / r.distanceKm)
    .sort((a, b) => a - b);
  if (runs.length === 0) return null;
  return runs[Math.floor(runs.length / 2)];
}

function step(label: string, seconds: number, effort: Effort, pace: number | null): RunStep {
  let hint = EFFORT_HINT[effort];
  if (pace && effort !== 'walk' && effort !== 'stride') {
    const p = pace * PACE_FACTOR[effort];
    hint = `${formatPace(p * 0.97)}–${formatPace(p * 1.04)} /km. ${hint}`;
  }
  return { label, seconds: Math.max(0, Math.round(seconds)), effort, zone: ZONE[effort], hint };
}

function repeat(n: number, work: RunStep, rest: RunStep | null): RunStep[] {
  const out: RunStep[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ ...work, label: `${work.label} ${i + 1}/${n}` });
    if (rest && i < n - 1) out.push(rest);
  }
  return out;
}

const TEMPO: Record<Experience, Array<[number, number]>> = {
  beginner: [[2, 5], [2, 6], [2, 8], [2, 4]],
  intermediate: [[2, 8], [2, 10], [3, 8], [2, 6]],
  advanced: [[2, 10], [3, 10], [2, 15], [2, 8]],
};
/** [reps, work seconds, recovery seconds] */
const INTERVALS: Record<Experience, Array<[number, number, number]>> = {
  beginner: [[5, 90, 90], [6, 90, 90], [5, 120, 120], [4, 60, 90]],
  intermediate: [[5, 180, 120], [6, 180, 120], [5, 240, 150], [4, 120, 120]],
  advanced: [[6, 180, 120], [7, 180, 120], [6, 240, 150], [5, 120, 120]],
};

function finish(kind: RunKind, steps: RunStep[], treadmill: boolean, pace: number): RunPlan {
  const clean = steps.filter((s) => s.seconds > 0);
  const totalSec = clean.reduce((s, x) => s + x.seconds, 0);
  const hardSec = clean.filter((s) => isHardEffort(s.effort)).reduce((s, x) => s + x.seconds, 0);
  const km = clean.reduce((s, x) => s + (x.effort === 'walk' ? x.seconds / 600 : x.seconds / (pace * PACE_FACTOR[x.effort])), 0);
  return { kind, treadmill, steps: clean, totalSec, hardSec, estimatedKm: Math.round(km * 10) / 10 };
}

/**
 * Build a run. Hard work is capped by the slot's `hardSec` budget so the week stays about 80/20.
 */
export function buildRunWorkout(req: WorkoutRequest, variant: 'recommended' | 'alternative'): Workout {
  const { slot, profile, intensity, weekIndex, history } = req;
  const exp = profile.experience.run;
  const kind: RunKind = slot.runKind ?? 'easy';
  const treadmill = req.equipment === 'gym';
  const known = easyPaceFromHistory(history);
  const pace = known ?? DEFAULT_EASY_PACE[exp];
  const hintPace = known;
  const total = Math.max(15, req.minutes) * 60;
  const w = Math.min(3, weekIndex);
  let budget = slot.hardSec ?? Math.round(total * 0.2);
  // Shorter session than planned: shrink the budget in proportion.
  if (slot.minutes > 0 && req.minutes < slot.minutes) budget = Math.round((budget * req.minutes) / slot.minutes);
  if (intensity === 'hard') budget = Math.round(budget * 1.15);
  if (intensity === 'easy') budget = Math.round(budget * 0.7);
  const warmSec = Math.min(600, Math.round(total * 0.25));

  let steps: RunStep[] = [];
  let label = 'Recommended';
  let why = '';

  const easyWithStrides = (strides: boolean, effort: Effort = 'easy') => {
    const strideBlock = strides ? 6 * 20 + 5 * 60 : 0;
    const out = [step(effort === 'walk' ? 'Very easy' : 'Easy running', total - strideBlock, effort, hintPace)];
    if (strides) out.push(...repeat(6, step('Stride', 20, 'stride', null), step('Walk back', 60, 'walk', null)));
    return out;
  };

  if (variant === 'recommended') {
    switch (kind) {
      case 'easy':
        steps = easyWithStrides(!!slot.strides || intensity === 'hard');
        why = slot.strides ? 'Easy miles build the engine. Strides keep your legs quick.' : 'Easy miles build your aerobic base. Keep it relaxed.';
        if (intensity === 'easy') steps = [step('Very easy running', total, 'easy', hintPace)];
        break;
      case 'recovery':
        steps = [step('Recovery jog', total, 'easy', hintPace)];
        why = 'Slow on purpose. Helps you recover from the hard days.';
        break;
      case 'long':
        steps = [step('Long easy run', total, 'easy', hintPace)];
        why = 'Time on your feet at an easy pace. Slower than you think.';
        break;
      case 'tempo': {
        let [reps, min] = TEMPO[exp][w];
        if (intensity === 'easy') reps = Math.max(1, reps - 1);
        let work = min * 60;
        // Fit hard work into the budget: shorten blocks first, then drop one.
        while (reps * work > budget && work > 240) work -= 60;
        while (reps * work > budget && reps > 2) reps -= 1;
        const rec = 120;
        const cool = Math.max(300, total - warmSec - reps * work - (reps - 1) * rec);
        steps = [
          step('Warm-up', warmSec, 'easy', hintPace),
          ...repeat(reps, step('Tempo', work, 'tempo', hintPace), step('Easy jog', rec, 'easy', null)),
          step('Cool-down', cool, 'easy', hintPace),
        ];
        why = 'Comfortably hard blocks raise the pace you can hold for longer.';
        break;
      }
      case 'intervals': {
        let [reps, work, rec] = INTERVALS[exp][w];
        if (intensity === 'easy') reps = Math.max(3, reps - 1);
        if (intensity === 'hard') reps += 1;
        while (reps * work > budget && reps > 3) reps -= 1;
        while (reps * work > budget && work > 60) work -= 30;
        const cool = Math.max(300, total - warmSec - reps * work - (reps - 1) * rec);
        steps = [
          step('Warm-up', warmSec, 'easy', hintPace),
          ...repeat(reps, step('Hard', work, 'hard', hintPace), step('Recover', rec, 'walk', null)),
          step('Cool-down', cool, 'easy', hintPace),
        ];
        why = treadmill ? 'Hard repeats with easy recoveries. Set the treadmill to 1 % incline.' : 'Hard repeats with easy recoveries build top-end speed.';
        break;
      }
    }
  } else {
    switch (kind) {
      case 'easy':
      case 'long': {
        // Run–walk: 9 min running, 1 min walking (4/1 for beginners).
        const runS = exp === 'beginner' ? 240 : 540;
        const cycle = runS + 60;
        const n = Math.max(1, Math.floor(total / cycle));
        steps = repeat(n, step('Run', runS, 'easy', hintPace), step('Walk', 60, 'walk', null));
        const left = total - n * cycle + 60;
        if (left >= 120) steps.push(step('Walk', 60, 'walk', null), step('Run', left - 60, 'easy', hintPace));
        else steps[steps.length - 1] = { ...steps[steps.length - 1], seconds: steps[steps.length - 1].seconds + left };
        label = 'Run–walk';
        why = 'Same time on your feet with short walk breaks. Easier on tired legs.';
        break;
      }
      case 'recovery':
        steps = [step('Easy bike, swim or cross-trainer', total, 'easy', null)];
        label = 'Cross-train';
        why = 'Same recovery, no impact. Good if your legs are sore.';
        break;
      case 'tempo': {
        // Fartlek: alternate steady-hard and easy.
        const on = 120;
        const off = 120;
        let reps = Math.max(3, Math.min(8, Math.floor((total - warmSec - 300) / (on + off))));
        while (reps * on > budget && reps > 3) reps -= 1;
        const cool = Math.max(300, total - warmSec - reps * (on + off));
        steps = [
          step('Warm-up', warmSec, 'easy', hintPace),
          ...repeat(reps, step('Push', on, 'tempo', hintPace), step('Easy', off, 'easy', null)),
          step('Cool-down', cool, 'easy', hintPace),
        ];
        label = 'Fartlek';
        why = 'Speed play: surges by feel instead of fixed blocks. Less mental, same benefit.';
        break;
      }
      case 'intervals': {
        const work = treadmill ? 60 : 50;
        const rec = 90;
        let reps = Math.max(4, Math.min(10, Math.floor((total - warmSec - 300) / (work + rec))));
        while (reps * work > budget && reps > 4) reps -= 1;
        const cool = Math.max(300, total - warmSec - reps * work - (reps - 1) * rec);
        steps = [
          step('Warm-up', warmSec, 'easy', hintPace),
          ...repeat(reps, step(treadmill ? 'Incline 6–8 %' : 'Uphill', work, 'hard', null), step(treadmill ? 'Flat, walk' : 'Walk down', rec, 'walk', null)),
          step('Cool-down', cool, 'easy', hintPace),
        ];
        label = treadmill ? 'Incline repeats' : 'Hill repeats';
        why = 'Short uphill efforts. Builds power with less pounding than flat sprints.';
        break;
      }
    }
  }

  const run = finish(kind, steps, treadmill, pace);
  if (hintPace) run.paceHint = `Easy pace about ${formatPace(hintPace)} /km`;
  return {
    id: `${slot.id}:${variant}`,
    type: 'run',
    variant,
    title: slot.title,
    label,
    why,
    equipment: req.equipment,
    intensity,
    targetMinutes: req.minutes,
    estimatedMinutes: Math.round(run.totalSec / 60),
    sections: [],
    run,
  };
}
