import { loadWorldScene } from './worldSceneLoader.ts';
import { loadPlayerCharacter } from './playerCharacterLoader.ts';
import { loadEnemyCharacter } from './enemyCharacterLoader.ts';
import { attachGameplayIsometricCamera } from './gameplayCameraController.ts';
import { createCombatTurnManager } from './combatTurnManager.ts';
import { createCombatGrid } from './combatGrid.ts';
import { createCombatGridMapper } from './combatGridMapper.ts';
import { createPlayerAnimationController } from './playerAnimationController.ts';
import { attachCombatPlayerMovementController } from './combatPlayerMovementController.ts';
import { createCombatActionResolver } from './combatActionResolver.ts';
import { attachCombatAttackInputController } from './combatAttackInputController.ts';
import { resolveOrCreateSceneCamera } from './babylonRuntime.ts';
import { createCombatDebugHud } from './combatDebugHud.ts';
import { resolveCombatGridConfig } from './combatGridConfig.ts';
import { createCombatGridOverlayRenderer } from './combatGridOverlayRenderer.ts';
import { createCombatMovementRangeHighlighter } from './combatMovementRangeHighlighter.ts';
import { createPlayerActionModeStateMachine, PLAYER_ACTION_MODES } from './playerActionModeStateMachine.ts';
import { createCombatDebugShell } from './combatDebugShell.ts';
import { ASSET_PATHS } from '../../core/assets/assetCatalog.ts';

const COMBAT_SCENE_FILE = ASSET_PATHS.scenes.combatPrototype;
const DEFAULT_PLAYER_SPAWN = Object.freeze({ x: -1.5, y: 0, z: 1.5 });
const DEFAULT_ENEMY_SPAWN = Object.freeze({ x: 1.5, y: 0, z: -1.5 });
const DEFAULT_AP_PER_TURN = 2;
const DEFAULT_MP_PER_TURN = 6;
const DEFAULT_HP = 20;
const DEFAULT_BASIC_ATTACK_DAMAGE = 4;
const DEFAULT_FALLBACK_ATTACK_RANGE = 1;

function manhattanDistance(cellA, cellB) {
  if (!cellA || !cellB) {
    return Infinity;
  }

  return Math.abs(cellA.x - cellB.x) + Math.abs(cellA.z - cellB.z);
}

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
    turn: turnState,
    actionAvailability: {
      canMove: false,
      canAttack: false,
      canEndTurn: false
    }
  };
}

