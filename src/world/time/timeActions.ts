/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей.
 */
import { TIME_OF_DAY_ORDER, TIME_PHASE, TIME_PHASE_ORDER } from '../constant/types.ts';
import type { GameState, TimeOfDay, TimePhase } from '../contracts.ts';
import { appendPhaseTransitions, createPhaseTransition } from '../map/phaseTransitionActions.ts';

/** Константа `ACTION_TIME_COST_STEPS` хранит общие настройки/данные, которые переиспользуются в модуле `world/time/timeActions`. */
export const ACTION_TIME_COST_STEPS = Object.freeze({
  navigation: 1,
  inspect: 1,
  conversation: 1,
  inventory: 0
});

const TIME_OF_DAY_TO_PHASE: Readonly<Record<TimeOfDay, TimePhase>> = Object.freeze({
  Morning: TIME_PHASE.Morning,
  Day: TIME_PHASE.Day,
  Evening: TIME_PHASE.Evening,
  Night: TIME_PHASE.Night
});

const PHASE_TO_TIME_OF_DAY: Readonly<Record<TimePhase, TimeOfDay>> = Object.freeze({
  [TIME_PHASE.Morning]: 'Morning',
  [TIME_PHASE.Day]: 'Day',
  [TIME_PHASE.Evening]: 'Evening',
  [TIME_PHASE.Night]: 'Night'
});

/** Выполняет `isTimePhase` в ходе выполнения связанного игрового сценария. */
function isTimePhase(value: string): value is TimePhase {
  return TIME_PHASE_ORDER.includes(value as TimePhase);
}

/** Выполняет `isTimeOfDay` в ходе выполнения связанного игрового сценария. */
function isTimeOfDay(value: string): value is TimeOfDay {
  return TIME_OF_DAY_ORDER.includes(value as TimeOfDay);
}

/** Нормализует `normalizeTimePhase` в ходе выполнения связанного игрового сценария. */
export function normalizeTimePhase(value: string | null | undefined, fallback: TimePhase | null = TIME_PHASE.Morning): TimePhase | null {
  if (value && isTimePhase(value)) return value;
  if (value && isTimeOfDay(value)) return TIME_OF_DAY_TO_PHASE[value];
  return fallback;
}

/** Выполняет `toLegacyTimeOfDay` в ходе выполнения связанного игрового сценария. */
function toLegacyTimeOfDay(phase: TimePhase): TimeOfDay {
  return PHASE_TO_TIME_OF_DAY[phase] || PHASE_TO_TIME_OF_DAY[TIME_PHASE.Morning];
}

/** Нормализует `normalizeWorldTime` в ходе выполнения связанного игрового сценария. */
function normalizeWorldTime(state: GameState): { phase: TimePhase; timeOfDay: TimeOfDay } {
  const normalizedPhase = normalizeTimePhase(state.world.timePhase, normalizeTimePhase(state.world.timeOfDay, TIME_PHASE.Morning));
  return {
    phase: normalizedPhase || TIME_PHASE.Morning,
    timeOfDay: toLegacyTimeOfDay(normalizedPhase || TIME_PHASE.Morning)
  };
}

/** Обновляет `setTimePhase` в ходе выполнения связанного игрового сценария. */
export function setTimePhase(state: GameState, nextTimePhase: string): GameState {
  const normalizedPhase = normalizeTimePhase(nextTimePhase, null);
  if (!normalizedPhase) return state;

  return {
    ...state,
    world: {
      ...state.world,
      timePhase: normalizedPhase,
      timeOfDay: toLegacyTimeOfDay(normalizedPhase)
    },
    updatedAt: Date.now()
  };
}

/** Обновляет `setTimeOfDay` в ходе выполнения связанного игрового сценария. */
export function setTimeOfDay(state: GameState, nextTimeOfDay: string): GameState {
  if (isTimeOfDay(nextTimeOfDay)) {
    return setTimePhase(state, normalizeTimePhase(nextTimeOfDay, TIME_PHASE.Morning) || TIME_PHASE.Morning);
  }

  return setTimePhase(state, nextTimeOfDay);
}

