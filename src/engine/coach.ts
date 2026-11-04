// The CoachEngine interface is the seam for a future AI coach.
// The app only talks to the engine through this interface; RuleCoach is the
// deterministic, offline implementation.
import { baseRunMinutes, proposeBlock, typicalGymMinutes, PHASES } from './block';
import { generateMobility, generateSport } from './other';
import { generateRun } from './running';
import { generateStrength } from './strength';
import { moveSession, planWeek, validateWeek, type WeekInput } from './week';
import type {
  Block,
  BlockProposal,
  DayAvailability,
  History,
  ISODate,
  PlannedSession,
  Profile,
  RunKind,
  Targets,
  WeekPlan,
  WeekProposal,
  WeekWarning,
  WorkoutOptions,
  GymFocus,
} from './types';

export interface WorkoutContext {
  profile: Profile;
  block: Block;
  week: WeekPlan;
  history: History;
  swaps?: Record<string, string>;
}

export interface CoachEngine {
  readonly name: string;
  proposeBlock(profile: Profile, wanted: Targets, availability: DayAvailability[]): BlockProposal;
  createBlock(profile: Profile, proposal: BlockProposal, choice: 'recommended' | 'alternative', startDate: ISODate, history: History): Block;
  planWeek(input: WeekInput): WeekProposal;
  validateWeek(plan: WeekPlan): WeekWarning[];
  moveSession(plan: WeekPlan, sessionId: string, date: ISODate): WeekPlan;
  generateWorkout(session: PlannedSession, ctx: WorkoutContext): WorkoutOptions;
}

export class RuleCoach implements CoachEngine {
  readonly name = 'rules';

  proposeBlock(profile: Profile, wanted: Targets, availability: DayAvailability[]): BlockProposal {
    return proposeBlock({ profile, wanted, availability });
  }

  createBlock(profile: Profile, proposal: BlockProposal, choice: 'recommended' | 'alternative', startDate: ISODate, history: History): Block {
    const targets = choice === 'recommended' ? proposal.recommended.targets : proposal.alternative.targets;
    return {
      id: `block-${startDate}`,
      startDate,
      focus: proposal.focus,
      phases: [...PHASES],
      options: [proposal.recommended, proposal.alternative],
      chosen: choice,
      realism: proposal.realism,
      baseRunMinutes: baseRunMinutes(profile, targets.run, history, startDate),
      gymMinutes: typicalGymMinutes(profile.availability),
      createdAt: new Date().toISOString(),
    };
  }

  planWeek(input: WeekInput): WeekProposal {
    return planWeek(input);
  }

  validateWeek(plan: WeekPlan): WeekWarning[] {
    return validateWeek(plan.sessions, plan.availability, plan.weekStart);
  }

  moveSession(plan: WeekPlan, sessionId: string, date: ISODate): WeekPlan {
    return moveSession(plan, sessionId, date);
  }

  generateWorkout(session: PlannedSession, ctx: WorkoutContext): WorkoutOptions {
    const { profile, block, week, history } = ctx;
    const base = { sessionId: session.id, durationMin: session.durationMin, equipment: session.equipment, weekIndex: week.weekIndex };
    switch (session.type) {
      case 'gym': {
        const input = {
          ...base,
          date: session.date,
          focus: session.intent as GymFocus,
          intensity: session.intensity,
          phase: week.phase,
          blockId: block.id,
          emphasis: session.emphasis,
          profile,
          history,
          swaps: ctx.swaps,
        };
        return { recommended: generateStrength(input, 'recommended'), alternative: generateStrength(input, 'alternative') };
      }
      case 'run': {
        const input = { ...base, kind: session.intent as RunKind, experience: profile.experience.run, phase: week.phase, history };
        return { recommended: generateRun(input, 'recommended'), alternative: generateRun(input, 'alternative') };
      }
      case 'sport': {
        const input = { ...base, sport: session.intent, intensity: session.intensity, blockId: block.id, profile };
        return { recommended: generateSport(input, 'recommended'), alternative: generateSport(input, 'alternative') };
      }
      case 'mobility': {
        const input = { ...base, blockId: block.id, profile };
        return { recommended: generateMobility(input, 'recommended'), alternative: generateMobility(input, 'alternative') };
      }
    }
  }
}

export const coach: CoachEngine = new RuleCoach();
