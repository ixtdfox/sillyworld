const DEFAULT_MOVE_SPEED = 3;
const DEFAULT_STOP_DISTANCE = 0.05;

const HIGHLIGHT_MESH_PREFIX = 'combatMoveHighlight_';

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

function tryParseCellFromMeshName(meshName) {
  if (typeof meshName !== 'string' || !meshName.startsWith(HIGHLIGHT_MESH_PREFIX)) {
    return null;
  }

  const [x, z] = meshName.slice(HIGHLIGHT_MESH_PREFIX.length).split('_').map((value) => Number.parseInt(value, 10));
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    return null;
  }

  return { x, z };
}

function tryResolveCellFromPick(pickResult, gridMapper) {
  if (!pickResult?.hit || !pickResult.pickedPoint) {
    return null;
  }

  const mesh = pickResult.pickedMesh ?? null;
  const metadataCell = mesh?.metadata?.combatGridCell ?? mesh?.metadata?.gridCell ?? null;
  if (metadataCell && Number.isFinite(metadataCell.x) && Number.isFinite(metadataCell.z)) {
    return {
      x: Math.trunc(metadataCell.x),
      z: Math.trunc(metadataCell.z)
    };
  }

  const meshNamedCell = tryParseCellFromMeshName(mesh?.name);
  if (meshNamedCell) {
    return meshNamedCell;
  }

  return gridMapper.worldToGridCell(pickResult.pickedPoint);
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

  let activePath = null;
  let activeWaypointIndex = 0;
  let pendingPathCost = 0;
  let isMoving = false;

  const setMoving = (nextMovingState) => {
    if (isMoving === nextMovingState) {
      return;
    }

    isMoving = nextMovingState;
    onMovingStateChange(isMoving);
  };

  const clearPath = () => {
    activePath = null;
    activeWaypointIndex = 0;
    pendingPathCost = 0;
    setMoving(false);
  };

  const pointerObserver = runtime.scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type !== runtime.BABYLON.PointerEventTypes.POINTERDOWN) {
      return;
    }

    if (
      combatState.status !== 'active'
      || (combatState.phase && combatState.phase !== 'turn_active')
      || !playerUnit.isAlive
      || isMoving
      || getActiveUnit()?.id !== playerUnit.id
    ) {
      return;
    }

    if (!isMovementEnabled()) {
      return;
    }

    if (!Number.isFinite(playerUnit.mp) || playerUnit.mp <= 0) {
      return;
    }

    const pickResult = pointerInfo.pickInfo?.hit
      ? pointerInfo.pickInfo
      : runtime.scene.pick(runtime.scene.pointerX, runtime.scene.pointerY);
    const destinationCell = tryResolveCellFromPick(pickResult, gridMapper);
    if (!destinationCell) {
      debugLog('[combat-move] rejected click: no valid destination cell', {
        pickedMeshName: pickResult?.pickedMesh?.name ?? 'none'
      });
      return;
    }

    const movementAttempt = typeof combatState.tryMoveActiveUnit === 'function'
      ? combatState.tryMoveActiveUnit({
        unitId: playerUnit.id,
        destinationCell,
        movementCost
      })
      : null;

    if (movementAttempt && !movementAttempt.success) {
      debugLog('[combat-move] movement rejected by combat state', {
        reason: movementAttempt.reason,
        destinationCell
      });
      return;
    }

    const path = movementAttempt?.path ?? grid.findPath(playerUnit.gridCell, destinationCell, {
      allowOccupiedByUnitId: playerUnit.id,
      movementCost
    });

    if (!path || path.length <= 1) {
      return;
    }

    const pathCost = movementAttempt?.pathCost ?? calculatePathCost(grid, path, movementCost);
    if (!Number.isFinite(pathCost) || pathCost <= 0 || pathCost > playerUnit.mp) {
      return;
    }

    const waypoints = path.slice(1).map((cell) => {
      const world = gridMapper.gridCellToWorld(cell, { resolveY: ({ x, z }) => resolveGroundY({ x, z }) });
      return new runtime.BABYLON.Vector3(world.x, world.y, world.z);
    });

    activePath = {
      cells: path,
      waypoints,
      destinationCell
    };
    activeWaypointIndex = 0;
    pendingPathCost = pathCost;
    setMoving(true);
  });

  const beforeRenderObserver = runtime.scene.onBeforeRenderObservable.add(() => {
    if (!activePath || activeWaypointIndex >= activePath.waypoints.length) {
      return;
    }

    const currentPosition = playerUnit.rootNode.position;
    const targetPosition = activePath.waypoints[activeWaypointIndex];
    const toTarget = targetPosition.subtract(currentPosition);
    const distanceToTarget = toTarget.length();

    if (distanceToTarget <= stopDistance) {
      currentPosition.copyFrom(targetPosition);
      activeWaypointIndex += 1;

      if (activeWaypointIndex >= activePath.waypoints.length) {
        if (typeof combatState.completeUnitMovement === 'function') {
          combatState.completeUnitMovement({
            unitId: playerUnit.id,
            destinationCell: activePath.destinationCell,
            pathCost: pendingPathCost
          });
        } else {
          const fromCell = playerUnit.gridCell;
          const toCell = activePath.destinationCell;
          grid.moveOccupant(fromCell, toCell, playerUnit.id);
          playerUnit.gridCell = toCell;
          playerUnit.mp -= pendingPathCost;
        }
        clearPath();
      }

      return;
    }

    const deltaTimeSeconds = runtime.engine.getDeltaTime() / 1000;
    const stepDistance = moveSpeed * deltaTimeSeconds;
    const moveVector = toTarget.normalize().scale(Math.min(stepDistance, distanceToTarget));
    currentPosition.addInPlace(moveVector);
  });

  return () => {
    runtime.scene.onPointerObservable.remove(pointerObserver);
    runtime.scene.onBeforeRenderObservable.remove(beforeRenderObserver);
  };
}
