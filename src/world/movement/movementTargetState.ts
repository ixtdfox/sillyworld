// @ts-nocheck

import { normalizeGridCell } from './gridMovement.ts';

export function createMovementTargetState() {
  let targetCell = null;

  return {
    getTarget: () => targetCell,
    getTargetCell: () => targetCell,
    hasTarget: () => Boolean(targetCell),
    setTarget: (nextTargetCell) => {
      targetCell = normalizeGridCell(nextTargetCell);
    },
    setTargetCell: (nextTargetCell) => {
      targetCell = normalizeGridCell(nextTargetCell);
    },
    clearTarget: () => {
      targetCell = null;
    }
  };
}