export async function createCombatRuntime(runtime, options = {}) {
  const combatScene = await loadWorldScene(runtime, {
    sceneFile: options.sceneFile ?? COMBAT_SCENE_FILE,
    containerName: options.sceneContainerName ?? 'combatSceneRoot',
    resolveAssetPath: options.resolveAssetPath
  });

  resolveOrCreateSceneCamera(runtime, {
    preferredCameras: combatScene.cameras,
    fallbackCameraName: 'combatFallbackCamera',
    fallbackPosition: options.fallbackCameraPosition ?? { x: 0, y: 11, z: -12 },
    fallbackTarget: options.fallbackCameraTarget ?? { x: 0, y: 0, z: 0 }
  });

  const playerEntity = await loadPlayerCharacter(runtime, {
    playerFile: options.playerFile,
    playerNormalizationId: options.playerNormalizationId,
    resolveAssetPath: options.resolveAssetPath
  });
  const enemyEntity = await loadEnemyCharacter(runtime, {
    enemyFile: options.enemyFile,
    enemyNormalizationId: options.enemyNormalizationId,
    enemyArchetypeId: options.enemyArchetypeId,
    resolveAssetPath: options.resolveAssetPath
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
  const movementCost = resolveMovementCostRule(options);
  const combatState = createCombatState({ combatScene, playerUnit, enemyUnit, turnManager });
  combatState.status = 'active';
  combatState.result = null;
  const actionMode = createPlayerActionModeStateMachine({
    initialMode: PLAYER_ACTION_MODES.IDLE
  });
  combatState.inputMode = actionMode.getMode();
  combatState.selectedTargetId = null;
  combatState.lastActionResult = null;

  combatState.grid = grid;
  combatState.gridMapper = gridMapper;
  combatState.getActiveUnit = () => {
    const activeTurnUnit = turnManager.getActiveUnit();
    if (!activeTurnUnit) {
      return null;
    }
    return combatState.units.player.id === activeTurnUnit.unitId ? combatState.units.player : combatState.units.enemy;
  };


  const findUnitById = (unitId) => Object.values(combatState.units).find((unit) => unit.id === unitId) ?? null;

  combatState.tryMoveActiveUnit = ({ unitId, destinationCell, movementCost: movementCostOverride } = {}) => {
    const unit = findUnitById(unitId);
    const activeUnit = combatState.getActiveUnit();

    if (
      combatState.status !== 'active'
      || combatState.phase !== 'turn_active'
      || !unit
      || !unit.isAlive
      || !activeUnit
      || activeUnit.id !== unit.id
      || unit.mp <= 0
    ) {
      return { success: false, reason: 'not_allowed' };
    }

    const resolvedMovementCost = typeof movementCostOverride === 'function' ? movementCostOverride : undefined;
    const path = grid.findPath(unit.gridCell, destinationCell, {
      allowOccupiedByUnitId: unit.id,
      movementCost: resolvedMovementCost
    });

    if (!path || path.length <= 1) {
      return { success: false, reason: 'unreachable' };
    }

    const pathCost = grid.calculatePathCost(path, {
      movementCost: resolvedMovementCost
    });

    if (!Number.isFinite(pathCost) || pathCost <= 0 || pathCost > unit.mp) {
      return { success: false, reason: 'insufficient_mp', pathCost };
    }

    return {
      success: true,
      path,
      pathCost,
      destinationCell: path[path.length - 1]
    };
  };

  combatState.completeUnitMovement = ({ unitId, destinationCell, pathCost } = {}) => {
    const unit = findUnitById(unitId);
    const activeUnit = combatState.getActiveUnit();
    if (
      !unit
      || !destinationCell
      || !Number.isFinite(pathCost)
      || pathCost <= 0
      || combatState.status !== 'active'
      || combatState.phase !== 'turn_active'
      || !unit.isAlive
      || !activeUnit
      || activeUnit.id !== unit.id
      || pathCost > unit.mp
    ) {
      return { success: false, reason: 'invalid_request' };
    }

    const fromCell = unit.gridCell;
    grid.moveOccupant(fromCell, destinationCell, unit.id);
    unit.gridCell = destinationCell;
    unit.mp = Math.max(0, unit.mp - pathCost);
    combatState.lastActionResult = {
      success: true,
      action: 'move',
      unitId: unit.id,
      destinationCell: { ...destinationCell },
      pathCost,
      mpRemaining: unit.mp
    };
    syncCombatHudState();

    return {
      success: true,
      unit,
      mpRemaining: unit.mp
    };
  };
  combatState.setInputMode = (inputMode) => {
    const isPlayerTurn = combatState.status === 'active'
      && combatState.phase === 'turn_active'
      && combatState.getActiveUnit()?.id === playerUnit.id;

    if (!isPlayerTurn && inputMode !== PLAYER_ACTION_MODES.IDLE) {
      actionMode.reset();
      combatState.inputMode = actionMode.getMode();
      return combatState.inputMode;
    }

    if (inputMode === PLAYER_ACTION_MODES.MOVE && (!Number.isFinite(playerUnit.mp) || playerUnit.mp <= 0)) {
      return combatState.inputMode;
    }

    if (inputMode === PLAYER_ACTION_MODES.ATTACK && (!Number.isFinite(playerUnit.ap) || playerUnit.ap <= 0)) {
      return combatState.inputMode;
    }

    const result = actionMode.setMode(inputMode);
    if (!result.success) {
      return combatState.inputMode;
    }

    combatState.inputMode = result.mode;

    if (combatState.inputMode !== PLAYER_ACTION_MODES.ATTACK) {
      combatState.selectedTargetId = null;
    }

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
    const activeUnit = combatState.getActiveUnit();
    if (activeUnit?.id !== playerUnit.id || combatState.phase !== 'turn_active' || combatState.status !== 'active') {
      actionMode.reset();
      combatState.inputMode = actionMode.getMode();
      combatState.selectedTargetId = null;
    }
  };

  const syncCombatHudState = () => {
    syncTurnState();

    const activeUnit = combatState.getActiveUnit();
    const canAct = combatState.status === 'active'
      && combatState.phase === 'turn_active'
      && activeUnit?.id === playerUnit.id
      && playerUnit.isAlive;

    combatState.actionAvailability = {
      canMove: canAct && Number.isFinite(playerUnit.mp) && playerUnit.mp > 0,
      canAttack: canAct && Number.isFinite(playerUnit.ap) && playerUnit.ap > 0,
      canEndTurn: canAct
    };
  };

  combatState.refreshCombatUiState = syncCombatHudState;

  const advanceToNextLivingUnit = () => {
    const maxSkips = combatState.turn?.orderedUnits?.length ?? 0;
    let skipCount = 0;

    while (skipCount < maxSkips) {
      const activeUnit = combatState.getActiveUnit();
      if (activeUnit?.isAlive) {
        return activeUnit;
      }

      turnManager.endTurn();
      turnManager.advanceToNextUnit();
      skipCount += 1;
    }

    return null;
  };

  const startTurn = () => {
    if (combatState.status !== 'active') {
      return;
    }

    const livingActiveUnit = advanceToNextLivingUnit();
    if (!livingActiveUnit) {
      evaluateAndFinalizeCombat();
      syncCombatHudState();
      return;
    }

    turnManager.startTurn();
    const activeUnit = combatState.getActiveUnit();
    if (activeUnit) {
      resetUnitResourcesForTurn(activeUnit);
      if (activeUnit.id === playerUnit.id) {
        combatState.setInputMode(PLAYER_ACTION_MODES.MOVE);
      }
    }
    syncCombatHudState();
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
    if (combatState.status !== 'active') {
      return {
        ended: true,
        result: combatState.result
      };
    }

    const outcome = actionResolver.evaluateCombatOutcome(Object.values(combatState.units));
    if (!outcome.ended) {
      return outcome;
    }

    combatState.status = 'ended';
    combatState.result = outcome.result;
    combatState.phase = 'combat_end';
    actionMode.reset();
    combatState.inputMode = actionMode.getMode();
    combatState.selectedTargetId = null;
    combatState.lastActionResult = {
      success: true,
      action: 'combat_end',
      result: outcome.result
    };

    options.onCombatEnd?.({
      result: outcome.result,
      combatState
    });

    return outcome;
  };

  combatState.tryBasicAttack = ({ attackerId, targetId }) => {
    if (combatState.status !== 'active' || combatState.phase !== 'turn_active') {
      return {
        success: false,
        reason: 'combat_not_active'
      };
    }

    const attacker = Object.values(combatState.units).find((unit) => unit.id === attackerId) ?? null;
    const target = Object.values(combatState.units).find((unit) => unit.id === targetId) ?? null;
    const activeUnitId = turnManager.getActiveUnit()?.unitId ?? null;

    const result = actionResolver.resolveBasicAttack({ attacker, target, activeUnitId });
    syncCombatHudState();
    if (!result.success) {
      return result;
    }

    if (result.targetDied && target?.gridCell) {
      combatState.grid.clearOccupied(target.gridCell);
      if (combatState.selectedTargetId === target.id) {
        combatState.selectedTargetId = null;
      }
    }

    const outcome = evaluateAndFinalizeCombat();
    syncCombatHudState();
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

    while (combatState.status === 'active' && activeUnit.ap > 0) {
      const attackAttempt = combatState.tryBasicAttack({
        attackerId: activeUnit.id,
        targetId: playerUnit.id
      });
      combatState.lastActionResult = attackAttempt;

      if (attackAttempt.success) {
        continue;
      }

      if (attackAttempt.reason !== 'target_out_of_range') {
        break;
      }

      if (!Number.isFinite(activeUnit.mp) || activeUnit.mp <= 0) {
        break;
      }

      const reachableCells = grid.getReachableCells(activeUnit.gridCell, activeUnit.mp, {
        allowOccupiedByUnitId: activeUnit.id,
        movementCost
      });

      const candidateCells = reachableCells
        .map((cell) => ({ x: cell.x, z: cell.z }))
        .filter((cell) => !(cell.x === activeUnit.gridCell.x && cell.z === activeUnit.gridCell.z));

      let selectedMove = null;

      for (const candidateCell of candidateCells) {
        const path = grid.findPath(activeUnit.gridCell, candidateCell, {
          allowOccupiedByUnitId: activeUnit.id,
          movementCost
        });
        if (!path || path.length <= 1) {
          continue;
        }

        const pathCost = grid.calculatePathCost(path, { movementCost });
        if (!Number.isFinite(pathCost) || pathCost <= 0 || pathCost > activeUnit.mp) {
          continue;
        }

        const distanceToPlayer = manhattanDistance(candidateCell, playerUnit.gridCell);
        const currentDistance = selectedMove ? manhattanDistance(selectedMove.destinationCell, playerUnit.gridCell) : Infinity;

        if (
          !selectedMove
          || distanceToPlayer < currentDistance
          || (distanceToPlayer === currentDistance && pathCost < selectedMove.pathCost)
        ) {
          selectedMove = {
            destinationCell: candidateCell,
            pathCost
          };
        }
      }

      if (!selectedMove) {
        break;
      }

      const movementResult = combatState.completeUnitMovement({
        unitId: activeUnit.id,
        destinationCell: selectedMove.destinationCell,
        pathCost: selectedMove.pathCost
      });

      if (!movementResult.success) {
        break;
      }

      const destinationWorld = gridMapper.gridCellToWorld(selectedMove.destinationCell, {
        resolveY: ({ x, z }) => resolveGroundY({ runtime, x, z, fallbackY: activeUnit.rootNode.position.y })
      });
      activeUnit.rootNode.position.copyFrom(new runtime.BABYLON.Vector3(
        destinationWorld.x,
        destinationWorld.y,
        destinationWorld.z
      ));

      combatState.lastActionResult = {
        success: true,
        action: 'move',
        unitId: activeUnit.id,
        destinationCell: { ...selectedMove.destinationCell },
        pathCost: selectedMove.pathCost,
        mpRemaining: activeUnit.mp
      };
      syncCombatHudState();

      if (manhattanDistance(activeUnit.gridCell, playerUnit.gridCell) <= activeUnit.attackRange) {
        continue;
      }

      if (activeUnit.mp <= 0) {
        break;
      }
    }
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
    syncCombatHudState();
    return combatState.turn;
  };

  combatState.endActiveTurn = () => {
    if (combatState.status !== 'active') {
      return combatState.turn;
    }

    endTurn();
    runEnemyTurnsIfNeeded();
    syncCombatHudState();
    return combatState.turn;
  };

  combatState.startCombat();

  const playerAnimationController = createPlayerAnimationController(playerEntity);
  const detachCombatMovementController = attachCombatPlayerMovementController(runtime, {
    combatState,
    playerUnit,
    grid,
    gridMapper,
    isMovementEnabled: () => combatState.inputMode === PLAYER_ACTION_MODES.MOVE,
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
    getPotentialTargets: () => Object.values(combatState.units)
      .filter((unit) => unit.team !== playerUnit.team)
      .map((unit) => ({ unit, targetRoot: unit.rootNode })),
    isAttackEnabled: () => combatState.inputMode === PLAYER_ACTION_MODES.ATTACK
  });

  const debugShell = createCombatDebugShell(runtime);
  debugShell.registerPanel({
    id: 'combat-hud',
    label: 'Combat HUD',
    initialVisible: true,
    createPanel: () => createCombatDebugHud(runtime, { combatState })
  });
  debugShell.registerPanel({
    id: 'combat-overlay',
    label: 'Combat Overlay',
    initialVisible: true,
    createPanel: () => createCombatMovementRangeHighlighter(runtime, {
      combatState,
      playerUnit,
      grid,
      gridMapper,
      isVisible: () => combatState.inputMode === PLAYER_ACTION_MODES.MOVE,
      resolveY: ({ x, z }) => resolveGroundY({ runtime, x, z, fallbackY: 0 }),
      movementCost
    })
  });
  debugShell.registerPanel({
    id: 'grid-debug',
    label: 'Grid Debug',
    initialVisible: true,
    createPanel: () => createCombatGridOverlayRenderer(runtime, {
      combatState,
      resolveY: ({ x, z }) => resolveGroundY({ runtime, x, z, fallbackY: 0 })
    })
  });
  debugShell.registerPanel({
    id: 'future-panel',
    label: 'Future Panel',
    enabled: false,
    createPanel: () => null
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
      debugShell?.dispose?.();
      enemyEntity.rootNode?.dispose(false, true);
      playerEntity.rootNode?.dispose(false, true);
      combatScene.sceneContainer?.dispose(false, true);
    }
  };
}
