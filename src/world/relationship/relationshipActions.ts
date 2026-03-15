/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей.
 */
import type { GameState } from '../contracts.ts';
import { getRelationship } from './relationshipSelectors.ts';

/** Выполняет `clamp` в ходе выполнения связанного игрового сценария. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Обновляет `setRelationship` в ходе выполнения связанного игрового сценария. */
export function setRelationship(
  state: GameState,
  characterId: string,
  delta: number
): { nextState: GameState; level: number } {
  const existing = getRelationship(state, characterId);
  const timestamp = Date.now();
  const relationship = {
    ...existing,
    level: clamp(existing.level + delta, -100, 100),
    history: [...(existing.history || []), `delta:${delta}`].slice(-12),
    lastInteractionAt: timestamp
  };

  return {
    nextState: {
      ...state,
      player: {
        ...state.player,
        relationships: {
          ...state.player.relationships,
          [characterId]: relationship
        }
      },
      updatedAt: timestamp
    },
    level: relationship.level
  };
}
