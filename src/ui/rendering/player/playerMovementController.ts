// @ts-nocheck
import type { RuntimeDispose } from '../shared/runtimeContracts.ts';

const DEFAULT_CELLS_PER_SECOND = 4;

interface BabylonRuntimeSubset {
  engine: { getDeltaTime?: () => number };
  scene: {
    onBeforeRenderObservable: {
      add: (callback: () => void) => unknown;
      remove: (observer: unknown) => void;
    };
  };
}

interface PlayerCharacterLike {
  rootNode: { position: { copyFrom: (position: unknown) => void; x: number; y: number; z: number } };
  gridCell?: { x: number; z: number } | null;
}

interface MovementTargetStateLike {
  hasTarget(): boolean;
  getTargetCell?(): { x: number; z: number } | null;
  getTarget(): { x: number; z: number } | null;
  clearTarget(): void;
}

interface PlayerMovementControllerOptions {
  moveSpeed?: number;
  onMovingStateChange?: (isMoving: boolean) => void;
  gridMapper: {
    worldToGridCell: (worldPosition: { x: number; z: number }) => { x: number; z: number };
    gridCellToWorld: (cell: { x: number; z: number }, transform?: { resolveY?: ({ x, z }: { x: number; z: number }) => number; fallbackY?: number }) => { x: number; y: number; z: number };
  };
  resolveGroundY: ({ x, z, fallbackY }: { x: number; z: number; fallbackY?: number }) => number;
  BABYLON: { Vector3: new (x: number, y: number, z: number) => unknown };
}

export class PlayerMovementController {
  readonly #runtime: BabylonRuntimeSubset;
  readonly #playerCharacter: PlayerCharacterLike;
  readonly #movementTargetState: MovementTargetStateLike;
  readonly #cellsPerSecond: number;
  readonly #onMovingStateChange: (isMoving: boolean) => void;
  readonly #gridMapper;
  readonly #resolveGroundY;
  readonly #BABYLON;

  #isMoving = false;
  #observer: unknown | null = null;
  #stepAccumulatorSeconds = 0;

  constructor(
    runtime: BabylonRuntimeSubset,
    playerCharacter: PlayerCharacterLike,
    movementTargetState: MovementTargetStateLike,
    options: PlayerMovementControllerOptions
  ) {
    this.#runtime = runtime;
    this.#playerCharacter = playerCharacter;
    this.#movementTargetState = movementTargetState;
    this.#cellsPerSecond = options.moveSpeed ?? DEFAULT_CELLS_PER_SECOND;
    this.#onMovingStateChange = options.onMovingStateChange ?? (() => {});
    this.#gridMapper = options.gridMapper;
    this.#resolveGroundY = options.resolveGroundY;
    this.#BABYLON = options.BABYLON;
  }

  public attach(): RuntimeDispose {
    if (this.#observer) {
      return () => this.dispose();
    }

    if (!this.#playerCharacter.gridCell) {
      this.#playerCharacter.gridCell = this.#gridMapper.worldToGridCell(this.#playerCharacter.rootNode.position);
    }
    this.#applyGridCellToTransform(this.#playerCharacter.gridCell);

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
    const targetCell = this.#movementTargetState.getTargetCell?.() ?? this.#movementTargetState.getTarget?.();
    if (!this.#movementTargetState.hasTarget() || !targetCell) {
      this.#setMoving(false);
      return;
    }

    const currentCell = this.#playerCharacter.gridCell ?? this.#gridMapper.worldToGridCell(this.#playerCharacter.rootNode.position);
    this.#playerCharacter.gridCell = currentCell;

    if (currentCell.x === targetCell.x && currentCell.z === targetCell.z) {
      this.#movementTargetState.clearTarget();
      this.#setMoving(false);
      this.#applyGridCellToTransform(currentCell);
      return;
    }

    this.#setMoving(true);
    const deltaTimeMs = this.#runtime.engine.getDeltaTime?.() ?? 16;
    const deltaTimeSeconds = deltaTimeMs / 1000;
    this.#stepAccumulatorSeconds += deltaTimeSeconds;

    const stepInterval = 1 / Math.max(0.1, this.#cellsPerSecond);
    if (this.#stepAccumulatorSeconds < stepInterval) {
      return;
    }

    this.#stepAccumulatorSeconds -= stepInterval;

    const nextCell = {
      x: currentCell.x,
      z: currentCell.z
    };

    if (targetCell.x !== currentCell.x) {
      nextCell.x += Math.sign(targetCell.x - currentCell.x);
    } else if (targetCell.z !== currentCell.z) {
      nextCell.z += Math.sign(targetCell.z - currentCell.z);
    }

    this.#playerCharacter.gridCell = nextCell;
    this.#applyGridCellToTransform(nextCell);
  }

  #applyGridCellToTransform(cell: { x: number; z: number }): void {
    const world = this.#gridMapper.gridCellToWorld(cell, {
      resolveY: ({ x, z }) => this.#resolveGroundY({ x, z, fallbackY: this.#playerCharacter.rootNode.position.y })
    });

    this.#playerCharacter.rootNode.position.copyFrom(new this.#BABYLON.Vector3(world.x, world.y, world.z));
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
  options: PlayerMovementControllerOptions
): RuntimeDispose {
  const controller = new PlayerMovementController(runtime, playerCharacter, movementTargetState, options);
  return controller.attach();
}
