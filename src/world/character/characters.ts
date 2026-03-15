/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей.
 */
import type { CharacterState, CharactersState } from '../contracts.ts';
import { indexBy } from '../utils/object.ts';

/** Описывает тип `CharacterSeed`, который формализует структуру данных в модуле `world/character/characters`. */
type CharacterSeed = Partial<CharacterState>;
/** Описывает тип `CharactersSeed`, который формализует структуру данных в модуле `world/character/characters`. */
type CharactersSeed = Partial<CharactersState>;

/** Нормализует `normalizeCharacter` в ходе выполнения связанного игрового сценария. */
function normalizeCharacter(character: CharacterSeed = {}): CharacterState {
  const id = character.id ?? '';
  return {
    id,
    name: character.name ?? id,
    currentNodeId: character.currentNodeId ?? null,
    homeNodeId: character.homeNodeId ?? character.currentNodeId ?? null,
    meta: character.meta ?? {}
  };
}

/** Создаёт и настраивает `createDefaultCharacters` в ходе выполнения связанного игрового сценария. */
export function createDefaultCharacters(seed: CharacterSeed[] | CharactersSeed = []): CharactersState {
  const asArray: CharacterSeed[] = Array.isArray(seed) ? seed : Object.values(seed.byId ?? {});
  const normalized = asArray.map(normalizeCharacter);

  return {
    byId: Array.isArray(seed) ? indexBy(normalized, 'id') : (seed.byId ?? indexBy(normalized, 'id'))
  };
}
