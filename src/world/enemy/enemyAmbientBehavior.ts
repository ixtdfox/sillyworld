// @ts-nocheck
import type { PositionLike, PositionNodeLike } from '../../ui/rendering/runtimeContracts.ts';

const EPSILON = 1e-5;
const DEFAULT_FACING_DIRECTION = Object.freeze({ x: 0, y: 0, z: -1 });

export type EnemyAmbientState = 'idle' | 'lookAround' | 'patrol';

export interface EnemyAmbientBehavior {
  state: EnemyAmbientState;
  stateTimeRemaining: number;
  facingDirection: PositionLike;
  lookAroundAngularSpeed: number;
  patrolSpeed: number;
  patrolPoints: PositionLike[];
  currentPatrolIndex: number;
  patrolArrivalThreshold: number;
}

function vectorLength(vector: PositionLike): number {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
}

function normalize(vector: PositionLike): PositionLike {
  const length = vectorLength(vector);
  if (length <= EPSILON) {
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
    return behavior.patrolPoints.length > 0 ? 'patrol' : 'idle';
  }

  return 'lookAround';
}

function enterState(behavior: EnemyAmbientBehavior, state: EnemyAmbientState, logger: Pick<Console, 'debug'>): void {
  behavior.state = state;

  if (state === 'idle') {
    behavior.stateTimeRemaining = 1.5;
  } else if (state === 'lookAround') {
    behavior.stateTimeRemaining = 2.25;
  } else {
    behavior.stateTimeRemaining = Number.POSITIVE_INFINITY;
  }

  logger.debug('[SillyRPG] Enemy ambient AI state changed.', {
    state,
    patrolPointIndex: behavior.currentPatrolIndex,
    patrolPointCount: behavior.patrolPoints.length
  });
}

export function createEnemyAmbientBehavior(options: {
  facingDirection?: PositionLike;
  patrolPoints?: PositionLike[];
  lookAroundAngularSpeed?: number;
  patrolSpeed?: number;
  patrolArrivalThreshold?: number;
} = {}): EnemyAmbientBehavior {
  return {
    state: 'idle',
    stateTimeRemaining: 1.5,
    facingDirection: normalize(options.facingDirection ?? DEFAULT_FACING_DIRECTION),
    lookAroundAngularSpeed: Number.isFinite(options.lookAroundAngularSpeed) ? Math.max(0.1, options.lookAroundAngularSpeed) : 0.9,
    patrolSpeed: Number.isFinite(options.patrolSpeed) ? Math.max(0.25, options.patrolSpeed) : 1.15,
    patrolPoints: Array.isArray(options.patrolPoints) ? [...options.patrolPoints] : [],
    currentPatrolIndex: 0,
    patrolArrivalThreshold: Number.isFinite(options.patrolArrivalThreshold) ? Math.max(0.05, options.patrolArrivalThreshold) : 0.25
  };
}

export function updateEnemyAmbientBehavior(params: {
  enemyRootNode?: PositionNodeLike;
  behavior: EnemyAmbientBehavior;
  deltaSeconds?: number;
  logger?: Pick<Console, 'debug'>;
}): EnemyAmbientBehavior {
  const behavior = params.behavior;
  const enemyRootNode = params.enemyRootNode;
  const logger = params.logger ?? console;
  const deltaSeconds = Number.isFinite(params.deltaSeconds) ? Math.max(0, params.deltaSeconds ?? 0) : 0;

  if (!behavior || !enemyRootNode?.position || deltaSeconds <= 0) {
    return behavior;
  }

  behavior.stateTimeRemaining -= deltaSeconds;
  if (behavior.stateTimeRemaining <= 0) {
    enterState(behavior, nextState(behavior), logger);
  }

  if (behavior.state === 'lookAround') {
    const currentYaw = yawFromDirection(behavior.facingDirection);
    const nextYaw = currentYaw + behavior.lookAroundAngularSpeed * deltaSeconds;
    behavior.facingDirection = directionFromYaw(nextYaw);
    setRootYaw(enemyRootNode, nextYaw);
    return behavior;
  }

  if (behavior.state === 'patrol' && behavior.patrolPoints.length > 0) {
    const target = behavior.patrolPoints[behavior.currentPatrolIndex % behavior.patrolPoints.length];
    const toTarget = {
      x: target.x - enemyRootNode.position.x,
      y: 0,
      z: target.z - enemyRootNode.position.z
    };

    const distanceToTarget = vectorLength(toTarget);
    if (distanceToTarget <= behavior.patrolArrivalThreshold) {
      behavior.currentPatrolIndex = (behavior.currentPatrolIndex + 1) % behavior.patrolPoints.length;
      logger.debug('[SillyRPG] Enemy reached patrol point.', {
        reachedPatrolPoint: { x: target.x, y: target.y, z: target.z },
        nextPatrolPointIndex: behavior.currentPatrolIndex
      });
      enterState(behavior, 'lookAround', logger);
      return behavior;
    }

    const stepDistance = Math.min(distanceToTarget, behavior.patrolSpeed * deltaSeconds);
    const direction = normalize(toTarget);
    enemyRootNode.position.x += direction.x * stepDistance;
    enemyRootNode.position.z += direction.z * stepDistance;
    behavior.facingDirection = direction;
    setRootYaw(enemyRootNode, yawFromDirection(direction));

    /*logger.debug('[SillyRPG] Enemy patrol update.', {
      patrolTarget: { x: target.x, y: target.y, z: target.z },
      distanceToTarget,
      patrolPointIndex: behavior.currentPatrolIndex
    });*/
  }

  return behavior;
}
