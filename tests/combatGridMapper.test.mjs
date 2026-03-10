import test from 'node:test';
import assert from 'node:assert/strict';

import { createCombatGridMapper } from '../src/ui/rendering/combatGridMapper.js';

test('maps world positions to grid and back with 1.5 cell size', () => {
  const mapper = createCombatGridMapper({ cellSize: 1.5, originWorldX: 0, originWorldZ: 0 });

  const cell = mapper.worldToGridCell({ x: -1.4, z: 1.6 });
  assert.deepEqual(cell, { x: -1, z: 1 });

  const world = mapper.gridCellToWorld(cell, {
    resolveY: ({ x, z }) => x + z
  });
  assert.deepEqual(world, { x: -1.5, y: 0, z: 1.5 });
});
