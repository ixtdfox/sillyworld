// @ts-nocheck
import { Cell } from '../cell/Cell.ts';

/**
 * Объект `Grid` владеет геометрией арены и изменяемым состоянием занятости клеток.
 *
 * Отдельный класс нужен, чтобы pathfinding, проверка проходимости и учёт юнитов
 * не размазывались по runtime-скриптам. Таким образом, правила передвижения живут
 * рядом с данными, которые эти правила используют.
 */
export class Grid {
  constructor({ minX, maxX, minZ, maxZ, blockedCells = [] }) {
    this.minX = minX;
    this.maxX = maxX;
    this.minZ = minZ;
    this.maxZ = maxZ;
    this.bounds = Object.freeze({ minX, maxX, minZ, maxZ });
    this.blocked = new Set(blockedCells.map((cell) => Cell.keyOf(cell)));
    this.occupiedByCell = new Map();
    this.occupancyRevision = 0;
  }

  isWithinBounds(cell) {
    const normalized = Cell.from(cell);
    return normalized.x >= this.minX && normalized.x <= this.maxX && normalized.z >= this.minZ && normalized.z <= this.maxZ;
  }

  isBlocked(cell) {
    return this.blocked.has(Cell.keyOf(cell));
  }

  getOccupiedUnitId(cell) {
    return this.occupiedByCell.get(Cell.keyOf(cell)) ?? null;
  }

  isOccupied(cell) {
    return this.getOccupiedUnitId(cell) !== null;
  }

  /**
   * Возвращает «можно ли стоять/проходить» с учётом трёх слоёв ограничений:
   * границы поля, статические препятствия и динамическая занятость юнитами.
   */
  isCellWalkable(cell, options = {}) {
    const normalized = Cell.from(cell);
    const allowOccupiedByUnitId = options.allowOccupiedByUnitId ?? null;

    if (!this.isWithinBounds(normalized) || this.isBlocked(normalized)) {
      return false;
    }

    const occupiedBy = this.getOccupiedUnitId(normalized);
    if (!occupiedBy) {
      return true;
    }

    return allowOccupiedByUnitId !== null && occupiedBy === allowOccupiedByUnitId;
  }

  setOccupied(cell, unitId) {
    const key = Cell.keyOf(cell);
    if (this.occupiedByCell.get(key) === unitId) {
      return;
    }

    this.occupiedByCell.set(key, unitId);
    this.occupancyRevision += 1;
  }

  clearOccupied(cell) {
    if (this.occupiedByCell.delete(Cell.keyOf(cell))) {
      this.occupancyRevision += 1;
    }
  }

  moveOccupant(fromCell, toCell, unitId) {
    this.clearOccupied(fromCell);
    this.setOccupied(toCell, unitId);
  }

  resolveMovementCost(fromCell, toCell, options = {}) {
    if (typeof options.movementCost === 'function') {
      const resolvedCost = options.movementCost(Cell.from(fromCell).toPlain(), Cell.from(toCell).toPlain());
      if (!Number.isFinite(resolvedCost) || resolvedCost <= 0) {
        return null;
      }
      return resolvedCost;
    }

    return 1;
  }

  /** Dijkstra по 4-соседям возвращает кратчайший путь для анимации и списания MP. */
  findPath(startCell, goalCell, options = {}) {
    const start = Cell.from(startCell);
    const goal = Cell.from(goalCell);
    const allowOccupiedByUnitId = options.allowOccupiedByUnitId ?? null;

    if (!this.isCellWalkable(start, { allowOccupiedByUnitId }) || !this.isCellWalkable(goal, { allowOccupiedByUnitId })) {
      return null;
    }

    const queue = [start];
    const bestCostByCell = new Map([[start.toKey(), 0]]);
    const cameFrom = new Map();

    while (queue.length > 0) {
      queue.sort((a, b) => (bestCostByCell.get(a.toKey()) ?? Infinity) - (bestCostByCell.get(b.toKey()) ?? Infinity));
      const current = queue.shift();
      const currentKey = current.toKey();
      const currentCost = bestCostByCell.get(currentKey) ?? Infinity;

      if (current.equals(goal)) {
        const path = [goal];
        let walkKey = currentKey;

        while (cameFrom.has(walkKey)) {
          const previous = cameFrom.get(walkKey);
          path.unshift(previous);
          walkKey = previous.toKey();
        }

        return path.map((entry) => entry.toPlain());
      }

      for (const neighbor of current.getNeighbors()) {
        const neighborKey = neighbor.toKey();
        if (!this.isCellWalkable(neighbor, { allowOccupiedByUnitId })) {
          continue;
        }

        const stepCost = this.resolveMovementCost(current, neighbor, options);
        if (stepCost === null) {
          continue;
        }

        const candidateCost = currentCost + stepCost;
        if (candidateCost >= (bestCostByCell.get(neighborKey) ?? Infinity)) {
          continue;
        }

        bestCostByCell.set(neighborKey, candidateCost);
        cameFrom.set(neighborKey, current);

        if (!queue.some((entry) => entry.toKey() === neighborKey)) {
          queue.push(neighbor);
        }
      }
    }

    return null;
  }

  calculatePathCost(path, options = {}) {
    if (!Array.isArray(path) || path.length <= 1) {
      return 0;
    }

    let cost = 0;
    for (let index = 1; index < path.length; index += 1) {
      const stepCost = this.resolveMovementCost(path[index - 1], path[index], options);
      if (stepCost === null) {
        return Infinity;
      }
      cost += stepCost;
    }
    return cost;
  }

  getReachableCells(startCell, maxCost, options = {}) {
    const start = Cell.from(startCell);
    const allowOccupiedByUnitId = options.allowOccupiedByUnitId ?? null;
    const maxAllowedCost = Number.isFinite(maxCost) ? Math.max(0, maxCost) : 0;

    if (!this.isCellWalkable(start, { allowOccupiedByUnitId })) {
      return [];
    }

    const queue = [start];
    const bestCostByCell = new Map([[start.toKey(), 0]]);

    while (queue.length > 0) {
      queue.sort((a, b) => (bestCostByCell.get(a.toKey()) ?? Infinity) - (bestCostByCell.get(b.toKey()) ?? Infinity));
      const current = queue.shift();
      const currentKey = current.toKey();
      const currentCost = bestCostByCell.get(currentKey) ?? Infinity;

      for (const neighbor of current.getNeighbors()) {
        const neighborKey = neighbor.toKey();
        if (!this.isCellWalkable(neighbor, { allowOccupiedByUnitId })) {
          continue;
        }

        const stepCost = this.resolveMovementCost(current, neighbor, options);
        if (stepCost === null) {
          continue;
        }

        const nextCost = currentCost + stepCost;
        if (nextCost > maxAllowedCost || nextCost >= (bestCostByCell.get(neighborKey) ?? Infinity)) {
          continue;
        }

        bestCostByCell.set(neighborKey, nextCost);
        if (!queue.some((entry) => entry.toKey() === neighborKey)) {
          queue.push(neighbor);
        }
      }
    }

    return Array.from(bestCostByCell.entries()).map(([key, cost]) => {
      const [x, z] = key.split(',').map((value) => Number.parseInt(value, 10));
      return { x, z, cost };
    }).filter((cell) => cell.cost <= maxAllowedCost);
  }

  getOccupancyRevision() {
    return this.occupancyRevision;
  }

  toCellKey(cell) {
    return Cell.keyOf(cell);
  }
}

/**
 * Фабрика оставлена как compatibility-слой для модулей, которые ещё живут в процедурном API.
 */
export function createCombatGrid(config) {
  return new Grid(config);
}
