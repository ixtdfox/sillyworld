// @ts-nocheck

function toCell(cell) {
  return {
    x: Math.trunc(cell.x),
    z: Math.trunc(cell.z)
  };
}

function getCellDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

function findNearestWalkableCell(grid, originCell, maxRadius = 4) {
  if (!grid || !originCell || !Number.isFinite(originCell.x) || !Number.isFinite(originCell.z)) {
    return null;
  }

  const start = toCell(originCell);
  if (grid.isCellWalkable(start)) {
    return start;
  }

  let best = null;
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let x = start.x - radius; x <= start.x + radius; x += 1) {
      for (let z = start.z - radius; z <= start.z + radius; z += 1) {
        const candidate = { x, z };
        if (!grid.isCellWalkable(candidate)) {
          continue;
        }

        if (!best || getCellDistance(start, candidate) < getCellDistance(start, best)) {
          best = candidate;
        }
      }
    }

    if (best) {
      return best;
    }
  }

  return null;
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

  if (!grid) {
    return { cell: mappedCell, mappedCell, usedFallback: false };
  }

  if (grid.isCellWalkable(mappedCell)) {
    return { cell: mappedCell, mappedCell, usedFallback: false };
  }

  const fallbackCell = findNearestWalkableCell(grid, mappedCell);
  logger.warn?.('[SillyRPG] Combat participant world position mapped to an invalid tactical cell.', {
    unitId: unitId ?? null,
    worldPosition,
    mappedCell,
    fallbackCell,
    gridBounds: grid.bounds ?? null
  });

  return {
    cell: fallbackCell,
    mappedCell,
    usedFallback: fallbackCell !== null
  };
}

export function mapCombatParticipantsFromWorldPositions({ participants = [], gridMapper, grid, logger = console }) {
  return participants.map((participant) => {
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
