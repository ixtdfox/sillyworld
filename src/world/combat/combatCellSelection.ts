export const COMBAT_MOVE_HIGHLIGHT_MESH_PREFIX = 'combatMoveHighlight_';

export interface CombatGridCellLike {
  x: number;
  z: number;
}

export interface CombatGridMapperLike {
  worldToGridCell: (position: { x: number; y?: number; z: number }) => CombatGridCellLike;
}

export function tryParseCellFromHighlightMeshName(meshName: unknown): CombatGridCellLike | null {
  if (typeof meshName !== 'string' || !meshName.startsWith(COMBAT_MOVE_HIGHLIGHT_MESH_PREFIX)) {
    return null;
  }

  const [x, z] = meshName.slice(COMBAT_MOVE_HIGHLIGHT_MESH_PREFIX.length).split('_').map((value) => Number.parseInt(value, 10));
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    return null;
  }

  return { x, z };
}

export function tryResolveCellFromPickResult(
  pickResult: any,
  gridMapper: CombatGridMapperLike
): CombatGridCellLike | null {
  if (!pickResult?.hit || !pickResult.pickedPoint) {
    return null;
  }

  const mesh = pickResult.pickedMesh ?? null;
  const metadataCell = mesh?.metadata?.combatGridCell ?? mesh?.metadata?.gridCell ?? null;
  if (metadataCell && Number.isFinite(metadataCell.x) && Number.isFinite(metadataCell.z)) {
    return {
      x: Math.trunc(metadataCell.x),
      z: Math.trunc(metadataCell.z)
    };
  }

  const meshNamedCell = tryParseCellFromHighlightMeshName(mesh?.name);
  if (meshNamedCell) {
    return meshNamedCell;
  }

  return gridMapper.worldToGridCell(pickResult.pickedPoint);
}
