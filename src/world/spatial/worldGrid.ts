// @ts-nocheck
/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей.
 */

export const DEFAULT_WORLD_GRID_CONFIG = Object.freeze({
  cellSize: 1.5,
  originWorldX: 0,
  originWorldZ: 0,
  minX: -8,
  maxX: 8,
  minZ: -8,
  maxZ: 8,
  blockedCells: []
});

/** Определяет `resolveWorldGridConfig` в ходе выполнения связанного игрового сценария. */
export function resolveWorldGridConfig(options = {}) {
  return {
    cellSize: options.cellSize ?? options.worldGridCellSize ?? options.combatGridCellSize ?? DEFAULT_WORLD_GRID_CONFIG.cellSize,
    originWorldX: options.originWorldX ?? options.worldGridOriginX ?? options.combatGridOriginX ?? DEFAULT_WORLD_GRID_CONFIG.originWorldX,
    originWorldZ: options.originWorldZ ?? options.worldGridOriginZ ?? options.combatGridOriginZ ?? DEFAULT_WORLD_GRID_CONFIG.originWorldZ,
    minX: options.worldGridMinX ?? options.combatGridMinX ?? DEFAULT_WORLD_GRID_CONFIG.minX,
    maxX: options.worldGridMaxX ?? options.combatGridMaxX ?? DEFAULT_WORLD_GRID_CONFIG.maxX,
    minZ: options.worldGridMinZ ?? options.combatGridMinZ ?? DEFAULT_WORLD_GRID_CONFIG.minZ,
    maxZ: options.worldGridMaxZ ?? options.combatGridMaxZ ?? DEFAULT_WORLD_GRID_CONFIG.maxZ,
    blockedCells: options.worldGridBlockedCells ?? options.combatGridBlockedCells ?? DEFAULT_WORLD_GRID_CONFIG.blockedCells
  };
}

export function resolveCombatGridConfig(options = {}) {
  return {
    cellSize: options.cellSize ?? options.worldGridCellSize ?? options.combatGridCellSize ?? DEFAULT_WORLD_GRID_CONFIG.cellSize,
    originWorldX: options.originWorldX ?? options.worldGridOriginX ?? options.combatGridOriginX ?? DEFAULT_WORLD_GRID_CONFIG.originWorldX,
    originWorldZ: options.originWorldZ ?? options.worldGridOriginZ ?? options.combatGridOriginZ ?? DEFAULT_WORLD_GRID_CONFIG.originWorldZ,
    minX: options.worldGridMinX ?? options.combatGridMinX ?? DEFAULT_WORLD_GRID_CONFIG.minX,
    maxX: options.worldGridMaxX ?? options.combatGridMaxX ?? DEFAULT_WORLD_GRID_CONFIG.maxX,
    minZ: options.worldGridMinZ ?? options.combatGridMinZ ?? DEFAULT_WORLD_GRID_CONFIG.minZ,
    maxZ: options.worldGridMaxZ ?? options.combatGridMaxZ ?? DEFAULT_WORLD_GRID_CONFIG.maxZ,
    blockedCells: options.worldGridBlockedCells ?? options.combatGridBlockedCells ?? DEFAULT_WORLD_GRID_CONFIG.blockedCells
  };
}

/** Нормализует `normalizeCell` в ходе выполнения связанного игрового сценария. */
function normalizeCell(cell) {
  return {
    x: Math.trunc(cell.x),
    z: Math.trunc(cell.z)
  };
}

/** Создаёт и настраивает `createWorldGridMapper` в ходе выполнения связанного игрового сценария. */
export function createWorldGridMapper(options = {}) {
  const config = resolveWorldGridConfig(options);
  const halfCellSize = config.cellSize / 2;

  const worldToGridCell = (worldPosition) => normalizeCell({
    x: Math.floor((worldPosition.x - config.originWorldX) / config.cellSize),
    z: Math.floor((worldPosition.z - config.originWorldZ) / config.cellSize)
  });

  const gridCellToWorld = (cell, transform = {}) => {
    const anchor = transform.anchor === 'corner' ? 'corner' : 'center';
    const anchorOffset = anchor === 'center' ? halfCellSize : 0;
    const x = config.originWorldX + cell.x * config.cellSize + anchorOffset;
    const z = config.originWorldZ + cell.z * config.cellSize + anchorOffset;
    const y = typeof transform.resolveY === 'function' ? transform.resolveY({ x, z }) : (transform.fallbackY ?? 0);

    return { x, y, z };
  };

  return {
    ...config,
    worldToGridCell,
    gridCellToWorld,
    normalizeCell
  };
}
