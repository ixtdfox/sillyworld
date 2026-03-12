import type { CharacterState, CharactersState } from '../contracts.ts';
import { indexBy } from '../utils/object.ts';

type CharacterSeed = Partial<CharacterState>;
type CharactersSeed = Partial<CharactersState>;

function normalizeCharacter(character: CharacterSeed = {}): CharacterState {
  return {
    id: character.id || '',
    name: character.name || character.id,
    currentNodeId: character.currentNodeId || null,
    homeNodeId: character.homeNodeId || character.currentNodeId || null,
    meta: character.meta || {}
  };
}

export function createDefaultCharacters(seed: CharacterSeed[] | CharactersSeed = []): CharactersState {
  const asArray: CharacterSeed[] = Array.isArray(seed) ? seed : Object.values(seed.byId || {});
  const normalized = asArray.map(normalizeCharacter);

  return {
    byId: Array.isArray(seed) ? indexBy(normalized, 'id') : (seed.byId || indexBy(normalized, 'id'))
  };
}
