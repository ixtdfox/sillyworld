import type { GameState, PhaseTransitionRecord, TimePhase, WorldState } from '../contracts.ts';

const DEFAULT_TRANSITION_TYPE = 'time.phase.changed';

interface CreatePhaseTransitionInput {
  fromPhase: TimePhase;
  toPhase: TimePhase;
  dayNumber: number;
  clockStep: number;
  trigger?: string;
}

function toTransitionId({ dayNumber, clockStep, fromPhase, toPhase }: CreatePhaseTransitionInput): string {
  return `${DEFAULT_TRANSITION_TYPE}:${dayNumber}:${clockStep}:${fromPhase}->${toPhase}`;
}

export function createPhaseTransition({ fromPhase, toPhase, dayNumber, clockStep, trigger = 'time-advance' }: CreatePhaseTransitionInput): PhaseTransitionRecord {
  return {
    id: toTransitionId({ dayNumber, clockStep, fromPhase, toPhase }),
    type: DEFAULT_TRANSITION_TYPE,
    fromPhase,
    toPhase,
    dayNumber,
    clockStep,
    trigger,
    createdAt: Date.now()
  };
}

function normalizeTransitionQueue(world: WorldState): { pending: PhaseTransitionRecord[]; history: PhaseTransitionRecord[] } {
  const pending = Array.isArray(world.phaseTransitions?.pending) ? world.phaseTransitions.pending : [];
  const history = Array.isArray(world.phaseTransitions?.history) ? world.phaseTransitions.history : [];

  return {
    pending,
    history
  };
}

export function appendPhaseTransitions(state: GameState, transitions: PhaseTransitionRecord[] = []): GameState {
  if (!Array.isArray(transitions) || transitions.length === 0) return state;
  const queue = normalizeTransitionQueue(state.world);

  return {
    ...state,
    world: {
      ...state.world,
      phaseTransitions: {
        pending: [...queue.pending, ...transitions],
        history: queue.history
      }
    },
    updatedAt: Date.now()
  };
}

export function consumeNextPhaseTransition(state: GameState): { state: GameState; transition: PhaseTransitionRecord | null } {
  const queue = normalizeTransitionQueue(state.world);
  const next = queue.pending[0];
  if (!next) {
    return {
      state,
      transition: null
    };
  }

  return {
    transition: next,
    state: {
      ...state,
      world: {
        ...state.world,
        phaseTransitions: {
          pending: queue.pending.slice(1),
          history: [...queue.history, next].slice(-32)
        }
      },
      updatedAt: Date.now()
    }
  };
}

export function getPendingPhaseTransitions(state: GameState): PhaseTransitionRecord[] {
  const queue = normalizeTransitionQueue(state.world);
  return queue.pending;
}
