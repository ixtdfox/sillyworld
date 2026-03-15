// @ts-nocheck
import {
  resolveEntityNormalizationConfig,
  getEntityNormalizationConfig,
  hasEntityNormalizationConfig,
  createEntityNormalizationConfigStore,
  resolvePlayerNormalizationConfigId,
  resolveEnemyNormalizationConfigId
} from '../../world/entity/entityNormalization.ts';
import {
  getEntityVisualHeight,
  placeEntityOnGround,
  refreshEntityWorldMatrices
} from './entityVisualBounds.ts';

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export {
  createEntityNormalizationConfigStore,
  getEntityNormalizationConfig,
  hasEntityNormalizationConfig,
  resolveEntityNormalizationConfig,
  resolvePlayerNormalizationConfigId,
  resolveEnemyNormalizationConfigId
};

export function applyEntityNormalization(runtime, entity, normalizationConfig) {
  const rootNode = entity?.rootNode;
  if (!rootNode) {
    throw new Error('Cannot normalize entity without a root node.');
  }

  const normalization = fitModelToHeight(rootNode, normalizationConfig.targetHeight, {
    includeMetrics: true,
    debugLabel: normalizationConfig.debugLabel
  });

  placeEntityOnGround(rootNode, {
    groundOffset: normalizationConfig.groundOffset,
    debugLabel: normalizationConfig.debugLabel
  });

  if (normalizationConfig.orientationCorrection) {
    const pitchDegrees = normalizationConfig.orientationCorrection.pitchDegrees;
    const yawDegrees = normalizationConfig.orientationCorrection.yawDegrees;
    const rollDegrees = normalizationConfig.orientationCorrection.rollDegrees;

    rootNode.rotation = new runtime.BABYLON.Vector3(
      toRadians(pitchDegrees),
      toRadians(yawDegrees),
      toRadians(rollDegrees)
    );
  }

  refreshEntityWorldMatrices(rootNode);

  return {
    targetHeight: normalizationConfig.targetHeight,
    sourceHeight: normalization.sourceHeight,
    scaleFactor: normalization.scaleFactor
  };
}

export function fitModelToHeight(entityOrRootNode, targetHeight, options = {}) {
  if (!Number.isFinite(targetHeight) || targetHeight <= 0) {
    throw new Error(`Cannot fit model to height: targetHeight must be a finite number > 0 (received ${String(targetHeight)}).`);
  }

  const rootNode = refreshEntityWorldMatrices(entityOrRootNode);
  const sourceHeight = getEntityVisualHeight(rootNode);

  if (!Number.isFinite(sourceHeight) || sourceHeight <= 0) {
    const debugLabel = options.debugLabel ? ` for ${options.debugLabel}` : '';
    throw new Error(
      `Cannot fit model to height${debugLabel}: measured source height must be a finite number > 0 (received ${String(sourceHeight)}).`
    );
  }

  const uniformScale = targetHeight / sourceHeight;
  if (typeof rootNode.scaling?.scaleInPlace !== 'function') {
    throw new Error('Cannot fit model to height: root node scaling.scaleInPlace(amount) is required.');
  }

  rootNode.scaling.scaleInPlace(uniformScale);
  refreshEntityWorldMatrices(rootNode);

  if (options.includeMetrics) {
    return {
      sourceHeight,
      scaleFactor: uniformScale
    };
  }

  return uniformScale;
}
