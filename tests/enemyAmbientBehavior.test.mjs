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

function createGridMapper(cellSize = 1) {
  return {
    worldToGridCell: ({ x, z }) => ({
      x: Math.round(x / cellSize),
      z: Math.round(z / cellSize)
    }),
    gridCellToWorld: ({ x, z }, transform = {}) => ({
      x: x * cellSize,
      y: transform.resolveY ? transform.resolveY({ x: x * cellSize, z: z * cellSize }) : (transform.fallbackY ?? 0),
      z: z * cellSize
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

test('enemy patrol movement advances one grid cell at a time and updates facing', () => {
  const behavior = createEnemyAmbientBehavior({
    facingDirection: { x: 0, y: 0, z: -1 },
    patrolCells: [{ x: 1, z: 0 }],
    patrolStepIntervalSeconds: 0.1
  });
  const enemyRootNode = createEnemyRootNode();
  enemyRootNode.gridCell = { x: 0, z: 0 };
  const gridMapper = createGridMapper(1);

  updateEnemyAmbientBehavior({ enemyRootNode, behavior, deltaSeconds: 2, gridMapper });
  const duringPatrol = updateEnemyAmbientBehavior({ enemyRootNode, behavior, deltaSeconds: 2.5, gridMapper });

  assert.equal(duringPatrol.state, 'patrol');
  assert.equal(enemyRootNode.gridCell.x, 1);
  assert.equal(Math.abs(enemyRootNode.gridCell.z), 0);
  assert.equal(enemyRootNode.position.x, 1);
  assert.equal(Math.abs(enemyRootNode.position.z), 0);
  assert.ok(duringPatrol.facingDirection.x > 0);
});

test('enemy patrol resolves patrol points to cells and re-centers enemy to avoid drift', () => {
  const behavior = createEnemyAmbientBehavior({
    patrolPoints: [{ x: 2.49, y: 0, z: -1.51 }],
    patrolStepIntervalSeconds: 1
  });
  const enemyRootNode = createEnemyRootNode({ x: 0.37, y: 0, z: -0.42 });
  const gridMapper = createGridMapper(1);

  updateEnemyAmbientBehavior({ enemyRootNode, behavior, deltaSeconds: 2, gridMapper });
  updateEnemyAmbientBehavior({ enemyRootNode, behavior, deltaSeconds: 2.5, gridMapper });

  assert.deepEqual(behavior.patrolCells, [{ x: 2, z: -2 }]);
  assert.equal(enemyRootNode.gridCell.x, 1);
  assert.equal(Math.abs(enemyRootNode.gridCell.z), 0);
  assert.equal(enemyRootNode.position.x, 1);
  assert.equal(Math.abs(enemyRootNode.position.z), 0);
});
