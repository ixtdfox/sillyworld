import test from 'node:test';
import assert from 'node:assert/strict';

import { createWorldGridMapper } from '../src/world/spatial/worldGrid.ts';
import { Cell } from '../src/world/spatial/cell/Cell.ts';

test('maps world positions to grid and back with 1.5 cell size', () => {
  const mapper = createWorldGridMapper({ cellSize: 1.5, originWorldX: 0, originWorldZ: 0 });

  const cell = mapper.worldToGridCell({ x: -1.4, z: 1.6 });
  assert.deepEqual(cell, new Cell(-1, 1));

  const world = mapper.gridCellToWorld(cell, {
    resolveY: ({ x, z }) => x + z
  });
  assert.deepEqual(world, { x: -0.75, y: 1.5, z: 2.25 });
});

test('supports mapping to tile corners for grid edge rendering', () => {
  const mapper = createWorldGridMapper({ cellSize: 2, originWorldX: 10, originWorldZ: -4 });

  const center = mapper.gridCellToWorld({ x: 1, z: 2 });
  const corner = mapper.gridCellToWorld({ x: 1, z: 2 }, { anchor: 'corner' });

  assert.deepEqual(center, { x: 13, y: 0, z: 1 });
  assert.deepEqual(corner, { x: 12, y: 0, z: 0 });
});
