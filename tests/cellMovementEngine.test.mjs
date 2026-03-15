import test from 'node:test';
import assert from 'node:assert/strict';

import { CellMovementEngine } from '../src/world/movement/cellMovementEngine.ts';
import { Cell } from '../src/world/spatial/cell/Cell.ts';

class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  copyFrom(other) {
    this.x = other.x;
    this.y = other.y;
    this.z = other.z;
  }
}

function createGridMapper() {
  return {
    worldToGridCell: ({ x, z }) => new Cell(Math.floor(x), Math.floor(z)),
    gridCellToWorld: ({ x, z }, transform = {}) => ({
      x: x + 0.5,
      y: transform.resolveY ? transform.resolveY({ x: x + 0.5, z: z + 0.5 }) : 0,
      z: z + 0.5
    })
  };
}

test('resolves path and traverses waypoints to completion', () => {
  const events = [];
  const engine = new CellMovementEngine({
    gridMapper: createGridMapper(),
    resolveGroundY: ({ fallbackY = 0 }) => fallbackY,
    grid: {
      findPath: () => [new Cell(0, 0), new Cell(1, 0), new Cell(2, 0)],
      isCellWalkable: () => true
    },
    moveSpeed: 4,
    toVector3: ({ x, y, z }) => new Vector3(x, y, z),
    onLifecycleEvent: (event) => events.push(event.type)
  });

  const position = new Vector3(0.5, 0, 0.5);
  const queued = engine.queueMovement({
    currentCell: new Cell(0, 0),
    destinationCell: new Cell(2, 0),
    position,
    fallbackY: 0
  });

  assert.equal(queued.ok, true);
  assert.equal(engine.isMoving, true);

  for (let i = 0; i < 8; i += 1) {
    engine.tick({ position, deltaTimeSeconds: 0.25 });
  }

  assert.equal(engine.isMoving, false);
  assert.deepEqual(position, new Vector3(2.5, 0, 0.5));
  assert.deepEqual(events, ['movement_started', 'waypoint_reached', 'waypoint_reached', 'movement_completed']);
});

test('returns no-op for same-cell movement requests', () => {
  const engine = new CellMovementEngine({
    gridMapper: createGridMapper(),
    resolveGroundY: () => 0,
    toVector3: ({ x, y, z }) => new Vector3(x, y, z)
  });

  const position = new Vector3(1.25, 0, 1.25);
  const result = engine.queueMovement({
    currentCell: new Cell(1, 1),
    destinationCell: new Cell(1, 1),
    position,
    fallbackY: 0
  });

  assert.deepEqual(result, { ok: false, reason: 'same_cell' });
  assert.deepEqual(position, new Vector3(1.5, 0, 1.5));
});

test('rejects invalid destinations and unreachable paths', () => {
  const engine = new CellMovementEngine({
    gridMapper: createGridMapper(),
    resolveGroundY: () => 0,
    grid: {
      isCellWalkable: (cell) => cell.x < 3,
      findPath: () => null
    },
    toVector3: ({ x, y, z }) => new Vector3(x, y, z)
  });

  const position = new Vector3(0.5, 0, 0.5);
  const invalidResult = engine.queueMovement({
    currentCell: new Cell(0, 0),
    destinationCell: { x: Number.NaN, z: 1 },
    position,
    fallbackY: 0
  });
  assert.deepEqual(invalidResult, { ok: false, reason: 'invalid_cells' });

  const unreachableResult = engine.queueMovement({
    currentCell: new Cell(0, 0),
    destinationCell: new Cell(4, 0),
    position,
    fallbackY: 0
  });
  assert.deepEqual(unreachableResult, { ok: false, reason: 'path_not_found' });
});

test('uses pre-resolved path for compatibility callers', () => {
  let findPathCalls = 0;
  const engine = new CellMovementEngine({
    gridMapper: createGridMapper(),
    resolveGroundY: () => 0,
    grid: {
      isCellWalkable: () => true,
      findPath: () => {
        findPathCalls += 1;
        return [new Cell(0, 0), new Cell(2, 0)];
      }
    },
    moveSpeed: 8,
    toVector3: ({ x, y, z }) => new Vector3(x, y, z)
  });

  const position = new Vector3(0.5, 0, 0.5);
  const queued = engine.queueMovement({
    currentCell: new Cell(0, 0),
    destinationCell: new Cell(2, 0),
    resolvedPathCells: [new Cell(0, 0), new Cell(1, 0), new Cell(2, 0)],
    position,
    fallbackY: 0
  });
  assert.equal(queued.ok, true);
  assert.equal(findPathCalls, 0);
});
