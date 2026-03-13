import test from 'node:test';
import assert from 'node:assert/strict';

import { canEnemySeePlayer, getEnemyVisionCoverage, updateEnemyPerception } from '../src/ui/rendering/enemyPerception.ts';

function actor({ x, y = 0, z, perception, facingDirection } = {}) {
  return {
    id: 'actor',
    rootNode: { position: { x, y, z } },
    perception,
    facingDirection
  };
}

test('canEnemySeePlayer detects player within distance and FOV', () => {
  const enemy = actor({ x: 0, z: 0, perception: { visionAngleDegrees: 90, visionDistance: 8 }, facingDirection: { x: 0, y: 0, z: 1 } });
  const player = actor({ x: 0, z: 5 });

  const result = canEnemySeePlayer(enemy, player);

  assert.equal(result.canSeePlayer, true);
  assert.equal(result.reason, 'detected');
});

test('canEnemySeePlayer reports out-of-range when player exceeds vision distance', () => {
  const enemy = actor({ x: 0, z: 0, perception: { visionAngleDegrees: 120, visionDistance: 3 }, facingDirection: { x: 0, y: 0, z: 1 } });
  const player = actor({ x: 0, z: 4 });

  const result = canEnemySeePlayer(enemy, player);

  assert.equal(result.canSeePlayer, false);
  assert.equal(result.reason, 'out-of-range');
});

test('canEnemySeePlayer reports outside-fov when player is behind enemy', () => {
  const enemy = actor({ x: 0, z: 0, perception: { visionAngleDegrees: 60, visionDistance: 10 }, facingDirection: { x: 0, y: 0, z: 1 } });
  const player = actor({ x: 0, z: -5 });

  const result = canEnemySeePlayer(enemy, player);

  assert.equal(result.canSeePlayer, false);
  assert.equal(result.reason, 'outside-fov');
});

test('canEnemySeePlayer supports optional line-of-sight callback', () => {
  const enemy = actor({ x: 0, z: 0, perception: { visionAngleDegrees: 120, visionDistance: 10 }, facingDirection: { x: 0, y: 0, z: 1 } });
  const player = actor({ x: 0, z: 4 });

  const blocked = canEnemySeePlayer(enemy, player, {
    hasLineOfSight: () => false
  });

  assert.equal(blocked.canSeePlayer, false);
  assert.equal(blocked.reason, 'blocked-line-of-sight');
});

test('updateEnemyPerception runs same detection result', () => {
  const enemy = actor({ x: 0, z: 0, perception: { visionAngleDegrees: 90, visionDistance: 8 }, facingDirection: { x: 0, y: 0, z: 1 } });
  const player = actor({ x: 0, z: 5 });

  const result = updateEnemyPerception(enemy, player);
  assert.equal(result.canSeePlayer, true);
  assert.equal(result.reason, 'detected');
});

test('getEnemyVisionCoverage returns visible cells from the same FOV constraints', () => {
  const enemy = actor({ x: 0, z: 0, perception: { visionAngleDegrees: 90, visionDistance: 2 }, facingDirection: { x: 0, y: 0, z: 1 } });
  const mapper = {
    cellSize: 1,
    worldToGridCell: ({ x, z }) => ({ x: Math.floor(x), z: Math.floor(z) }),
    gridCellToWorld: ({ x, z }) => ({ x: x + 0.5, y: 0, z: z + 0.5 })
  };

  const coverage = getEnemyVisionCoverage(enemy, mapper);
  const visibleKeys = new Set(coverage.visibleCells.map((cell) => `${cell.x},${cell.z}`));

  assert.equal(visibleKeys.has('0,1'), true);
  assert.equal(visibleKeys.has('0,-1'), false);
});

test('getEnemyVisionCoverage surfaces blocked cells when LOS callback blocks target cell', () => {
  const enemy = actor({ x: 0, z: 0, perception: { visionAngleDegrees: 180, visionDistance: 3 }, facingDirection: { x: 0, y: 0, z: 1 } });
  const mapper = {
    cellSize: 1,
    worldToGridCell: ({ x, z }) => ({ x: Math.floor(x), z: Math.floor(z) }),
    gridCellToWorld: ({ x, z }) => ({ x: x + 0.5, y: 0, z: z + 0.5 })
  };

  const coverage = getEnemyVisionCoverage(enemy, mapper, {
    hasLineOfSight: ({ targetPosition }) => !(Math.floor(targetPosition.x) === 0 && Math.floor(targetPosition.z) === 2)
  });
  const blockedKeys = new Set(coverage.blockedCells.map((cell) => `${cell.x},${cell.z}`));

  assert.equal(blockedKeys.has('0,2'), true);
});
