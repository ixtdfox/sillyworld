const DEFAULT_MOVE_SPEED = 2.5;
const DEFAULT_STOP_DISTANCE = 0.1;

export function attachPlayerMovementController(runtime, playerCharacter, movementTargetState, options = {}) {
  const moveSpeed = options.moveSpeed ?? DEFAULT_MOVE_SPEED;
  const stopDistance = options.stopDistance ?? DEFAULT_STOP_DISTANCE;
  const onMovingStateChange = options.onMovingStateChange ?? (() => {});

  let isMoving = false;

  const setMoving = (nextMovingState) => {
    if (isMoving === nextMovingState) {
      return;
    }

    isMoving = nextMovingState;
    onMovingStateChange(isMoving);
  };

  const beforeRenderObserver = runtime.scene.onBeforeRenderObservable.add(() => {
    if (!movementTargetState.hasTarget()) {
      return;
    }

    const target = movementTargetState.getTarget();
    const currentPosition = playerCharacter.rootNode.position;

    const toTarget = target.subtract(currentPosition);
    const distanceToTarget = toTarget.length();

    if (!isMoving) {
      setMoving(true);
      console.log('[SillyRPG] Movement start');
    }

    if (distanceToTarget <= stopDistance) {
      currentPosition.copyFrom(target);
      movementTargetState.clearTarget();
      setMoving(false);
      console.log('[SillyRPG] Movement stop');
      return;
    }

    const deltaTimeSeconds = runtime.engine.getDeltaTime() / 1000;
    const stepDistance = moveSpeed * deltaTimeSeconds;

    const moveVector = toTarget.normalize().scale(Math.min(stepDistance, distanceToTarget));
    currentPosition.addInPlace(moveVector);
  });

  return () => {
    runtime.scene.onBeforeRenderObservable.remove(beforeRenderObserver);
  };
}
