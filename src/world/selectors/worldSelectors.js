import { normalizeTimePhase } from '../actions/timeActions.js';

export function getTimePhase(state) {
  return normalizeTimePhase(state.world?.timePhase, normalizeTimePhase(state.world?.timeOfDay));
}

export function getTimeOfDay(state) {
  return state.world.timeOfDay;
}

export function getWorldClock(state) {
  return state.world.clock;
}
