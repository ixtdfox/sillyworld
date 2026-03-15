// @ts-nocheck
/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей.
 */
const DEFAULT_ATTACK_RANGE = 1;

/** Выполняет `toFiniteOrFallback` в ходе выполнения связанного игрового сценария. */
function toFiniteOrFallback(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

/** Создаёт и настраивает `createEntityGameplayDimensions` в ходе выполнения связанного игрового сценария. */
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
