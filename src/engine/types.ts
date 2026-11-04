/**
 * Domain types for the training engine. Pure data, no UI.
 * Days are indexed 0 = Monday ... 6 = Sunday. Dates are ISO strings "YYYY-MM-DD".
 */

export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'athletic' | 'strength' | 'muscle' | 'endurance' | 'health';
export type SessionType = 'gym' | 'run' | 'sport' | 'mobility';
export type EquipmentContext = 'gym' | 'home' | 'bodyweight' | 'outdoors';
export type Intensity = 'easy' | 'normal' | 'hard';
export type Load = 'easy' | 'moderate' | 'hard';
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type TimeWindow = 'morning' | 'midday' | 'evening' | 'any';

export type Equipment =
  | 'barbell'
  | 'rack'
  | 'bench'
  | 'dumbbell'
  | 'kettlebell'
  | 'cable'
  | 'pullupBar'
  | 'dipBars'
  | 'band'
  | 'box'
  | 'treadmill';

/** Coarse movement pattern (spec §4). */
export type Pattern = 'push' | 'pull' | 'squat' | 'hinge' | 'lunge' | 'carry' | 'core' | 'plyo' | 'cardio' | 'mobility';

/** Fine-grained slot used by workout templates. */
export type Slot =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'pushH'
  | 'pushV'
  | 'pullH'
  | 'pullV'
  | 'core'
  | 'antiRotation'
  | 'carry'
  | 'plyo'
  | 'conditioning'
  | 'calves'
  | 'shoulderHealth'
  | 'warmup'
  | 'mobility';

export type Muscle =
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'core';

export interface Exercise {
  id: string;
  name: string;
  pattern: Pattern;
  slot: Slot;
  /** Muscles worked; the first ones count fully toward weekly volume, see `primary`. */
  muscles: Muscle[];
  /** Number of leading entries in `muscles` that are primary movers. */
  primary: number;
  /** All items required. Empty = no equipment. */
  equipment: Equipment[];
  difficulty: 1 | 2 | 3;
  /** How the set is measured. */
  unit: 'reps' | 'sec' | 'repsPerSide' | 'secPerSide' | 'meters';
  /** Loadable with external weight we should suggest (kg). */
  loaded: boolean;
  /** Smallest sensible load jump in kg. */
  increment?: number;
  /** Is this a heavy compound that suits low reps? */
  compound: boolean;
  cues: string[];
  mistake: string;
  animation: string;
  /** Ids of exercises with the same slot that make good swaps. */
  substitutions: string[];
  /** Harder bodyweight variation to move on to once the top of the rep range is easy (progression ladder). */
  harder?: string;
  /** A simple classic free-weight lift. The bodyweight-first style allows these, but no other loaded exercises. */
  classic?: boolean;
}

export interface Profile {
  name: string;
  age?: number;
  bodyWeightKg?: number;
  goal: Goal;
  experience: { gym: Experience; run: Experience };
  sports: string[]; // sport ids, see SPORTS
  defaultEquipment: EquipmentContext;
  gymAccess: boolean;
  /** How Carlo likes to train strength. Missing = 'calisthenics' (bodyweight first). */
  style?: TrainingStyle;
}

/**
 * calisthenics: bodyweight first, plus a few classic barbell/dumbbell lifts; never machines or cables.
 * freeWeights: any free weights; never machines or cables.
 * all: anything the equipment allows.
 */
export type TrainingStyle = 'calisthenics' | 'freeWeights' | 'all';

export interface DayAvailability {
  available: boolean;
  minutes: number;
  window: TimeWindow;
}

/** Always 7 entries, Monday first. */
export type WeekAvailability = DayAvailability[];

export interface Targets {
  gym: number;
  run: number;
  sport: number;
  mobility: number;
}

export type Split = 'fullBody' | 'upperLower' | 'ppl';
export type Phase = 'build' | 'peak' | 'deload';
export type BlockFocus = 'athletic' | 'strength' | 'muscle' | 'endurance' | 'health';

export interface RealismReport {
  level: 'ok' | 'tight' | 'over';
  /** Plain-language reasons. Empty when ok. */
  issues: string[];
  /** A version that fits. Equal to the input when ok. */
  suggestion: Targets;
}

export interface BlockOption {
  key: 'recommended' | 'alternative';
  label: string;
  why: string;
  targets: Targets;
  split: Split;
}

