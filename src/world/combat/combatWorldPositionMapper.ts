// @ts-nocheck
/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей. Фокус файла — пошаговый бой: клетки, действия, очередь ходов или управление вводом в бою.
 */

import { normalizeGridCell } from '../movement/gridMovement.ts';

/** Выполняет `toCell` в ходе выполнения связанного игрового сценария. */
function toCell(cell) {
  return normalizeGridCell(cell);
}

/** Выполняет `mapWorldPositionToCombatCell` в ходе выполнения связанного игрового сценария. */
export function mapWorldPositionToCombatCell({ unitId, worldPosition, gridMapper, grid, logger = console }) {
  if (!gridMapper || typeof gridMapper.worldToGridCell !== 'function') {
    throw new Error('[SillyRPG] Combat world-position mapping requires a grid mapper.');
  }

  if (!worldPosition || !Number.isFinite(worldPosition.x) || !Number.isFinite(worldPosition.z)) {
    logger.warn?.('[SillyRPG] Failed to map combat participant to grid: invalid world position.', {
      unitId: unitId ?? null,
      worldPosition: worldPosition ?? null
    });
    return { cell: null, mappedCell: null };
  }

  const mappedCell = toCell(gridMapper.worldToGridCell(worldPosition));
  const expectedSnappedWorld = gridMapper.gridCellToWorld(mappedCell, {
    fallbackY: Number.isFinite(worldPosition.y) ? worldPosition.y : 0
  });

  if (!grid) {
    return { cell: mappedCell, mappedCell, expectedSnappedWorld, isWalkable: true };
  }

  const isWalkable = grid.isCellWalkable(mappedCell);
  if (!isWalkable) {
    logger.error?.('[SillyRPG] Combat entry resolved to non-walkable tactical cell.', {
    unitId: unitId ?? null,
    worldPosition,
    mappedCell,
    expectedSnappedCellCenter: expectedSnappedWorld,
    gridBounds: grid.bounds ?? null
  });
  }

  return {
    cell: mappedCell,
    mappedCell,
    expectedSnappedWorld,
    isWalkable
  };
}

/** Выполняет `mapCombatParticipantsFromWorldPositions` в ходе выполнения связанного игрового сценария. */
export function mapCombatParticipantsFromWorldPositions({ participants = [], gridMapper, grid, logger = console }) {
  return participants.map((participant) => {
    const canonicalGridCell = participant?.entity?.gridCell;
    if (canonicalGridCell && Number.isFinite(canonicalGridCell.x) && Number.isFinite(canonicalGridCell.z)) {
      const normalizedCanonicalCell = toCell(canonicalGridCell);

      return {
        ...participant,
        mappedCell: normalizedCanonicalCell,
        initialCell: normalizedCanonicalCell,
        usedCanonicalGridCell: true
      };
    }

    const mapping = mapWorldPositionToCombatCell({
      unitId: participant?.id,
      worldPosition: participant?.entity?.rootNode?.position,
      gridMapper,
      grid,
      logger
    });

    return {
      ...participant,
      mappedCell: mapping.mappedCell,
      initialCell: mapping.cell
    };
  });
}
