// @ts-nocheck
import { DEFAULT_COMBAT_GRID_CONFIG } from './combatGridConfig.ts';

export function createCombatGridMapper(options = {}) {
  const cellSize = options.cellSize ?? DEFAULT_COMBAT_GRID_CONFIG.cellSize;
  const originWorldX = options.originWorldX ?? 0;
  const originWorldZ = options.originWorldZ ?? 0;
  const halfCellSize = cellSize / 2;

  const worldToGridCell = (worldPosition) => ({
    x: Math.floor((worldPosition.x - originWorldX) / cellSize),
    z: Math.floor((worldPosition.z - originWorldZ) / cellSize)
  });

  const gridCellToWorld = (cell, transform = {}) => {
    // Cell coordinates address logical tiles; by default we resolve to tile centers.
    // Use anchor "corner" for grid lines / tile-edge geometry.
    const anchor = transform.anchor === 'corner' ? 'corner' : 'center';
    const anchorOffset = anchor === 'center' ? halfCellSize : 0;
    const x = originWorldX + cell.x * cellSize + anchorOffset;
    const z = originWorldZ + cell.z * cellSize + anchorOffset;
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
