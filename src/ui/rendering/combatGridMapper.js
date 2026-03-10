const DEFAULT_CELL_SIZE = 1.5;

export function createCombatGridMapper(options = {}) {
  const cellSize = options.cellSize ?? DEFAULT_CELL_SIZE;
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
    worldToGridCell,
    gridCellToWorld
  };
}
