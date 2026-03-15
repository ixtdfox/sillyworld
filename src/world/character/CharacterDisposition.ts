import type { RelationshipState } from '../contracts.ts';

export type CharacterDisposition = 'hostile' | 'neutral' | 'friendly';

/**
 * Translation boundary between legacy persisted RelationshipState and the normalized
 * character-domain disposition model. Keeping conversion here avoids coupling CharacterRelations
 * to persistence contract details and gives one upgrade point for future schema changes.
 */
export function dispositionFromRelationshipState(
  relationship: RelationshipState | null | undefined
): CharacterDisposition {
  if (!relationship) {
    return 'neutral';
  }

  if (relationship.stance === 'hostile') {
    return 'hostile';
  }

  if (relationship.stance === 'friendly' || relationship.level >= 30) {
    return 'friendly';
  }

  if (relationship.level <= -30) {
    return 'hostile';
  }

  return 'neutral';
}
