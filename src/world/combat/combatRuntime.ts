// @ts-nocheck
import { createCombatTurnManager } from './combatTurnManager.ts';
import { createCombatGrid } from './combatGrid.ts';
import { createWorldGridMapper } from '../spatial/worldGrid.ts';
import { createPlayerAnimationController } from '../player/playerAnimationController.ts';
import { attachCombatPlayerMovementController } from '../player/combatPlayerMovementController.ts';
import { createCombatActionResolver } from './combatActionResolver.ts';
import { attachCombatAttackInputController } from './combatAttackInputController.ts';
import { createCombatDebugHud } from '../../render/debug/combatDebugHud.ts';
import { resolveCombatGridConfig } from './combatGridConfig.ts';
import { createCombatGridOverlayRenderer } from '../../render/combat/combatGridOverlayRenderer.ts';
import { createCombatMovementRangeHighlighter } from '../../render/combat/combatMovementRangeHighlighter.ts';
import { createPlayerActionModeStateMachine, PLAYER_ACTION_MODES } from './playerActionModeStateMachine.ts';
import { createCombatDebugShell } from '../../render/debug/combatDebugShell.ts';
import { mapCombatParticipantsFromWorldPositions } from './combatWorldPositionMapper.ts';
const DEFAULT_PLAYER_SPAWN_CELL = Object.freeze({ x: -1, z: 1 });
const DEFAULT_ENEMY_SPAWN_CELL = Object.freeze({ x: 1, z: -1 });
const DEFAULT_AP_PER_TURN = 2;
const DEFAULT_MP_PER_TURN = 6;
const DEFAULT_HP = 20;
const DEFAULT_BASIC_ATTACK_DAMAGE = 4;
const DEFAULT_FALLBACK_ATTACK_RANGE = 1;

/** Выполняет `manhattanDistance` в ходе выполнения связанного игрового сценария. */
function manhattanDistance(cellA, cellB) {
  if (!cellA || !cellB) {
    return Infinity;
  }

  return Math.abs(cellA.x - cellB.x) + Math.abs(cellA.z - cellB.z);
}

/** Определяет `resolveMovementCostRule` в ходе выполнения связанного игрового сценария. */
function resolveMovementCostRule(options = {}) {
  return typeof options.movementCost === 'function' ? options.movementCost : undefined;
}

/** Определяет `resolveGroundY` в ходе выполнения связанного игрового сценария. */
function resolveGroundY({ runtime, x, z, fallbackY = 0 }) {
  const groundMesh = runtime?.scene?.getMeshByName?.('Ground') ?? null;
  if (!groundMesh || groundMesh.isEnabled?.() === false || groundMesh.isVisible === false) {
    return fallbackY;
  }

  const origin = new runtime.BABYLON.Vector3(x, fallbackY + 25, z);
  const ray = new runtime.BABYLON.Ray(
      origin,
      new runtime.BABYLON.Vector3(0, -1, 0),
      200
  );

  const hit = runtime.scene.pickWithRay(ray, (mesh) => mesh === groundMesh);
  return hit?.hit && hit.pickedPoint ? hit.pickedPoint.y : fallbackY;
}

/** Нормализует `normalizeCell` в ходе выполнения связанного игрового сценария. */
function normalizeCell(cell, fallbackCell) {
  if (cell && Number.isFinite(cell.x) && Number.isFinite(cell.z)) {
    return {
      x: Math.trunc(cell.x),
      z: Math.trunc(cell.z)
    };
  }

  return { ...fallbackCell };
}