/** Продвигает `advanceTime` в ходе выполнения связанного игрового сценария. */
export function advanceTime(state: GameState, options: { trigger?: string } = {}): GameState {
  const current = normalizeWorldTime(state);
  const currentIndex = TIME_PHASE_ORDER.indexOf(current.phase);
  const nextIndex = (currentIndex + 1) % TIME_PHASE_ORDER.length;
  const wrapped = nextIndex === 0;
  const nextPhase = TIME_PHASE_ORDER[nextIndex] ?? TIME_PHASE.Morning;

  const nextState: GameState = {
    ...state,
    world: {
      ...state.world,
      timePhase: nextPhase,
      timeOfDay: toLegacyTimeOfDay(nextPhase),
      clock: {
        dayNumber: wrapped ? state.world.clock.dayNumber + 1 : state.world.clock.dayNumber,
        step: state.world.clock.step + 1
      }
    },
    updatedAt: Date.now()
  };

  const transition = createPhaseTransition({
    fromPhase: current.phase,
    toPhase: nextPhase,
    dayNumber: nextState.world.clock.dayNumber,
    clockStep: nextState.world.clock.step,
    trigger: options.trigger || 'time-advance'
  });

  return appendPhaseTransitions(nextState, [transition]);
}

/** Продвигает `advanceTimeBySteps` в ходе выполнения связанного игрового сценария. */
export function advanceTimeBySteps(state: GameState, steps = 1, options: { trigger?: string } = {}): GameState {
  const normalizedSteps = Number.isFinite(steps) ? Math.max(0, Math.floor(steps)) : 0;
  let nextState = state;

  for (let index = 0; index < normalizedSteps; index += 1) {
    nextState = advanceTime(nextState, options);
  }

  return nextState;
}

/** Возвращает `getStepsUntilPhase` в ходе выполнения связанного игрового сценария. */
export function getStepsUntilPhase(currentPhase: string, targetPhase: string): number {
  const normalizedCurrent = normalizeTimePhase(currentPhase, null);
  const normalizedTarget = normalizeTimePhase(targetPhase, null);
  if (!normalizedCurrent || !normalizedTarget) return 0;

  const currentIndex = TIME_PHASE_ORDER.indexOf(normalizedCurrent);
  const targetIndex = TIME_PHASE_ORDER.indexOf(normalizedTarget);
  if (currentIndex < 0 || targetIndex < 0) return 0;

  return (targetIndex - currentIndex + TIME_PHASE_ORDER.length) % TIME_PHASE_ORDER.length;
}

/** Продвигает `advanceToTimePhase` в ходе выполнения связанного игрового сценария. */
export function advanceToTimePhase(
  state: GameState,
  targetTimePhase: string,
  options: { trigger?: string; requireForwardProgress?: boolean } = {}
): GameState {
  const currentPhase = normalizeTimePhase(state.world.timePhase, normalizeTimePhase(state.world.timeOfDay, TIME_PHASE.Morning));
  const steps = getStepsUntilPhase(currentPhase || TIME_PHASE.Morning, targetTimePhase);
  const minimumSteps = options.requireForwardProgress === false ? 0 : 1;
  const effectiveSteps = steps === 0 ? minimumSteps : steps;

  return advanceTimeBySteps(state, effectiveSteps, options);
}

/** Возвращает `getTimeCostForAction` в ходе выполнения связанного игрового сценария. */
export function getTimeCostForAction(actionType: string, fallback = 0): number {
  if (typeof actionType !== 'string' || !actionType) return fallback;
  const configured = (ACTION_TIME_COST_STEPS as Record<string, number>)[actionType];
  if (!Number.isFinite(configured)) return fallback;
  return Math.max(0, Math.floor(configured));
}
