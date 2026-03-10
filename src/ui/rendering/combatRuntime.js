import { loadWorldScene } from './worldSceneLoader.js';
import { loadPlayerCharacter } from './playerCharacterLoader.js';
import { loadEnemyCharacter } from './enemyCharacterLoader.js';
import { attachGameplayIsometricCamera } from './gameplayCameraController.js';
import { createCombatTurnManager } from './combatTurnManager.js';
import { createCombatGrid } from './combatGrid.js';
import { createCombatGridMapper } from './combatGridMapper.js';
import { createPlayerAnimationController } from './playerAnimationController.js';
import { attachCombatPlayerMovementController } from './combatPlayerMovementController.js';

const COMBAT_SCENE_FILE = 'assets/combat.glb';
const DEFAULT_PLAYER_SPAWN = Object.freeze({ x: -1.5, y: 0, z: 1.5 });
const DEFAULT_ENEMY_SPAWN = Object.freeze({ x: 1.5, y: 0, z: -1.5 });
const DEFAULT_AP_PER_TURN = 2;
const DEFAULT_MP_PER_TURN = 6;

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

function createCombatUnit(id, team, entity, initiative = 0) {
  return {
    id,
    team,
    initiative,
    maxAp: DEFAULT_AP_PER_TURN,
    maxMp: DEFAULT_MP_PER_TURN,
    ap: DEFAULT_AP_PER_TURN,
    mp: DEFAULT_MP_PER_TURN,
    gridCell: null,
    rootNode: entity.rootNode,
    meshes: entity.meshes,
    skeletons: entity.skeletons,
    animationGroups: entity.animationGroups
  };
}

function createCombatState({ combatScene, playerUnit, enemyUnit, turnManager }) {
  const turnState = turnManager.getState();

  return {
    mode: 'combat',
    phase: turnState.phase,
    combatScene,
    units: {
      player: playerUnit,
      enemy: enemyUnit
    },
    turn: turnState
  };
}

export async function createCombatRuntime(runtime, options = {}) {
  const combatScene = await loadWorldScene(runtime, {
    sceneFile: options.sceneFile ?? COMBAT_SCENE_FILE,
    containerName: options.sceneContainerName ?? 'combatSceneRoot'
  });

  const playerEntity = await loadPlayerCharacter(runtime, { playerFile: options.playerFile });
  const enemyEntity = await loadEnemyCharacter(runtime, { enemyFile: options.enemyFile });

  const gridMapper = createCombatGridMapper({
    cellSize: options.combatGridCellSize ?? 1.5,
    originWorldX: options.combatGridOriginX ?? 0,
    originWorldZ: options.combatGridOriginZ ?? 0
  });
  const grid = createCombatGrid({
    minX: options.combatGridMinX ?? -8,
    maxX: options.combatGridMaxX ?? 8,
    minZ: options.combatGridMinZ ?? -8,
    maxZ: options.combatGridMaxZ ?? 8,
    blockedCells: options.combatGridBlockedCells ?? []
  });

  placeOnGround(runtime, playerEntity.rootNode, options.playerSpawn ?? DEFAULT_PLAYER_SPAWN);
  placeOnGround(runtime, enemyEntity.rootNode, options.enemySpawn ?? DEFAULT_ENEMY_SPAWN);

  const playerUnit = createCombatUnit('player_1', 'player', playerEntity, options.playerInitiative ?? 100);
  const enemyUnit = createCombatUnit('enemy_1', 'enemy', enemyEntity, options.enemyInitiative ?? 10);

  playerUnit.gridCell = gridMapper.worldToGridCell(playerUnit.rootNode.position);
  enemyUnit.gridCell = gridMapper.worldToGridCell(enemyUnit.rootNode.position);
  grid.setOccupied(playerUnit.gridCell, playerUnit.id);
  grid.setOccupied(enemyUnit.gridCell, enemyUnit.id);

  const turnManager = createCombatTurnManager([playerUnit, enemyUnit]);
  const combatState = createCombatState({ combatScene, playerUnit, enemyUnit, turnManager });

  combatState.grid = grid;
  combatState.gridMapper = gridMapper;
  combatState.getActiveUnit = () => {
    const activeTurnUnit = turnManager.getActiveUnit();
    if (!activeTurnUnit) {
      return null;
    }
    return combatState.units.player.id === activeTurnUnit.unitId ? combatState.units.player : combatState.units.enemy;
  };

  const resetUnitResourcesForTurn = (unit) => {
    unit.ap = unit.maxAp;
    unit.mp = unit.maxMp;
  };

  const syncTurnState = () => {
    combatState.turn = turnManager.getState();
    combatState.phase = combatState.turn.phase;
  };

  const startTurn = () => {
    turnManager.startTurn();
    const activeUnit = combatState.getActiveUnit();
    if (activeUnit) {
      resetUnitResourcesForTurn(activeUnit);
    }
    syncTurnState();
  };

  const endTurn = () => {
    turnManager.endTurn();
    turnManager.advanceToNextUnit();
    startTurn();
  };

  const runEnemyTurnsIfNeeded = () => {
    let safetyCounter = 0;

    while (turnManager.getActiveUnit()?.team === 'enemy' && safetyCounter < combatState.turn.orderedUnits.length) {
      endTurn();
      safetyCounter += 1;
    }
  };

  combatState.startCombat = () => {
    turnManager.startCombat();
    startTurn();
    runEnemyTurnsIfNeeded();
    syncTurnState();
    return combatState.turn;
  };

  combatState.endActiveTurn = () => {
    endTurn();
    runEnemyTurnsIfNeeded();
    syncTurnState();
    return combatState.turn;
  };

  combatState.startCombat();

  const playerAnimationController = createPlayerAnimationController(playerEntity);
  const detachCombatMovementController = attachCombatPlayerMovementController(runtime, {
    combatState,
    playerUnit,
    grid,
    gridMapper,
    resolveGroundY: ({ x, z }) => resolveGroundY({ runtime, x, z, fallbackY: playerUnit.rootNode.position.y }),
    onMovingStateChange: (isMoving) => playerAnimationController.setMoving(isMoving)
  });

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
      detachCombatMovementController?.();
      enemyEntity.rootNode?.dispose(false, true);
      playerEntity.rootNode?.dispose(false, true);
      combatScene.sceneContainer?.dispose(false, true);
    }
  };
}
