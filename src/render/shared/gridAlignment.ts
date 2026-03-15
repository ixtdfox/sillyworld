// @ts-nocheck
/**
 * Модуль слоя render: отвечает за визуальное представление состояния мира, UI и отладочные оверлеи.
 */

export const GRID_ALIGNMENT_DEFAULTS = Object.freeze({
  positionTolerance: 0.05,
  maxCellSearchRadius: 8
});

/** Выполняет `toFiniteNumber` в ходе выполнения связанного игрового сценария. */
function toFiniteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

/** Создаёт и настраивает `createGroundedWorldPosition` в ходе выполнения связанного игрового сценария. */
function createGroundedWorldPosition({ gridMapper, cell, resolveY, fallbackY = 0 }) {
  return gridMapper.gridCellToWorld(cell, {
    resolveY: ({ x, z }) => (typeof resolveY === 'function' ? resolveY({ x, z, fallbackY }) : fallbackY),
    fallbackY
  });
}

/** Выполняет `compareCandidateCells` в ходе выполнения связанного игрового сценария. */
function compareCandidateCells(a, b) {
  if (a.distanceSq !== b.distanceSq) {
    return a.distanceSq - b.distanceSq;
  }
  if (a.manhattanDistance !== b.manhattanDistance) {
    return a.manhattanDistance - b.manhattanDistance;
  }
  if (a.cell.x !== b.cell.x) {
    return a.cell.x - b.cell.x;
  }
  return a.cell.z - b.cell.z;
}

/** Выполняет `validateActorAlignment` в ходе выполнения связанного игрового сценария. */
export function validateActorAlignment({ actor, gridMapper, resolveY, tolerance = GRID_ALIGNMENT_DEFAULTS.positionTolerance } = {}) {
  const worldPosition = actor?.rootNode?.position;
  if (!worldPosition || !gridMapper?.worldToGridCell || !gridMapper?.gridCellToWorld) {
    return { aligned: false, reason: 'invalid_input', targetCell: null, targetWorld: null, distance: Infinity };
  }

  const targetCell = gridMapper.worldToGridCell(worldPosition);
  const targetWorld = createGroundedWorldPosition({
    gridMapper,
    cell: targetCell,
    resolveY,
    fallbackY: toFiniteNumber(worldPosition.y, 0)
  });

  const dx = toFiniteNumber(worldPosition.x) - targetWorld.x;
  const dz = toFiniteNumber(worldPosition.z) - targetWorld.z;
  const distance = Math.hypot(dx, dz);

  return {
    aligned: distance <= Math.max(0, tolerance),
    reason: 'ok',
    targetCell,
    targetWorld,
    distance
  };
}

/** Выполняет `findNearestValidGridCell` в ходе выполнения связанного игрового сценария. */
export function findNearestValidGridCell({ worldPosition, gridMapper, isCellValid, maxSearchRadius = GRID_ALIGNMENT_DEFAULTS.maxCellSearchRadius } = {}) {
  if (!worldPosition || !gridMapper?.worldToGridCell) {
    return null;
  }

  const baseCell = gridMapper.worldToGridCell(worldPosition);
  const validator = typeof isCellValid === 'function' ? isCellValid : () => true;
  const radiusLimit = Math.max(0, Math.trunc(maxSearchRadius));

  const candidates = [];
  for (let radius = 0; radius <= radiusLimit; radius += 1) {
    for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
      for (let offsetZ = -radius; offsetZ <= radius; offsetZ += 1) {
        if (Math.max(Math.abs(offsetX), Math.abs(offsetZ)) !== radius) {
          continue;
        }

        const cell = { x: baseCell.x + offsetX, z: baseCell.z + offsetZ };
        if (!validator(cell)) {
          continue;
        }

        const dx = offsetX;
        const dz = offsetZ;
        candidates.push({
          cell,
          distanceSq: (dx * dx) + (dz * dz),
          manhattanDistance: Math.abs(dx) + Math.abs(dz)
        });
      }
    }

    if (candidates.length > 0) {
      candidates.sort(compareCandidateCells);
      return candidates[0].cell;
    }
  }

  return validator(baseCell) ? baseCell : null;
}

