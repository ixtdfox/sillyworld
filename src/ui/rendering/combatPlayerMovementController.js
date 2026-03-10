const DEFAULT_MOVE_SPEED = 3;
const DEFAULT_STOP_DISTANCE = 0.05;

const GROUND_MESH_NAME = 'Ground';

function isGroundNode(node) {
  let current = node;
  while (current) {
    if (current.name === GROUND_MESH_NAME) {
      return true;
    }
    current = current.parent ?? null;
  }

  return false;
}

export function attachCombatPlayerMovementController(runtime, options) {
  const {
    combatState,
    playerUnit,
    grid,
    gridMapper,
    resolveGroundY,
    onMovingStateChange = () => {},
    moveSpeed = DEFAULT_MOVE_SPEED,
    stopDistance = DEFAULT_STOP_DISTANCE
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

    if (combatState.status !== 'active' || !playerUnit.isAlive || isMoving || getActiveUnit()?.id !== playerUnit.id) {
      return;
    }

    const pickResult = runtime.scene.pick(runtime.scene.pointerX, runtime.scene.pointerY);
    if (!pickResult?.hit || !pickResult.pickedPoint || !isGroundNode(pickResult.pickedMesh)) {
      return;
    }

    const destinationCell = gridMapper.worldToGridCell(pickResult.pickedPoint);
    const path = grid.findPath(playerUnit.gridCell, destinationCell, {
      allowOccupiedByUnitId: playerUnit.id
    });

    if (!path || path.length <= 1) {
      return;
    }

    const pathCost = path.length - 1;
    if (pathCost > playerUnit.mp) {
      console.log('[SillyRPG] Combat movement blocked: insufficient MP.', {
        currentMp: playerUnit.mp,
        requiredMp: pathCost
      });
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
        const fromCell = playerUnit.gridCell;
        const toCell = activePath.destinationCell;
        grid.moveOccupant(fromCell, toCell, playerUnit.id);
        playerUnit.gridCell = toCell;
        playerUnit.mp -= pendingPathCost;
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
