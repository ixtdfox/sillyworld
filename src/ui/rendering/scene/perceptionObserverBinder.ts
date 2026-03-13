// @ts-nocheck
import { evaluateEnemyPerceptionPipeline } from '../../../world/enemy/enemyPerception.ts';
import { updateEnemyAmbientBehavior } from '../../../world/enemy/enemyAmbientBehavior.ts';
import { createCombatGridMapper } from '../../../world/combat/combatGridMapper.ts';

export function createPerceptionObserverBinder(runtime, options: {
  getExplorationRuntime: () => any;
  canRun: () => boolean;
  isCooldownActive: () => boolean;
  hasLineOfSight: (args: any) => boolean;
  onPerceptionUpdated: (payload: any) => void;
  onCombatTriggered: (payload: any) => void;
}) {
  let observer = null;
  const gridMapper = createCombatGridMapper();

  const detach = () => {
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

      const deltaMs = runtime.engine?.getDeltaTime?.() ?? 16;
      const deltaSeconds = Math.max(0, deltaMs / 1000);

      const updatedBehavior = explorationRuntime.enemyAmbientBehavior
        ? updateEnemyAmbientBehavior({
            enemyRootNode: explorationRuntime.enemyMeshRoot,
            behavior: explorationRuntime.enemyAmbientBehavior,
            deltaSeconds,
            logger: console
          })
        : null;

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
        console.error('[SillyRPG] Enemy perception pipeline update failed.', {
          error,
          enemyPosition: enemyActor?.rootNode?.position ?? null,
          playerPosition: playerActor?.rootNode?.position ?? null,
          facingDirection: enemyActor?.facingDirection ?? null
        });
        return;
      }

      const perceptionResult = {
        ...pipelineResult.perceptionResult,
        canSeePlayer: pipelineResult.playerCellVisible
      };
      options.onPerceptionUpdated(perceptionResult);

      if (pipelineResult.playerCellVisible === true) {
        console.info('[SillyRPG] Enemy perception triggered combat.', {
          combatTriggerCalled: true,
          playerCell: pipelineResult.playerCell,
          enemyCell: pipelineResult.enemyCell,
          visibleCellsCount: pipelineResult.visibleCells.length
        });

        options.onCombatTriggered({
          distanceToEnemy: pipelineResult.perceptionResult.distanceToPlayer
        });
      }
    });
  };

  return { attach, detach };
}
