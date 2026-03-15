/**
 * Identity axis for character-domain objects.
 * This stays stable even when control ownership or relationships change at runtime.
 */
export type CharacterKind = 'player' | 'npc' | 'creature';

export interface CharacterIdentity {
  id: string;
  name: string;
  kind: CharacterKind;
}

export interface GridCell {
  x: number;
  z: number;
}
