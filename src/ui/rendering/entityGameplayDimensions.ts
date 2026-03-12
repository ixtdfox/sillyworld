const DEFAULT_ATTACK_RANGE = 1;

function toFiniteOrFallback(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function createEntityGameplayDimensions(normalizationConfig) {
  if (!normalizationConfig || typeof normalizationConfig !== 'object') {
    throw new Error('Cannot create entity gameplay dimensions without a normalization config object.');
  }

  return Object.freeze({
    collisionRadius: toFiniteOrFallback(normalizationConfig.collisionRadius, 0),
    collisionHeight: toFiniteOrFallback(normalizationConfig.collisionHeight, 0),
    attackRange: toFiniteOrFallback(normalizationConfig.attackRange, DEFAULT_ATTACK_RANGE),
    interactionRadius: toFiniteOrFallback(normalizationConfig.interactionRadius, normalizationConfig.attackRange)
  });
}

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
