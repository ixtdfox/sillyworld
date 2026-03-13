import type { GameState, TimeOfDay, TimePhase, WorldClockState } from '../contracts.ts';
import { normalizeTimePhase } from './timeActions.ts';

export function getTimePhase(state: GameState): TimePhase {
  return normalizeTimePhase(state.world?.timePhase, normalizeTimePhase(state.world?.timeOfDay)) ?? 'morning';
}

export function getTimeOfDay(state: GameState): TimeOfDay {
  return state.world.timeOfDay;
}

export function getWorldClock(state: GameState): WorldClockState {
  return state.world.clock;
}
