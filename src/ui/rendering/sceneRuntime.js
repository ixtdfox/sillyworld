import { createBabylonWorldRuntime, ensureBabylonRuntime } from './babylonRuntime.js';
import { createMovementTargetState } from './movementTargetState.js';
import { createPlayerAnimationController } from './playerAnimationController.js';
import { attachPlayerMovementController } from './playerMovementController.js';
import { attachGroundClickInput } from './sceneGroundClickInput.js';
import { attachGameplayIsometricCamera } from './gameplayCameraController.js';
import { createDistrictExplorationRuntime } from './districtExplorationRuntime.js';
import { attachEncounterInteractionInput } from './encounterInteractionInput.js';

export async function mountSceneRuntime(canvas, options = {}) {
  await ensureBabylonRuntime();
  const runtime = createBabylonWorldRuntime(canvas);
  let detachGroundClickInput = null;
  let detachEncounterInteractionInput = null;
  let detachPlayerMovementController = null;
  let detachGameplayCameraController = null;

  try {
    const explorationRuntime = await createDistrictExplorationRuntime(runtime, {
      districtId: options.districtId
    });

    const playerAnimationController = createPlayerAnimationController(explorationRuntime.playerEntity);
    detachGameplayCameraController = attachGameplayIsometricCamera(runtime, explorationRuntime.playerMeshRoot);

    const movementTargetState = createMovementTargetState();
    detachEncounterInteractionInput = attachEncounterInteractionInput(runtime, {
      playerRoot: explorationRuntime.playerMeshRoot,
      enemyRoot: explorationRuntime.enemyMeshRoot,
      onEncounterStart: options.onEncounterStart
    });
    detachGroundClickInput = attachGroundClickInput(runtime, movementTargetState);
    detachPlayerMovementController = attachPlayerMovementController(
      runtime,
      explorationRuntime.playerEntity,
      movementTargetState,
      {
        onMovingStateChange: (isMoving) => playerAnimationController.setMoving(isMoving)
      }
    );
  } catch (error) {
    detachGroundClickInput?.();
    detachEncounterInteractionInput?.();
    detachPlayerMovementController?.();
    detachGameplayCameraController?.();
    runtime.dispose();
    throw error;
  }

  return () => {
    detachGroundClickInput?.();
    detachEncounterInteractionInput?.();
    detachPlayerMovementController?.();
    detachGameplayCameraController?.();
    runtime.dispose();
  };
}
