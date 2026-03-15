// @ts-nocheck
import { CombatCellPicker } from '../combat/input/CombatCellPicker.ts';
import { isCameraOrbiting, isPrimaryPointerAction } from '../../render/shared/pointerInputGuards.ts';
import { CellMovementEngine } from '../movement/cellMovementEngine.ts';
import { resolveCellPath } from '../movement/gridMovement.ts';

const DEFAULT_MOVE_SPEED = 3;
const DEFAULT_STOP_DISTANCE = 0.05;

function calculatePathCost(grid, path, movementCost) {
  if (typeof grid.calculatePathCost === 'function') {
    return grid.calculatePathCost(path, { movementCost });
  }

  if (!Array.isArray(path) || path.length <= 1) {
    return 0;
  }

  if (typeof movementCost === 'function') {
    let totalCost = 0;
    for (let index = 1; index < path.length; index += 1) {
      const stepCost = movementCost(path[index - 1], path[index]);
      if (!Number.isFinite(stepCost) || stepCost <= 0) {
        return Infinity;
      }
      totalCost += stepCost;
    }
    return totalCost;
  }

  return path.length - 1;
}

export function attachCombatPlayerMovementController(runtime, options) {
  const {
    combatState,
    playerUnit,
    grid,
    gridMapper,
    resolveGroundY,
    onMovingStateChange = () => {},
    isMovementEnabled = () => true,
    moveSpeed = DEFAULT_MOVE_SPEED,
    stopDistance = DEFAULT_STOP_DISTANCE,
    movementCost,
    debugLog = () => {}
  } = options;

  const getActiveUnit = () => combatState.getActiveUnit?.() ?? null;

  let pendingPathCost = 0;
  let isMoving = false;
  let movementInputResetVersion = combatState.pendingMovementInputResetVersion ?? 0;
  combatState.playerMovementInProgress = false;

  const movementEngine = new CellMovementEngine({
    moveSpeed,
    stopDistance,
    gridMapper,
    resolveGroundY,
    grid,
    toVector3: (world) => new runtime.BABYLON.Vector3(world.x, world.y, world.z)
  });

  const setMoving = (nextMovingState) => {
    if (isMoving === nextMovingState) {
      return;
    }

    isMoving = nextMovingState;
    combatState.playerMovementInProgress = isMoving;
    if (!isMoving) {
      combatState.hoveredMovementDestination = null;
    }
    onMovingStateChange(isMoving);
  };

  const clearPath = (reason = 'clear_path') => {
    if (movementEngine.activePath) {
      debugLog('[combat-move] cleared pending movement path', { reason });
    }
    movementEngine.clear(reason);
    pendingPathCost = 0;
    setMoving(false);
  };

  const syncResetVersion = () => {
    const nextVersion = combatState.pendingMovementInputResetVersion ?? 0;
    if (nextVersion !== movementInputResetVersion) {
      movementInputResetVersion = nextVersion;
      clearPath(`external_reset:${combatState.lastMovementInputResetReason ?? 'unknown'}`);
    }
  };

  const isPlayerMoveAllowed = () => {
    const activeUnit = getActiveUnit();
    return combatState.status === 'active'
      && (!combatState.phase || combatState.phase === 'turn_active')
      && playerUnit.isAlive
      && activeUnit?.id === playerUnit.id
      && isMovementEnabled()
      && Number.isFinite(playerUnit.mp)
      && playerUnit.mp > 0;
  };

  const currentCell = movementEngine.ensureCharacterCell({
    currentCell: playerUnit.gridCell,
    position: playerUnit.rootNode.position
  });
  playerUnit.gridCell = currentCell;
  playerUnit.rootNode.gridCell = currentCell;
  movementEngine.snapPositionToCell({
    cell: currentCell,
    position: playerUnit.rootNode.position,
    fallbackY: playerUnit.rootNode.position.y
  });

  const pointerObserver = runtime.scene.onPointerObservable.add((pointerInfo) => {
    syncResetVersion();

    if (pointerInfo.type === runtime.BABYLON.PointerEventTypes.POINTERUP) {
      if (combatState.consumeUiPointerGuard?.()) {
        debugLog('[combat-move] suppressed pointer up from GUI interaction', {
          reason: combatState.uiPointerGuardReason ?? 'unknown'
        });
      }
      return;
    }

    if (pointerInfo.type !== runtime.BABYLON.PointerEventTypes.POINTERDOWN) {
      return;
    }

    if (!isPrimaryPointerAction(pointerInfo) || isCameraOrbiting(runtime)) {
      return;
    }

    if (combatState.consumeUiPointerGuard?.()) {
      debugLog('[combat-move] suppressed pointer down from GUI interaction', {
        reason: combatState.uiPointerGuardReason ?? 'unknown'
      });
      return;
    }

    if (!isPlayerMoveAllowed() || isMoving) {
      return;
    }

    const picker = new CombatCellPicker();
    const { pickResult, cell: destinationCell } = picker.pickCombatCellAtPointer(runtime, gridMapper, pointerInfo.pickInfo ?? null);

    if (!pickResult?.hit || !pickResult.pickedPoint) {
      return;
    }

    if (!destinationCell) {
      if (pickResult?.pickedMesh?.metadata?.isCombatHudControl) {
        debugLog('[combat-move] rejected click: gui mesh pick');
      } else {
        debugLog('[combat-move] rejected click: no valid destination cell', {
          pickedMeshName: pickResult?.pickedMesh?.name ?? 'none'
        });
      }
      return;
    }

    const movementAttempt = typeof combatState.tryMoveActiveUnit === 'function'
      ? combatState.tryMoveActiveUnit({
        unitId: playerUnit.id,
        destinationCell,
        movementCost,
        source: 'world_pointer'
      })
      : null;

    if (movementAttempt && !movementAttempt.success) {
      debugLog('[combat-move] movement rejected by combat state', {
        reason: movementAttempt.reason,
        destinationCell
      });
      return;
    }

    const path = movementAttempt?.path ?? resolveCellPath({
      startCell: playerUnit.gridCell,
      destinationCell,
      grid,
      findPathOptions: {
        allowOccupiedByUnitId: playerUnit.id,
        movementCost
      }
    });
    if (!path || path.length <= 1) {
      debugLog('[combat-move] rejected click: path not found', { destinationCell });
      return;
    }

    const pathCost = movementAttempt?.pathCost ?? calculatePathCost(grid, path, movementCost);
    if (!Number.isFinite(pathCost) || pathCost <= 0 || pathCost > playerUnit.mp) {
      debugLog('[combat-move] rejected click: invalid path cost', { pathCost, mp: playerUnit.mp });
      return;
    }

    const queueResult = movementEngine.queueMovement({
      currentCell: playerUnit.gridCell,
      destinationCell,
      position: playerUnit.rootNode.position,
      fallbackY: playerUnit.rootNode.position.y,
      findPathOptions: {
        allowOccupiedByUnitId: playerUnit.id,
        movementCost
      },
      resolvedPathCells: path
    });

    if (!queueResult.ok) {
      debugLog('[combat-move] rejected click: movement queue failed', {
        destinationCell,
        reason: queueResult.reason
      });
      return;
    }

    pendingPathCost = pathCost;
    setMoving(true);
    debugLog('[combat-move] queued movement', {
      source: 'world_pointer',
      destinationCell,
      pathCost
    });
  });

  const beforeRenderObserver = runtime.scene.onBeforeRenderObservable.add(() => {
    syncResetVersion();

    if (!isPlayerMoveAllowed()) {
      clearPath('player_cannot_move');
      return;
    }

    if (!movementEngine.isMoving) {
      return;
    }

    const currentPosition = playerUnit.rootNode.position;
    const deltaTimeSeconds = runtime.engine.getDeltaTime() / 1000;
    const advanceResult = movementEngine.tick({
      position: currentPosition,
      deltaTimeSeconds
    });

    if (advanceResult.reachedWaypoint && advanceResult.reachedCell) {
      playerUnit.gridCell = advanceResult.reachedCell;
      playerUnit.rootNode.gridCell = advanceResult.reachedCell;
      if (playerUnit.entity) {
        playerUnit.entity.gridCell = advanceResult.reachedCell;
      }
    }

    if (!advanceResult.movementComplete) {
      return;
    }

    debugLog('[combat-move] reached destination waypoint', {
      destinationCell: advanceResult.destinationCell,
      pathCost: pendingPathCost
    });

    if (typeof combatState.completeUnitMovement === 'function') {
      combatState.completeUnitMovement({
        unitId: playerUnit.id,
        destinationCell: advanceResult.destinationCell,
        pathCost: pendingPathCost,
        source: 'world_pointer'
      });
    } else {
      const fromCell = playerUnit.gridCell;
      const toCell = advanceResult.destinationCell;
      grid.moveOccupant(fromCell, toCell, playerUnit.id);
      playerUnit.gridCell = toCell;
      playerUnit.rootNode.gridCell = toCell;
      if (playerUnit.entity) {
        playerUnit.entity.gridCell = toCell;
      }
      playerUnit.mp -= pendingPathCost;
    }

    movementEngine.snapPositionToCell({
      cell: advanceResult.destinationCell,
      position: playerUnit.rootNode.position,
      fallbackY: playerUnit.rootNode.position.y
    });

    setMoving(false);
    combatState.resetPendingMovementInput?.('movement_complete');
    syncResetVersion();
  });

  return () => {
    clearPath('controller_detach');
    runtime.scene.onPointerObservable.remove(pointerObserver);
    runtime.scene.onBeforeRenderObservable.remove(beforeRenderObserver);
  };
}
