import type { GridCell } from './CharacterIdentity.ts';

/**
 * Runtime-only mutable state tracked by Character aggregate.
 * Rendering/scene data stays outside this object to keep migration incremental.
 */
export interface CharacterRuntimeState {
  cell: GridCell | null;
  currentNodeId: string | null;
  homeNodeId: string | null;
  hpCurrent: number;
}
