// @ts-nocheck
/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей.
 */
import { Cell } from '../spatial/cell/Cell.ts';

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

/** Нормализует `normalizeGridCell` в ходе выполнения связанного игрового сценария. */
export function normalizeGridCell(cell) {
  if (!cell || !isFiniteNumber(cell.x) || !isFiniteNumber(cell.z)) {
    return null;
  }

  return Cell.from(cell);
}

/** Создаёт и настраивает `createPathSignature` в ходе выполнения связанного игрового сценария. */
export function createPathSignature(startCell, destinationCell) {
  const start = normalizeGridCell(startCell);
  const destination = normalizeGridCell(destinationCell);
  if (!start || !destination) {
    return '';
  }
  return `${start.toKey()}>${destination.toKey()}`;
}

/** Выполняет `stepCellTowardsTarget` в ходе выполнения связанного игрового сценария. */
export function stepCellTowardsTarget(currentCell, targetCell) {
  const current = normalizeGridCell(currentCell);
  const target = normalizeGridCell(targetCell);
  if (!current || !target) {
    return null;
  }

  let nextX = current.x;
  let nextZ = current.z;

  if (target.x !== current.x) {
    nextX += Math.sign(target.x - current.x);
  } else if (target.z !== current.z) {
    nextZ += Math.sign(target.z - current.z);
  }

  return new Cell(nextX, nextZ);
}

/** Выполняет `areCellsEqual` в ходе выполнения связанного игрового сценария. */
export function areCellsEqual(a, b) {
  return Boolean(a && b && Cell.from(a).equals(b));
}

/** Определяет `resolveCellPath` в ходе выполнения связанного игрового сценария. */
export function resolveCellPath({ startCell, destinationCell, grid, findPathOptions }) {
  const start = normalizeGridCell(startCell);
  const destination = normalizeGridCell(destinationCell);
  if (!start || !destination) {
    return null;
  }

  if (typeof grid?.isCellWalkable === 'function' && !grid.isCellWalkable(destination)) {
    return null;
  }

  if (typeof grid?.findPath === 'function') {
    return grid.findPath(start, destination, findPathOptions);
  }

  return [start, destination];
}

/** Определяет `resolveWorldPositionFromCell` в ходе выполнения связанного игрового сценария. */
export function resolveWorldPositionFromCell({ cell, gridMapper, resolveGroundY, fallbackY = 0 }) {
  return gridMapper.gridCellToWorld(cell, {
    resolveY: ({ x, z }) => resolveGroundY?.({ x, z, fallbackY }) ?? fallbackY
  });
}

/** Собирает `buildWorldWaypointPath` в ходе выполнения связанного игрового сценария. */
export function buildWorldWaypointPath({ pathCells, gridMapper, resolveGroundY, fallbackY = 0 }) {
  if (!Array.isArray(pathCells) || pathCells.length <= 1) {
    return [];
  }

  return pathCells.slice(1).map((cell) => resolveWorldPositionFromCell({
    cell,
    gridMapper,
    resolveGroundY,
    fallbackY
  }));
}

/** Выполняет `isCellPathTraversalComplete` в ходе выполнения связанного игрового сценария. */
export function isCellPathTraversalComplete({ activeWaypointIndex = 0, waypoints = [] }) {
  return activeWaypointIndex >= waypoints.length;
}

/** Продвигает `advancePositionAlongWaypoints` в ходе выполнения связанного игрового сценария. */
export function advancePositionAlongWaypoints({
  position,
  waypoints,
  activeWaypointIndex,
  moveSpeed,
  deltaTimeSeconds,
  stopDistance
}) {
  if (!position || !Array.isArray(waypoints) || activeWaypointIndex >= waypoints.length) {
    return { activeWaypointIndex, reachedWaypoint: false, movementComplete: true };
  }

  const targetPosition = waypoints[activeWaypointIndex];
  const dx = targetPosition.x - position.x;
  const dy = targetPosition.y - position.y;
  const dz = targetPosition.z - position.z;
  const distanceToTarget = Math.hypot(dx, dy, dz);

  if (distanceToTarget <= stopDistance) {
    position.x = targetPosition.x;
    position.y = targetPosition.y;
    position.z = targetPosition.z;
    const nextWaypointIndex = activeWaypointIndex + 1;
    return {
      activeWaypointIndex: nextWaypointIndex,
      reachedWaypoint: true,
      movementComplete: nextWaypointIndex >= waypoints.length
    };
  }

  const stepDistance = Math.max(0, moveSpeed * Math.max(0, deltaTimeSeconds));
  const moveDistance = Math.min(stepDistance, distanceToTarget);
  const scale = distanceToTarget > 0 ? moveDistance / distanceToTarget : 0;

  position.x += dx * scale;
  position.y += dy * scale;
  position.z += dz * scale;

  return {
    activeWaypointIndex,
    reachedWaypoint: false,
    movementComplete: false
  };
}
