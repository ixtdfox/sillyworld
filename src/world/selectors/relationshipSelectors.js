export const DEFAULT_RELATIONSHIP = Object.freeze({
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

export function getRelationship(state, characterId) {
  return state.player.relationships[characterId] || DEFAULT_RELATIONSHIP;
}

export function getCharacterById(state, characterId) {
  return state.characters.byId[characterId] || null;
}
