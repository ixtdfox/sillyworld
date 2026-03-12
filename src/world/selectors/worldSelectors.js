import { normalizeTimePhase } from "../actions/timeActions.js";
function getTimePhase(state) {
  return normalizeTimePhase(state.world?.timePhase, normalizeTimePhase(state.world?.timeOfDay));
}
function getTimeOfDay(state) {
  return state.world.timeOfDay;
}
function getWorldClock(state) {
  return state.world.clock;
}
export {
  getTimeOfDay,
  getTimePhase,
  getWorldClock
};
