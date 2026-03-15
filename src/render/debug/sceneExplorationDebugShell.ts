// @ts-nocheck
import { createCombatDebugShell } from './combatDebugShell.ts';
import { createEnemyVisionGridDebugOverlay } from './enemyVisionGridDebugOverlay.ts';

/** Обновляет `setupSceneExplorationDebugShell` в ходе выполнения связанного игрового сценария. */
export function setupSceneExplorationDebugShell(runtime, options: {
  getExplorationRuntime: () => any;
  hasLineOfSight: (args: any) => boolean;
}) {
  const debugShell = createCombatDebugShell(runtime, { runtimeKey: '__sceneDebugShellController' });
  debugShell.registerPanel({
    id: 'enemy-vision-grid',
    label: 'Enemy Vision Grid',
    initialVisible: true,
    createPanel: () => createEnemyVisionGridDebugOverlay(runtime, {
      getEnemyActor: () => {
        const explorationRuntime = options.getExplorationRuntime();
        if (!explorationRuntime?.enemyMeshRoot) {
          return null;
        }

        return {
          id: 'scene_enemy',
          rootNode: explorationRuntime.enemyMeshRoot,
          perception: {
            visionAngleDegrees: explorationRuntime.enemyPerception?.visionAngleDegrees,
            visionDistance: explorationRuntime.enemyPerception?.visionDistance
          },
          facingDirection: explorationRuntime.enemyPerception?.facingDirection
        };
      },
      getPlayerActor: () => {
        const explorationRuntime = options.getExplorationRuntime();
        return explorationRuntime?.playerMeshRoot
          ? { id: 'scene_player', rootNode: explorationRuntime.playerMeshRoot }
          : null;
      },
      resolveY: (position) => position?.y ?? 0,
      hasLineOfSight: options.hasLineOfSight
    })
  });

  return debugShell;
}
