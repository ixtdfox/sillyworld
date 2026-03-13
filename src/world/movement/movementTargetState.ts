// @ts-nocheck

import { normalizeGridCell } from './gridMovement.ts';

export function createMovementTargetState() {
  let targetCell = null;

  return {
    getTarget: () => targetCell,
    hasTarget: () => Boolean(targetCell),
    setTarget: (nextTargetCell) => {
      targetCell = normalizeGridCell(nextTargetCell);
    },
    clearTarget: () => {
      targetCell = null;
    }
  };
}
