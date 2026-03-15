// @ts-nocheck
import type { RuntimeDispose } from '../../render/shared/runtimeContracts.ts';
import { CellMovementEngine } from './cellMovementEngine.ts';

const DEFAULT_CELLS_PER_SECOND = 4;

/**
 * Runs shared movement execution for any character/controller pair.
 * Controllers decide destination intents, this class resolves paths and mutates world position.
 */
export class CharacterMovementOrchestrator {
  readonly #runtime;
  readonly #character;
  readonly #rootNode;
  readonly #movementEngine;
  readonly #onMovingStateChange;
  readonly #onMovementRejected;
  readonly #onDestinationReached;
  readonly #onCellUpdated;

  #observer = null;
  #isMoving = false;

  constructor(runtime, params) {
    this.#runtime = runtime;
    this.#character = params.character;
    this.#rootNode = params.rootNode;
    this.#onMovingStateChange = params.onMovingStateChange ?? (() => {});
    this.#onMovementRejected = params.onMovementRejected ?? (() => {});
    this.#onDestinationReached = params.onDestinationReached ?? (() => {});
    this.#onCellUpdated = params.onCellUpdated ?? (() => {});

    this.#movementEngine = new CellMovementEngine({
      moveSpeed: params.moveSpeed ?? DEFAULT_CELLS_PER_SECOND,
      stopDistance: params.stopDistance ?? 0.05,
      gridMapper: params.gridMapper,
      resolveGroundY: params.resolveGroundY,
      grid: params.grid,
      toVector3: (world) => new params.BABYLON.Vector3(world.x, world.y, world.z)
    });
  }

  public attach(): RuntimeDispose {
    if (this.#observer) {
      return () => this.dispose();
    }

    const cell = this.#movementEngine.ensureCharacterCell({
      currentCell: this.#character.getCell?.() ?? this.#rootNode.gridCell,
      position: this.#rootNode.position
    });
    this.#setCell(cell);
    this.#movementEngine.snapPositionToCell({
      cell,
      position: this.#rootNode.position,
      fallbackY: this.#rootNode.position.y
    });

    this.#observer = this.#runtime.scene.onBeforeRenderObservable.add(() => this.tick());
    return () => this.dispose();
  }

  public tick(): void {
    const intent = this.#character.getController().issueIntent(this.#character);
    if (!intent || intent.kind !== 'move') {
      this.#movementEngine.clear('idle_intent');
      this.#setMoving(false);
      return;
    }

    const currentCell = this.#movementEngine.ensureCharacterCell({
      currentCell: this.#character.getCell?.() ?? this.#rootNode.gridCell,
      position: this.#rootNode.position
    });
    this.#setCell(currentCell);

    const queueResult = this.#movementEngine.queueMovement({
      currentCell,
      destinationCell: intent.command.destinationCell,
      position: this.#rootNode.position,
      fallbackY: this.#rootNode.position.y
    });

    if (!queueResult.ok) {
      this.#onMovementRejected(queueResult);
      this.#setMoving(false);
      return;
    }

    const deltaTimeSeconds = (this.#runtime.engine.getDeltaTime?.() ?? 16) / 1000;
    const tickResult = this.#movementEngine.tick({
      position: this.#rootNode.position,
      deltaTimeSeconds
    });

    if (tickResult.reachedWaypoint && tickResult.reachedCell) {
      this.#setCell(tickResult.reachedCell);
    }

    if (tickResult.movementComplete && tickResult.destinationCell) {
      this.#setCell(tickResult.destinationCell);
      this.#movementEngine.snapPositionToCell({
        cell: tickResult.destinationCell,
        position: this.#rootNode.position,
        fallbackY: this.#rootNode.position.y
      });
      this.#onDestinationReached(tickResult.destinationCell);
    }

    this.#setMoving(this.#movementEngine.isMoving);
  }

  public dispose(): void {
    if (this.#observer) {
      this.#runtime.scene.onBeforeRenderObservable.remove(this.#observer);
      this.#observer = null;
    }

    this.#movementEngine.clear('dispose');
    this.#setMoving(false);
  }


  #setCell(cell): void {
    this.#character.setCell?.(cell);
    this.#rootNode.gridCell = cell;
    this.#onCellUpdated(cell);
  }

  #setMoving(nextMovingState: boolean): void {
    if (this.#isMoving === nextMovingState) {
      return;
    }

    this.#isMoving = nextMovingState;
    this.#onMovingStateChange(this.#isMoving);
  }
}

