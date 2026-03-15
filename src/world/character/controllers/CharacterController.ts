import type { Character } from '../Character.ts';
import type { GridCell } from '../CharacterIdentity.ts';

export interface MovementCommand {
  destinationCell: GridCell;
  source: 'player_input' | 'ai';
}

export type CharacterIntent = { kind: 'move'; command: MovementCommand } | { kind: 'idle' };

/**
 * Controllers produce intents only. Movement systems consume intents and apply world updates.
 * This separation allows player and AI control to share movement execution paths.
 */
export abstract class CharacterController {
  public abstract issueIntent(character: Character): CharacterIntent | null;
}
