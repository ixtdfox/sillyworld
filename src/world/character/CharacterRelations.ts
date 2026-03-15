import type { RelationshipState } from '../contracts.ts';
import { dispositionFromRelationshipState, type CharacterDisposition } from './CharacterDisposition.ts';

/**
 * CharacterRelations isolates social state from identity/control so hostility can change without
 * changing what a character is or who controls it.
 */
export class CharacterRelations {
  readonly #selfId: string;
  readonly #relationshipsByTargetId: Map<string, RelationshipState>;

  constructor(selfId: string, relationshipsByTargetId: Record<string, RelationshipState> = {}) {
    this.#selfId = selfId;
    this.#relationshipsByTargetId = new Map(Object.entries(relationshipsByTargetId));
  }

  public getSelfId(): string {
    return this.#selfId;
  }

  public setRelationship(targetId: string, relationship: RelationshipState): void {
    this.#relationshipsByTargetId.set(targetId, relationship);
  }

  public getRelationship(targetId: string): RelationshipState | null {
    return this.#relationshipsByTargetId.get(targetId) ?? null;
  }

  public getDispositionToward(targetId: string): CharacterDisposition {
    return dispositionFromRelationshipState(this.getRelationship(targetId));
  }

  public isHostileToward(targetId: string): boolean {
    return this.getDispositionToward(targetId) === 'hostile';
  }
}
