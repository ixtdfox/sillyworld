// @ts-nocheck
import { CombatCellPicker } from './input/CombatCellPicker.ts';

/**
 * Фасад указателя оставлен для совместимости с контроллерами движения/подсветки,
 * а сама логика извлечения клетки инкапсулирована в `CombatCellPicker`.
 */
const picker = new CombatCellPicker();

export function isCombatGuiPick(pickResult) {
  return picker.isCombatGuiPick(pickResult);
}

export function tryResolveCellFromPick(pickResult, gridMapper) {
  return picker.tryResolveCellFromPickResult(pickResult, gridMapper);
}

export function pickCombatCellAtPointer(runtime, gridMapper, pointerPickInfo = null) {
  return picker.pickCombatCellAtPointer(runtime, gridMapper, pointerPickInfo);
}
