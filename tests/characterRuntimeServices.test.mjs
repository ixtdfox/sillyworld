import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CharacterAnimationController,
  CharacterRuntime,
  CharacterRuntimeFactory,
  CharacterSpawner
} from '../src/world/character/characterRuntimeServices.ts';
import { loadPlayerCharacter } from '../src/world/player/playerCharacterLoader.ts';
import { loadEnemyCharacter } from '../src/world/enemy/enemyCharacterLoader.ts';
import { spawnPlayerCharacter } from '../src/world/player/playerSpawn.ts';

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

function createRuntime(rootNode) {
  return {
    scene: {
      getMeshByName: () => null,
      getNodeByName: () => null,
      pickWithRay: () => null
    },
    BABYLON: {
      SceneLoader: {
        ImportMeshAsync: async () => ({
          transformNodes: [rootNode],
          meshes: [],
          skeletons: [],
          animationGroups: [{ name: 'idle_loop' }]
        })
      },
      Vector3: class Vector3 {
        constructor(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        }
      },
      Ray: class Ray {
        constructor(origin, direction, length) {
          this.origin = origin;
          this.direction = direction;
          this.length = length;
        }
      }
    }
  };
}

test('CharacterRuntimeFactory creates CharacterRuntime with normalized scene data and metadata', async () => {
  globalThis.window = {
    location: { href: 'https://example.invalid/game/' },
    __SILLYRPG__: { EXT_BASE: 'https://example.invalid/game/' }
  };

  const runtime = createRuntime(createRootNode());
  const factory = new CharacterRuntimeFactory(runtime);
  const characterRuntime = await factory.createCharacterRuntime({
    entityLabel: 'Player',
    modelFile: 'assets/character.glb',
    normalizationConfigId: 'player',
    runtimeMetadata: {
      role: 'player',
      controllerId: 'player_input',
      archetypeId: 'player_default'
    }
  });

  assert.ok(characterRuntime instanceof CharacterRuntime);
  assert.equal(characterRuntime.normalizationConfig.entityId, 'player');
  assert.equal(characterRuntime.runtimeMetadata.role, 'player');
  assert.equal(characterRuntime.runtimeMetadata.controllerId, 'player_input');
  assert.equal(characterRuntime.runtimeMetadata.archetypeId, 'player_default');
});

test('CharacterSpawner snaps world spawn requests to grid-centered world coordinates', () => {
  const runtime = createRuntime(createRootNode());
  const gridMapper = {
    worldToGridCell: ({ x, z }) => ({ x: Math.floor(x), z: Math.floor(z) }),
    gridCellToWorld: (cell, transform = {}) => ({
      x: cell.x + 0.5,
      y: (transform.resolveY ? transform.resolveY({ x: cell.x + 0.5, z: cell.z + 0.5 }) : 0),
      z: cell.z + 0.5
    })
  };
  const spawner = new CharacterSpawner(runtime, { gridMapper });

  const placement = spawner.resolveSpawnPlacement({
    spawn: { x: 4.8, z: -2.1 },
    resolveY: () => 3
  });

  assert.deepEqual(placement.spawnCell, { x: 4, z: -3 });
  assert.equal(placement.spawnPosition.x, 4.5);
  assert.equal(placement.spawnPosition.y, 3);
  assert.equal(placement.spawnPosition.z, -2.5);
});

