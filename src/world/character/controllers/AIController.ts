import type { Character } from '../Character.ts';
import type { GridCell } from '../CharacterIdentity.ts';
import { CharacterController, type CharacterIntent } from './CharacterController.ts';

/**
 * AIController adapts system behavior outputs into domain intents.
 * Decision logic can evolve independently while keeping a stable movement command interface.
 */
export class AIController extends CharacterController {
  readonly #resolveTarget: (character: Character) => GridCell | null;

  constructor(resolveTarget: (character: Character) => GridCell | null) {
    super();
    this.#resolveTarget = resolveTarget;
  }

  public issueIntent(character: Character): CharacterIntent | null {
    const destinationCell = this.#resolveTarget(character);
    if (!destinationCell) {
      return { kind: 'idle' };
    }

    return {
      kind: 'move',
      command: {
        destinationCell,
        source: 'ai'
      }
    };
  }
}
