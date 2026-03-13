import test from 'node:test';
import assert from 'node:assert/strict';

import { canEnemySeePlayer, updateEnemyPerception } from '../src/ui/rendering/enemyPerception.ts';

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
