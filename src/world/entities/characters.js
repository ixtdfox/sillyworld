import { indexBy } from '../utils/object.js';

function normalizeCharacter(character = {}) {
  return {
    id: character.id,
    name: character.name || character.id,
    currentNodeId: character.currentNodeId || null,
    homeNodeId: character.homeNodeId || character.currentNodeId || null,
    meta: character.meta || {}
  };
}

export function createDefaultCharacters(seed = []) {
  const asArray = Array.isArray(seed) ? seed : Object.values(seed.byId || {});
  const normalized = asArray.map(normalizeCharacter);

  return {
    byId: seed.byId || indexBy(normalized, 'id')
  };
}
