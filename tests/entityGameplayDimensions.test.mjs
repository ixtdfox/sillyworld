import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyEntityCollisionFromDimensions,
  createEntityGameplayDimensions
} from '../src/ui/rendering/entityGameplayDimensions.ts';

test('createEntityGameplayDimensions maps gameplay values from normalization config', () => {
  const dimensions = createEntityGameplayDimensions({
    collisionRadius: 0.6,
    collisionHeight: 2.2,
    attackRange: 1.75,
    interactionRadius: 2.5
  });

  assert.deepEqual(dimensions, {
    collisionRadius: 0.6,
    collisionHeight: 2.2,
    attackRange: 1.75,
    interactionRadius: 2.5
  });
});

test('createEntityGameplayDimensions falls back interactionRadius to attackRange', () => {
  const dimensions = createEntityGameplayDimensions({
    collisionRadius: 0.6,
    collisionHeight: 2.2,
    attackRange: 1.75
  });

  assert.equal(dimensions.interactionRadius, 1.75);
});

test('applyEntityCollisionFromDimensions sets ellipsoid from configured collision dimensions', () => {
  const rootNode = {};
  const runtime = {
    BABYLON: {
      Vector3: class Vector3 {
        constructor(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        }
      }
    }
  };

  applyEntityCollisionFromDimensions(runtime, rootNode, {
    collisionRadius: 0.8,
    collisionHeight: 2.4
  });

  assert.equal(rootNode.checkCollisions, true);
  assert.equal(rootNode.ellipsoid.x, 0.8);
  assert.equal(rootNode.ellipsoid.y, 1.2);
  assert.equal(rootNode.ellipsoid.z, 0.8);
  assert.equal(rootNode.ellipsoidOffset.x, 0);
  assert.equal(rootNode.ellipsoidOffset.y, 1.2);
  assert.equal(rootNode.ellipsoidOffset.z, 0);
});
