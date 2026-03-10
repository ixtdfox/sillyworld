import test from 'node:test';
import assert from 'node:assert/strict';

import { createCombatGrid } from '../src/ui/rendering/combatGrid.js';

test('findPath avoids blocked and occupied cells', () => {
  const grid = createCombatGrid({
    minX: 0,
    maxX: 4,
    minZ: 0,
    maxZ: 4,
    blockedCells: [{ x: 1, z: 0 }]
  });

  grid.setOccupied({ x: 1, z: 1 }, 'enemy_1');

  const path = grid.findPath({ x: 0, z: 0 }, { x: 2, z: 0 });
  assert.ok(path);
  assert.deepEqual(path, [
    { x: 0, z: 0 },
    { x: 0, z: 1 },
    { x: 0, z: 2 },
    { x: 1, z: 2 },
    { x: 2, z: 2 },
    { x: 2, z: 1 },
    { x: 2, z: 0 }
  ]);
});

test('moveOccupant updates occupancy map', () => {
  const grid = createCombatGrid({ minX: -1, maxX: 1, minZ: -1, maxZ: 1 });
  grid.setOccupied({ x: 0, z: 0 }, 'player_1');

  grid.moveOccupant({ x: 0, z: 0 }, { x: 0, z: 1 }, 'player_1');

  assert.equal(grid.getOccupiedUnitId({ x: 0, z: 0 }), null);
  assert.equal(grid.getOccupiedUnitId({ x: 0, z: 1 }), 'player_1');
});