/** Выполняет `snapActorToGridCell` в ходе выполнения связанного игрового сценария. */
export function snapActorToGridCell({ runtime, actor, gridMapper, cell, resolveY, logger = console, reason = 'unspecified' } = {}) {
  const worldPosition = actor?.rootNode?.position;
  if (!runtime?.BABYLON?.Vector3 || !actor?.rootNode || !worldPosition || !gridMapper?.gridCellToWorld || !cell) {
    return null;
  }

  const originalWorldPosition = {
    x: toFiniteNumber(worldPosition.x),
    y: toFiniteNumber(worldPosition.y),
    z: toFiniteNumber(worldPosition.z)
  };
  const targetWorld = createGroundedWorldPosition({
    gridMapper,
    cell,
    resolveY,
    fallbackY: originalWorldPosition.y
  });

  actor.rootNode.position.copyFrom(new runtime.BABYLON.Vector3(targetWorld.x, targetWorld.y, targetWorld.z));
  actor.rootNode.gridCell = { ...cell };
  actor.gridCell = { ...cell };

  logger.debug?.('[SillyRPG] Actor snapped to grid cell.', {
    reason,
    originalWorldPosition,
    resolvedGridCell: { ...cell },
    finalSnappedWorldPosition: {
      x: actor.rootNode.position.x,
      y: actor.rootNode.position.y,
      z: actor.rootNode.position.z
    }
  });

  return {
    cell: { ...cell },
    worldPosition: {
      x: actor.rootNode.position.x,
      y: actor.rootNode.position.y,
      z: actor.rootNode.position.z
    }
  };
}

/** Выполняет `snapActorToNearestValidGridCell` в ходе выполнения связанного игрового сценария. */
export function snapActorToNearestValidGridCell({
  runtime,
  actor,
  gridMapper,
  isCellValid,
  resolveY,
  tolerance = GRID_ALIGNMENT_DEFAULTS.positionTolerance,
  maxSearchRadius = GRID_ALIGNMENT_DEFAULTS.maxCellSearchRadius,
  logger = console,
  reason = 'unspecified'
} = {}) {
  const alignment = validateActorAlignment({ actor, gridMapper, resolveY, tolerance });
  const worldPosition = actor?.rootNode?.position;

  if (!worldPosition || !gridMapper?.worldToGridCell) {
    return { snapped: false, reason: 'invalid_input', cell: null, worldPosition: null };
  }

  const nearestCell = findNearestValidGridCell({
    worldPosition,
    gridMapper,
    isCellValid,
    maxSearchRadius
  });

  if (!nearestCell) {
    logger.warn?.('[SillyRPG] Unable to resolve valid grid cell for actor alignment.', {
      reason,
      worldPosition: {
        x: worldPosition.x,
        y: worldPosition.y,
        z: worldPosition.z
      }
    });
    return { snapped: false, reason: 'no_valid_cell', cell: null, worldPosition: null };
  }

  const alignedToSameCell = alignment.aligned
    && alignment.targetCell?.x === nearestCell.x
    && alignment.targetCell?.z === nearestCell.z;

  if (alignedToSameCell) {
    actor.rootNode.gridCell = { ...nearestCell };
    actor.gridCell = { ...nearestCell };
    return {
      snapped: false,
      reason: 'already_aligned',
      cell: { ...nearestCell },
      worldPosition: {
        x: worldPosition.x,
        y: worldPosition.y,
        z: worldPosition.z
      }
    };
  }

  const snapResult = snapActorToGridCell({
    runtime,
    actor,
    gridMapper,
    cell: nearestCell,
    resolveY,
    logger,
    reason
  });

  return {
    snapped: true,
    reason: 'snapped',
    cell: snapResult?.cell ?? { ...nearestCell },
    worldPosition: snapResult?.worldPosition ?? null
  };
}
