// @ts-nocheck
/**
 * Canonical per-entity normalization settings.
 * All distance values are world units where 1 unit = 1 meter.
 */

/**
 * @typedef {Object} OrientationCorrection
 * @property {number} [pitchDegrees]
 * @property {number} [yawDegrees]
 * @property {number} [rollDegrees]
 */

/**
 * @typedef {Object} EntityNormalizationConfig
 * @property {string} [entityId]
 * @property {string} [archetypeId]
 * @property {number} targetHeight
 * @property {number} collisionRadius
 * @property {number} collisionHeight
 * @property {number} attackRange
 * @property {number} [interactionRadius]
 * @property {number} [groundOffset]
 * @property {OrientationCorrection} [orientationCorrection]
 * @property {string} [debugLabel]
 */

/** @type {Record<string, EntityNormalizationConfig>} */
export const ENTITY_NORMALIZATION_CONFIG = Object.freeze({
  player: Object.freeze({
    entityId: 'player',
    targetHeight: 1.8,
    collisionRadius: 0.35,
    collisionHeight: 1.8,
    attackRange: 1.5,
    interactionRadius: 2,
    groundOffset: 0,
    debugLabel: 'Player'
  }),
  enemy_humanoid_raider: Object.freeze({
    archetypeId: 'enemy_humanoid_raider',
    targetHeight: 1.9,
    collisionRadius: 0.4,
    collisionHeight: 1.9,
    attackRange: 1.6,
    interactionRadius: 2,
    groundOffset: 0,
    debugLabel: 'Humanoid Raider'
  }),
  monster_stone_golem: Object.freeze({
    archetypeId: 'monster_stone_golem',
    targetHeight: 3.4,
    collisionRadius: 1,
    collisionHeight: 3.4,
    attackRange: 2.4,
    interactionRadius: 3,
    groundOffset: 0,
    orientationCorrection: Object.freeze({
      yawDegrees: 180
    }),
    debugLabel: 'Stone Golem'
  })
});

export const DEFAULT_PLAYER_NORMALIZATION_ID = 'player';
export const DEFAULT_ENEMY_NORMALIZATION_ID = 'enemy_humanoid_raider';
