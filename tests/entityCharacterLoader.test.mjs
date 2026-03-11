import test from 'node:test';
import assert from 'node:assert/strict';

import { loadAndNormalizeEntityCharacter } from '../src/ui/rendering/entityCharacterLoader.js';

function createRootNode(sourceHeight = 2) {
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
        min: { y: 0 },
        max: { y: sourceHeight }
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

test('loadAndNormalizeEntityCharacter imports, resolves config, scales, and ground-aligns', async () => {
  globalThis.window = {
    location: { href: 'https://example.invalid/game/' },
    __SILLYRPG__: { EXT_BASE: 'https://example.invalid/game/' }
  };

  const rootNode = createRootNode(2);
  const runtime = {
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

  const entity = await loadAndNormalizeEntityCharacter(runtime, {
    entityLabel: 'Player',
    modelFile: 'assets/character.glb',
    normalizationConfigId: 'player'
  });

  assert.equal(entity.normalizationConfig.entityId, 'player');
  assert.equal(entity.gameplayDimensions.collisionRadius, 0.35);
  assert.equal(entity.gameplayDimensions.collisionHeight, 1.8);
  assert.equal(entity.gameplayDimensions.attackRange, 1.5);
  assert.equal(entity.gameplayDimensions.interactionRadius, 2);
  assert.equal(rootNode.checkCollisions, true);
  assert.equal(rootNode.ellipsoid.x, 0.35);
  assert.equal(rootNode.ellipsoid.y, 0.9);
  assert.equal(rootNode.ellipsoid.z, 0.35);
  assert.equal(rootNode.ellipsoidOffset.y, 0.9);
  assert.equal(rootNode.scaling.value, 0.9);
  assert.equal(rootNode.position.y, 0);
});

test('loadAndNormalizeEntityCharacter throws clear error when normalization config is missing', async () => {
  globalThis.window = {
    location: { href: 'https://example.invalid/game/' },
    __SILLYRPG__: { EXT_BASE: 'https://example.invalid/game/' }
  };

  const runtime = {
    scene: {},
    BABYLON: {
      SceneLoader: {
        ImportMeshAsync: async () => ({
          transformNodes: [createRootNode(2)],
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

  await assert.rejects(
    () => loadAndNormalizeEntityCharacter(runtime, {
      entityLabel: 'Enemy',
      modelFile: 'assets/enemy.glb',
      normalizationConfigId: 'missing_entity'
    }),
    /Missing entity normalization config for entity id: missing_entity/
  );
});
