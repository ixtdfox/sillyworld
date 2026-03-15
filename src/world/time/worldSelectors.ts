/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей.
 */
import type { GameState, TimeOfDay, TimePhase, WorldClockState } from '../contracts.ts';
import { normalizeTimePhase } from './timeActions.ts';

/** Возвращает `getTimePhase` в ходе выполнения связанного игрового сценария. */
export function getTimePhase(state: GameState): TimePhase {
  return normalizeTimePhase(state.world?.timePhase, normalizeTimePhase(state.world?.timeOfDay)) ?? 'morning';
}

/** Возвращает `getTimeOfDay` в ходе выполнения связанного игрового сценария. */
export function getTimeOfDay(state: GameState): TimeOfDay {
  return state.world.timeOfDay;
}

/** Возвращает `getWorldClock` в ходе выполнения связанного игрового сценария. */
export function getWorldClock(state: GameState): WorldClockState {
  return state.world.clock;
}
