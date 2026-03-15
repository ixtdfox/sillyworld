// @ts-nocheck
/**
 * Enemy ambient behavior models AI state transitions and patrol decisions.
 * It owns decision state, while shared movement systems execute spatial changes.
 */
import type { PositionLike, PositionNodeLike } from '../spatial/types.ts';
import {
  areCellsEqual,
  normalizeGridCell
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

function ensurePatrolCells(
  behavior: EnemyAmbientBehavior,
  gridMapper?: { worldToGridCell: (position: PositionLike) => { x: number; z: number } }
): { x: number; z: number }[] {
  if (behavior.patrolCells.length > 0) {
    return behavior.patrolCells;
  }

  if (!gridMapper || behavior.patrolPoints.length <= 0) {
    return [];
  }

  behavior.patrolCells = behavior.patrolPoints
    .map((point) => normalizeGridCell(gridMapper.worldToGridCell(point)))
    .filter(Boolean);

  return behavior.patrolCells;
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

/**
 * Updates ambient AI state and returns next requested patrol cell.
 * Returned destination is a movement intent; callers decide how movement executes.
 */
export function updateEnemyAmbientBehavior(params: {
  enemyRootNode?: PositionNodeLike;
  behavior: EnemyAmbientBehavior;
  currentCell?: { x: number; z: number } | null;
  deltaSeconds?: number;
  gridMapper?: {
    worldToGridCell: (position: PositionLike) => { x: number; z: number };
  };
}): EnemyAmbientBehavior & { requestedDestinationCell: { x: number; z: number } | null } {
  const behavior = params.behavior;
  const enemyRootNode = params.enemyRootNode;
  const deltaSeconds = Number.isFinite(params.deltaSeconds) ? Math.max(0, params.deltaSeconds ?? 0) : 0;

  if (!behavior || deltaSeconds <= 0) {
    return {
      ...behavior,
      requestedDestinationCell: null
    };
  }

  behavior.stateTimeRemaining -= deltaSeconds;
  if (behavior.stateTimeRemaining <= 0) {
    enterState(behavior, nextState(behavior));
  }

  if (behavior.state === 'lookAround') {
    const currentYaw = yawFromDirection(behavior.facingDirection);
    const nextYaw = currentYaw + behavior.lookAroundAngularSpeed * deltaSeconds;
    behavior.facingDirection = directionFromYaw(nextYaw);
    if (enemyRootNode) {
      setRootYaw(enemyRootNode, nextYaw);
    }
    return {
      ...behavior,
      requestedDestinationCell: null
    };
  }

  if (behavior.state !== 'patrol') {
    return {
      ...behavior,
      requestedDestinationCell: null
    };
  }

  const patrolCells = ensurePatrolCells(behavior, params.gridMapper);
  if (patrolCells.length <= 0) {
    enterState(behavior, 'lookAround');
    return {
      ...behavior,
      requestedDestinationCell: null
    };
  }

  behavior.patrolStepAccumulatorSeconds += deltaSeconds;
  if (behavior.patrolStepAccumulatorSeconds < behavior.patrolStepIntervalSeconds) {
    return {
      ...behavior,
      requestedDestinationCell: null
    };
  }

  behavior.patrolStepAccumulatorSeconds = 0;
  const targetCell = patrolCells[behavior.currentPatrolIndex % patrolCells.length] ?? null;
  if (!targetCell) {
    return {
      ...behavior,
      requestedDestinationCell: null
    };
  }

  const currentCell = params.currentCell ?? enemyRootNode?.gridCell ?? null;
  if (currentCell && areCellsEqual(currentCell, targetCell)) {
    behavior.currentPatrolIndex = (behavior.currentPatrolIndex + 1) % patrolCells.length;
    enterState(behavior, 'lookAround');
    return {
      ...behavior,
      requestedDestinationCell: null
    };
  }

  if (currentCell) {
    behavior.facingDirection = normalize({ x: targetCell.x - currentCell.x, y: 0, z: targetCell.z - currentCell.z });
    if (enemyRootNode) {
      setRootYaw(enemyRootNode, yawFromDirection(behavior.facingDirection));
    }
  }

  return {
    ...behavior,
    requestedDestinationCell: targetCell
  };
}
