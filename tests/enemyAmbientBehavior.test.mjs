import test from 'node:test';
import assert from 'node:assert/strict';

import { createEnemyAmbientBehavior, updateEnemyAmbientBehavior } from '../src/world/enemy/enemyAmbientBehavior.ts';

function createEnemyRootNode(position = { x: 0, y: 0, z: 0 }) {
  return {
    position: { ...position },
    rotation: { x: 0, y: 0, z: 0 },
    rotationQuaternion: null
  };
}

test('enemy ambient behavior transitions from idle to lookAround and rotates facing direction', () => {
  const behavior = createEnemyAmbientBehavior({ facingDirection: { x: 0, y: 0, z: 1 }, patrolPoints: [] });
  const enemyRootNode = createEnemyRootNode();

  updateEnemyAmbientBehavior({ enemyRootNode, behavior, deltaSeconds: 2, logger: console });
  const afterRotate = updateEnemyAmbientBehavior({ enemyRootNode, behavior, deltaSeconds: 0.5, logger: console });

  assert.equal(afterRotate.state, 'lookAround');
  assert.notEqual(Math.round(afterRotate.facingDirection.x * 1000) / 1000, 0);
  assert.notEqual(enemyRootNode.rotation.y, 0);
});

test('enemy ambient behavior patrol updates position and facing direction toward patrol target', () => {
  const behavior = createEnemyAmbientBehavior({
    facingDirection: { x: 0, y: 0, z: 1 },
    patrolPoints: [{ x: 3, y: 0, z: 0 }],
    patrolSpeed: 2
  });
  const enemyRootNode = createEnemyRootNode();

  updateEnemyAmbientBehavior({ enemyRootNode, behavior, deltaSeconds: 2, logger: console });
  updateEnemyAmbientBehavior({ enemyRootNode, behavior, deltaSeconds: 2, logger: console });
  const duringPatrol = updateEnemyAmbientBehavior({ enemyRootNode, behavior, deltaSeconds: 0.5, logger: console });

  assert.equal(duringPatrol.state, 'patrol');
  assert.ok(enemyRootNode.position.x > 0);
  assert.ok(duringPatrol.facingDirection.x > 0);
});
