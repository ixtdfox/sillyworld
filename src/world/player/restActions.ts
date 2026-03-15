/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей. Фокус файла — состояние и поведение игрока в исследовании и связанных действиях.
 */
import { TIME_PHASE } from '../constant/types.ts';
import { advanceTimeBySteps, advanceToTimePhase } from '../time/timeActions.ts';
import type { GameState, PhaseTransitionRecord } from '../contracts.ts';

const REST_ACTION = Object.freeze({
  UntilEvening: 'rest-until-evening',
  SleepUntilMorning: 'sleep-until-morning',
  NextPhase: 'advance-to-next-phase'
});

/** Выполняет `isAtHome` в ходе выполнения связанного игрового сценария. */
function isAtHome(state: GameState): boolean {
  return Boolean(state.player.currentNodeId) && state.player.currentNodeId === state.player.homeNodeId;
}

/** Выполняет `summarizeTransitions` в ходе выполнения связанного игрового сценария. */
function summarizeTransitions(state: GameState, previousPendingCount: number): PhaseTransitionRecord[] {
  const pending = Array.isArray(state.world.phaseTransitions?.pending) ? state.world.phaseTransitions.pending : [];
  return pending.slice(previousPendingCount);
}

/** Возвращает `getAvailableRestActions` в ходе выполнения связанного игрового сценария. */
export function getAvailableRestActions(state: GameState): Array<{ id: string; label: string; description: string }> {
  if (!isAtHome(state)) return [];

  return [
    {
      id: REST_ACTION.UntilEvening,
      label: 'Rest until evening',
      description: 'Pass low-stakes daytime hours and resume when the city enters evening.'
    },
    {
      id: REST_ACTION.SleepUntilMorning,
      label: 'Sleep until morning',
      description: 'Sleep through the current cycle and wake up in the next morning phase.'
    },
    {
      id: REST_ACTION.NextPhase,
      label: 'Advance to next phase',
      description: 'Move the clock forward by one phase.'
    }
  ];
}

/** Выполняет `performRestAction` в ходе выполнения связанного игрового сценария. */
export function performRestAction(state: GameState, actionId: string) {
  if (!isAtHome(state)) {
    return {
      ok: false,
      reason: 'Rest time are only available at home.',
      state
    };
  }

  const previousPendingCount = Array.isArray(state.world.phaseTransitions?.pending)
    ? state.world.phaseTransitions.pending.length
    : 0;

  let nextState = state;
  let timeCostSteps = 0;

  if (actionId === REST_ACTION.NextPhase) {
    timeCostSteps = 1;
    nextState = advanceTimeBySteps(state, 1, { trigger: actionId });
  } else if (actionId === REST_ACTION.UntilEvening) {
    nextState = advanceToTimePhase(state, TIME_PHASE.Evening, { trigger: actionId });
    timeCostSteps = nextState.world.clock.step - state.world.clock.step;
  } else if (actionId === REST_ACTION.SleepUntilMorning) {
    nextState = advanceToTimePhase(state, TIME_PHASE.Morning, { trigger: actionId });
    timeCostSteps = nextState.world.clock.step - state.world.clock.step;
  } else {
    return {
      ok: false,
      reason: 'Unknown rest action.',
      state
    };
  }

  return {
    ok: true,
    state: nextState,
    ...(Number.isFinite(timeCostSteps) ? { timeCostSteps } : {}),
    transitions: summarizeTransitions(nextState, previousPendingCount)
  };
}

export { REST_ACTION };
