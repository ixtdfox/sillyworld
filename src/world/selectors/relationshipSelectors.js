export function getRelationship(state, characterId) {
  return state.player.relationships[characterId] || { level: 0, tags: [] };
}

export function getCharacterById(state, characterId) {
  return state.characters.byId[characterId] || null;
}
