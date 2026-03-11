import { createBabylonWorldRuntime, ensureBabylonRuntime } from './babylonRuntime.js';
import { createMovementTargetState } from './movementTargetState.js';
import { createPlayerAnimationController } from './playerAnimationController.js';
import { attachPlayerMovementController } from './playerMovementController.js';
import { attachGroundClickInput } from './sceneGroundClickInput.js';
import { attachGameplayIsometricCamera } from './gameplayCameraController.js';
import { createDistrictExplorationRuntime } from './districtExplorationRuntime.js';
import { attachEncounterInteractionInput, ENCOUNTER_INTERACTION_DISTANCE } from './encounterInteractionInput.js';
import { createCombatRuntime } from './combatRuntime.js';

function toPositionSnapshot(node) {
  if (!node?.position) {
    return null;
  }

  return {
    x: node.position.x,
    y: node.position.y,
    z: node.position.z
  };
}

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
  let sceneMode = 'loading';
  let encounterInteractionDistance = options.interactionDistance ?? ENCOUNTER_INTERACTION_DISTANCE;

  const emitDebugState = () => {
    if (!options.onDebugStateChange) {
      return;
    }

    const explorationRuntime = sceneMode === 'exploration' ? activeGameplayRuntime : null;
    const combatRuntime = sceneMode === 'combat' ? activeGameplayRuntime : null;

    if (sceneMode === 'combat' && combatRuntime?.combatState) {
      const combatState = combatRuntime.combatState;
      const activeUnit = combatState.getActiveUnit?.() ?? null;

      options.onDebugStateChange({
        mode: sceneMode,
        combat: {
          state: combatState.status,
          phase: combatState.phase,
          round: combatState.turn?.round ?? null,
          activeUnit: activeUnit ? `${activeUnit.team}:${activeUnit.id}` : null,
          activeUnitAp: activeUnit?.ap ?? null,
          activeUnitMp: activeUnit?.mp ?? null,
          playerHp: combatState.units?.player?.hp ?? null,
          enemyHp: combatState.units?.enemy?.hp ?? null
        }
      });
      return;
    }

    if (sceneMode === 'exploration' && explorationRuntime?.playerMeshRoot && explorationRuntime?.enemyMeshRoot) {
      const playerPosition = toPositionSnapshot(explorationRuntime.playerMeshRoot);
      const enemyPosition = toPositionSnapshot(explorationRuntime.enemyMeshRoot);
      const distanceToEnemy = runtime.BABYLON.Vector3.Distance(
        explorationRuntime.playerMeshRoot.position,
        explorationRuntime.enemyMeshRoot.position
      );

      options.onDebugStateChange({
        mode: sceneMode,
        exploration: {
          playerPosition,
          enemyPosition,
          distanceToEnemy,
          enemyInteractionAllowed: !combatTransitionStarted && distanceToEnemy <= encounterInteractionDistance
        }
      });
      return;
    }

    options.onDebugStateChange({ mode: sceneMode });
  };

  const debugObserver = runtime.scene.onBeforeRenderObservable.add(() => {
    emitDebugState();
  });

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
    sceneMode = 'transitioning';
    emitDebugState();
    teardownActiveGameplayRuntime();

    const combatRuntime = await createCombatRuntime(runtime, {
      sceneFile: options.combatSceneFile,
      playerFile: options.playerFile,
      enemyFile: options.enemyFile,
      playerNormalizationId: options.playerNormalizationId,
      enemyNormalizationId: options.enemyNormalizationId
    });

    activeGameplayRuntime = combatRuntime;
    sceneMode = 'combat';
    emitDebugState();

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
      enemySpawn: options.enemySpawn,
      playerNormalizationId: options.playerNormalizationId,
      enemyNormalizationId: options.enemyNormalizationId
    });
    activeGameplayRuntime = explorationRuntime;

    if (!Number.isFinite(options.interactionDistance)) {
      const playerInteractionRadius = explorationRuntime.playerEntity?.normalizationConfig?.interactionRadius;
      const enemyInteractionRadius = explorationRuntime.enemyEntity?.normalizationConfig?.interactionRadius;
      encounterInteractionDistance = Number.isFinite(playerInteractionRadius)
        ? playerInteractionRadius
        : Number.isFinite(enemyInteractionRadius)
          ? enemyInteractionRadius
          : ENCOUNTER_INTERACTION_DISTANCE;
    }

    sceneMode = 'exploration';
    emitDebugState();

    const playerAnimationController = createPlayerAnimationController(explorationRuntime.playerEntity);
    const movementTargetState = createMovementTargetState();

    explorationInputScope.setDetachFns({
      detachGameplayCameraController: attachGameplayIsometricCamera(runtime, explorationRuntime.playerMeshRoot),
      detachEncounterInteractionInput: attachEncounterInteractionInput(runtime, {
        playerRoot: explorationRuntime.playerMeshRoot,
        enemyRoot: explorationRuntime.enemyMeshRoot,
        interactionDistance: encounterInteractionDistance,
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
    runtime.scene.onBeforeRenderObservable.remove(debugObserver);
    teardownActiveGameplayRuntime();
    runtime.dispose();
  };
}
