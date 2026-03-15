import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyEntityNormalization,
  createEntityNormalizationConfigStore,
  fitModelToHeight,
  getEntityNormalizationConfig,
  hasEntityNormalizationConfig,
  resolveEnemyNormalizationConfigId,
  resolveEntityNormalizationConfig,
  resolvePlayerNormalizationConfigId
} from '../src/render/shared/entityNormalization.ts';

test('resolves configured normalization entries', () => {
  const player = resolveEntityNormalizationConfig(resolvePlayerNormalizationConfigId());
  const enemy = resolveEntityNormalizationConfig(resolveEnemyNormalizationConfigId());

  assert.equal(player.entityId, 'player');
  assert.equal(enemy.archetypeId, 'enemy_humanoid_raider');
  assert.equal(typeof player.targetHeight, 'number');
  assert.equal(typeof enemy.attackRange, 'number');
});

test('supports has/get runtime config API', () => {
  assert.equal(hasEntityNormalizationConfig('player'), true);
  assert.equal(hasEntityNormalizationConfig('enemy_humanoid_raider'), true);
  assert.equal(hasEntityNormalizationConfig('missing_entity'), false);

  const byAlias = getEntityNormalizationConfig('enemy_humanoid_raider');
  assert.equal(byAlias.archetypeId, 'enemy_humanoid_raider');
});

test('throws when normalization config id is missing', () => {
  assert.throws(() => resolveEntityNormalizationConfig('missing_entity'), /Missing entity normalization config for entity id/);
});

test('normalizes optional fields during load', () => {
  const store = createEntityNormalizationConfigStore({
    test_npc: {
      targetHeight: 1,
      collisionRadius: 0.5,
      collisionHeight: 1.5,
      attackRange: 0
    }
  });

  const config = store.getEntityNormalizationConfig('test_npc');
  assert.equal(config.interactionRadius, 0);
  assert.equal(config.groundOffset, 0);
  assert.equal(config.orientationCorrection, null);
  assert.equal(config.debugLabel, 'test_npc');
});

test('validates required numeric field constraints with descriptive errors', () => {
  assert.throws(
    () => createEntityNormalizationConfigStore({ bad: { targetHeight: 0, collisionRadius: 1, collisionHeight: 1, attackRange: 1 } }),
    /field "targetHeight" must be > 0/
  );

  assert.throws(
    () => createEntityNormalizationConfigStore({ bad: { targetHeight: 1, collisionRadius: 0, collisionHeight: 1, attackRange: 1 } }),
    /field "collisionRadius" must be > 0/
  );

  assert.throws(
    () => createEntityNormalizationConfigStore({ bad: { targetHeight: 1, collisionRadius: 1, collisionHeight: 0, attackRange: 1 } }),
    /field "collisionHeight" must be > 0/
  );

  assert.throws(
    () => createEntityNormalizationConfigStore({ bad: { targetHeight: 1, collisionRadius: 1, collisionHeight: 1, attackRange: -1 } }),
    /field "attackRange" must be >= 0/
  );
});

test('validates orientationCorrection values', () => {
  assert.throws(
    () => createEntityNormalizationConfigStore({
      bad: {
        targetHeight: 1,
        collisionRadius: 1,
        collisionHeight: 1,
        attackRange: 0,
        orientationCorrection: 'wrong'
      }
    }),
    /orientationCorrection" must be an object/
  );
});

test('fitModelToHeight throws when measured height is invalid', () => {
  const rootNode = {
    scaling: {
      value: 1,
      scaleInPlace(amount) {
        this.value *= amount;
      }
    },
    computeWorldMatrix() {},
    getHierarchyBoundingVectors() {
      return {
        min: { y: 0 },
        max: { y: 0 }
      };
    },
    getDescendants() {
      return [];
    },
    getChildMeshes() {
      return [];
    }
  };

  assert.throws(
    () => fitModelToHeight(rootNode, 2, { debugLabel: 'test_entity' }),
    /Cannot fit model to height for test_entity: measured source height must be a finite number > 0/
  );
});

test('fitModelToHeight throws for invalid target height', () => {
  const rootNode = {
    scaling: {
      value: 1,
      scaleInPlace(amount) {
        this.value *= amount;
      }
    },
    computeWorldMatrix() {},
    getHierarchyBoundingVectors() {
      return {
        min: { y: 0 },
        max: { y: 2 }
      };
    },
    getDescendants() {
      return [];
    },
    getChildMeshes() {
      return [];
    }
  };

  assert.throws(
    () => fitModelToHeight(rootNode, 0),
    /targetHeight must be a finite number > 0/
  );
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

  const normalizationMetrics = applyEntityNormalization(runtime, { rootNode }, {
    targetHeight: 4,
    collisionRadius: 0.5,
    collisionHeight: 4,
    attackRange: 2,
    groundOffset: 0.25,
    orientationCorrection: {
      pitchDegrees: 0,
      yawDegrees: 90,
      rollDegrees: 0
    }
  });

  assert.equal(normalizationMetrics.targetHeight, 4);
  assert.equal(normalizationMetrics.sourceHeight, 2);
  assert.equal(normalizationMetrics.scaleFactor, 2);
  assert.equal(rootNode.scaling.value, 2);
  assert.equal(rootNode.position.y, 0.25);
  assert.ok(rootNode.rotation);
  assert.equal(rootNode.rotation.y, Math.PI / 2);
});
