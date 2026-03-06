import { TIME_OF_DAY, TIME_PHASE } from '../constants/types.js';
import { normalizeTimePhase } from '../actions/timeActions.js';

const PHASE_TO_TIME_OF_DAY = Object.freeze({
  [TIME_PHASE.Morning]: TIME_OF_DAY.Morning,
  [TIME_PHASE.Day]: TIME_OF_DAY.Day,
  [TIME_PHASE.Evening]: TIME_OF_DAY.Evening,
  [TIME_PHASE.Night]: TIME_OF_DAY.Night
});

function toLegacyTimeOfDay(phase) {
  return PHASE_TO_TIME_OF_DAY[phase] || TIME_OF_DAY.Morning;
}

export function createDefaultWorld(seed = {}) {
  const timePhase = normalizeTimePhase(seed.timePhase, normalizeTimePhase(seed.timeOfDay));

  return {
    timePhase,
    timeOfDay: toLegacyTimeOfDay(timePhase),
    clock: {
      dayNumber: seed.clock?.dayNumber || 1,
      step: seed.clock?.step || 0
    }
  };
}
