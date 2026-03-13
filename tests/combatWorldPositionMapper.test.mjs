import test from 'node:test';
import assert from 'node:assert/strict';

import { createCombatGridMapper } from '../src/world/combat/combatGridMapper.ts';
import { createCombatGrid } from '../src/world/combat/combatGrid.ts';
import { mapCombatParticipantsFromWorldPositions, mapWorldPositionToCombatCell } from '../src/world/combat/combatWorldPositionMapper.ts';

test('maps a world position to a valid tactical cell', () => {
  const mapper = createCombatGridMapper({ cellSize: 2, originWorldX: 0, originWorldZ: 0 });
  const grid = createCombatGrid({ minX: -2, maxX: 2, minZ: -2, maxZ: 2 });

  const result = mapWorldPositionToCombatCell({
    unitId: 'player_1',
    worldPosition: { x: 1.2, y: 0, z: -1.1 },
    gridMapper: mapper,
    grid,
    logger: { warn() {} }
  });

  assert.deepEqual(result, {
    cell: { x: 0, z: -1 },
    mappedCell: { x: 0, z: -1 },
    usedFallback: false,
    isWalkable: true,
    expectedSnappedWorld: { x: 1, y: 0, z: -1 }
  });
});

test('keeps mapped cell and flags non-walkable when mapped cell is blocked', () => {
  const mapper = createCombatGridMapper({ cellSize: 1, originWorldX: 0, originWorldZ: 0 });
  const grid = createCombatGrid({
    minX: -1,
    maxX: 1,
    minZ: -1,
    maxZ: 1,
    blockedCells: [{ x: 0, z: 0 }]
  });

  const result = mapWorldPositionToCombatCell({
    unitId: 'enemy_1',
    worldPosition: { x: 0.2, y: 0, z: 0.2 },
    gridMapper: mapper,
    grid,
    logger: { warn() {} }
  });

  assert.deepEqual(result.mappedCell, { x: 0, z: 0 });
  assert.equal(result.usedFallback, false);
  assert.deepEqual(result.cell, { x: 0, z: 0 });
  assert.equal(result.isWalkable, false);
});

test('registers participants with mapped initial cells', () => {
  const mapper = createCombatGridMapper({ cellSize: 1, originWorldX: 0, originWorldZ: 0 });
  const grid = createCombatGrid({ minX: -4, maxX: 4, minZ: -4, maxZ: 4 });
  const participants = mapCombatParticipantsFromWorldPositions({
    participants: [
      {
        id: 'player_1',
        role: 'player',
        team: 'player',
        entity: { rootNode: { position: { x: -1.3, y: 0, z: 2.8 } } }
      },
      {
        id: 'enemy_1',
        role: 'detecting_enemy',
        team: 'enemy',
        entity: { rootNode: { position: { x: 1.1, y: 0, z: 2.2 } } }
      }
    ],
    gridMapper: mapper,
    grid,
    logger: { warn() {}, info() {} }
  });

  assert.equal(participants.length, 2);
  assert.deepEqual(participants[0].initialCell, { x: -2, z: 2 });
  assert.deepEqual(participants[1].initialCell, { x: 1, z: 2 });
});
