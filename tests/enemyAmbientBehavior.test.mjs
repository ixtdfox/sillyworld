import test from 'node:test';
import assert from 'node:assert/strict';

import { createEnemyAmbientBehavior, updateEnemyAmbientBehavior } from '../src/world/enemy/enemyAmbientBehavior.ts';

function createEnemyRootNode(position = { x: 0, y: 0, z: 0 }) {
  return {
    position: { ...position },
    rotation: { x: 0, y: 0, z: 0 },
    rotationQuaternion: null,
    gridCell: { x: 0, z: 0 }
  };
}

function createGridMapper(cellSize = 1) {
  return {
    worldToGridCell: ({ x, z }) => ({
      x: Math.round(x / cellSize),
      z: Math.round(z / cellSize)
    })
  };
}

test('enemy ambient behavior transitions from idle to lookAround and rotates facing direction', () => {
  const behavior = createEnemyAmbientBehavior({ facingDirection: { x: 0, y: 0, z: 1 }, patrolPoints: [] });
  const enemyRootNode = createEnemyRootNode();

  updateEnemyAmbientBehavior({ enemyRootNode, behavior, deltaSeconds: 2 });
  const afterRotate = updateEnemyAmbientBehavior({ enemyRootNode, behavior, deltaSeconds: 0.5 });

  assert.equal(afterRotate.state, 'lookAround');
  assert.notEqual(Math.round(afterRotate.facingDirection.x * 1000) / 1000, 0);
  assert.notEqual(enemyRootNode.rotation.y, 0);
});

test('enemy patrol update emits destination intent without mutating enemy position', () => {
  const behavior = createEnemyAmbientBehavior({
    facingDirection: { x: 0, y: 0, z: -1 },
    patrolCells: [{ x: 1, z: 0 }],
    patrolStepIntervalSeconds: 0.1
  });
  const enemyRootNode = createEnemyRootNode({ x: 4.25, y: 0, z: 3.75 });

  updateEnemyAmbientBehavior({ enemyRootNode, behavior, deltaSeconds: 2, currentCell: { x: 0, z: 0 } });
  const duringPatrol = updateEnemyAmbientBehavior({ enemyRootNode, behavior, deltaSeconds: 2.5, currentCell: { x: 0, z: 0 } });

  assert.equal(duringPatrol.state, 'patrol');
  assert.deepEqual(duringPatrol.requestedDestinationCell, { x: 1, z: 0 });
  assert.deepEqual(enemyRootNode.position, { x: 4.25, y: 0, z: 3.75 });
  assert.ok(duringPatrol.facingDirection.x > 0);
});

test('enemy patrol resolves patrol points to cells and emits movement intent', () => {
  const behavior = createEnemyAmbientBehavior({
    patrolPoints: [{ x: 2.49, y: 0, z: -1.51 }],
    patrolStepIntervalSeconds: 1
  });
  const enemyRootNode = createEnemyRootNode({ x: 0.37, y: 0, z: -0.42 });
  const gridMapper = createGridMapper(1);

  updateEnemyAmbientBehavior({ enemyRootNode, behavior, deltaSeconds: 2, currentCell: { x: 0, z: 0 }, gridMapper });
  const result = updateEnemyAmbientBehavior({ enemyRootNode, behavior, deltaSeconds: 2.5, currentCell: { x: 0, z: 0 }, gridMapper });

  assert.deepEqual(behavior.patrolCells.map((cell) => ({ x: cell.x, z: cell.z })), [{ x: 2, z: -2 }]);
  assert.deepEqual({ x: result.requestedDestinationCell.x, z: result.requestedDestinationCell.z }, { x: 2, z: -2 });
});
