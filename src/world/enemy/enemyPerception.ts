// @ts-nocheck
import type { PositionLike, PositionNodeLike } from '../../ui/rendering/shared/runtimeContracts.ts';

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
  hasLineOfSight?: (params: { enemy: EnemyPerceptionActor; player?: EnemyPerceptionActor; targetPosition?: PositionLike; directionToPlayer: PositionLike; distanceToPlayer: number }) => boolean;
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

export interface EnemyPerceptionGridMapper {
  cellSize?: number;
  worldToGridCell: (position: PositionLike) => { x: number; z: number };
  gridCellToWorld: (cell: { x: number; z: number }, transform?: { fallbackY?: number }) => PositionLike;
}

export interface EnemyVisionCoverageCell {
  x: number;
  z: number;
}

export interface EnemyVisionCoverage {
  enemyCell: EnemyVisionCoverageCell | null;
  visibleCells: EnemyVisionCoverageCell[];
  blockedCells: EnemyVisionCoverageCell[];
}

export interface EnemyPerceptionPipelineResult {
  enemyPosition: PositionLike | null;
  facingDirection: PositionLike;
  enemyCell: EnemyVisionCoverageCell | null;
  playerPosition: PositionLike | null;
  playerCell: EnemyVisionCoverageCell | null;
  visibleCells: EnemyVisionCoverageCell[];
  blockedCells: EnemyVisionCoverageCell[];
  playerCellVisible: boolean;
  perceptionResult: EnemyPerceptionResult;
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

function evaluateEnemyVisionTarget(
  enemy: EnemyPerceptionActor,
  targetPosition: PositionLike,
  world: EnemyPerceptionWorld = {},
  player?: EnemyPerceptionActor
): EnemyPerceptionResult {
  const settings = resolvePerceptionSettings(enemy);
  const enemyPosition = enemy?.rootNode?.position;
  if (!enemyPosition || !targetPosition) {
    return {
      canSeePlayer: false,
      reason: 'missing-position',
      distanceToPlayer: Number.POSITIVE_INFINITY,
      angleToPlayerDegrees: Number.POSITIVE_INFINITY,
      maxVisionDistance: settings.visionDistance,
      visionAngleDegrees: settings.visionAngleDegrees
    };
  }

  const toPlayer = toVector(enemyPosition, targetPosition);
  const distanceToPlayer = vectorLength(toPlayer);
  if (distanceToPlayer > settings.visionDistance) {
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
    ? world.hasLineOfSight({ enemy, player, targetPosition, directionToPlayer, distanceToPlayer })
    : true;
  if (!hasLineOfSight) {
    return {
      canSeePlayer: false,
      reason: 'blocked-line-of-sight',
      distanceToPlayer,
      angleToPlayerDegrees,
      maxVisionDistance: settings.visionDistance,
      visionAngleDegrees: settings.visionAngleDegrees
    };
  }
  const logger = resolveLogger(world);
  logger.debug('[SillyRPG] Enemy SEEE PLAYET!.', {
    enemyId: enemy?.id ?? null,
    playerId: player?.id ?? null,
    distanceToPlayer: distanceToPlayer,
    angleToPlayerDegrees: angleToPlayerDegrees
  });
  return {
    canSeePlayer: true,
    reason: 'detected',
    distanceToPlayer,
    angleToPlayerDegrees,
    maxVisionDistance: settings.visionDistance,
    visionAngleDegrees: settings.visionAngleDegrees
  };
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

  const result = evaluateEnemyVisionTarget(enemy, playerPosition, world, player);
  /*if (result.reason === 'out-of-range') {
    logger.debug('[SillyRPG] Enemy perception failed: player is out of range.', {
      enemyId: enemy?.id ?? null,
      playerId: player?.id ?? null,
      distanceToPlayer: result.distanceToPlayer,
      visionDistance: settings.visionDistance
    });
  } else if (result.reason === 'outside-fov') {
    logger.debug('[SillyRPG] Enemy perception failed: player is outside FOV.', {
      enemyId: enemy?.id ?? null,
      playerId: player?.id ?? null,
      angleToPlayerDegrees: result.angleToPlayerDegrees,
      halfFov: settings.visionAngleDegrees * 0.5,
      visionAngleDegrees: settings.visionAngleDegrees
    });
  } else if (result.reason === 'blocked-line-of-sight') {
    logger.debug('[SillyRPG] Enemy perception failed: line of sight is blocked.', {
      enemyId: enemy?.id ?? null,
      playerId: player?.id ?? null,
      distanceToPlayer: result.distanceToPlayer,
      angleToPlayerDegrees: result.angleToPlayerDegrees
    });
  }*/

  return result;
}

export function getEnemyVisionCoverage(
  enemy: EnemyPerceptionActor,
  gridMapper: EnemyPerceptionGridMapper,
  world: EnemyPerceptionWorld = {}
): EnemyVisionCoverage {
  const enemyPosition = enemy?.rootNode?.position;
  if (!enemyPosition || !gridMapper) {
    return { enemyCell: null, visibleCells: [], blockedCells: [] };
  }

  const enemyCell = gridMapper.worldToGridCell(enemyPosition);
  const settings = resolvePerceptionSettings(enemy);
  const cellSize = Math.max(EPSILON, gridMapper.cellSize ?? 1);
  const radiusCells = Math.max(1, Math.ceil(settings.visionDistance / cellSize));
  const visibleCells: EnemyVisionCoverageCell[] = [];
  const blockedCells: EnemyVisionCoverageCell[] = [];

  for (let x = enemyCell.x - radiusCells; x <= enemyCell.x + radiusCells; x += 1) {
    for (let z = enemyCell.z - radiusCells; z <= enemyCell.z + radiusCells; z += 1) {
      const targetPosition = gridMapper.gridCellToWorld({ x, z }, { fallbackY: enemyPosition.y });
      const result = evaluateEnemyVisionTarget(enemy, targetPosition, world);
      if (result.reason === 'detected') {
        visibleCells.push({ x, z });
      } else if (result.reason === 'blocked-line-of-sight') {
        blockedCells.push({ x, z });
      }
    }
  }

  return {
    enemyCell,
    visibleCells,
    blockedCells
  };
}

export function evaluateEnemyPerceptionPipeline(
  enemy: EnemyPerceptionActor,
  player: EnemyPerceptionActor,
  gridMapper: EnemyPerceptionGridMapper,
  world: EnemyPerceptionWorld = {}
): EnemyPerceptionPipelineResult {
  const enemyPosition = enemy?.rootNode?.position ?? null;
  const playerPosition = player?.rootNode?.position ?? null;
  const facingDirection = resolveFacingDirection(enemy);
  const coverage = getEnemyVisionCoverage(enemy, gridMapper, world);
  const playerCell = playerPosition ? gridMapper.worldToGridCell(playerPosition) : null;
  const playerCellVisible = Boolean(
    playerCell && coverage.visibleCells.some((cell) => cell.x === playerCell.x && cell.z === playerCell.z)
  );

  const perceptionResult = canEnemySeePlayer(enemy, player, world);

  return {
    enemyPosition,
    facingDirection,
    enemyCell: coverage.enemyCell,
    playerPosition,
    playerCell,
    visibleCells: coverage.visibleCells,
    blockedCells: coverage.blockedCells,
    playerCellVisible,
    perceptionResult
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
