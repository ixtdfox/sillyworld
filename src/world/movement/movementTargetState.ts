// @ts-nocheck

import { normalizeGridCell } from './gridMovement.ts';

/** Создаёт и настраивает `createMovementTargetState` в ходе выполнения связанного игрового сценария. */
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
