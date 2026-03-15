import type { CharacterDisposition } from './CharacterDisposition.ts';
import { Character } from './Character.ts';

/**
 * Resolves player-facing disposition from character relationship state.
 * This keeps hostility checks centralized so scene/combat code can reason about
 * "hostile characters" without coupling to relationship storage details.
 */
export class CharacterHostilityRuntime {
  readonly #playerCharacterId: string;

  constructor(playerCharacterId: string) {
    this.#playerCharacterId = playerCharacterId;
  }

  public getCharacterDispositionTowardPlayer(character: Character): CharacterDisposition {
    return character.getRelations().getDispositionToward(this.#playerCharacterId);
  }

  public isHostileCharacter(character: Character): boolean {
    if (!character.isAlive()) {
      return false;
    }
    return this.getCharacterDispositionTowardPlayer(character) === 'hostile';
  }
}

export function getCharacterDispositionTowardPlayer(
  character: Character,
  playerCharacterId = 'player'
): CharacterDisposition {
  return new CharacterHostilityRuntime(playerCharacterId).getCharacterDispositionTowardPlayer(character);
}

export function isHostileCharacter(character: Character, playerCharacterId = 'player'): boolean {
  return new CharacterHostilityRuntime(playerCharacterId).isHostileCharacter(character);
}

