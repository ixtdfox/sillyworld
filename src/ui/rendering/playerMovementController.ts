import type { PositionLike, RuntimeDispose } from './runtimeContracts.ts';

const DEFAULT_MOVE_SPEED = 2.5;
const DEFAULT_STOP_DISTANCE = 0.1;

interface Vector3Like {
  x: number;
  y: number;
  z: number;
  subtract(other: Vector3Like): Vector3Like;
  length(): number;
  normalize(): Vector3Like;
  scale(value: number): Vector3Like;
  addInPlace(other: Vector3Like): Vector3Like;
  copyFrom(other: Vector3Like): void;
}

interface BabylonRuntimeSubset {
  engine: { [key: string]: unknown; getDeltaTime?: () => number };
  scene: {
    onBeforeRenderObservable: {
      add: (callback: () => void) => unknown;
      remove: (observer: unknown) => void;
    };
  };
}

interface PlayerCharacterLike {
  rootNode: { position: PositionLike };
}

interface MovementTargetStateLike {
  hasTarget(): boolean;
  getTarget(): PositionLike;
  clearTarget(): void;
}

interface PlayerMovementControllerOptions {
  moveSpeed?: number;
  stopDistance?: number;
  onMovingStateChange?: (isMoving: boolean) => void;
}

export class PlayerMovementController {
  readonly #runtime: BabylonRuntimeSubset;
  readonly #playerCharacter: PlayerCharacterLike;
  readonly #movementTargetState: MovementTargetStateLike;
  readonly #moveSpeed: number;
  readonly #stopDistance: number;
  readonly #onMovingStateChange: (isMoving: boolean) => void;

  #isMoving = false;
  #observer: unknown | null = null;

  constructor(
    runtime: BabylonRuntimeSubset,
    playerCharacter: PlayerCharacterLike,
    movementTargetState: MovementTargetStateLike,
    options: PlayerMovementControllerOptions = {}
  ) {
    this.#runtime = runtime;
    this.#playerCharacter = playerCharacter;
    this.#movementTargetState = movementTargetState;
    this.#moveSpeed = options.moveSpeed ?? DEFAULT_MOVE_SPEED;
    this.#stopDistance = options.stopDistance ?? DEFAULT_STOP_DISTANCE;
    this.#onMovingStateChange = options.onMovingStateChange ?? (() => {});
  }

  public attach(): RuntimeDispose {
    if (this.#observer) {
      return () => this.dispose();
    }

    this.#observer = this.#runtime.scene.onBeforeRenderObservable.add(() => this.#tick());
    return () => this.dispose();
  }

  public dispose(): void {
    if (this.#observer) {
      this.#runtime.scene.onBeforeRenderObservable.remove(this.#observer);
      this.#observer = null;
    }
    this.#setMoving(false);
  }

  #tick(): void {
    if (!this.#movementTargetState.hasTarget()) {
      return;
    }

    const target = this.#movementTargetState.getTarget() as Vector3Like;
    const currentPosition = this.#playerCharacter.rootNode.position as Vector3Like;
    const toTarget = target.subtract(currentPosition);
    const distanceToTarget = toTarget.length();

    if (!this.#isMoving) {
      this.#setMoving(true);
      console.log('[SillyRPG] Movement start');
    }

    if (distanceToTarget <= this.#stopDistance) {
      currentPosition.copyFrom(target);
      this.#movementTargetState.clearTarget();
      this.#setMoving(false);
      console.log('[SillyRPG] Movement stop');
      return;
    }

    const deltaTimeMs = this.#runtime.engine.getDeltaTime?.() ?? 16;
    const deltaTimeSeconds = deltaTimeMs / 1000;
    const stepDistance = this.#moveSpeed * deltaTimeSeconds;
    const moveVector = toTarget.normalize().scale(Math.min(stepDistance, distanceToTarget));
    currentPosition.addInPlace(moveVector);
  }

  #setMoving(nextMovingState: boolean): void {
    if (this.#isMoving === nextMovingState) {
      return;
    }

    this.#isMoving = nextMovingState;
    this.#onMovingStateChange(this.#isMoving);
  }
}

export function attachPlayerMovementController(
  runtime: BabylonRuntimeSubset,
  playerCharacter: PlayerCharacterLike,
  movementTargetState: MovementTargetStateLike,
  options: PlayerMovementControllerOptions = {}
): RuntimeDispose {
  const controller = new PlayerMovementController(runtime, playerCharacter, movementTargetState, options);
  return controller.attach();
}
