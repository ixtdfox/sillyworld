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

/**
 * Runtime service for player turn movement in combat.
 * Owns pointer subscriptions, movement path lifecycle, and combat-state synchronization.
 */
export class CombatPlayerMovementRuntime {
  constructor(runtime, options) {
    this.runtime = runtime;
    this.combatState = options.combatState;
    this.playerUnit = options.playerUnit;
    this.grid = options.grid;
    this.gridMapper = options.gridMapper;
    this.resolveGroundY = options.resolveGroundY;
    this.onMovingStateChange = options.onMovingStateChange ?? (() => {});
    this.isMovementEnabled = options.isMovementEnabled ?? (() => true);
    this.moveSpeed = options.moveSpeed ?? DEFAULT_MOVE_SPEED;
    this.stopDistance = options.stopDistance ?? DEFAULT_STOP_DISTANCE;
    this.movementCost = options.movementCost;
    this.debugLog = options.debugLog ?? (() => {});

    this.pendingPathCost = 0;
    this.isMoving = false;
    this.movementInputResetVersion = this.combatState.pendingMovementInputResetVersion ?? 0;
    this.pointerObserver = null;
    this.beforeRenderObserver = null;

    this.combatState.playerMovementInProgress = false;
    this.movementEngine = new CellMovementEngine({
      moveSpeed: this.moveSpeed,
      stopDistance: this.stopDistance,
      gridMapper: this.gridMapper,
      resolveGroundY: this.resolveGroundY,
      grid: this.grid,
      toVector3: (world) => new this.runtime.BABYLON.Vector3(world.x, world.y, world.z)
    });
  }

  attach() {
    if (this.pointerObserver || this.beforeRenderObserver) {
      return () => this.dispose();
    }

    const currentCell = this.movementEngine.ensureCharacterCell({
      currentCell: this.playerUnit.gridCell,
      position: this.playerUnit.rootNode.position
    });
    this.playerUnit.gridCell = currentCell;
    this.playerUnit.rootNode.gridCell = currentCell;
    this.movementEngine.snapPositionToCell({
      cell: currentCell,
      position: this.playerUnit.rootNode.position,
      fallbackY: this.playerUnit.rootNode.position.y
    });

    this.pointerObserver = this.runtime.scene.onPointerObservable.add((pointerInfo) => this.#onPointer(pointerInfo));
    this.beforeRenderObserver = this.runtime.scene.onBeforeRenderObservable.add(() => this.#onBeforeRender());

    return () => this.dispose();
  }

  dispose() {
    this.#clearPath('controller_detach');
    if (this.pointerObserver) {
      this.runtime.scene.onPointerObservable.remove(this.pointerObserver);
      this.pointerObserver = null;
    }
    if (this.beforeRenderObserver) {
      this.runtime.scene.onBeforeRenderObservable.remove(this.beforeRenderObserver);
      this.beforeRenderObserver = null;
    }
  }

  #getActiveUnit() {
    return this.combatState.getActiveUnit?.() ?? null;
  }

  #setMoving(nextMovingState) {
    if (this.isMoving === nextMovingState) {
      return;
    }

    this.isMoving = nextMovingState;
    this.combatState.playerMovementInProgress = this.isMoving;
    if (!this.isMoving) {
      this.combatState.hoveredMovementDestination = null;
    }
    this.onMovingStateChange(this.isMoving);
  }

