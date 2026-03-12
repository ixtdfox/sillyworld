import test from 'node:test';
import assert from 'node:assert/strict';

import { loadEnemyCharacter } from '../src/ui/rendering/enemyCharacterLoader.ts';

function createRootNode({ minY = 0, maxY = 2 } = {}) {
  return {
    scaling: {
      value: 1,
      scaleInPlace(amount) {
        this.value *= amount;
      }
    },
    position: {
      x: 0,
      y: 0,
      z: 0,
      copyFrom(vector) {
        this.x = vector.x;
        this.y = vector.y;
        this.z = vector.z;
      }
    },
    rotation: null,
    computeWorldMatrix() {},
    getHierarchyBoundingVectors() {
      return {
        min: { y: minY },
        max: { y: maxY }
      };
    },
    getDescendants() {
      return [];
    },
    getChildMeshes() {
      return [];
    }
  };
}

function createRuntime(rootNode) {
  return {
    scene: {},
    BABYLON: {
      SceneLoader: {
        ImportMeshAsync: async () => ({
          transformNodes: [rootNode],
          meshes: [],
          skeletons: [],
          animationGroups: []
        })
      },
      Vector3: class Vector3 {
        constructor(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        }
      }
    }
  };
}

test('loadEnemyCharacter defaults to humanoid raider normalization', async () => {
  globalThis.window = {
    location: { href: 'https://example.invalid/game/' },
    __SILLYRPG__: { EXT_BASE: 'https://example.invalid/game/' }
  };

  const rootNode = createRootNode({ minY: 0, maxY: 2 });
  const enemy = await loadEnemyCharacter(createRuntime(rootNode));

  assert.equal(enemy.normalizationConfig.archetypeId, 'enemy_humanoid_raider');
  assert.equal(enemy.normalizationMetrics.targetHeight, 1.9);
  assert.equal(rootNode.scaling.value, 0.95);
  assert.equal(rootNode.position.y, 0);
});

test('loadEnemyCharacter supports stone golem archetype normalization', async () => {
  globalThis.window = {
    location: { href: 'https://example.invalid/game/' },
    __SILLYRPG__: { EXT_BASE: 'https://example.invalid/game/' }
  };

  const rootNode = createRootNode({ minY: 0, maxY: 2 });
  const enemy = await loadEnemyCharacter(createRuntime(rootNode), {
    enemyArchetypeId: 'monster_stone_golem'
  });

  assert.equal(enemy.normalizationConfig.archetypeId, 'monster_stone_golem');
  assert.equal(enemy.normalizationMetrics.targetHeight, 3.4);
  assert.equal(rootNode.scaling.value, 1.7);
  assert.ok(rootNode.rotation);
  assert.equal(rootNode.rotation.y, Math.PI);
});


test('loadEnemyCharacter throws for unknown enemy archetype ids', async () => {
  await assert.rejects(
    () => loadEnemyCharacter(createRuntime(createRootNode()), { enemyArchetypeId: 'unknown_enemy' }),
    /Unknown enemy archetype id: unknown_enemy/
  );
});
