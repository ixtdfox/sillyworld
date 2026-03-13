import test from 'node:test';
import assert from 'node:assert/strict';

import {
  advancePositionAlongWaypoints,
  areCellsEqual,
  buildWorldWaypointPath,
  resolveCellPath,
  stepCellTowardsTarget
} from '../src/world/movement/gridMovement.ts';

test('stepCellTowardsTarget moves one axis-aligned step toward destination', () => {
  assert.deepEqual(stepCellTowardsTarget({ x: 1, z: 1 }, { x: 3, z: 9 }), { x: 2, z: 1 });
  assert.deepEqual(stepCellTowardsTarget({ x: 3, z: 1 }, { x: 3, z: -1 }), { x: 3, z: 0 });
});

test('resolveCellPath falls back to direct path when no grid pathfinder exists', () => {
  const path = resolveCellPath({
    startCell: { x: 0, z: 0 },
    destinationCell: { x: 2, z: 0 },
    grid: { isCellWalkable: () => true }
  });

  assert.deepEqual(path, [{ x: 0, z: 0 }, { x: 2, z: 0 }]);
});

test('buildWorldWaypointPath resolves y via ground callback and advances incrementally', () => {
  const waypoints = buildWorldWaypointPath({
    pathCells: [{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 2, z: 0 }],
    gridMapper: {
      gridCellToWorld: ({ x, z }, transform = {}) => ({
        x,
        y: transform.resolveY ? transform.resolveY({ x, z }) : 0,
        z
      })
    },
    resolveGroundY: () => 0,
    fallbackY: -1
  });

  assert.deepEqual(waypoints, [{ x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }]);

  const position = { x: 0, y: 0, z: 0 };
  const stepOne = advancePositionAlongWaypoints({
    position,
    waypoints,
    activeWaypointIndex: 0,
    moveSpeed: 1,
    deltaTimeSeconds: 1,
    stopDistance: 0.01
  });

  assert.equal(stepOne.reachedWaypoint, false);
  assert.deepEqual(position, { x: 1, y: 0, z: 0 });

  const snapOne = advancePositionAlongWaypoints({
    position,
    waypoints,
    activeWaypointIndex: 0,
    moveSpeed: 1,
    deltaTimeSeconds: 1,
    stopDistance: 0.01
  });

  assert.equal(snapOne.reachedWaypoint, true);
  assert.equal(areCellsEqual({ x: 1, z: 0 }, { x: 1, z: 0 }), true);
});
