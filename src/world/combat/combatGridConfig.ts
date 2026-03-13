// @ts-nocheck
export const DEFAULT_COMBAT_GRID_CONFIG = Object.freeze({
  cellSize: 1.5,
  originWorldX: 0,
  originWorldZ: 0,
  minX: -8,
  maxX: 8,
  minZ: -8,
  maxZ: 8,
  blockedCells: []
});

export function resolveCombatGridConfig(options = {}) {
  return {
    cellSize: options.combatGridCellSize ?? DEFAULT_COMBAT_GRID_CONFIG.cellSize,
    originWorldX: options.combatGridOriginX ?? DEFAULT_COMBAT_GRID_CONFIG.originWorldX,
    originWorldZ: options.combatGridOriginZ ?? DEFAULT_COMBAT_GRID_CONFIG.originWorldZ,
    minX: options.combatGridMinX ?? DEFAULT_COMBAT_GRID_CONFIG.minX,
    maxX: options.combatGridMaxX ?? DEFAULT_COMBAT_GRID_CONFIG.maxX,
    minZ: options.combatGridMinZ ?? DEFAULT_COMBAT_GRID_CONFIG.minZ,
    maxZ: options.combatGridMaxZ ?? DEFAULT_COMBAT_GRID_CONFIG.maxZ,
    blockedCells: options.combatGridBlockedCells ?? DEFAULT_COMBAT_GRID_CONFIG.blockedCells
  };
}
