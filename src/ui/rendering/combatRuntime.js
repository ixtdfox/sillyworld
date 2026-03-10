import { loadWorldScene } from './worldSceneLoader.js';
import { loadPlayerCharacter } from './playerCharacterLoader.js';
import { loadEnemyCharacter } from './enemyCharacterLoader.js';
import { attachGameplayIsometricCamera } from './gameplayCameraController.js';

const COMBAT_SCENE_FILE = 'assets/combat.glb';
const DEFAULT_PLAYER_SPAWN = Object.freeze({ x: -1.5, y: 0, z: 1.5 });
const DEFAULT_ENEMY_SPAWN = Object.freeze({ x: 1.5, y: 0, z: -1.5 });

function resolveGroundY({ runtime, x, z, fallbackY = 0 }) {
  const origin = new runtime.BABYLON.Vector3(x, fallbackY + 25, z);
  const ray = new runtime.BABYLON.Ray(origin, new runtime.BABYLON.Vector3(0, -1, 0), 200);
  const hit = runtime.scene.pickWithRay(ray, (mesh) => mesh?.isEnabled?.() && mesh.isVisible);
  return hit?.hit && hit.pickedPoint ? hit.pickedPoint.y : fallbackY;
}

function placeOnGround(runtime, rootNode, spawn) {
  const y = resolveGroundY({ runtime, x: spawn.x, z: spawn.z, fallbackY: spawn.y ?? 0 });
  rootNode.position.copyFrom(new runtime.BABYLON.Vector3(spawn.x, y, spawn.z));
}

function createCombatUnit(id, team, entity) {
  return {
    id,
    team,
    rootNode: entity.rootNode,
    meshes: entity.meshes,
    skeletons: entity.skeletons,
    animationGroups: entity.animationGroups
  };
}

function createCombatState({ combatScene, playerUnit, enemyUnit }) {
  return {
    mode: 'combat',
    phase: 'start',
    combatScene,
    units: {
      player: playerUnit,
      enemy: enemyUnit
    },
    turn: {
      order: [playerUnit.id, enemyUnit.id],
      activeUnitId: playerUnit.id,
      round: 1
    }
  };
}

export async function createCombatRuntime(runtime, options = {}) {
  const combatScene = await loadWorldScene(runtime, {
    sceneFile: options.sceneFile ?? COMBAT_SCENE_FILE,
    containerName: options.sceneContainerName ?? 'combatSceneRoot'
  });

  const playerEntity = await loadPlayerCharacter(runtime, { playerFile: options.playerFile });
  const enemyEntity = await loadEnemyCharacter(runtime, { enemyFile: options.enemyFile });

  placeOnGround(runtime, playerEntity.rootNode, options.playerSpawn ?? DEFAULT_PLAYER_SPAWN);
  placeOnGround(runtime, enemyEntity.rootNode, options.enemySpawn ?? DEFAULT_ENEMY_SPAWN);

  const playerUnit = createCombatUnit('player_1', 'player', playerEntity);
  const enemyUnit = createCombatUnit('enemy_1', 'enemy', enemyEntity);
  const combatState = createCombatState({ combatScene, playerUnit, enemyUnit });

  const detachCamera = attachGameplayIsometricCamera(runtime, playerEntity.rootNode, {
    distance: 12,
    elevationDegrees: 50,
    yawDegrees: -35,
    targetHeight: 1.1
  });

  return {
    combatState,
    combatScene,
    playerUnit,
    enemyUnit,
    dispose: () => {
      detachCamera?.();
      enemyEntity.rootNode?.dispose(false, true);
      playerEntity.rootNode?.dispose(false, true);
      combatScene.sceneContainer?.dispose(false, true);
    }
  };
}
