// @ts-nocheck
/**
 * Модуль слоя render: отвечает за визуальное представление состояния мира, UI и отладочные оверлеи.
 */
import { createEntityGameplayDimensions } from '../../world/entity/entityGameplayDimensions.ts';

export { createEntityGameplayDimensions };

/** Выполняет `applyEntityCollisionFromDimensions` в ходе выполнения связанного игрового сценария. */
export function applyEntityCollisionFromDimensions(runtime, rootNode, gameplayDimensions) {
  if (!runtime?.BABYLON?.Vector3 || !rootNode) {
    return;
  }

  const radius = gameplayDimensions?.collisionRadius;
  const height = gameplayDimensions?.collisionHeight;
  if (!Number.isFinite(radius) || !Number.isFinite(height) || radius <= 0 || height <= 0) {
    return;
  }

  rootNode.checkCollisions = true;
  rootNode.ellipsoid = new runtime.BABYLON.Vector3(radius, height / 2, radius);
  rootNode.ellipsoidOffset = new runtime.BABYLON.Vector3(0, height / 2, 0);
}
