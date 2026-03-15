// @ts-nocheck
import { DEFAULT_WORLD_GRID_CONFIG, resolveWorldGridConfig } from '../spatial/worldGrid.ts';

/** Константа `DEFAULT_COMBAT_GRID_CONFIG` хранит общие настройки/данные, которые переиспользуются в модуле `world/combat/combatGridConfig`. */
export const DEFAULT_COMBAT_GRID_CONFIG = DEFAULT_WORLD_GRID_CONFIG;

/** Определяет `resolveCombatGridConfig` в ходе выполнения связанного игрового сценария. */
export function resolveCombatGridConfig(options = {}) {
  return resolveWorldGridConfig(options);
}