/** Выполняет `placeUnitAtCell` в ходе выполнения связанного игрового сценария. */
function placeUnitAtCell(runtime, unit, gridMapper, cell, options = {}) {
  const resolvedCell = normalizeCell(cell, options.fallbackCell ?? { x: 0, z: 0 });
  const worldPosition = gridMapper.gridCellToWorld(resolvedCell, {
    resolveY: ({ x, z }) => resolveGroundY({
      runtime,
      x,
      z,
      fallbackY: options.fallbackY ?? unit?.rootNode?.position?.y ?? 0
    })
  });

  unit.rootNode.position.copyFrom(new runtime.BABYLON.Vector3(
    worldPosition.x,
    worldPosition.y,
    worldPosition.z
  ));
  unit.gridCell = resolvedCell;
  unit.rootNode.gridCell = resolvedCell;
  if (unit.entity) {
    unit.entity.gridCell = resolvedCell;
  }

  console.debug('[SillyRPG] Combat unit placement applied', {
    unitId: unit.id,
    source: options.source ?? 'unknown',
    logicalCell: resolvedCell,
    computedWorld: worldPosition,
    finalRootTransform: {
      x: unit.rootNode.position.x,
      y: unit.rootNode.position.y,
      z: unit.rootNode.position.z
    }
  });

  return {
    cell: resolvedCell,
    worldPosition
  };
}

/** Создаёт и настраивает `createCombatUnit` в ходе выполнения связанного игрового сценария. */
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
    animationGroups: entity.animationGroups,
    entity
  };
}


/** Определяет `resolveDistinctSpawnCell` в ходе выполнения связанного игрового сценария. */
function resolveDistinctSpawnCell({ originCell, blockedCell, grid }) {
  if (!originCell || !blockedCell) {
    return originCell;
  }

  if (originCell.x !== blockedCell.x || originCell.z !== blockedCell.z) {
    return originCell;
  }

  const candidates = [
    { x: originCell.x + 1, z: originCell.z },
    { x: originCell.x - 1, z: originCell.z },
    { x: originCell.x, z: originCell.z + 1 },
    { x: originCell.x, z: originCell.z - 1 }
  ];

  for (const candidate of candidates) {
    if (grid?.isCellWalkable?.(candidate)) {
      return candidate;
    }
  }

  return originCell;
}

/** Создаёт и настраивает `createCombatState` в ходе выполнения связанного игрового сценария. */
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

/** Определяет `resolveEncounterParticipants` в ходе выполнения связанного игрового сценария. */
function resolveEncounterParticipants(options = {}) {
  const playerParticipant = {
    id: 'player_1',
    displayName: 'Player',
    role: 'player',
    team: 'player',
    initiative: options.playerInitiative ?? 100,
    entity: options.playerEntity
  };

  const enemyParticipants = [
    {
      id: 'enemy_1',
      displayName: 'Enemy',
      role: 'detecting_enemy',
      team: 'enemy',
      initiative: options.enemyInitiative ?? 10,
      entity: options.enemyEntity
    },
    ...(Array.isArray(options.nearbyEnemyEntities)
      ? options.nearbyEnemyEntities.map((entity, index) => ({
          id: `enemy_nearby_${index + 1}`,
          displayName: `Enemy ${index + 2}`,
          role: 'nearby_enemy',
          team: 'enemy',
          initiative: options.enemyInitiative ?? 10,
          entity
        }))
      : [])
  ].filter((participant) => participant.entity);

  return {
    playerParticipant,
    enemyParticipants,
    supportedEnemyParticipants: enemyParticipants.slice(0, 1),
    deferredEnemyParticipants: enemyParticipants.slice(1)
  };
}

