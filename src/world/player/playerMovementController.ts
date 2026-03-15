// @ts-nocheck
/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей. Фокус файла — состояние и поведение игрока в исследовании и связанных действиях.
 */
import type { RuntimeDispose } from '../../render/shared/runtimeContracts.ts';
import {
  advancePositionAlongWaypoints,
  areCellsEqual,
  buildWorldWaypointPath,
  createPathSignature,
  isCellPathTraversalComplete,
  resolveCellPath,
  resolveWorldPositionFromCell
} from '../movement/gridMovement.ts';

const DEFAULT_CELLS_PER_SECOND = 4;

/** Определяет контракт `BabylonRuntimeSubset` для согласованного взаимодействия модулей в контексте `world/player/playerMovementController`. */
interface BabylonRuntimeSubset {
  engine: { getDeltaTime?: () => number };
  scene: {
    onBeforeRenderObservable: {
      add: (callback: () => void) => unknown;
      remove: (observer: unknown) => void;
    };
  };
}

/** Определяет контракт `PlayerCharacterLike` для согласованного взаимодействия модулей в контексте `world/player/playerMovementController`. */
interface PlayerCharacterLike {
  rootNode: { position: { copyFrom: (position: unknown) => void; x: number; y: number; z: number } };
  gridCell?: { x: number; z: number } | null;
}

/** Определяет контракт `MovementTargetStateLike` для согласованного взаимодействия модулей в контексте `world/player/playerMovementController`. */
interface MovementTargetStateLike {
  hasTarget(): boolean;
  getTarget(): { x: number; z: number } | null;
  clearTarget(): void;
}

/** Определяет контракт `PlayerMovementControllerOptions` для согласованного взаимодействия модулей в контексте `world/player/playerMovementController`. */
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

/** Класс `PlayerMovementController` координирует соответствующий сценарий модуля `world/player/playerMovementController` и инкапсулирует связанную логику. */
export class PlayerMovementController {
  readonly #runtime: BabylonRuntimeSubset;
  readonly #playerCharacter: PlayerCharacterLike;
  readonly #movementTargetState: MovementTargetStateLike;
  readonly #cellsPerSecond: number;
  readonly #onMovingStateChange: (isMoving: boolean) => void;
  readonly #stopDistance: number;
  readonly #gridMapper;
  readonly #resolveGroundY;
  readonly #BABYLON;
  readonly #grid;

  #isMoving = false;
  #observer: unknown | null = null;
  #activePath: {
    cells: Array<{ x: number; z: number }>;
    waypoints: Array<unknown>;
    destinationCell: { x: number; z: number };
  } | null = null;
  #activeWaypointIndex = 0;
  #pathSignature = '';

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
    this.#stopDistance = options.stopDistance ?? 0.05;
    this.#onMovingStateChange = options.onMovingStateChange ?? (() => {});
    this.#gridMapper = options.gridMapper;
    this.#resolveGroundY = options.resolveGroundY;
    this.#BABYLON = options.BABYLON;
    this.#grid = options.grid ?? null;
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
    const targetCell = this.#movementTargetState.getTarget();
    if (!this.#movementTargetState.hasTarget() || !targetCell) {
      this.#clearPath();
      this.#setMoving(false);
      return;
    }

    const currentCell = this.#playerCharacter.gridCell ?? this.#gridMapper.worldToGridCell(this.#playerCharacter.rootNode.position);
    this.#playerCharacter.gridCell = currentCell;

    if (areCellsEqual(currentCell, targetCell)) {
      this.#movementTargetState.clearTarget();
      this.#clearPath();
      this.#setMoving(false);
      this.#applyGridCellToTransform(currentCell);
      return;
    }

    if (!this.#ensurePath(currentCell, targetCell)) {
      this.#movementTargetState.clearTarget();
      this.#clearPath();
      this.#setMoving(false);
      return;
    }

    if (!this.#activePath || isCellPathTraversalComplete({ activeWaypointIndex: this.#activeWaypointIndex, waypoints: this.#activePath.waypoints })) {
      this.#clearPath();
      this.#setMoving(false);
      return;
    }

    this.#setMoving(true);
    this.#followPath();
  }

  #ensurePath(currentCell: { x: number; z: number }, targetCell: { x: number; z: number }): boolean {
    const nextPathSignature = createPathSignature(currentCell, targetCell);
    if (this.#activePath && this.#pathSignature === nextPathSignature) {
      return true;
    }

    const pathCells = this.#resolvePath(currentCell, targetCell);
    if (!pathCells || pathCells.length <= 1) {
      return false;
    }

    const waypoints = buildWorldWaypointPath({
      pathCells,
      gridMapper: this.#gridMapper,
      resolveGroundY: this.#resolveGroundY,
      fallbackY: this.#playerCharacter.rootNode.position.y
    }).map((world) => new this.#BABYLON.Vector3(world.x, world.y, world.z));

    this.#activePath = {
      cells: pathCells,
      waypoints,
      destinationCell: pathCells[pathCells.length - 1]
    };
    this.#activeWaypointIndex = 0;
    this.#pathSignature = nextPathSignature;
    return true;
  }

  #resolvePath(currentCell: { x: number; z: number }, targetCell: { x: number; z: number }): Array<{ x: number; z: number }> | null {
    return resolveCellPath({
      startCell: currentCell,
      destinationCell: targetCell,
      grid: this.#grid
    });
  }

  #followPath(): void {
    if (!this.#activePath) {
      return;
    }

    const currentPosition = this.#playerCharacter.rootNode.position;
    const deltaTimeSeconds = (this.#runtime.engine.getDeltaTime?.() ?? 16) / 1000;
    const advanceResult = advancePositionAlongWaypoints({
      position: currentPosition,
      waypoints: this.#activePath.waypoints,
      activeWaypointIndex: this.#activeWaypointIndex,
      moveSpeed: this.#cellsPerSecond,
      deltaTimeSeconds,
      stopDistance: this.#stopDistance
    });

    if (!advanceResult.reachedWaypoint) {
      return;
    }

    this.#activeWaypointIndex = advanceResult.activeWaypointIndex;
    const reachedCell = this.#activePath.cells[this.#activeWaypointIndex];
    if (reachedCell) {
      this.#playerCharacter.gridCell = reachedCell;
    }

    if (!isCellPathTraversalComplete({
      activeWaypointIndex: this.#activeWaypointIndex,
      waypoints: this.#activePath.waypoints
    })) {
      return;
    }

    const destinationCell = this.#activePath.destinationCell;
    this.#playerCharacter.gridCell = destinationCell;
    this.#movementTargetState.clearTarget();
    this.#applyGridCellToTransform(destinationCell);
    this.#clearPath();
    this.#setMoving(false);
  }

  #applyGridCellToTransform(cell: { x: number; z: number }): void {
    const world = resolveWorldPositionFromCell({
      cell,
      gridMapper: this.#gridMapper,
      resolveGroundY: this.#resolveGroundY,
      fallbackY: this.#playerCharacter.rootNode.position.y
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

  #clearPath(): void {
    this.#activePath = null;
    this.#activeWaypointIndex = 0;
    this.#pathSignature = '';
  }
}

/** Подключает `attachPlayerMovementController` в ходе выполнения связанного игрового сценария. */
export function attachPlayerMovementController(
  runtime: BabylonRuntimeSubset,
  playerCharacter: PlayerCharacterLike,
  movementTargetState: MovementTargetStateLike,
  options: PlayerMovementControllerOptions
): RuntimeDispose {
  const controller = new PlayerMovementController(runtime, playerCharacter, movementTargetState, options);
  return controller.attach();
}
