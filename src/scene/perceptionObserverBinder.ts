// @ts-nocheck
/**
 * Perception binder keeps sensory checks separate from movement execution.
 * AI state produces intents, while CharacterMovementOrchestrator applies movement.
 */
import { evaluateEnemyPerceptionPipeline } from '../world/enemy/enemyPerception.ts';
import { updateEnemyAmbientBehavior } from '../world/enemy/enemyAmbientBehavior.ts';
import { createWorldGridMapper } from '../world/spatial/worldGrid.ts';
import { AIController, Character, CharacterRelations } from '../world/character/index.ts';
import { CharacterMovementOrchestrator } from '../world/movement/characterMovementOrchestrator.ts';

export function createPerceptionObserverBinder(runtime, options: {
  getExplorationRuntime: () => any;
  canRun: () => boolean;
  isCooldownActive: () => boolean;
  hasLineOfSight: (args: any) => boolean;
  onPerceptionUpdated: (payload: any) => void;
  onCombatTriggered: (payload: any) => void;
}) {
  let observer = null;
  const fallbackGridMapper = createWorldGridMapper();
  const aiTargetState = { destinationCell: null };

  const enemyCharacter = new Character({
    identity: { id: 'scene:enemy', name: 'Enemy', kind: 'creature' },
    controller: new AIController(() => aiTargetState.destinationCell),
    relations: new CharacterRelations('scene:enemy'),
    runtimeState: {
      cell: null,
      currentNodeId: null,
      homeNodeId: null,
      hpCurrent: 1
    }
  });

  let movementOrchestrator = null;
  let movementDispose = () => {};

  const ensureMovementOrchestrator = (explorationRuntime, gridMapper) => {
    if (movementOrchestrator || !explorationRuntime?.enemyMeshRoot) {
      return;
    }

    movementOrchestrator = new CharacterMovementOrchestrator(runtime, {
      character: enemyCharacter,
      rootNode: explorationRuntime.enemyMeshRoot,
      moveSpeed: 3.2,
      gridMapper,
      grid: explorationRuntime.worldGrid,
      resolveGroundY: explorationRuntime.resolveGroundY,
      BABYLON: runtime.BABYLON
    });
    movementDispose = movementOrchestrator.attach();
  };

  const detach = () => {
    movementDispose();
    movementOrchestrator = null;
    movementDispose = () => {};

    if (observer) {
      runtime.scene.onBeforeRenderObservable.remove(observer);
      observer = null;
    }
  };

  const attach = () => {
    detach();

    observer = runtime.scene.onBeforeRenderObservable.add(() => {
      const explorationRuntime = options.getExplorationRuntime();
      if (!explorationRuntime?.enemyMeshRoot || !explorationRuntime?.playerMeshRoot) {
        return;
      }
      if (!options.canRun() || options.isCooldownActive()) {
        return;
      }

      const gridMapper = explorationRuntime.worldGridMapper ?? fallbackGridMapper;
      ensureMovementOrchestrator(explorationRuntime, gridMapper);
      const deltaMs = runtime.engine?.getDeltaTime?.() ?? 16;
      const deltaSeconds = Math.max(0, deltaMs / 1000);

      const updatedBehavior = explorationRuntime.enemyAmbientBehavior
        ? updateEnemyAmbientBehavior({
            enemyRootNode: explorationRuntime.enemyMeshRoot,
            behavior: explorationRuntime.enemyAmbientBehavior,
            currentCell: enemyCharacter.getCell(),
            deltaSeconds,
            gridMapper
          })
        : null;

      aiTargetState.destinationCell = updatedBehavior?.requestedDestinationCell ?? null;

      if (updatedBehavior?.facingDirection) {
        explorationRuntime.enemyPerception = explorationRuntime.enemyPerception ?? {};
        explorationRuntime.enemyPerception.facingDirection = { ...updatedBehavior.facingDirection };
      }

      const enemyActor = {
        id: 'scene_enemy',
        rootNode: explorationRuntime.enemyMeshRoot,
        perception: {
          visionAngleDegrees: explorationRuntime.enemyPerception?.visionAngleDegrees,
          visionDistance: explorationRuntime.enemyPerception?.visionDistance
        },
        facingDirection: explorationRuntime.enemyPerception?.facingDirection
      };
      const playerActor = {
        id: 'scene_player',
        rootNode: explorationRuntime.playerMeshRoot
      };

      let pipelineResult;
      try {
        pipelineResult = evaluateEnemyPerceptionPipeline(enemyActor, playerActor, gridMapper, {
          hasLineOfSight: options.hasLineOfSight
        });
      } catch (error) {
        return;
      }

      const perceptionResult = {
        ...pipelineResult.perceptionResult,
        canSeePlayer: pipelineResult.playerCellVisible
      };
      options.onPerceptionUpdated(perceptionResult);

      if (pipelineResult.playerCellVisible === true) {
        options.onCombatTriggered({
          distanceToEnemy: pipelineResult.perceptionResult.distanceToPlayer
        });
      }
    });
  };

  return { attach, detach };
}
