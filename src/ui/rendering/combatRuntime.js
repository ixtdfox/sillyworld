import { loadWorldScene } from './worldSceneLoader.js';
import { loadPlayerCharacter } from './playerCharacterLoader.js';
import { loadEnemyCharacter } from './enemyCharacterLoader.js';
import { attachGameplayIsometricCamera } from './gameplayCameraController.js';
import { createCombatTurnManager } from './combatTurnManager.js';
import { createCombatGrid } from './combatGrid.js';
import { createCombatGridMapper } from './combatGridMapper.js';
import { createPlayerAnimationController } from './playerAnimationController.js';
import { attachCombatPlayerMovementController } from './combatPlayerMovementController.js';
import { createCombatActionResolver } from './combatActionResolver.js';
import { attachCombatAttackInputController } from './combatAttackInputController.js';
import { resolveOrCreateSceneCamera } from './babylonRuntime.js';
import { createCombatDebugHud } from './combatDebugHud.js';
import { resolveCombatGridConfig } from './combatGridConfig.js';
import { createCombatGridOverlayRenderer } from './combatGridOverlayRenderer.js';
import { createCombatMovementRangeHighlighter } from './combatMovementRangeHighlighter.js';

const COMBAT_SCENE_FILE = 'assets/combat.glb';
const DEFAULT_PLAYER_SPAWN = Object.freeze({ x: -1.5, y: 0, z: 1.5 });
const DEFAULT_ENEMY_SPAWN = Object.freeze({ x: 1.5, y: 0, z: -1.5 });
const DEFAULT_AP_PER_TURN = 2;
const DEFAULT_MP_PER_TURN = 6;
const DEFAULT_HP = 20;
const DEFAULT_BASIC_ATTACK_DAMAGE = 4;
const DEFAULT_FALLBACK_ATTACK_RANGE = 1;

function resolveMovementCostRule(options = {}) {
  return typeof options.movementCost === 'function' ? options.movementCost : undefined;
}

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

