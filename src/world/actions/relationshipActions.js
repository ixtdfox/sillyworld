import { getRelationship } from '../selectors/relationshipSelectors.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function setRelationship(state, characterId, delta) {
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
