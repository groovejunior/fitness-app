// Core domain types for the training engine.
// Pure TypeScript: no UI, no storage. Everything here is plain serialisable data.

/** ISO date string, yyyy-mm-dd (local calendar date). */
export type ISODate = string;

/** 0 = Monday … 6 = Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type PrimaryGoal = 'athletic' | 'strength' | 'endurance' | 'health';
export type SessionType = 'gym' | 'run' | 'sport' | 'mobility';

/** Where a session happens. Decides which equipment is available. */
export type EquipmentContext = 'gym' | 'home' | 'bodyweight' | 'outdoors';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'cable'
  | 'machine'
  | 'bench'
  | 'pullup-bar'
  | 'band'
  | 'box'
  | 'none';

export type MovementPattern =
  | 'push'
  | 'pull'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'carry'
  | 'core'
  | 'plyo'
  | 'cardio'
  | 'mobility';

export type Muscle =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'hips'
  | 'full';

/** How an exercise is used inside a workout. An exercise may have several. */
export type ExerciseRole = 'main' | 'accessory' | 'core' | 'power' | 'conditioning' | 'warmup' | 'cooldown';

export interface Exercise {
  id: string;
  name: string;
  pattern: MovementPattern;
  /** For push/pull: horizontal (press, row) or vertical (overhead, pull-up). */
  plane?: 'horizontal' | 'vertical';
  /** First entry is the primary muscle. */
  muscles: Muscle[];
  /** Every item listed is required. `['none']` means no equipment. */
  equipment: Equipment[];
  /** 1 = easy to learn, 3 = technical. */
  difficulty: 1 | 2 | 3;
  roles: ExerciseRole[];
  /** weighted: log kg + reps. bodyweight: log reps. timed: log seconds. */
  load: 'weighted' | 'bodyweight' | 'timed';
  /** Per side (lunges, single-arm rows)? Reps are then per side. */
  unilateral?: boolean;
  cues: string[];
  mistake: string;
  animationId: string;
  /** Exercise ids with the same pattern but different equipment. */
  substitutions: string[];
}

// ---------------------------------------------------------------------------
// Profile and availability

export interface DayAvailability {
  available: boolean;
  /** Typical minutes free for training that day. */
  minutes: number;
  window: 'morning' | 'midday' | 'evening';
}

export interface SportPref {
  name: string;
  perWeek: number;
  durationMin: number;
  /** Preferred fixed days, if any (e.g. club tennis on Thursday). */
  days?: Weekday[];
  intensity: 'easy' | 'moderate' | 'hard';
}

export interface Targets {
  gym: number;
  run: number;
  sport: number;
  mobility: number;
}

