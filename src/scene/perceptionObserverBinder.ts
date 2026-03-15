// @ts-nocheck
/**
 * Модуль runtime сцены: координирует Babylon-объекты, ввод игрока и режимы исследования/боя.
 */
import { evaluateEnemyPerceptionPipeline } from '../world/enemy/enemyPerception.ts';
import { updateEnemyAmbientBehavior } from '../world/enemy/enemyAmbientBehavior.ts';
import { createWorldGridMapper } from '../world/spatial/worldGrid.ts';

/** Создаёт и настраивает `createPerceptionObserverBinder` в ходе выполнения связанного игрового сценария. */
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

      const gridMapper = explorationRuntime.worldGridMapper ?? fallbackGridMapper;
      const deltaMs = runtime.engine?.getDeltaTime?.() ?? 16;
      const deltaSeconds = Math.max(0, deltaMs / 1000);

      const updatedBehavior = explorationRuntime.enemyAmbientBehavior
        ? updateEnemyAmbientBehavior({
            enemyRootNode: explorationRuntime.enemyMeshRoot,
            behavior: explorationRuntime.enemyAmbientBehavior,
            deltaSeconds,
            gridMapper,
            resolveGroundY: explorationRuntime.resolveGroundY
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
