// @ts-nocheck
import { DEFAULT_WORLD_GRID_CONFIG, resolveWorldGridConfig } from '../spatial/worldGrid.ts';

export const DEFAULT_COMBAT_GRID_CONFIG = DEFAULT_WORLD_GRID_CONFIG;

export function resolveCombatGridConfig(options = {}) {
  return resolveWorldGridConfig(options);
}
