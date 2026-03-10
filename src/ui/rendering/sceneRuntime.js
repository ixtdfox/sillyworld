import { createBabylonWorldRuntime, ensureBabylonRuntime } from './babylonRuntime.js';
import { createMovementTargetState } from './movementTargetState.js';
import { createPlayerAnimationController } from './playerAnimationController.js';
import { attachPlayerMovementController } from './playerMovementController.js';
import { attachGroundClickInput } from './sceneGroundClickInput.js';
import { attachGameplayIsometricCamera } from './gameplayCameraController.js';
import { createDistrictExplorationRuntime } from './districtExplorationRuntime.js';
import { attachEncounterInteractionInput } from './encounterInteractionInput.js';
import { createCombatRuntime } from './combatRuntime.js';

function createExplorationInputScope() {
  let detachGroundClickInput = null;
  let detachEncounterInteractionInput = null;
  let detachPlayerMovementController = null;
  let detachGameplayCameraController = null;

  return {
    setDetachFns(detachFns) {
      detachGroundClickInput = detachFns.detachGroundClickInput;
      detachEncounterInteractionInput = detachFns.detachEncounterInteractionInput;
      detachPlayerMovementController = detachFns.detachPlayerMovementController;
      detachGameplayCameraController = detachFns.detachGameplayCameraController;
    },
    dispose() {
      detachGroundClickInput?.();
      detachEncounterInteractionInput?.();
      detachPlayerMovementController?.();
      detachGameplayCameraController?.();
      detachGroundClickInput = null;
      detachEncounterInteractionInput = null;
      detachPlayerMovementController = null;
      detachGameplayCameraController = null;
    }
  };
}

export async function mountSceneRuntime(canvas, options = {}) {
  await ensureBabylonRuntime();

  const runtime = createBabylonWorldRuntime(canvas);
  const explorationInputScope = createExplorationInputScope();
  let activeGameplayRuntime = null;
  let combatTransitionStarted = false;

  const teardownActiveGameplayRuntime = () => {
    explorationInputScope.dispose();
    activeGameplayRuntime?.dispose?.();
    activeGameplayRuntime = null;
  };

  const transitionToCombat = async (encounterDetails) => {
    if (combatTransitionStarted) {
      return null;
    }

    combatTransitionStarted = true;
    teardownActiveGameplayRuntime();

    const combatRuntime = await createCombatRuntime(runtime, {
      sceneFile: options.combatSceneFile,
      playerFile: options.playerFile,
      enemyFile: options.enemyFile
    });

    activeGameplayRuntime = combatRuntime;

    options.onEncounterStart?.({
      ...encounterDetails,
      combatState: combatRuntime.combatState
    });

    return combatRuntime.combatState;
  };

  try {
    const explorationRuntime = await createDistrictExplorationRuntime(runtime, {
      districtId: options.districtId,
      sceneFile: options.sceneFile,
      playerFile: options.playerFile,
      enemyFile: options.enemyFile,
      enemySpawn: options.enemySpawn
    });
    activeGameplayRuntime = explorationRuntime;

    const playerAnimationController = createPlayerAnimationController(explorationRuntime.playerEntity);
    const movementTargetState = createMovementTargetState();

    explorationInputScope.setDetachFns({
      detachGameplayCameraController: attachGameplayIsometricCamera(runtime, explorationRuntime.playerMeshRoot),
      detachEncounterInteractionInput: attachEncounterInteractionInput(runtime, {
        playerRoot: explorationRuntime.playerMeshRoot,
        enemyRoot: explorationRuntime.enemyMeshRoot,
        onEncounterStart: (details) => {
          transitionToCombat(details).catch((error) => {
            console.error('[SillyRPG] Failed to transition from exploration to combat.', error);
          });
        }
      }),
      detachGroundClickInput: attachGroundClickInput(runtime, movementTargetState),
      detachPlayerMovementController: attachPlayerMovementController(
        runtime,
        explorationRuntime.playerEntity,
        movementTargetState,
        {
          onMovingStateChange: (isMoving) => playerAnimationController.setMoving(isMoving)
        }
      )
    });
  } catch (error) {
    teardownActiveGameplayRuntime();
    runtime.dispose();
    throw error;
  }

  return () => {
    teardownActiveGameplayRuntime();
    runtime.dispose();
  };
}
