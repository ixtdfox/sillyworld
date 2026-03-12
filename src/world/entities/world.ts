import { TIME_OF_DAY, TIME_PHASE } from '../constants/types.ts';
import { normalizeTimePhase } from '../actions/timeActions.ts';
import type { GameStateSeed, TimePhase, TimeOfDay, WorldState, WorldPhaseTransitionState } from '../contracts.ts';

const PHASE_TO_TIME_OF_DAY: Record<TimePhase, TimeOfDay> = Object.freeze({
  [TIME_PHASE.Morning]: TIME_OF_DAY.Morning,
  [TIME_PHASE.Day]: TIME_OF_DAY.Day,
  [TIME_PHASE.Evening]: TIME_OF_DAY.Evening,
  [TIME_PHASE.Night]: TIME_OF_DAY.Night
});

function toLegacyTimeOfDay(phase: TimePhase): TimeOfDay {
  return PHASE_TO_TIME_OF_DAY[phase] ?? TIME_OF_DAY.Morning;
}

function normalizeTransitions(phaseTransitions: unknown): WorldPhaseTransitionState {
  const transitions = (phaseTransitions ?? {}) as { pending?: unknown; history?: unknown };
  return {
    pending: Array.isArray(transitions.pending) ? transitions.pending : [],
    history: Array.isArray(transitions.history) ? transitions.history : []
  };
}

export function createDefaultWorld(seed: GameStateSeed['world'] | undefined = undefined): WorldState {
  const safeSeed = (seed ?? {}) as Partial<WorldState> & { timeOfDay?: string; timePhase?: string };
  const normalizedPhase = normalizeTimePhase(safeSeed.timePhase, normalizeTimePhase(safeSeed.timeOfDay));
  const timePhase = normalizedPhase ?? TIME_PHASE.Morning;

  return {
    timePhase,
    timeOfDay: toLegacyTimeOfDay(timePhase),
    clock: {
      dayNumber: safeSeed.clock?.dayNumber ?? 1,
      step: safeSeed.clock?.step ?? 0
    },
    phaseTransitions: normalizeTransitions(safeSeed.phaseTransitions)
  };
}
