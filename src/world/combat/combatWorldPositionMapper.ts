// @ts-nocheck

import { normalizeGridCell } from '../movement/gridMovement.ts';

function toCell(cell) {
  return normalizeGridCell(cell);
}

export function mapWorldPositionToCombatCell({ unitId, worldPosition, gridMapper, grid, logger = console }) {
  if (!gridMapper || typeof gridMapper.worldToGridCell !== 'function') {
    throw new Error('[SillyRPG] Combat world-position mapping requires a grid mapper.');
  }

  if (!worldPosition || !Number.isFinite(worldPosition.x) || !Number.isFinite(worldPosition.z)) {
    logger.warn?.('[SillyRPG] Failed to map combat participant to grid: invalid world position.', {
      unitId: unitId ?? null,
      worldPosition: worldPosition ?? null
    });
    return { cell: null, mappedCell: null, usedFallback: false };
  }

  const mappedCell = toCell(gridMapper.worldToGridCell(worldPosition));
  const expectedSnappedWorld = gridMapper.gridCellToWorld(mappedCell, {
    fallbackY: Number.isFinite(worldPosition.y) ? worldPosition.y : 0
  });

  logger.info?.('[SillyRPG] Combat entry world/grid mapping resolved.', {
    unitId: unitId ?? null,
    worldPosition: {
      x: worldPosition.x,
      y: worldPosition.y,
      z: worldPosition.z
    },
    resolvedCell: mappedCell,
    expectedSnappedCellCenter: expectedSnappedWorld
  });

  if (!grid) {
    return { cell: mappedCell, mappedCell, expectedSnappedWorld, usedFallback: false, isWalkable: true };
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

  console.assert(isWalkable, '[SillyRPG] Combat entry expected mapped tactical cell to be walkable.', {
    unitId: unitId ?? null,
    worldPosition,
    mappedCell,
    expectedSnappedCellCenter: expectedSnappedWorld,
    gridBounds: grid.bounds ?? null
  });

  return {
    cell: mappedCell,
    mappedCell,
    expectedSnappedWorld,
    usedFallback: false,
    isWalkable
  };
}

export function mapCombatParticipantsFromWorldPositions({ participants = [], gridMapper, grid, logger = console }) {
  return participants.map((participant) => {
    const canonicalGridCell = participant?.entity?.gridCell;
    if (canonicalGridCell && Number.isFinite(canonicalGridCell.x) && Number.isFinite(canonicalGridCell.z)) {
      const normalizedCanonicalCell = toCell(canonicalGridCell);

      logger.info?.('[SillyRPG] Combat participant registered from canonical grid cell.', {
        participantId: participant?.id ?? null,
        role: participant?.role ?? null,
        team: participant?.team ?? null,
        canonicalGridCell: normalizedCanonicalCell
      });

      return {
        ...participant,
        mappedCell: normalizedCanonicalCell,
        initialCell: normalizedCanonicalCell,
        usedFallbackCell: false,
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

    logger.info?.('[SillyRPG] Combat participant registered from world position.', {
      participantId: participant?.id ?? null,
      role: participant?.role ?? null,
      team: participant?.team ?? null,
      worldPosition: participant?.entity?.rootNode?.position
        ? {
            x: participant.entity.rootNode.position.x,
            y: participant.entity.rootNode.position.y,
            z: participant.entity.rootNode.position.z
          }
        : null,
      mappedCell: mapping.mappedCell,
      assignedCell: mapping.cell,
      expectedSnappedCellCenter: mapping.expectedSnappedWorld,
      isWalkable: mapping.isWalkable,
      usedFallbackCell: mapping.usedFallback
    });

    return {
      ...participant,
      mappedCell: mapping.mappedCell,
      initialCell: mapping.cell,
      usedFallbackCell: mapping.usedFallback
    };
  });
}
