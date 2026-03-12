import type { GameState, TimeOfDay, TimePhase, WorldClockState } from '../contracts.js';
import { normalizeTimePhase } from '../actions/timeActions.js';

export function getTimePhase(state: GameState): TimePhase {
  return normalizeTimePhase(state.world?.timePhase, normalizeTimePhase(state.world?.timeOfDay));
}

export function getTimeOfDay(state: GameState): TimeOfDay {
  return state.world.timeOfDay;
}

export function getWorldClock(state: GameState): WorldClockState {
  return state.world.clock;
}
