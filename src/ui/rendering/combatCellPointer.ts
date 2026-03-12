// @ts-nocheck
const HIGHLIGHT_MESH_PREFIX = 'combatMoveHighlight_';

function tryParseCellFromMeshName(meshName) {
  if (typeof meshName !== 'string' || !meshName.startsWith(HIGHLIGHT_MESH_PREFIX)) {
    return null;
  }

  const [x, z] = meshName.slice(HIGHLIGHT_MESH_PREFIX.length).split('_').map((value) => Number.parseInt(value, 10));
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    return null;
  }

  return { x, z };
}

export function isCombatGuiPick(pickResult) {
  return Boolean(pickResult?.pickedMesh?.metadata?.isCombatHudControl);
}

export function tryResolveCellFromPick(pickResult, gridMapper) {
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

  const meshNamedCell = tryParseCellFromMeshName(mesh?.name);
  if (meshNamedCell) {
    return meshNamedCell;
  }

  return gridMapper.worldToGridCell(pickResult.pickedPoint);
}

export function pickCombatCellAtPointer(runtime, gridMapper, pointerPickInfo = null) {
  const pickResult = pointerPickInfo?.hit
    ? pointerPickInfo
    : runtime.scene.pick(runtime.scene.pointerX, runtime.scene.pointerY);

  if (!pickResult?.hit || !pickResult.pickedPoint || isCombatGuiPick(pickResult)) {
    return {
      pickResult,
      cell: null
    };
  }

  return {
    pickResult,
    cell: tryResolveCellFromPick(pickResult, gridMapper)
  };
}