export interface Block {
  id: string;
  startDate: string; // a Monday
  focus: BlockFocus;
  focusLabel: string;
  targets: Targets;
  split: Split;
  phases: Phase[]; // length 4
  availability: WeekAvailability;
  /** Planned easy-pace run minutes in week 1. Later weeks scale from this. */
  runBaseMinutes: number;
  chosen: 'recommended' | 'alternative';
  options: BlockOption[];
  requested: Targets;
  realism: RealismReport;
}

export type GymDay = 'full' | 'upper' | 'lower' | 'push' | 'pull' | 'legs';
export type RunKind = 'easy' | 'recovery' | 'tempo' | 'intervals' | 'long';

export type WeekFocus = 'balanced' | 'legs' | 'upper' | 'endurance' | 'strength' | 'deload' | 'sport';

export interface PlannedSlot {
  id: string;
  day: DayIndex;
  type: SessionType;
  title: string;
  intent: string;
  minutes: number;
  load: Load;
  gymDay?: GymDay;
  /** Variation letter within the split, e.g. full body A/B/C. */
  variant?: number;
  runKind?: RunKind;
  sportId?: string;
  /** Run only: seconds of hard running this session may use (keeps the week near 80/20). */
  hardSec?: number;
  /** Run only: add strides at the end of an easy run. */
  strides?: boolean;
  /** The user moved this slot by hand; re-planning keeps it on its day. */
  pinned?: boolean;
}

export interface WeekWarning {
  code:
    | 'legsBeforeHardRun'
    | 'hardRunBeforeLegs'
    | 'sameMusclesBackToBack'
    | 'hardBackToBack'
    | 'tooLong'
    | 'unavailableDay'
    | 'noRestDay'
    | 'doubleDay'
    | 'droppedSessions'
    | 'sportBeforeLegs';
  message: string;
  days: DayIndex[];
}

export interface WeekPlan {
  weekStart: string;
  blockId: string;
  weekIndex: number; // 0..3
  phase: Phase;
  focus: WeekFocus;
  availability: WeekAvailability;
  slots: PlannedSlot[];
  warnings: WeekWarning[];
  chosen: 'recommended' | 'alternative';
  label: string;
  why: string;
}

// ---------- Workouts ----------

export interface WorkoutItem {
  id: string;
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
  /** Suggested load in kg, null = bodyweight or unknown. */
  targetKg: number | null;
  note?: string;
  /** Superset group label ("A", "B") in superset formats. */
  group?: string;
}

export type BlockKind = 'warmup' | 'main' | 'accessory' | 'core' | 'conditioning' | 'cooldown' | 'prep';

export interface WorkoutSection {
  kind: BlockKind;
  title: string;
  items: WorkoutItem[];
}

export type Effort = 'walk' | 'easy' | 'steady' | 'tempo' | 'hard' | 'stride';

export interface RunStep {
  label: string;
  seconds: number;
  effort: Effort;
  /** Heart-rate / effort zone 1–5. */
  zone: 1 | 2 | 3 | 4 | 5;
  hint: string;
}

export interface RunPlan {
  kind: RunKind;
  treadmill: boolean;
  steps: RunStep[];
  totalSec: number;
  hardSec: number;
  estimatedKm: number;
  paceHint?: string;
}

export interface Workout {
  id: string;
  type: SessionType;
  variant: 'recommended' | 'alternative';
  title: string;
  label: string; // "Recommended" / "Alternative: supersets"
  why: string;
  equipment: EquipmentContext;
  intensity: Intensity;
  targetMinutes: number;
  estimatedMinutes: number;
  sections: WorkoutSection[];
  run?: RunPlan;
  sportId?: string;
}

// ---------- History (input to progression) ----------

export interface SetPerformance {
  weightKg: number | null;
  reps: number;
  done: boolean;
}

export interface ExercisePerformance {
  date: string;
  exerciseId: string;
  repsMin: number;
  repsMax: number;
  sets: SetPerformance[];
}

export interface RunPerformance {
  date: string;
  kind: RunKind;
  distanceKm: number;
  durationSec: number;
}

export interface History {
  /** Most recent first is not required; engine sorts. */
  exercises: ExercisePerformance[];
  runs: RunPerformance[];
}

export const EMPTY_HISTORY: History = { exercises: [], runs: [] };
