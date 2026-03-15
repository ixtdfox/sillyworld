// @ts-nocheck
import type { RuntimeDispose } from '../../render/shared/runtimeContracts.ts';
import { CellMovementEngine } from '../movement/cellMovementEngine.ts';

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
  getTarget(): { x: number; z: number } | null;
  clearTarget(): void;
}

interface PlayerMovementControllerOptions {
  moveSpeed?: number;
  stopDistance?: number;
  onMovingStateChange?: (isMoving: boolean) => void;
  gridMapper: {
    worldToGridCell: (worldPosition: { x: number; z: number }) => { x: number; z: number };
    gridCellToWorld: (cell: { x: number; z: number }, transform?: { resolveY?: ({ x, z }: { x: number; z: number }) => number; fallbackY?: number }) => { x: number; y: number; z: number };
  };
  resolveGroundY: ({ x, z, fallbackY }: { x: number; z: number; fallbackY?: number }) => number;
  BABYLON: { Vector3: new (x: number, y: number, z: number) => unknown };
  grid?: {
    findPath?: (startCell: { x: number; z: number }, goalCell: { x: number; z: number }, options?: unknown) => Array<{ x: number; z: number }> | null;
    isCellWalkable?: (cell: { x: number; z: number }) => boolean;
  };
}

export class PlayerMovementController {
  readonly #runtime: BabylonRuntimeSubset;
  readonly #playerCharacter: PlayerCharacterLike;
  readonly #movementTargetState: MovementTargetStateLike;
  readonly #onMovingStateChange: (isMoving: boolean) => void;
  readonly #movementEngine: CellMovementEngine;

  #isMoving = false;
  #observer: unknown | null = null;

  constructor(
    runtime: BabylonRuntimeSubset,
    playerCharacter: PlayerCharacterLike,
    movementTargetState: MovementTargetStateLike,
    options: PlayerMovementControllerOptions
  ) {
    this.#runtime = runtime;
    this.#playerCharacter = playerCharacter;
    this.#movementTargetState = movementTargetState;
    this.#onMovingStateChange = options.onMovingStateChange ?? (() => {});
    this.#movementEngine = new CellMovementEngine({
      moveSpeed: options.moveSpeed ?? DEFAULT_CELLS_PER_SECOND,
      stopDistance: options.stopDistance ?? 0.05,
      gridMapper: options.gridMapper,
      resolveGroundY: options.resolveGroundY,
      grid: options.grid,
      toVector3: (world) => new options.BABYLON.Vector3(world.x, world.y, world.z)
    });
  }

  public attach(): RuntimeDispose {
    if (this.#observer) {
      return () => this.dispose();
    }

    const cell = this.#movementEngine.ensureCharacterCell({
      currentCell: this.#playerCharacter.gridCell,
      position: this.#playerCharacter.rootNode.position
    });
    this.#playerCharacter.gridCell = cell;
    this.#movementEngine.snapPositionToCell({
      cell,
      position: this.#playerCharacter.rootNode.position,
      fallbackY: this.#playerCharacter.rootNode.position.y
    });

    this.#observer = this.#runtime.scene.onBeforeRenderObservable.add(() => this.#tick());
    return () => this.dispose();
  }

  public dispose(): void {
    if (this.#observer) {
      this.#runtime.scene.onBeforeRenderObservable.remove(this.#observer);
      this.#observer = null;
    }
    this.#movementEngine.clear('dispose');
    this.#setMoving(false);
  }

  #tick(): void {
    const targetCell = this.#movementTargetState.getTarget();
    if (!this.#movementTargetState.hasTarget() || !targetCell) {
      this.#movementEngine.clear('target_cleared');
      this.#setMoving(false);
      return;
    }

    const currentCell = this.#movementEngine.ensureCharacterCell({
      currentCell: this.#playerCharacter.gridCell,
      position: this.#playerCharacter.rootNode.position
    });
    this.#playerCharacter.gridCell = currentCell;

    const queueResult = this.#movementEngine.queueMovement({
      currentCell,
      destinationCell: targetCell,
      position: this.#playerCharacter.rootNode.position,
      fallbackY: this.#playerCharacter.rootNode.position.y
    });

    if (!queueResult.ok) {
      if (queueResult.reason === 'same_cell' || queueResult.reason === 'path_not_found' || queueResult.reason === 'invalid_cells') {
        this.#movementTargetState.clearTarget();
      }
      this.#setMoving(false);
      return;
    }

    const deltaTimeSeconds = (this.#runtime.engine.getDeltaTime?.() ?? 16) / 1000;
    const tickResult = this.#movementEngine.tick({
      position: this.#playerCharacter.rootNode.position,
      deltaTimeSeconds
    });

    if (tickResult.reachedWaypoint && tickResult.reachedCell) {
      this.#playerCharacter.gridCell = tickResult.reachedCell;
    }

    if (tickResult.movementComplete && tickResult.destinationCell) {
      this.#playerCharacter.gridCell = tickResult.destinationCell;
      this.#movementTargetState.clearTarget();
      this.#movementEngine.snapPositionToCell({
        cell: tickResult.destinationCell,
        position: this.#playerCharacter.rootNode.position,
        fallbackY: this.#playerCharacter.rootNode.position.y
      });
    }

    this.#setMoving(this.#movementEngine.isMoving);
  }

  #setMoving(nextMovingState: boolean): void {
    if (this.#isMoving === nextMovingState) {
      return;
    }

    this.#isMoving = nextMovingState;
    this.#onMovingStateChange(this.#isMoving);
  }
}