  #clearPath(reason = 'clear_path') {
    if (this.movementEngine.activePath) {
      this.debugLog('[combat-move] cleared pending movement path', { reason });
    }
    this.movementEngine.clear(reason);
    this.pendingPathCost = 0;
    this.#setMoving(false);
  }

  #syncResetVersion() {
    const nextVersion = this.combatState.pendingMovementInputResetVersion ?? 0;
    if (nextVersion !== this.movementInputResetVersion) {
      this.movementInputResetVersion = nextVersion;
      this.#clearPath(`external_reset:${this.combatState.lastMovementInputResetReason ?? 'unknown'}`);
    }
  }

  #isPlayerMoveAllowed() {
    const activeUnit = this.#getActiveUnit();
    return this.combatState.status === 'active'
      && (!this.combatState.phase || this.combatState.phase === 'turn_active')
      && this.playerUnit.isAlive
      && activeUnit?.id === this.playerUnit.id
      && this.isMovementEnabled()
      && Number.isFinite(this.playerUnit.mp)
      && this.playerUnit.mp > 0;
  }

  #onPointer(pointerInfo) {
    this.#syncResetVersion();

    if (pointerInfo.type === this.runtime.BABYLON.PointerEventTypes.POINTERUP) {
      if (this.combatState.consumeUiPointerGuard?.()) {
        this.debugLog('[combat-move] suppressed pointer up from GUI interaction', {
          reason: this.combatState.uiPointerGuardReason ?? 'unknown'
        });
      }
      return;
    }

    if (pointerInfo.type !== this.runtime.BABYLON.PointerEventTypes.POINTERDOWN) {
      return;
    }

    if (!isPrimaryPointerAction(pointerInfo) || isCameraOrbiting(this.runtime)) {
      return;
    }

    if (this.combatState.consumeUiPointerGuard?.()) {
      this.debugLog('[combat-move] suppressed pointer down from GUI interaction', {
        reason: this.combatState.uiPointerGuardReason ?? 'unknown'
      });
      return;
    }

    if (!this.#isPlayerMoveAllowed() || this.isMoving) {
      return;
    }

    const picker = new CombatCellPicker();
    const { pickResult, cell: destinationCell } = picker.pickCombatCellAtPointer(this.runtime, this.gridMapper, pointerInfo.pickInfo ?? null);

    if (!pickResult?.hit || !pickResult.pickedPoint) {
      return;
    }

    if (!destinationCell) {
      if (pickResult?.pickedMesh?.metadata?.isCombatHudControl) {
        this.debugLog('[combat-move] rejected click: gui mesh pick');
      } else {
        this.debugLog('[combat-move] rejected click: no valid destination cell', {
          pickedMeshName: pickResult?.pickedMesh?.name ?? 'none'
        });
      }
      return;
    }

    const movementAttempt = typeof this.combatState.tryMoveActiveUnit === 'function'
      ? this.combatState.tryMoveActiveUnit({
        unitId: this.playerUnit.id,
        destinationCell,
        movementCost: this.movementCost,
        source: 'world_pointer'
      })
      : null;

    if (movementAttempt && !movementAttempt.success) {
      this.debugLog('[combat-move] movement rejected by combat state', {
        reason: movementAttempt.reason,
        destinationCell
      });
      return;
    }

    const path = movementAttempt?.path ?? resolveCellPath({
      startCell: this.playerUnit.gridCell,
      destinationCell,
      grid: this.grid,
      findPathOptions: {
        allowOccupiedByUnitId: this.playerUnit.id,
        movementCost: this.movementCost
      }
    });

    if (!path || path.length <= 1) {
      this.debugLog('[combat-move] rejected click: path not found', { destinationCell });
      return;
    }

    const pathCost = movementAttempt?.pathCost ?? calculatePathCost(this.grid, path, this.movementCost);
    if (!Number.isFinite(pathCost) || pathCost <= 0 || pathCost > this.playerUnit.mp) {
      this.debugLog('[combat-move] rejected click: invalid path cost', { pathCost, mp: this.playerUnit.mp });
      return;
    }

    const queueResult = this.movementEngine.queueMovement({
      currentCell: this.playerUnit.gridCell,
      destinationCell,
      position: this.playerUnit.rootNode.position,
      fallbackY: this.playerUnit.rootNode.position.y,
      findPathOptions: {
        allowOccupiedByUnitId: this.playerUnit.id,
        movementCost: this.movementCost
      },
      resolvedPathCells: path
    });

    if (!queueResult.ok) {
      this.debugLog('[combat-move] rejected click: movement queue failed', {
        destinationCell,
        reason: queueResult.reason
      });
      return;
    }

    this.pendingPathCost = pathCost;
    this.#setMoving(true);
    this.debugLog('[combat-move] queued movement', {
      source: 'world_pointer',
      destinationCell,
      pathCost
    });
  }

  #onBeforeRender() {
    this.#syncResetVersion();

    if (!this.#isPlayerMoveAllowed()) {
      this.#clearPath('player_cannot_move');
      return;
    }

    if (!this.movementEngine.isMoving) {
      return;
    }

    const currentPosition = this.playerUnit.rootNode.position;
    const deltaTimeSeconds = this.runtime.engine.getDeltaTime() / 1000;
    const advanceResult = this.movementEngine.tick({
      position: currentPosition,
      deltaTimeSeconds
    });

    if (advanceResult.reachedWaypoint && advanceResult.reachedCell) {
      this.playerUnit.gridCell = advanceResult.reachedCell;
      this.playerUnit.rootNode.gridCell = advanceResult.reachedCell;
      if (this.playerUnit.entity) {
        this.playerUnit.entity.gridCell = advanceResult.reachedCell;
      }
    }

    if (!advanceResult.movementComplete) {
      return;
    }

    this.debugLog('[combat-move] reached destination waypoint', {
      destinationCell: advanceResult.destinationCell,
      pathCost: this.pendingPathCost
    });

    if (typeof this.combatState.completeUnitMovement === 'function') {
      this.combatState.completeUnitMovement({
        unitId: this.playerUnit.id,
        destinationCell: advanceResult.destinationCell,
        pathCost: this.pendingPathCost,
        source: 'world_pointer'
      });
    } else {
      const fromCell = this.playerUnit.gridCell;
      const toCell = advanceResult.destinationCell;
      this.grid.moveOccupant(fromCell, toCell, this.playerUnit.id);
      this.playerUnit.gridCell = toCell;
      this.playerUnit.rootNode.gridCell = toCell;
      if (this.playerUnit.entity) {
        this.playerUnit.entity.gridCell = toCell;
      }
      this.playerUnit.mp -= this.pendingPathCost;
    }

    this.movementEngine.snapPositionToCell({
      cell: advanceResult.destinationCell,
      position: this.playerUnit.rootNode.position,
      fallbackY: this.playerUnit.rootNode.position.y
    });

    this.#setMoving(false);
    this.combatState.resetPendingMovementInput?.('movement_complete');
    this.#syncResetVersion();
  }
}

export function attachCombatPlayerMovementController(runtime, options) {
  const movementRuntime = new CombatPlayerMovementRuntime(runtime, options);
  movementRuntime.attach();
  return () => movementRuntime.dispose();
}
