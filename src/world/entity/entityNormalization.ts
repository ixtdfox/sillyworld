// @ts-nocheck
import {
  DEFAULT_ENEMY_NORMALIZATION_ID,
  DEFAULT_PLAYER_NORMALIZATION_ID,
  ENTITY_NORMALIZATION_CONFIG
} from './entityNormalizationConfig.ts';

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function assertField(configId, fieldName, value, validator, expectation) {
  if (!validator(value)) {
    throw new Error(
      `Invalid entity normalization config "${configId}": field "${fieldName}" must be ${expectation} (received ${String(value)}).`
    );
  }
}

function normalizeOrientationCorrection(configId, value) {
  if (value == null) return null;
  if (typeof value !== 'object') {
    throw new Error(
      `Invalid entity normalization config "${configId}": field "orientationCorrection" must be an object when provided.`
    );
  }

  const pitchDegrees = value.pitchDegrees ?? 0;
  const yawDegrees = value.yawDegrees ?? 0;
  const rollDegrees = value.rollDegrees ?? 0;

  assertField(configId, 'orientationCorrection.pitchDegrees', pitchDegrees, isFiniteNumber, 'a finite number');
  assertField(configId, 'orientationCorrection.yawDegrees', yawDegrees, isFiniteNumber, 'a finite number');
  assertField(configId, 'orientationCorrection.rollDegrees', rollDegrees, isFiniteNumber, 'a finite number');

  return Object.freeze({ pitchDegrees, yawDegrees, rollDegrees });
}

function normalizeConfigEntry(configId, entry) {
  if (!entry || typeof entry !== 'object') {
    throw new Error(`Invalid entity normalization config "${configId}": entry must be an object.`);
  }

  const targetHeight = entry.targetHeight;
  const collisionRadius = entry.collisionRadius;
  const collisionHeight = entry.collisionHeight;
  const attackRange = entry.attackRange;

  assertField(configId, 'targetHeight', targetHeight, (value) => isFiniteNumber(value) && value > 0, '> 0');
  assertField(configId, 'collisionRadius', collisionRadius, (value) => isFiniteNumber(value) && value > 0, '> 0');
  assertField(configId, 'collisionHeight', collisionHeight, (value) => isFiniteNumber(value) && value > 0, '> 0');
  assertField(configId, 'attackRange', attackRange, (value) => isFiniteNumber(value) && value >= 0, '>= 0');

  const interactionRadius = isFiniteNumber(entry.interactionRadius) ? Math.max(0, entry.interactionRadius) : attackRange;
  const groundOffset = isFiniteNumber(entry.groundOffset) ? entry.groundOffset : 0;

  const normalized = {
    ...entry,
    targetHeight,
    collisionRadius,
    collisionHeight,
    attackRange,
    interactionRadius,
    groundOffset,
    orientationCorrection: normalizeOrientationCorrection(configId, entry.orientationCorrection),
    debugLabel: entry.debugLabel ?? configId
  };

  return Object.freeze(normalized);
}

export function createEntityNormalizationConfigStore(rawConfig = {}) {
  if (!rawConfig || typeof rawConfig !== 'object') {
    throw new Error('Entity normalization config root must be an object.');
  }

  const normalizedByConfigId = new Map();
  const configIdByEntityId = new Map();

  for (const [configId, entry] of Object.entries(rawConfig)) {
    const normalizedEntry = normalizeConfigEntry(configId, entry);

    normalizedByConfigId.set(configId, normalizedEntry);

    const aliases = new Set(
      [configId, normalizedEntry.entityId, normalizedEntry.archetypeId]
        .filter((value) => typeof value === 'string' && value.length > 0)
    );

    for (const alias of aliases) {
      if (configIdByEntityId.has(alias)) {
        const existing = configIdByEntityId.get(alias);
        throw new Error(
          `Duplicate entity normalization identifier "${alias}" found in configs "${existing}" and "${configId}".`
        );
      }
      configIdByEntityId.set(alias, configId);
    }
  }

  function resolveConfigId(entityId) {
    if (typeof entityId !== 'string' || entityId.length === 0) {
      throw new Error(`Entity normalization config id must be a non-empty string (received ${String(entityId)}).`);
    }

    const configId = configIdByEntityId.get(entityId);
    if (!configId) {
      throw new Error(`Missing entity normalization config for entity id: ${entityId}`);
    }
    return configId;
  }

  function getEntityNormalizationConfig(entityId) {
    return normalizedByConfigId.get(resolveConfigId(entityId));
  }

  function hasEntityNormalizationConfig(entityId) {
    if (typeof entityId !== 'string' || entityId.length === 0) return false;
    return configIdByEntityId.has(entityId);
  }

  return Object.freeze({
    getEntityNormalizationConfig,
    hasEntityNormalizationConfig,
    getAllEntityNormalizationConfigs: () => Object.freeze(Object.fromEntries(normalizedByConfigId.entries()))
  });
}

const ENTITY_NORMALIZATION_STORE = createEntityNormalizationConfigStore(ENTITY_NORMALIZATION_CONFIG);

export function getEntityNormalizationConfig(entityId) {
  return ENTITY_NORMALIZATION_STORE.getEntityNormalizationConfig(entityId);
}

export function hasEntityNormalizationConfig(entityId) {
  return ENTITY_NORMALIZATION_STORE.hasEntityNormalizationConfig(entityId);
}

export function resolveEntityNormalizationConfig(configId) {
  return getEntityNormalizationConfig(configId);
}

export function resolvePlayerNormalizationConfigId(options = {}) {
  return options.playerNormalizationId ?? DEFAULT_PLAYER_NORMALIZATION_ID;
}

export function resolveEnemyNormalizationConfigId(options = {}) {
  return options.enemyNormalizationId ?? DEFAULT_ENEMY_NORMALIZATION_ID;
}
