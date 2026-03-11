import { DEFAULT_COMBAT_GRID_CONFIG } from './combatGridConfig.js';

export function createCombatGridMapper(options = {}) {
  const cellSize = options.cellSize ?? DEFAULT_COMBAT_GRID_CONFIG.cellSize;
  const originWorldX = options.originWorldX ?? 0;
  const originWorldZ = options.originWorldZ ?? 0;

  const worldToGridCell = (worldPosition) => ({
    x: Math.round((worldPosition.x - originWorldX) / cellSize),
    z: Math.round((worldPosition.z - originWorldZ) / cellSize)
  });

  const gridCellToWorld = (cell, transform = {}) => {
    const x = originWorldX + cell.x * cellSize;
    const z = originWorldZ + cell.z * cellSize;
    const y = typeof transform.resolveY === 'function' ? transform.resolveY({ x, z }) : (transform.fallbackY ?? 0);

    return { x, y, z };
  };

  return {
    cellSize,
    originWorldX,
    originWorldZ,
    worldToGridCell,
    gridCellToWorld
  };
}
