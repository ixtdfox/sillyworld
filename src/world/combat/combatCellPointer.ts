// @ts-nocheck
/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей. Фокус файла — пошаговый бой: клетки, действия, очередь ходов или управление вводом в бою.
 */
import { tryResolveCellFromPickResult } from './combatCellSelection.ts';

/** Выполняет `isCombatGuiPick` в ходе выполнения связанного игрового сценария. */
export function isCombatGuiPick(pickResult) {
  return Boolean(pickResult?.pickedMesh?.metadata?.isCombatHudControl);
}

/** Выполняет `tryResolveCellFromPick` в ходе выполнения связанного игрового сценария. */
export function tryResolveCellFromPick(pickResult, gridMapper) {
  return tryResolveCellFromPickResult(pickResult, gridMapper);
}

/** Выполняет `pickCombatCellAtPointer` в ходе выполнения связанного игрового сценария. */
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
    cell: tryResolveCellFromPickResult(pickResult, gridMapper)
  };
}
