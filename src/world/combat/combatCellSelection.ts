import { CombatCellPicker } from './input/CombatCellPicker.ts';

/**
 * Публичный префикс сохранён для рендер-модулей, которые подписывают highlight-меши
 * и ожидают прежний формат имени.
 */
export const COMBAT_MOVE_HIGHLIGHT_MESH_PREFIX = CombatCellPicker.MOVE_HIGHLIGHT_MESH_PREFIX;

export interface CombatGridCellLike {
  x: number;
  z: number;
}

export interface CombatGridMapperLike {
  worldToGridCell: (position: { x: number; y?: number; z: number }) => CombatGridCellLike;
}

const picker = new CombatCellPicker();

/**
 * Совместимый экспорт: старый функциональный API теперь делегирует реальному picker-объекту,
 * чтобы input-резолв клетки можно было эволюционировать в одном месте.
 */
export function tryParseCellFromHighlightMeshName(meshName: unknown): CombatGridCellLike | null {
  return picker.tryParseCellFromHighlightMeshName(meshName);
}

export function tryResolveCellFromPickResult(
  pickResult: any,
  gridMapper: CombatGridMapperLike
): CombatGridCellLike | null {
  return picker.tryResolveCellFromPickResult(pickResult, gridMapper);
}
