import { TIME_OF_DAY_ORDER, TIME_PHASE, TIME_PHASE_ORDER } from '../constants/types.js';
import { appendPhaseTransitions, createPhaseTransition } from './phaseTransitionActions.js';

export const ACTION_TIME_COST_STEPS = Object.freeze({
  navigation: 1,
  inspect: 1,
  conversation: 1,
  inventory: 0
});

const TIME_OF_DAY_TO_PHASE = Object.freeze({
  Morning: TIME_PHASE.Morning,
  Day: TIME_PHASE.Day,
  Evening: TIME_PHASE.Evening,
  Night: TIME_PHASE.Night
});

const PHASE_TO_TIME_OF_DAY = Object.freeze({
  [TIME_PHASE.Morning]: 'Morning',
  [TIME_PHASE.Day]: 'Day',
  [TIME_PHASE.Evening]: 'Evening',
  [TIME_PHASE.Night]: 'Night'
});

export function normalizeTimePhase(value, fallback = TIME_PHASE.Morning) {
  if (TIME_PHASE_ORDER.includes(value)) return value;
  if (typeof value === 'string' && TIME_OF_DAY_TO_PHASE[value]) return TIME_OF_DAY_TO_PHASE[value];
  return fallback;
}

function toLegacyTimeOfDay(phase) {
  return PHASE_TO_TIME_OF_DAY[phase] || PHASE_TO_TIME_OF_DAY[TIME_PHASE.Morning];
}

function normalizeWorldTime(world = {}) {
  const normalizedPhase = normalizeTimePhase(world.timePhase, normalizeTimePhase(world.timeOfDay));
  return {
    phase: normalizedPhase,
    timeOfDay: toLegacyTimeOfDay(normalizedPhase)
  };
}

export function setTimePhase(state, nextTimePhase) {
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

export function setTimeOfDay(state, nextTimeOfDay) {
  if (TIME_OF_DAY_ORDER.includes(nextTimeOfDay)) {
    return setTimePhase(state, normalizeTimePhase(nextTimeOfDay));
  }

  return setTimePhase(state, nextTimeOfDay);
}

export function advanceTime(state) {
  const current = normalizeWorldTime(state.world);
  const currentIndex = TIME_PHASE_ORDER.indexOf(current.phase);
  const nextIndex = (currentIndex + 1) % TIME_PHASE_ORDER.length;
  const wrapped = nextIndex === 0;
  const nextPhase = TIME_PHASE_ORDER[nextIndex];

  const nextState = {
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
    trigger: 'time-advance'
  });

  return appendPhaseTransitions(nextState, [transition]);
}

export function advanceTimeBySteps(state, steps = 1) {
  const normalizedSteps = Number.isFinite(steps) ? Math.max(0, Math.floor(steps)) : 0;
  let nextState = state;

  for (let index = 0; index < normalizedSteps; index += 1) {
    nextState = advanceTime(nextState);
  }

  return nextState;
}

export function getTimeCostForAction(actionType, fallback = 0) {
  if (typeof actionType !== 'string' || !actionType) return fallback;
  const configured = ACTION_TIME_COST_STEPS[actionType];
  if (!Number.isFinite(configured)) return fallback;
  return Math.max(0, Math.floor(configured));
}
