// @ts-nocheck

function normalizeCell(cell) {
  if (!cell || !Number.isFinite(cell.x) || !Number.isFinite(cell.z)) {
    return null;
  }

  return {
    x: Math.trunc(cell.x),
    z: Math.trunc(cell.z)
  };
}

export function createMovementTargetState() {
  let targetCell = null;

  return {
    getTarget: () => targetCell,
    getTargetCell: () => targetCell,
    hasTarget: () => Boolean(targetCell),
    setTarget: (nextTargetCell) => {
      targetCell = normalizeCell(nextTargetCell);
    },
    setTargetCell: (nextTargetCell) => {
      targetCell = normalizeCell(nextTargetCell);
    },
    clearTarget: () => {
      targetCell = null;
    }
  };
}
