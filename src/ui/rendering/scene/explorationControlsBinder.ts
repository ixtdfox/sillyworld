// @ts-nocheck
import { createMovementTargetState } from '../../../world/movement/movementTargetState.ts';
import { createWorldGridMapper } from '../../../world/spatial/worldGrid.ts';
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

function resolveGroundY(runtime, x: number, z: number, fallbackY = 0): number {
  const origin = new runtime.BABYLON.Vector3(x, fallbackY + 25, z);
  const ray = new runtime.BABYLON.Ray(origin, new runtime.BABYLON.Vector3(0, -1, 0), 200);
  const hit = runtime.scene.pickWithRay(ray, (mesh) => mesh?.isEnabled?.() && mesh.isVisible);
  return hit?.hit && hit.pickedPoint ? hit.pickedPoint.y : fallbackY;
}

export function createExplorationControlsBinder(
  runtime,
  explorationRuntime: {
    playerEntity: { rootNode: PositionNodeLike & { position: PositionLike }; gridCell?: { x: number; z: number } | null };
    playerMeshRoot: PositionNodeLike & { position: PositionLike };
  }
): ExplorationControlsBinder {
  let attached = false;
  let detach: RuntimeDispose = () => {};

  const playerAnimationController = createPlayerAnimationController(explorationRuntime.playerEntity);
  const movementTargetState = createMovementTargetState();
  const gridMapper = createWorldGridMapper();
  const movementController = new PlayerMovementController(
    runtime,
    explorationRuntime.playerEntity,
    movementTargetState,
    {
      moveSpeed: 4,
      gridMapper,
      resolveGroundY: ({ x, z, fallbackY }) => resolveGroundY(runtime, x, z, fallbackY),
      BABYLON: runtime.BABYLON,
      onMovingStateChange: (isMoving: boolean) => playerAnimationController.setMoving(isMoving)
    }
  );
  const groundClickInput = new SceneGroundMovementInput(runtime, movementTargetState, gridMapper);

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
