// @ts-nocheck
import { createMovementTargetState } from '../../../world/movement/movementTargetState.ts';
import { createPlayerAnimationController } from '../player/playerAnimationController.ts';
import { PlayerMovementController } from '../player/playerMovementController.ts';
import { SceneGroundMovementInput } from './sceneGroundMovementInput.ts';
import { attachGameplayIsometricCamera } from '../camera/gameplayCameraController.ts';
import type { PositionLike, PositionNodeLike, RuntimeDispose } from '../shared/runtimeContracts.ts';

export interface ExplorationControlsBinder {
  attach: () => void;
  dispose: RuntimeDispose;
  isAttached: () => boolean;
}

export function createExplorationControlsBinder(
  runtime,
  explorationRuntime: {
    playerEntity: { rootNode: PositionNodeLike & { position: PositionLike } };
    playerMeshRoot: PositionNodeLike & { position: PositionLike };
  }
): ExplorationControlsBinder {
  let attached = false;
  let detach: RuntimeDispose = () => {};

  const playerAnimationController = createPlayerAnimationController(explorationRuntime.playerEntity);
  const movementTargetState = createMovementTargetState();
  const movementController = new PlayerMovementController(
    runtime,
    explorationRuntime.playerEntity,
    movementTargetState,
    {
      onMovingStateChange: (isMoving: boolean) => playerAnimationController.setMoving(isMoving)
    }
  );
  const groundClickInput = new SceneGroundMovementInput(runtime, movementTargetState);

  return {
    attach: () => {
      if (attached) {
        return;
      }

      attached = true;
      const detachGroundInput = groundClickInput.attach();
      const detachMovement = movementController.attach();
      const detachCamera = attachGameplayIsometricCamera(runtime, explorationRuntime.playerMeshRoot);

      detach = () => {
        if (!attached) {
          return;
        }
        attached = false;
        detachGroundInput();
        detachMovement();
        detachCamera();
        detach = () => {};
      };
    },
    dispose: () => detach(),
    isAttached: () => attached
  };
}
