// @ts-nocheck
import type { PositionLike, PositionNodeLike } from './runtimeContracts.ts';

const EPSILON = 1e-6;
const DEFAULT_FACING_DIRECTION = Object.freeze({ x: 0, y: 0, z: -1 });

export const DEFAULT_ENEMY_PERCEPTION_SETTINGS = Object.freeze({
  visionAngleDegrees: 70,
  visionDistance: 10
});

export interface EnemyPerceptionSettings {
  visionAngleDegrees: number;
  visionDistance: number;
}

export interface EnemyPerceptionActor {
  id?: string;
  rootNode?: PositionNodeLike;
  perception?: Partial<EnemyPerceptionSettings>;
  facingDirection?: PositionLike;
}

export interface EnemyPerceptionWorld {
  hasLineOfSight?: (params: { enemy: EnemyPerceptionActor; player: EnemyPerceptionActor; directionToPlayer: PositionLike; distanceToPlayer: number }) => boolean;
  logger?: Pick<Console, 'debug' | 'info'>;
}

export interface EnemyPerceptionResult {
  canSeePlayer: boolean;
  reason: 'detected' | 'missing-position' | 'out-of-range' | 'outside-fov' | 'blocked-line-of-sight';
  distanceToPlayer: number;
  angleToPlayerDegrees: number;
  maxVisionDistance: number;
  visionAngleDegrees: number;
}

function resolveLogger(world?: EnemyPerceptionWorld): Pick<Console, 'debug' | 'info'> {
  return world?.logger ?? console;
}

