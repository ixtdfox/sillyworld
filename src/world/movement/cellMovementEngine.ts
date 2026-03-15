// @ts-nocheck
import {
  advancePositionAlongWaypoints,
  areCellsEqual,
  buildWorldWaypointPath,
  createPathSignature,
  isCellPathTraversalComplete,
  normalizeGridCell,
  resolveCellPath,
  resolveWorldPositionFromCell
} from './gridMovement.ts';

const DEFAULT_MOVE_SPEED = 4;
const DEFAULT_STOP_DISTANCE = 0.05;

/**
 * Shared cell-based movement pipeline used by exploration and combat controllers.
 *
 * This engine owns path resolution, waypoint construction, and per-frame traversal.
 * Callers keep ownership of mode-specific rules such as AP/MP validation, turn checks,
 * or input policies, and invoke this engine only after those checks pass.
 */
export class CellMovementEngine {
  #gridMapper;
  #resolveGroundY;
  #grid;
  #moveSpeed;
  #stopDistance;
  #toVector3;
  #onLifecycleEvent;

  #activePath = null;
  #activeWaypointIndex = 0;
  #pathSignature = '';

  constructor(options) {
    this.#gridMapper = options.gridMapper;
    this.#resolveGroundY = options.resolveGroundY;
    this.#grid = options.grid ?? null;
    this.#moveSpeed = options.moveSpeed ?? DEFAULT_MOVE_SPEED;
    this.#stopDistance = options.stopDistance ?? DEFAULT_STOP_DISTANCE;
    this.#toVector3 = options.toVector3 ?? ((world) => world);
    this.#onLifecycleEvent = options.onLifecycleEvent ?? (() => {});
  }

  get isMoving() {
    return Boolean(this.#activePath);
  }

  get activePath() {
    return this.#activePath;
  }

  clear(reason = 'clear_path') {
    if (!this.#activePath) {
      return;
    }
    this.#emit('movement_cancelled', { reason, path: this.#activePath });
    this.#activePath = null;
    this.#activeWaypointIndex = 0;
    this.#pathSignature = '';
  }

  ensureCharacterCell({ currentCell, position }) {
    return normalizeGridCell(currentCell) ?? this.#gridMapper.worldToGridCell(position);
  }

  snapPositionToCell({ cell, position, fallbackY = 0 }) {
    const normalizedCell = normalizeGridCell(cell);
    if (!normalizedCell) {
      return null;
    }

    const world = resolveWorldPositionFromCell({
      cell: normalizedCell,
      gridMapper: this.#gridMapper,
      resolveGroundY: this.#resolveGroundY,
      fallbackY
    });
    position.copyFrom(this.#toVector3(world));
    return normalizedCell;
  }

  queueMovement({ currentCell, destinationCell, position, fallbackY = 0, findPathOptions, resolvedPathCells }) {
    const start = normalizeGridCell(currentCell);
    const destination = normalizeGridCell(destinationCell);

    if (!start || !destination) {
      this.clear('invalid_cells');
      this.#emit('movement_rejected', { reason: 'invalid_cells', start, destination });
      return { ok: false, reason: 'invalid_cells' };
    }

    if (areCellsEqual(start, destination)) {
      this.clear('same_cell');
      this.snapPositionToCell({ cell: start, position, fallbackY });
      this.#emit('movement_noop', { reason: 'same_cell', cell: start });
      return { ok: false, reason: 'same_cell' };
    }

    const nextPathSignature = createPathSignature(start, destination);
    if (this.#activePath && this.#pathSignature === nextPathSignature) {
      return { ok: true, reason: 'already_queued', path: this.#activePath.cells };
    }

    const pathCells = Array.isArray(resolvedPathCells)
      ? resolvedPathCells.map((cell) => normalizeGridCell(cell)).filter(Boolean)
      : resolveCellPath({
        startCell: start,
        destinationCell: destination,
        grid: this.#grid,
        findPathOptions
      });

    if (!Array.isArray(pathCells) || pathCells.length <= 1) {
      this.clear('path_not_found');
      this.#emit('movement_rejected', { reason: 'path_not_found', start, destination });
      return { ok: false, reason: 'path_not_found' };
    }

    const waypoints = buildWorldWaypointPath({
      pathCells,
      gridMapper: this.#gridMapper,
      resolveGroundY: this.#resolveGroundY,
      fallbackY
    }).map((world) => this.#toVector3(world));

    this.#activePath = {
      cells: pathCells,
      waypoints,
      destinationCell: pathCells[pathCells.length - 1]
    };
    this.#activeWaypointIndex = 0;
    this.#pathSignature = nextPathSignature;

    this.#emit('movement_started', {
      startCell: pathCells[0],
      destinationCell: this.#activePath.destinationCell,
      pathCells
    });

    return { ok: true, reason: 'queued', path: pathCells };
  }

  tick({ position, deltaTimeSeconds }) {
    if (!this.#activePath || isCellPathTraversalComplete({
      activeWaypointIndex: this.#activeWaypointIndex,
      waypoints: this.#activePath.waypoints
    })) {
      return { isMoving: false, reachedWaypoint: false, movementComplete: false };
    }

    const advanceResult = advancePositionAlongWaypoints({
      position,
      waypoints: this.#activePath.waypoints,
      activeWaypointIndex: this.#activeWaypointIndex,
      moveSpeed: this.#moveSpeed,
      deltaTimeSeconds,
      stopDistance: this.#stopDistance
    });

    if (!advanceResult.reachedWaypoint) {
      return { isMoving: true, reachedWaypoint: false, movementComplete: false };
    }

    this.#activeWaypointIndex = advanceResult.activeWaypointIndex;
    const reachedCell = this.#activePath.cells[this.#activeWaypointIndex] ?? this.#activePath.destinationCell;
    this.#emit('waypoint_reached', {
      cell: reachedCell,
      waypointIndex: this.#activeWaypointIndex,
      destinationCell: this.#activePath.destinationCell
    });

    if (!advanceResult.movementComplete) {
      return {
        isMoving: true,
        reachedWaypoint: true,
        movementComplete: false,
        reachedCell
      };
    }

    const completedPath = this.#activePath;
    this.#activePath = null;
    this.#activeWaypointIndex = 0;
    this.#pathSignature = '';
    this.#emit('movement_completed', {
      destinationCell: completedPath.destinationCell,
      pathCells: completedPath.cells
    });

    return {
      isMoving: false,
      reachedWaypoint: true,
      movementComplete: true,
      reachedCell: completedPath.destinationCell,
      destinationCell: completedPath.destinationCell,
      pathCells: completedPath.cells
    };
  }

  #emit(type, payload) {
    this.#onLifecycleEvent({ type, ...payload });
  }
}