test('CharacterRuntime.placeAt and CharacterSpawner.spawn keep runtime and node cells in sync', () => {
  const runtime = createRuntime(createRootNode());
  const characterRuntime = new CharacterRuntime({
    rootNode: createRootNode(),
    normalizationConfig: {},
    normalizationMetrics: {},
    gameplayDimensions: {},
    normalizationDebug: {},
    meshes: [],
    skeletons: [],
    animationGroups: []
  }, {});
  const spawner = new CharacterSpawner(runtime, {
    gridMapper: {
      worldToGridCell: ({ x, z }) => ({ x: Math.round(x), z: Math.round(z) }),
      gridCellToWorld: (cell) => ({ x: cell.x + 0.5, y: 0, z: cell.z + 0.5 })
    }
  });

  const spawnPosition = spawner.spawn(characterRuntime, {
    spawn: { x: 1.2, z: 2.6 }
  });

  assert.deepEqual(characterRuntime.gridCell, { x: 1, z: 3 });
  assert.deepEqual(characterRuntime.rootNode.gridCell, { x: 1, z: 3 });
  assert.deepEqual(characterRuntime.runtimeMetadata.lastSpawnCell, { x: 1, z: 3 });
  assert.equal(spawnPosition.x, 1.5);
  assert.equal(spawnPosition.y, 0);
  assert.equal(spawnPosition.z, 3.5);
});

test('CharacterAnimationController initializes shared animation runtime bookkeeping', () => {
  const characterRuntime = new CharacterRuntime({
    rootNode: createRootNode(),
    normalizationConfig: {},
    normalizationMetrics: {},
    gameplayDimensions: {},
    normalizationDebug: {},
    meshes: [],
    skeletons: [],
    animationGroups: [{ name: 'Idle' }, { name: 'Run' }]
  }, {});

  const animationController = new CharacterAnimationController(characterRuntime);
  const result = animationController.initialize({ defaultState: 'idle' });

  assert.equal(result.animationGroups.length, 2);
  assert.deepEqual(characterRuntime.runtimeMetadata.animationGroupNames, ['Idle', 'Run']);
  assert.equal(characterRuntime.runtimeMetadata.animationState, 'idle');

  animationController.setState('walking');
  assert.equal(characterRuntime.runtimeMetadata.animationState, 'walking');
});

test('player/enemy compatibility wrappers return CharacterRuntime instances with role metadata', async () => {
  globalThis.window = {
    location: { href: 'https://example.invalid/game/' },
    __SILLYRPG__: { EXT_BASE: 'https://example.invalid/game/' }
  };

  const player = await loadPlayerCharacter(createRuntime(createRootNode()));
  const enemy = await loadEnemyCharacter(createRuntime(createRootNode()));

  assert.ok(player instanceof CharacterRuntime);
  assert.ok(enemy instanceof CharacterRuntime);
  assert.equal(player.runtimeMetadata.role, 'player');
  assert.equal(player.runtimeMetadata.controllerId, 'player_input');
  assert.equal(player.runtimeMetadata.animationState, 'idle');

  assert.equal(enemy.runtimeMetadata.role, 'enemy');
  assert.equal(enemy.runtimeMetadata.controllerId, 'enemy_ai');
  assert.equal(enemy.runtimeMetadata.animationState, 'idle');
});

test('spawnPlayerCharacter remains a compatibility wrapper over CharacterSpawner', () => {
  const runtime = createRuntime(createRootNode());
  const gridMapper = {
    worldToGridCell: ({ x, z }) => ({ x: Math.floor(x), z: Math.floor(z) }),
    gridCellToWorld: (cell) => ({ x: cell.x + 0.5, y: 0, z: cell.z + 0.5 })
  };

  const playerCharacter = new CharacterRuntime({
    rootNode: createRootNode(),
    normalizationConfig: {},
    normalizationMetrics: {},
    gameplayDimensions: {},
    normalizationDebug: {},
    meshes: [],
    skeletons: [],
    animationGroups: []
  }, {});

  const spawnPosition = spawnPlayerCharacter(runtime, playerCharacter, {
    gridMapper,
    spawn: { x: 8.2, z: 4.9 }
  });

  assert.deepEqual(playerCharacter.gridCell, { x: 8, z: 4 });
  assert.equal(spawnPosition.x, 8.5);
  assert.equal(spawnPosition.y, 0);
  assert.equal(spawnPosition.z, 4.5);
});