export interface Profile {
  name: string;
  age?: number;
  weightKg?: number;
  experience: { gym: Experience; run: Experience };
  goal: PrimaryGoal;
  sports: SportPref[];
  defaultEquipment: EquipmentContext;
  /** What "home with some equipment" means for this person. */
  homeEquipment: Equipment[];
  wanted: Targets;
  /** Default weekly availability, Monday first (7 entries). */
  availability: DayAvailability[];
  units: 'metric' | 'imperial';
  theme: 'system' | 'light' | 'dark';
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Month block

export type WeekPhase = 'build' | 'peak' | 'deload';

export interface RealismReport {
  ok: boolean;
  /** Short plain sentences, shown to the user. */
  issues: string[];
  /** A realistic version of what was asked, if the ask was not realistic. */
  suggested?: Targets;
}

export interface BlockOption {
  key: 'recommended' | 'alternative';
  label: string;
  description: string;
  targets: Targets;
}

export interface BlockProposal {
  focus: string;
  phases: WeekPhase[];
  realism: RealismReport;
  recommended: BlockOption;
  alternative: BlockOption;
}

export interface Block {
  id: string;
  /** Monday of week 1. */
  startDate: ISODate;
  focus: string;
  phases: WeekPhase[];
  options: [BlockOption, BlockOption];
  chosen: 'recommended' | 'alternative';
  realism: RealismReport;
  /** Weekly run minutes at the start of the block (week 1 target). */
  baseRunMinutes: number;
  /** Typical gym session length in minutes. */
  gymMinutes: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Week plan

export type WeekFocus = 'balanced' | 'legs' | 'upper' | 'endurance' | 'deload' | 'sport';

export type GymFocus = 'full-a' | 'full-b' | 'full-c' | 'upper' | 'lower' | 'push' | 'pull' | 'legs';
export type RunKind = 'easy' | 'recovery' | 'long' | 'tempo' | 'intervals' | 'progression' | 'strides';
export type Intensity = 'easy' | 'moderate' | 'hard';
export type SessionStatus = 'planned' | 'committed' | 'in_progress' | 'done' | 'skipped';

export interface PlannedSession {
  id: string;
  date: ISODate;
  type: SessionType;
  /** gym: GymFocus, run: RunKind, sport: sport name, mobility: 'mobility'. */
  intent: string;
  title: string;
  durationMin: number;
  intensity: Intensity;
  equipment: EquipmentContext;
  status: SessionStatus;
  /** Fixed by the user (sport on a set day). The engine will not move it. */
  fixed?: boolean;
  /** Emphasis passed into workout generation (from week focus). */
  emphasis?: 'lower' | 'upper';
  /** Which option the user picked on the detail screen. */
  chosenOption?: 'recommended' | 'alternative';
}

export interface WeekWarning {
  sessionId?: string;
  message: string;
}

export interface WeekPlan {
  /** Monday of this week; also the primary key. */
  weekStart: ISODate;
  blockId: string;
  weekIndex: number;
  phase: WeekPhase;
  focus: WeekFocus;
  availability: DayAvailability[];
  sessions: PlannedSession[];
  warnings: WeekWarning[];
  variant: 'recommended' | 'alternative';
  /** Short description of the other option, for the switch on the week screen. */
  alternativeLabel?: string;
}

export interface WeekProposal {
  recommended: WeekPlan;
  alternative: WeekPlan;
  alternativeLabel: string;
}

// ---------------------------------------------------------------------------
// Workouts

export type RepTarget = { kind: 'reps'; min: number; max: number } | { kind: 'time'; seconds: number };

export interface StrengthItem {
  kind: 'strength';
  exerciseId: string;
  sets: number;
  target: RepTarget;
  restSec: number;
  /** Suggested load in kg (from history). Undefined = find a working weight. */
  weightKg?: number;
  note?: string;
}

export type RunEffort = 'walk' | 'easy' | 'steady' | 'tempo' | 'hard' | 'stride';

export interface RunStep {
  kind: 'run';
  label: string;
  effort: RunEffort;
  durationSec: number;
}

export type WorkoutBlockKind = 'warmup' | 'power' | 'main' | 'accessory' | 'core' | 'conditioning' | 'cooldown' | 'run';

export interface WorkoutBlock {
  kind: WorkoutBlockKind;
  title: string;
  items: (StrengthItem | RunStep)[];
}

export interface Workout {
  sessionId: string;
  type: SessionType;
  variant: 'recommended' | 'alternative';
  title: string;
  /** One plain line about why / what this workout is. */
  summary: string;
  durationMin: number;
  equipment: EquipmentContext;
  intensity: Intensity;
  blocks: WorkoutBlock[];
}

export interface WorkoutOptions {
  recommended: Workout;
  alternative: Workout;
}

// ---------------------------------------------------------------------------
// Logs

export interface SetLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  date: ISODate;
  setIndex: number;
  weightKg?: number;
  reps?: number;
  timeSec?: number;
  rpe?: number;
  done: boolean;
}

export interface SessionLog {
  sessionId: string;
  date: ISODate;
  type: SessionType;
  title: string;
  intent: string;
  durationMin: number;
  /** Perceived effort 1–10. */
  effort?: number;
  notes?: string;
  distanceKm?: number;
  runTimeSec?: number;
  stepsCompleted?: number;
  stepsTotal?: number;
  /** The workout as it was done, for history. */
  workout?: Workout;
  completedAt: string;
}

/** Everything the engine may look at from the past. */
export interface History {
  sets: SetLog[];
  sessions: SessionLog[];
}
