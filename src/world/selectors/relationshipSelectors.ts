import type { CharacterState, GameState, RelationshipState } from '../contracts.js';

export const DEFAULT_RELATIONSHIP: Readonly<RelationshipState> = Object.freeze({
  level: 0,
  tags: [],
  stance: 'neutral',
  axes: {
    trust: 0,
    fear: 0,
    guilt: 0,
    affection: 0,
    resentment: 0,
    officialNarrativeLoyalty: 0
  },
  flags: {},
  history: [],
  lastInteractionAt: null
});

export function getRelationship(state: GameState, characterId: string): RelationshipState {
  return state.player.relationships[characterId] || DEFAULT_RELATIONSHIP;
}

export function getCharacterById(state: GameState, characterId: string): CharacterState | null {
  return state.characters.byId[characterId] || null;
}
