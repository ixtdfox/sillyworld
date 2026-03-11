import {
  DEFAULT_ENEMY_NORMALIZATION_ID,
  DEFAULT_PLAYER_NORMALIZATION_ID,
  ENTITY_NORMALIZATION_CONFIG
} from './entityNormalizationConfig.js';

const REQUIRED_FIELDS = Object.freeze([
  'targetHeight',
  'collisionRadius',
  'collisionHeight',
  'attackRange'
]);

function isFinitePositiveNumber(value) {
  return Number.isFinite(value) && value > 0;
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function resolveEntityNormalizationConfig(configId) {
  const config = configId ? ENTITY_NORMALIZATION_CONFIG[configId] : null;

  if (!config) {
    throw new Error(`Missing entity normalization config for id: ${configId}`);
  }

  for (const fieldName of REQUIRED_FIELDS) {
    if (!isFinitePositiveNumber(config[fieldName])) {
      throw new Error(`Entity normalization config \"${configId}\" has invalid required field: ${fieldName}`);
    }
  }

  return config;
}

export function applyEntityNormalization(runtime, entity, normalizationConfig) {
  const rootNode = entity?.rootNode;
  if (!rootNode) {
    throw new Error('Cannot normalize entity without a root node.');
  }

  rootNode.computeWorldMatrix?.(true);

  const bounds = rootNode.getHierarchyBoundingVectors?.();
  const sourceHeight = bounds ? bounds.max.y - bounds.min.y : NaN;

  if (isFinitePositiveNumber(sourceHeight)) {
    const uniformScale = normalizationConfig.targetHeight / sourceHeight;
    rootNode.scaling.scaleInPlace(uniformScale);
  } else {
    console.warn('[SillyRPG] Entity normalization skipped source scale calibration because source bounds were invalid.', {
      debugLabel: normalizationConfig.debugLabel
    });
  }

  if (Number.isFinite(normalizationConfig.groundOffset)) {
    rootNode.position.y += normalizationConfig.groundOffset;
  }

  if (normalizationConfig.orientationCorrection) {
    const pitchDegrees = normalizationConfig.orientationCorrection.pitchDegrees ?? 0;
    const yawDegrees = normalizationConfig.orientationCorrection.yawDegrees ?? 0;
    const rollDegrees = normalizationConfig.orientationCorrection.rollDegrees ?? 0;

    rootNode.rotation = new runtime.BABYLON.Vector3(
      toRadians(pitchDegrees),
      toRadians(yawDegrees),
      toRadians(rollDegrees)
    );
  }
}

export function resolvePlayerNormalizationConfigId(options = {}) {
  return options.playerNormalizationId ?? DEFAULT_PLAYER_NORMALIZATION_ID;
}

export function resolveEnemyNormalizationConfigId(options = {}) {
  return options.enemyNormalizationId ?? DEFAULT_ENEMY_NORMALIZATION_ID;
}
