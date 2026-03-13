// @ts-nocheck
import type { PositionLike, PositionNodeLike } from '../spatial/types.ts';
import {
  areCellsEqual,
  resolveWorldPositionFromCell,
  stepCellTowardsTarget
} from '../movement/gridMovement.ts';

const DEFAULT_FACING_DIRECTION = Object.freeze({ x: 0, y: 0, z: -1 });

export type EnemyAmbientState = 'idle' | 'lookAround' | 'patrol';

export interface EnemyAmbientBehavior {
  state: EnemyAmbientState;
  stateTimeRemaining: number;
  facingDirection: PositionLike;
  lookAroundAngularSpeed: number;
  patrolPoints: PositionLike[];
  patrolCells: { x: number; z: number }[];
  currentPatrolIndex: number;
  patrolStepIntervalSeconds: number;
  patrolStepAccumulatorSeconds: number;
}

function normalize(vector: PositionLike): PositionLike {
  const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
  if (length <= 1e-5) {
    return { ...DEFAULT_FACING_DIRECTION };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

function yawFromDirection(direction: PositionLike): number {
  return Math.atan2(direction.x, direction.z);
}

function directionFromYaw(yaw: number): PositionLike {
  return normalize({ x: Math.sin(yaw), y: 0, z: Math.cos(yaw) });
}

function setRootYaw(rootNode: PositionNodeLike, yaw: number): void {
  if (!rootNode || !Number.isFinite(yaw)) {
    return;
  }

  if (rootNode.rotationQuaternion !== undefined) {
    rootNode.rotationQuaternion = null;
  }

  rootNode.rotation = rootNode.rotation ?? { x: 0, y: 0, z: 0 };
  rootNode.rotation.y = yaw;
}

function nextState(behavior: EnemyAmbientBehavior): EnemyAmbientState {
  if (behavior.state === 'idle') {
    return 'lookAround';
  }

  if (behavior.state === 'lookAround') {
    return (behavior.patrolCells.length > 0 || behavior.patrolPoints.length > 0) ? 'patrol' : 'idle';
  }

  return 'lookAround';
}

function enterState(behavior: EnemyAmbientBehavior, state: EnemyAmbientState): void {
  behavior.state = state;

  if (state === 'idle') {
    behavior.stateTimeRemaining = 1.5;
  } else if (state === 'lookAround') {
    behavior.stateTimeRemaining = 2.25;
  } else {
    behavior.stateTimeRemaining = Number.POSITIVE_INFINITY;
  }
}

export function createEnemyAmbientBehavior(options: {
  facingDirection?: PositionLike;
  patrolPoints?: PositionLike[];
  patrolCells?: { x: number; z: number }[];
  patrolStepIntervalSeconds?: number;
} = {}): EnemyAmbientBehavior {
  return {
    state: 'idle',
    stateTimeRemaining: 1.5,
    facingDirection: normalize(options.facingDirection ?? DEFAULT_FACING_DIRECTION),
    lookAroundAngularSpeed: 0.9,
    patrolPoints: Array.isArray(options.patrolPoints) ? [...options.patrolPoints] : [],
    patrolCells: Array.isArray(options.patrolCells) ? [...options.patrolCells] : [],
    currentPatrolIndex: 0,
    patrolStepIntervalSeconds: Number.isFinite(options.patrolStepIntervalSeconds) ? Math.max(0.1, options.patrolStepIntervalSeconds) : 0.3,
    patrolStepAccumulatorSeconds: 0
  };
}

export function updateEnemyAmbientBehavior(params: {
  enemyRootNode?: PositionNodeLike;
  behavior: EnemyAmbientBehavior;
  deltaSeconds?: number;
  gridMapper?: {
    worldToGridCell: (position: PositionLike) => { x: number; z: number };
    gridCellToWorld: (cell: { x: number; z: number }, transform?: { resolveY?: ({ x, z }: { x: number; z: number }) => number; fallbackY?: number }) => PositionLike;
  };
  resolveGroundY?: ({ x, z, fallbackY }: { x: number; z: number; fallbackY?: number }) => number;
}): EnemyAmbientBehavior {
  const behavior = params.behavior;
  const enemyRootNode = params.enemyRootNode;
  const deltaSeconds = Number.isFinite(params.deltaSeconds) ? Math.max(0, params.deltaSeconds ?? 0) : 0;

  if (!behavior || !enemyRootNode?.position || deltaSeconds <= 0) {
    return behavior;
  }

  behavior.stateTimeRemaining -= deltaSeconds;
  if (behavior.stateTimeRemaining <= 0) {
    enterState(behavior, nextState(behavior));
  }

  if (behavior.state === 'lookAround') {
    const currentYaw = yawFromDirection(behavior.facingDirection);
    const nextYaw = currentYaw + behavior.lookAroundAngularSpeed * deltaSeconds;
    behavior.facingDirection = directionFromYaw(nextYaw);
    setRootYaw(enemyRootNode, nextYaw);
    return behavior;
  }

  if (behavior.state === 'patrol' && params.gridMapper) {
    const patrolCells = behavior.patrolCells.length > 0
      ? behavior.patrolCells
      : behavior.patrolPoints.map((point) => params.gridMapper!.worldToGridCell(point));

    if (patrolCells.length <= 0) {
      enterState(behavior, 'lookAround');
      return behavior;
    }

    if (behavior.patrolCells.length <= 0) {
      behavior.patrolCells = patrolCells;
    }

    const currentCell = enemyRootNode.gridCell ?? params.gridMapper.worldToGridCell(enemyRootNode.position);
    const centeredCurrentWorld = resolveWorldPositionFromCell({
      cell: currentCell,
      gridMapper: params.gridMapper,
      resolveGroundY: params.resolveGroundY,
      fallbackY: enemyRootNode.position.y
    });

    enemyRootNode.position.x = centeredCurrentWorld.x;
    enemyRootNode.position.y = centeredCurrentWorld.y;
    enemyRootNode.position.z = centeredCurrentWorld.z;
    enemyRootNode.gridCell = currentCell;

    behavior.patrolStepAccumulatorSeconds += deltaSeconds;
    if (behavior.patrolStepAccumulatorSeconds < behavior.patrolStepIntervalSeconds) {
      return behavior;
    }

    behavior.patrolStepAccumulatorSeconds = 0;

    const targetCell = patrolCells[behavior.currentPatrolIndex % patrolCells.length];

    if (areCellsEqual(currentCell, targetCell)) {
      behavior.currentPatrolIndex = (behavior.currentPatrolIndex + 1) % patrolCells.length;
      enterState(behavior, 'lookAround');
      return behavior;
    }

    const nextCell = stepCellTowardsTarget(currentCell, targetCell) ?? currentCell;

    const toDirection = normalize({ x: nextCell.x - currentCell.x, y: 0, z: nextCell.z - currentCell.z });
    const world = resolveWorldPositionFromCell({
      cell: nextCell,
      gridMapper: params.gridMapper,
      resolveGroundY: params.resolveGroundY,
      fallbackY: enemyRootNode.position.y
    });

    enemyRootNode.position.x = world.x;
    enemyRootNode.position.y = world.y;
    enemyRootNode.position.z = world.z;
    enemyRootNode.gridCell = nextCell;
    behavior.facingDirection = toDirection;
    setRootYaw(enemyRootNode, yawFromDirection(toDirection));
  }

  return behavior;
}
