import type { CharacterState, GameState, RelationshipState } from '../contracts.ts';

/** Константа `DEFAULT_RELATIONSHIP` хранит общие настройки/данные, которые переиспользуются в модуле `world/relationship/relationshipSelectors`. */
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

/** Возвращает `getRelationship` в ходе выполнения связанного игрового сценария. */
export function getRelationship(state: GameState, characterId: string): RelationshipState {
  return state.player.relationships[characterId] || DEFAULT_RELATIONSHIP;
}

/** Возвращает `getCharacterById` в ходе выполнения связанного игрового сценария. */
export function getCharacterById(state: GameState, characterId: string): CharacterState | null {
  return state.characters.byId[characterId] || null;
}
