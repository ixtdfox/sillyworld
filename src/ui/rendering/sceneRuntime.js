import { createBabylonWorldRuntime, ensureBabylonRuntime } from './babylonRuntime.js';
import { createMovementTargetState } from './movementTargetState.js';
import { createPlayerAnimationController } from './playerAnimationController.js';
import { attachPlayerMovementController } from './playerMovementController.js';
import { loadPlayerCharacter } from './playerCharacterLoader.js';
import { spawnPlayerCharacter } from './playerSpawn.js';
import { attachGroundClickInput } from './sceneGroundClickInput.js';
import { attachGameplayIsometricCamera } from './gameplayCameraController.js';
import { loadWorldScene } from './worldSceneLoader.js';

export async function mountSceneRuntime(canvas) {
  await ensureBabylonRuntime();
  const runtime = createBabylonWorldRuntime(canvas);
  let detachGroundClickInput = null;
  let detachPlayerMovementController = null;
  let detachGameplayCameraController = null;

  try {
    await loadWorldScene(runtime);

    const playerCharacter = await loadPlayerCharacter(runtime);
    spawnPlayerCharacter(runtime, playerCharacter);
    const playerAnimationController = createPlayerAnimationController(playerCharacter);
    detachGameplayCameraController = attachGameplayIsometricCamera(runtime, playerCharacter.rootNode);

    const movementTargetState = createMovementTargetState();
    detachGroundClickInput = attachGroundClickInput(runtime, movementTargetState);
    detachPlayerMovementController = attachPlayerMovementController(runtime, playerCharacter, movementTargetState, {
      onMovingStateChange: (isMoving) => playerAnimationController.setMoving(isMoving)
    });
  } catch (error) {
    detachGroundClickInput?.();
    detachPlayerMovementController?.();
    detachGameplayCameraController?.();
    runtime.dispose();
    throw error;
  }

  return () => {
    detachGroundClickInput?.();
    detachPlayerMovementController?.();
    detachGameplayCameraController?.();
    runtime.dispose();
  };
}
