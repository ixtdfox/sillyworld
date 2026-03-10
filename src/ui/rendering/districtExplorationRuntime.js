import { loadWorldScene } from './worldSceneLoader.js';
import { loadPlayerCharacter } from './playerCharacterLoader.js';
import { loadEnemyCharacter } from './enemyCharacterLoader.js';
import { spawnPlayerCharacter } from './playerSpawn.js';

const DEFAULT_ENEMY_SPAWN = Object.freeze({ x: 2, z: 2 });

function resolveGroundY({ runtime, x, z, fallbackY = 0 }) {
  const origin = new runtime.BABYLON.Vector3(x, fallbackY + 25, z);
  const ray = new runtime.BABYLON.Ray(origin, new runtime.BABYLON.Vector3(0, -1, 0), 200);

  const hit = runtime.scene.pickWithRay(ray, (mesh) => mesh?.isEnabled?.() && mesh.isVisible);
  return hit?.hit && hit.pickedPoint ? hit.pickedPoint.y : fallbackY;
}

function placeEnemyOnGround(runtime, enemyEntity, spawnPreset = DEFAULT_ENEMY_SPAWN) {
  if (!enemyEntity?.rootNode) {
    throw new Error('Cannot place enemy character without a root node.');
  }

  // TODO: replace static enemy spawn presets with district encounter data.
  const x = spawnPreset.x;
  const z = spawnPreset.z;
  const y = resolveGroundY({ runtime, x, z, fallbackY: 0 });

  enemyEntity.rootNode.position.copyFrom(new runtime.BABYLON.Vector3(x, y, z));
  return enemyEntity.rootNode.position;
}

export async function createDistrictExplorationRuntime(runtime, options = {}) {
  const districtScene = await loadWorldScene(runtime, {
    sceneFile: options.sceneFile,
    containerName: options.sceneContainerName ?? 'districtSceneRoot'
  });

  const playerEntity = await loadPlayerCharacter(runtime, {
    playerFile: options.playerFile
  });
  spawnPlayerCharacter(runtime, playerEntity);

  const enemyEntity = await loadEnemyCharacter(runtime, {
    enemyFile: options.enemyFile
  });
  placeEnemyOnGround(runtime, enemyEntity, options.enemySpawn);

  return {
    districtSceneRoot: districtScene.sceneContainer,
    districtScene,
    groundMesh: districtScene.groundMesh,
    playerEntity,
    playerMeshRoot: playerEntity.rootNode,
    enemyEntity,
    enemyMeshRoot: enemyEntity.rootNode
  };
}
