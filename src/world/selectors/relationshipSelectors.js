const DEFAULT_RELATIONSHIP = Object.freeze({
  level: 0,
  tags: [],
  stance: "neutral",
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
function getRelationship(state, characterId) {
  return state.player.relationships[characterId] || DEFAULT_RELATIONSHIP;
}
function getCharacterById(state, characterId) {
  return state.characters.byId[characterId] || null;
}
export {
  DEFAULT_RELATIONSHIP,
  getCharacterById,
  getRelationship
};