function createCombatUnit(id, team, entity, initiative = 0, displayName = id) {
  const attackRange = entity?.gameplayDimensions?.attackRange;

  return {
    id,
    displayName,
    team,
    initiative,
    maxAp: DEFAULT_AP_PER_TURN,
    maxMp: DEFAULT_MP_PER_TURN,
    maxHp: DEFAULT_HP,
    hp: DEFAULT_HP,
    isAlive: true,
    attackRange: Number.isFinite(attackRange) ? attackRange : DEFAULT_FALLBACK_ATTACK_RANGE,
    attackPower: DEFAULT_BASIC_ATTACK_DAMAGE,
    ap: DEFAULT_AP_PER_TURN,
    mp: DEFAULT_MP_PER_TURN,
    gridCell: null,
    gameplayDimensions: entity.gameplayDimensions,
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

  resolveOrCreateSceneCamera(runtime, {
    preferredCameras: combatScene.cameras,
    fallbackCameraName: 'combatFallbackCamera',
    fallbackPosition: options.fallbackCameraPosition ?? { x: 0, y: 11, z: -12 },
    fallbackTarget: options.fallbackCameraTarget ?? { x: 0, y: 0, z: 0 }
  });

  const playerEntity = await loadPlayerCharacter(runtime, {
    playerFile: options.playerFile,
    playerNormalizationId: options.playerNormalizationId
  });
  const enemyEntity = await loadEnemyCharacter(runtime, {
    enemyFile: options.enemyFile,
    enemyNormalizationId: options.enemyNormalizationId,
    enemyArchetypeId: options.enemyArchetypeId
  });

  const combatGridConfig = resolveCombatGridConfig(options);

  const gridMapper = createCombatGridMapper({
    cellSize: combatGridConfig.cellSize,
    originWorldX: combatGridConfig.originWorldX,
    originWorldZ: combatGridConfig.originWorldZ
  });
  const grid = createCombatGrid({
    minX: combatGridConfig.minX,
    maxX: combatGridConfig.maxX,
    minZ: combatGridConfig.minZ,
    maxZ: combatGridConfig.maxZ,
    blockedCells: combatGridConfig.blockedCells
  });

  placeOnGround(runtime, playerEntity.rootNode, options.playerSpawn ?? DEFAULT_PLAYER_SPAWN);
  placeOnGround(runtime, enemyEntity.rootNode, options.enemySpawn ?? DEFAULT_ENEMY_SPAWN);

  const playerUnit = createCombatUnit('player_1', 'player', playerEntity, options.playerInitiative ?? 100, 'Player');
  const enemyUnit = createCombatUnit('enemy_1', 'enemy', enemyEntity, options.enemyInitiative ?? 10, 'Enemy');

  playerUnit.gridCell = gridMapper.worldToGridCell(playerUnit.rootNode.position);
  enemyUnit.gridCell = gridMapper.worldToGridCell(enemyUnit.rootNode.position);
  grid.setOccupied(playerUnit.gridCell, playerUnit.id);
  grid.setOccupied(enemyUnit.gridCell, enemyUnit.id);

  const turnManager = createCombatTurnManager([playerUnit, enemyUnit]);
  const actionResolver = createCombatActionResolver({
    basicAttackApCost: options.basicAttackApCost ?? 1,
    basicAttackDamage: options.basicAttackDamage ?? DEFAULT_BASIC_ATTACK_DAMAGE
  });
  const combatState = createCombatState({ combatScene, playerUnit, enemyUnit, turnManager });
  combatState.status = 'active';
  combatState.result = null;
  combatState.inputMode = 'move';

  combatState.grid = grid;
  combatState.gridMapper = gridMapper;
  combatState.getActiveUnit = () => {
    const activeTurnUnit = turnManager.getActiveUnit();
    if (!activeTurnUnit) {
      return null;
    }
    return combatState.units.player.id === activeTurnUnit.unitId ? combatState.units.player : combatState.units.enemy;
  };

  combatState.setInputMode = (inputMode) => {
    if (inputMode !== 'move' && inputMode !== 'attack') {
      return combatState.inputMode;
    }

    combatState.inputMode = inputMode;
    return combatState.inputMode;
  };

  const resetUnitResourcesForTurn = (unit) => {
    if (!unit?.isAlive) {
      return;
    }
    unit.ap = unit.maxAp;
    unit.mp = unit.maxMp;
  };

  const syncTurnState = () => {
    combatState.turn = turnManager.getState();
    combatState.phase = combatState.turn.phase;
  };

  const startTurn = () => {
    if (combatState.status !== 'active') {
      return;
    }

    if (!combatState.getActiveUnit()?.isAlive) {
      turnManager.endTurn();
      turnManager.advanceToNextUnit();
    }

    turnManager.startTurn();
    const activeUnit = combatState.getActiveUnit();
    if (activeUnit) {
      resetUnitResourcesForTurn(activeUnit);
    }
    syncTurnState();
  };

  const endTurn = () => {
    if (combatState.status !== 'active') {
      return;
    }
    turnManager.endTurn();
    turnManager.advanceToNextUnit();
    startTurn();
  };

  const evaluateAndFinalizeCombat = () => {
    const outcome = actionResolver.evaluateCombatOutcome(Object.values(combatState.units));
    if (!outcome.ended) {
      return outcome;
    }

    combatState.status = 'ended';
    combatState.result = outcome.result;
    combatState.phase = 'combat_end';
    return outcome;
  };

  combatState.tryBasicAttack = ({ attackerId, targetId }) => {
    const attacker = Object.values(combatState.units).find((unit) => unit.id === attackerId) ?? null;
    const target = Object.values(combatState.units).find((unit) => unit.id === targetId) ?? null;
    const activeUnitId = turnManager.getActiveUnit()?.unitId ?? null;

    const result = actionResolver.resolveBasicAttack({ attacker, target, activeUnitId });
    if (!result.success) {
      return result;
    }

    if (result.targetDied && target?.gridCell) {
      combatState.grid.clearOccupied(target.gridCell);
    }

    const outcome = evaluateAndFinalizeCombat();
    return {
      ...result,
      combatResult: outcome.result
    };
  };

  const runEnemyAction = () => {
    const activeUnit = combatState.getActiveUnit();
    if (!activeUnit || activeUnit.team !== 'enemy' || combatState.status !== 'active') {
      return;
    }

    combatState.tryBasicAttack({
      attackerId: activeUnit.id,
      targetId: playerUnit.id
    });
  };

  const runEnemyTurnsIfNeeded = () => {
    let safetyCounter = 0;

    while (
      combatState.status === 'active'
      && turnManager.getActiveUnit()?.team === 'enemy'
      && safetyCounter < combatState.turn.orderedUnits.length
    ) {
      runEnemyAction();
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
    if (combatState.status !== 'active') {
      return combatState.turn;
    }

    endTurn();
    runEnemyTurnsIfNeeded();
    syncTurnState();
    return combatState.turn;
  };

  combatState.startCombat();

  const movementCost = resolveMovementCostRule(options);

  const playerAnimationController = createPlayerAnimationController(playerEntity);
  const detachCombatMovementController = attachCombatPlayerMovementController(runtime, {
    combatState,
    playerUnit,
    grid,
    gridMapper,
    isMovementEnabled: () => combatState.inputMode === 'move',
    resolveGroundY: ({ x, z }) => resolveGroundY({ runtime, x, z, fallbackY: playerUnit.rootNode.position.y }),
    onMovingStateChange: (isMoving) => playerAnimationController.setMoving(isMoving),
    movementCost
  });

  const detachCamera = attachGameplayIsometricCamera(runtime, playerEntity.rootNode, {
    distance: 12,
    elevationDegrees: 50,
    yawDegrees: -35,
    targetHeight: 1.1
  });

  const detachCombatAttackInputController = attachCombatAttackInputController(runtime, {
    combatState,
    attackerUnit: playerUnit,
    targetUnit: enemyUnit,
    targetRoot: enemyEntity.rootNode,
    isAttackEnabled: () => combatState.inputMode === 'attack'
  });

  const detachCombatDebugHud = createCombatDebugHud(runtime, { combatState });
  const detachCombatGridOverlay = createCombatGridOverlayRenderer(runtime, {
    combatState,
    resolveY: ({ x, z }) => resolveGroundY({ runtime, x, z, fallbackY: 0 })
  });
  const detachMovementRangeHighlighter = createCombatMovementRangeHighlighter(runtime, {
    combatState,
    playerUnit,
    grid,
    gridMapper,
    isVisible: () => combatState.inputMode === 'move',
    resolveY: ({ x, z }) => resolveGroundY({ runtime, x, z, fallbackY: 0 }),
    movementCost
  });

  return {
    combatState,
    combatScene,
    playerUnit,
    enemyUnit,
    dispose: () => {
      detachCamera?.();
      detachCombatMovementController?.();
      detachCombatAttackInputController?.();
      detachCombatDebugHud?.();
      detachCombatGridOverlay?.();
      detachMovementRangeHighlighter?.();
      enemyEntity.rootNode?.dispose(false, true);
      playerEntity.rootNode?.dispose(false, true);
      combatScene.sceneContainer?.dispose(false, true);
    }
  };
}