/** Создаёт и настраивает `createCombatRuntime` в ходе выполнения связанного игрового сценария. */
export async function createCombatRuntime(runtime, options = {}) {
  const combatScene = {
    sceneContainer: options.sceneContainer ?? null
  };

  const playerEntity = options.playerEntity;
  const enemyEntity = options.enemyEntity;

  if (!playerEntity?.rootNode || !enemyEntity?.rootNode) {
    throw new Error('World combat runtime requires active exploration entity.');
  }

  const combatGridConfig = resolveCombatGridConfig(options);

  const gridMapper = createWorldGridMapper({
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



  const participants = resolveEncounterParticipants({
    ...options,
    playerEntity,
    enemyEntity
  });

  if (participants.deferredEnemyParticipants.length > 0) {
    console.info('[SillyRPG] Nearby enemy participants detected but deferred for future multi-enemy combat support.', {
      deferredEnemyIds: participants.deferredEnemyParticipants.map((participant) => participant.id)
    });
  }

  const playerUnit = createCombatUnit(
    participants.playerParticipant.id,
    participants.playerParticipant.team,
    playerEntity,
    participants.playerParticipant.initiative,
    participants.playerParticipant.displayName
  );
  const primaryEnemyParticipant = participants.supportedEnemyParticipants[0];
  const enemyUnit = createCombatUnit(
    primaryEnemyParticipant?.id ?? 'enemy_1',
    primaryEnemyParticipant?.team ?? 'enemy',
    enemyEntity,
    primaryEnemyParticipant?.initiative ?? (options.enemyInitiative ?? 10),
    primaryEnemyParticipant?.displayName ?? 'Enemy'
  );

  let playerSpawnCell = normalizeCell(options.playerSpawnCell, DEFAULT_PLAYER_SPAWN_CELL);
  let enemySpawnCell = normalizeCell(options.enemySpawnCell, DEFAULT_ENEMY_SPAWN_CELL);

  const mappedParticipants = mapCombatParticipantsFromWorldPositions({
    participants: [participants.playerParticipant, ...participants.supportedEnemyParticipants],
    gridMapper,
    grid,
    logger: console
  });
  const mappedPlayer = mappedParticipants.find((participant) => participant.id === participants.playerParticipant.id);
  const mappedEnemy = mappedParticipants.find((participant) => participant.id === enemyUnit.id);

  if (!mappedPlayer?.initialCell || !mappedEnemy?.initialCell) {
    throw new Error('[SillyRPG] Combat entry requires resolved tactical cells for player and enemy participants.');
  }

  if (mappedPlayer.isWalkable === false || mappedEnemy.isWalkable === false) {
    throw new Error('[SillyRPG] Combat entry resolved to non-walkable tactical cells.');
  }

  playerSpawnCell = normalizeCell(mappedPlayer?.initialCell, DEFAULT_PLAYER_SPAWN_CELL);
  enemySpawnCell = normalizeCell(mappedEnemy?.initialCell, DEFAULT_ENEMY_SPAWN_CELL);

  const playerExpectedSnappedCenter = gridMapper.gridCellToWorld(playerSpawnCell, {
    fallbackY: playerEntity.rootNode.position.y
  });
  const enemyExpectedSnappedCenter = gridMapper.gridCellToWorld(enemySpawnCell, {
    fallbackY: enemyEntity.rootNode.position.y
  });

  enemySpawnCell = resolveDistinctSpawnCell({
    originCell: enemySpawnCell,
    blockedCell: playerSpawnCell,
    grid
  });

  placeUnitAtCell(runtime, playerUnit, gridMapper, playerSpawnCell, {
    source: 'combat_spawn_player',
    fallbackCell: DEFAULT_PLAYER_SPAWN_CELL,
    fallbackY: options.playerSpawn?.y ?? 0
  });
  placeUnitAtCell(runtime, enemyUnit, gridMapper, enemySpawnCell, {
    source: 'combat_spawn_enemy',
    fallbackCell: DEFAULT_ENEMY_SPAWN_CELL,
    fallbackY: options.enemySpawn?.y ?? 0
  });

  console.info('[SillyRPG] Combat initial cell assignment completed from world positions.', {
    playerSpawnCell,
    enemySpawnCell
  });

  grid.setOccupied(playerUnit.gridCell, playerUnit.id);
  grid.setOccupied(enemyUnit.gridCell, enemyUnit.id);

  const turnManager = createCombatTurnManager([playerUnit, enemyUnit]);
  const initialTurnOrder = turnManager.getState()?.orderedUnits ?? [];
  console.info('[SillyRPG] Combat turn order created.', {
    turnOrder: initialTurnOrder.map((entry) => ({
      unitId: entry.unitId,
      team: entry.team,
      initiative: entry.initiative
    }))
  });
  const actionResolver = createCombatActionResolver({
    basicAttackApCost: options.basicAttackApCost ?? 1,
    basicAttackDamage: options.basicAttackDamage ?? DEFAULT_BASIC_ATTACK_DAMAGE
  });
  const movementCost = resolveMovementCostRule(options);
  const combatState = createCombatState({ combatScene, playerUnit, enemyUnit, turnManager });
  combatState.status = 'active';
  combatState.result = null;
  combatState.endRequested = false;
  combatState.endReason = null;
  const actionMode = createPlayerActionModeStateMachine({
    initialMode: PLAYER_ACTION_MODES.IDLE
  });
  combatState.inputMode = actionMode.getMode();
  combatState.selectedTargetId = null;
  combatState.lastActionResult = null;
  combatState.pendingMovementInputResetVersion = 0;
  combatState.uiPointerGuardActive = false;
  combatState.uiPointerGuardReason = null;
  combatState.playerMovementInProgress = false;
  combatState.hoveredMovementDestination = null;


  combatState.resetPendingMovementInput = (reason = 'unspecified') => {
    combatState.pendingMovementInputResetVersion += 1;
    combatState.lastMovementInputResetReason = reason;
    return combatState.pendingMovementInputResetVersion;
  };

  combatState.notifyUiInteraction = (reason = 'ui_interaction') => {
    combatState.uiPointerGuardActive = true;
    combatState.uiPointerGuardReason = reason;
    combatState.resetPendingMovementInput(`ui:${reason}`);
  };

  combatState.consumeUiPointerGuard = () => {
    if (!combatState.uiPointerGuardActive) {
      return false;
    }

    combatState.uiPointerGuardActive = false;
    combatState.uiPointerGuardReason = null;
    return true;
  };

  combatState.clearUiPointerGuard = () => {
    combatState.uiPointerGuardActive = false;
    combatState.uiPointerGuardReason = null;
  };

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

  combatState.tryMoveActiveUnit = ({ unitId, destinationCell, movementCost: movementCostOverride, source = 'unknown' } = {}) => {
    const unit = findUnitById(unitId);
    const activeUnit = combatState.getActiveUnit();

    if (
      source !== 'world_pointer'
      || combatState.status !== 'active'
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

  combatState.completeUnitMovement = ({ unitId, destinationCell, pathCost, source = 'unknown' } = {}) => {
    const unit = findUnitById(unitId);
    const activeUnit = combatState.getActiveUnit();
    if (
      source !== 'world_pointer' && source !== 'enemy_ai'
      || !unit
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
    unit.rootNode.gridCell = destinationCell;
    if (unit.entity) {
      unit.entity.gridCell = destinationCell;
    }
    unit.mp = Math.max(0, unit.mp - pathCost);
    combatState.lastActionResult = {
      success: true,
      action: 'move',
      unitId: unit.id,
      destinationCell: { ...destinationCell },
      pathCost,
      mpRemaining: unit.mp
    };
    combatState.resetPendingMovementInput('movement_complete');
    syncCombatHudState();

    return {
      success: true,
      unit,
      mpRemaining: unit.mp
    };
  };
  combatState.setInputMode = (inputMode) => {
    const previousMode = combatState.inputMode;
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

    if (previousMode !== combatState.inputMode) {
      combatState.resetPendingMovementInput(`mode_change:${previousMode}->${combatState.inputMode}`);
    }

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
      combatState.resetPendingMovementInput('turn_state_sync_non_player');
      combatState.clearUiPointerGuard();
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
      evaluateAndFinalizeCombat('turn_start_no_living_units');
      syncCombatHudState();
      return;
    }

    turnManager.startTurn();
    const activeUnit = combatState.getActiveUnit();
    if (activeUnit) {
      resetUnitResourcesForTurn(activeUnit);
      if (activeUnit.id === playerUnit.id) {
        combatState.resetPendingMovementInput('player_turn_start');
        combatState.clearUiPointerGuard();
        combatState.setInputMode(PLAYER_ACTION_MODES.MOVE);
      } else {
        combatState.resetPendingMovementInput('enemy_turn_start');
        combatState.clearUiPointerGuard();
      }
    }
    syncCombatHudState();
  };

  const endTurn = () => {
    if (combatState.status !== 'active') {
      return;
    }
    combatState.resetPendingMovementInput('turn_end');
    combatState.clearUiPointerGuard();
    turnManager.endTurn();
    turnManager.advanceToNextUnit();
    startTurn();
  };

  const evaluateAndFinalizeCombat = (source = 'unknown') => {
    if (combatState.status !== 'active' || combatState.endRequested) {
      return {
        ended: true,
        result: combatState.result
      };
    }

    const outcome = actionResolver.evaluateCombatOutcome(Object.values(combatState.units));
    if (!outcome.ended) {
      return outcome;
    }

    combatState.endRequested = true;
    combatState.endReason = source;
    combatState.status = 'ended';
    combatState.result = outcome.result;
    combatState.phase = 'combat_end';
    actionMode.reset();
    combatState.inputMode = actionMode.getMode();
    combatState.selectedTargetId = null;
    combatState.resetPendingMovementInput('combat_end');
    combatState.clearUiPointerGuard();
    combatState.lastActionResult = {
      success: true,
      action: 'combat_end',
      result: outcome.result
    };

    console.info('[SillyRPG] Combat end triggered', {
      source,
      result: outcome.result
    });

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

    combatState.resetPendingMovementInput('attack_resolved');
    const outcome = evaluateAndFinalizeCombat('basic_attack');
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

    combatState.resetPendingMovementInput('enemy_action_begin');
    combatState.clearUiPointerGuard();

    while (combatState.status === 'active' && activeUnit.ap > 0) {
      const attackAttempt = combatState.tryBasicAttack({
        attackerId: activeUnit.id,
        targetId: playerUnit.id
      });
      combatState.lastActionResult = attackAttempt;

      if (attackAttempt.success) {
        combatState.resetPendingMovementInput('enemy_attack_resolved');
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
        pathCost: selectedMove.pathCost,
        source: 'enemy_ai'
      });

      if (!movementResult.success) {
        break;
      }

      placeUnitAtCell(runtime, activeUnit, gridMapper, selectedMove.destinationCell, {
        source: 'enemy_movement',
        fallbackY: activeUnit.rootNode.position.y
      });

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

    combatState.resetPendingMovementInput('enemy_action_complete');
    combatState.clearUiPointerGuard();
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
    id: 'tactical-overlay',
    label: 'Tactical Overlay',
    initialVisible: true,
    createPanel: () => createCombatMovementRangeHighlighter(runtime, {
      combatState,
      playerUnit,
      grid,
      isVisible: () => combatState.inputMode === PLAYER_ACTION_MODES.MOVE,
      resolveY: ({ x, z }) => resolveGroundY({ runtime, x, z, fallbackY: 0 }),
      movementCost
    })
  });
  debugShell.registerPanel({
    id: 'grid-debug',
    label: 'Raw Debug Grid',
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

  let disposed = false;

  const dispose = () => {
    if (disposed) {
      return;
    }

    disposed = true;
    console.debug('[SillyRPG] Combat runtime cleanup start', {
      result: combatState.result,
      endReason: combatState.endReason
    });
    detachCombatAttackInputController?.();
    detachCombatMovementController?.();
    debugShell?.dispose?.();
    console.debug('[SillyRPG] Combat runtime cleanup complete');
  };

  return {
    combatState,
    combatScene,
    playerUnit,
    enemyUnit,
    dispose
  };
}
