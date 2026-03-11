import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyEntityNormalization,
  resolveEntityNormalizationConfig,
  resolveEnemyNormalizationConfigId,
  resolvePlayerNormalizationConfigId
} from '../src/ui/rendering/entityNormalization.js';

test('resolves configured normalization entries', () => {
  const player = resolveEntityNormalizationConfig(resolvePlayerNormalizationConfigId());
  const enemy = resolveEntityNormalizationConfig(resolveEnemyNormalizationConfigId());

  assert.equal(player.entityId, 'player');
  assert.equal(enemy.archetypeId, 'enemy_humanoid_raider');
  assert.equal(typeof player.targetHeight, 'number');
  assert.equal(typeof enemy.attackRange, 'number');
});

test('throws when normalization config id is missing', () => {
  assert.throws(() => resolveEntityNormalizationConfig('missing_entity'), /Missing entity normalization config/);
});

test('applies scaling, ground offset and orientation correction', () => {
  const rootNode = {
    scaling: {
      value: 1,
      scaleInPlace(amount) {
        this.value *= amount;
      }
    },
    position: { y: 0 },
    rotation: null,
    computeWorldMatrix() {},
    getHierarchyBoundingVectors() {
      return {
        min: { y: 0 },
        max: { y: 2 }
      };
    }
  };

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

  applyEntityNormalization(runtime, { rootNode }, {
    targetHeight: 4,
    collisionRadius: 0.5,
    collisionHeight: 4,
    attackRange: 2,
    groundOffset: 0.25,
    orientationCorrection: {
      yawDegrees: 90
    }
  });

  assert.equal(rootNode.scaling.value, 2);
  assert.equal(rootNode.position.y, 0.25);
  assert.ok(rootNode.rotation);
  assert.equal(rootNode.rotation.y, Math.PI / 2);
});