function toVector(from: PositionLike, to: PositionLike): PositionLike {
  return { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
}

function vectorLength(vector: PositionLike): number {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
}

function normalize(vector: PositionLike): PositionLike {
  const length = vectorLength(vector);
  if (length <= EPSILON) {
    return { x: 0, y: 0, z: 0 };
  }

  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

function dot(a: PositionLike, b: PositionLike): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolvePerceptionSettings(enemy: EnemyPerceptionActor): EnemyPerceptionSettings {
  const visionAngleDegrees = Number.isFinite(enemy?.perception?.visionAngleDegrees)
    ? Math.max(0, enemy.perception.visionAngleDegrees)
    : DEFAULT_ENEMY_PERCEPTION_SETTINGS.visionAngleDegrees;
  const visionDistance = Number.isFinite(enemy?.perception?.visionDistance)
    ? Math.max(0, enemy.perception.visionDistance)
    : DEFAULT_ENEMY_PERCEPTION_SETTINGS.visionDistance;

  return { visionAngleDegrees, visionDistance };
}

function resolveFacingDirection(enemy: EnemyPerceptionActor): PositionLike {
  if (enemy?.facingDirection && vectorLength(enemy.facingDirection) > EPSILON) {
    return normalize(enemy.facingDirection);
  }

  return DEFAULT_FACING_DIRECTION;
}

export function canEnemySeePlayer(
  enemy: EnemyPerceptionActor,
  player: EnemyPerceptionActor,
  world: EnemyPerceptionWorld = {}
): EnemyPerceptionResult {
  const logger = resolveLogger(world);
  const enemyPosition = enemy?.rootNode?.position;
  const playerPosition = player?.rootNode?.position;
  const settings = resolvePerceptionSettings(enemy);

  if (!enemyPosition || !playerPosition) {
    logger.debug('[SillyRPG] Enemy perception failed because one or more positions are missing.', {
      enemyId: enemy?.id ?? null,
      playerId: player?.id ?? null
    });
    return {
      canSeePlayer: false,
      reason: 'missing-position',
      distanceToPlayer: Number.POSITIVE_INFINITY,
      angleToPlayerDegrees: Number.POSITIVE_INFINITY,
      maxVisionDistance: settings.visionDistance,
      visionAngleDegrees: settings.visionAngleDegrees
    };
  }

  const toPlayer = toVector(enemyPosition, playerPosition);
  const distanceToPlayer = vectorLength(toPlayer);
  if (distanceToPlayer > settings.visionDistance) {
    logger.debug('[SillyRPG] Enemy perception failed: player is out of range.', {
      enemyId: enemy?.id ?? null,
      playerId: player?.id ?? null,
      distanceToPlayer,
      visionDistance: settings.visionDistance
    });
    return {
      canSeePlayer: false,
      reason: 'out-of-range',
      distanceToPlayer,
      angleToPlayerDegrees: Number.POSITIVE_INFINITY,
      maxVisionDistance: settings.visionDistance,
      visionAngleDegrees: settings.visionAngleDegrees
    };
  }

  const directionToPlayer = normalize(toPlayer);
  const facingDirection = resolveFacingDirection(enemy);
  const dotValue = clamp(dot(facingDirection, directionToPlayer), -1, 1);
  const angleToPlayerDegrees = (Math.acos(dotValue) * 180) / Math.PI;
  const halfFov = settings.visionAngleDegrees * 0.5;

  if (angleToPlayerDegrees > halfFov) {
    logger.debug('[SillyRPG] Enemy perception failed: player is outside FOV.', {
      enemyId: enemy?.id ?? null,
      playerId: player?.id ?? null,
      angleToPlayerDegrees,
      halfFov,
      visionAngleDegrees: settings.visionAngleDegrees
    });
    return {
      canSeePlayer: false,
      reason: 'outside-fov',
      distanceToPlayer,
      angleToPlayerDegrees,
      maxVisionDistance: settings.visionDistance,
      visionAngleDegrees: settings.visionAngleDegrees
    };
  }

  const hasLineOfSight = world?.hasLineOfSight
    ? world.hasLineOfSight({ enemy, player, directionToPlayer, distanceToPlayer })
    : true;
  if (!hasLineOfSight) {
    logger.debug('[SillyRPG] Enemy perception failed: line of sight is blocked.', {
      enemyId: enemy?.id ?? null,
      playerId: player?.id ?? null,
      distanceToPlayer,
      angleToPlayerDegrees
    });
    return {
      canSeePlayer: false,
      reason: 'blocked-line-of-sight',
      distanceToPlayer,
      angleToPlayerDegrees,
      maxVisionDistance: settings.visionDistance,
      visionAngleDegrees: settings.visionAngleDegrees
    };
  }

  return {
    canSeePlayer: true,
    reason: 'detected',
    distanceToPlayer,
    angleToPlayerDegrees,
    maxVisionDistance: settings.visionDistance,
    visionAngleDegrees: settings.visionAngleDegrees
  };
}

export function updateEnemyPerception(
  enemy: EnemyPerceptionActor,
  player: EnemyPerceptionActor,
  world: EnemyPerceptionWorld = {}
): EnemyPerceptionResult {
  const logger = resolveLogger(world);
  logger.debug('[SillyRPG] Running enemy perception check.', {
    enemyId: enemy?.id ?? null,
    playerId: player?.id ?? null,
    visionAngleDegrees: enemy?.perception?.visionAngleDegrees ?? DEFAULT_ENEMY_PERCEPTION_SETTINGS.visionAngleDegrees,
    visionDistance: enemy?.perception?.visionDistance ?? DEFAULT_ENEMY_PERCEPTION_SETTINGS.visionDistance
  });

  const result = canEnemySeePlayer(enemy, player, world);
  if (result.canSeePlayer) {
    logger.info('[SillyRPG] Enemy detected player. Triggering in-place combat.', {
      enemyId: enemy?.id ?? null,
      playerId: player?.id ?? null,
      distanceToPlayer: result.distanceToPlayer,
      angleToPlayerDegrees: result.angleToPlayerDegrees,
      visionDistance: result.maxVisionDistance,
      visionAngleDegrees: result.visionAngleDegrees
    });
  }

  return result;
}
