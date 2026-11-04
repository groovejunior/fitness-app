import { chooseBlockOption, checkRealism, planMonth, type MonthInput } from './month';
import { moveSession, planWeek, revalidateWeek, type WeekInput, type WeekPlanResult } from './week';
import type { WorkoutRequest } from './gym';
import { buildWorkouts, substitutes, swapExercise, type WorkoutResult } from './workout';
import { suggestLoad, type LoadSuggestion } from './progression';
import type { Block, DayIndex, EquipmentContext, Exercise, History, Phase, Profile, RealismReport, Targets, TrainingStyle, WeekAvailability, WeekPlan, Workout } from './types';

/**
 * The coach the app talks to. Everything the UI needs from "the brain" goes through here,
 * so a Claude-powered coach can replace the rule-based one later without touching screens.
 * Implementations must be deterministic for the same input (the rule coach is).
 */
export interface CoachEngine {
  readonly name: string;
  checkRealism(requested: Targets, availability: WeekAvailability, profile: Profile): RealismReport;
  planMonth(input: MonthInput): Block;
  chooseBlockOption(block: Block, key: 'recommended' | 'alternative', ctx: Pick<MonthInput, 'profile' | 'history' | 'previousBlock'>): Block;
  planWeek(input: WeekInput): WeekPlanResult;
  moveSession(plan: WeekPlan, slotId: string, toDay: DayIndex, profile: Profile): WeekPlan;
  revalidateWeek(plan: WeekPlan, profile: Profile): WeekPlan;
  buildWorkouts(req: WorkoutRequest): WorkoutResult;
  substitutes(exerciseId: string, ctx: EquipmentContext, style?: TrainingStyle): Exercise[];
  swapExercise(workout: Workout, itemId: string, newExerciseId: string, ctx: { profile: Profile; history: History; phase: Phase }): Workout;
  suggestLoad(exercise: Exercise, repsMin: number, repsMax: number, history: History, phase: Phase): LoadSuggestion;
}

export const ruleCoach: CoachEngine = {
  name: 'Rule coach v1',
  checkRealism,
  planMonth,
  chooseBlockOption,
  planWeek,
  moveSession,
  revalidateWeek,
  buildWorkouts,
  substitutes,
  swapExercise,
  suggestLoad,
};

/** The coach in use. Swap this for another CoachEngine implementation. */
export const coach: CoachEngine = ruleCoach;
