import type { Character } from '../Character.ts';
import type { GridCell } from '../CharacterIdentity.ts';
import { CharacterController, type CharacterIntent } from './CharacterController.ts';

/**
 * PlayerController adapts already-collected user input into domain intents.
 * It never mutates transforms directly, so legacy and future movement executors can stay decoupled.
 */
export class PlayerController extends CharacterController {
  readonly #resolveTarget: () => GridCell | null;

  constructor(resolveTarget: () => GridCell | null) {
    super();
    this.#resolveTarget = resolveTarget;
  }

  public issueIntent(_character: Character): CharacterIntent | null {
    const destinationCell = this.#resolveTarget();
    if (!destinationCell) {
      return { kind: 'idle' };
    }

    return {
      kind: 'move',
      command: {
        destinationCell,
        source: 'player_input'
      }
    };
  }
}
