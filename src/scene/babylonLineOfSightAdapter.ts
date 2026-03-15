// @ts-nocheck
/**
 * Модуль runtime сцены: координирует Babylon-объекты, ввод игрока и режимы исследования/боя.
 */
import type { PositionLike } from '../render/shared/runtimeContracts.ts';

/** Выполняет `isSameNodeOrDescendant` в ходе выполнения связанного игрового сценария. */
function isSameNodeOrDescendant(mesh: any, root: any): boolean {
  if (!mesh || !root) {
    return false;
  }

  if (mesh === root) {
    return true;
  }

  let current = mesh.parent;
  while (current) {
    if (current === root) {
      return true;
    }
    current = current.parent;
  }

  return false;
}

/** Создаёт и настраивает `createBabylonLineOfSightAdapter` в ходе выполнения связанного игрового сценария. */
export function createBabylonLineOfSightAdapter(runtime, getRoots: () => { enemyRoot?: any; playerRoot?: any }) {
  /** Выполняет `return` внутри жизненного цикла класса. */
  return ({ enemy, targetPosition, directionToPlayer, distanceToPlayer }): boolean => {
    const enemyPosition = enemy?.rootNode?.position;
    if (!enemyPosition || !Number.isFinite(distanceToPlayer) || distanceToPlayer <= 0) {
      return false;
    }

    const eyeHeight = 1.15;
    const origin = new runtime.BABYLON.Vector3(enemyPosition.x, enemyPosition.y + eyeHeight, enemyPosition.z);

    const resolvedTarget = targetPosition ?? {
      x: enemyPosition.x + directionToPlayer.x * distanceToPlayer,
      y: enemyPosition.y + directionToPlayer.y * distanceToPlayer,
      z: enemyPosition.z + directionToPlayer.z * distanceToPlayer
    };

    const target = new runtime.BABYLON.Vector3(
      resolvedTarget.x,
      (resolvedTarget.y ?? enemyPosition.y) + eyeHeight,
      resolvedTarget.z
    );

    const toTarget = target.subtract(origin);
    const rayLength = Math.max(0.01, toTarget.length());
    const rayDirection = toTarget.normalize();
    const ray = new runtime.BABYLON.Ray(origin, rayDirection, rayLength);

    const { enemyRoot, playerRoot } = getRoots();

    const hit = runtime.scene.pickWithRay(ray, (mesh) => {
      if (!mesh?.isEnabled?.() || mesh?.isVisible === false) {
        return false;
      }

      if (mesh?.metadata?.isEnemyVisionDebugOverlay === true) {
        return false;
      }

      if (isSameNodeOrDescendant(mesh, enemyRoot)) {
        return false;
      }

      return true;
    });

    if (!hit?.hit || !hit.pickedMesh) {
      return true;
    }

    return isSameNodeOrDescendant(hit.pickedMesh, playerRoot);
  };
}
