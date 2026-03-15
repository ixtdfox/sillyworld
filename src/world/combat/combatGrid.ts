// @ts-nocheck
/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей. Фокус файла — пошаговый бой: клетки, действия, очередь ходов или управление вводом в бою.
 */
function createCellKey(cell) {
  return `${cell.x},${cell.z}`;
}

/**
 * Приводит произвольные координаты к дискретной клетке боевой сетки.
 * Это устраняет дробные значения из мира рендера перед расчётом пути и занятости.
 */
function normalizeCell(cell) {
  return {
    x: Math.trunc(cell.x),
    z: Math.trunc(cell.z)
  };
}

/** Преобразует список заблокированных клеток в Set для быстрых проверок проходимости. */
function toCellMap(cells = []) {
  const map = new Set();
  for (const cell of cells) {
    map.add(createCellKey(normalizeCell(cell)));
  }
  return map;
}

/**
 * Собирает runtime-модель боевой сетки.
 * Отвечает за границы поля, блокированные клетки, занятость юнитами и поиск путей/доступных клеток
 * для подсветки перемещения и валидации действий в пошаговом бою.
 */
export function createCombatGrid({ minX, maxX, minZ, maxZ, blockedCells = [] }) {
  const blocked = toCellMap(blockedCells);
  const occupiedByCell = new Map();
  let occupancyRevision = 0;

  const bounds = Object.freeze({ minX, maxX, minZ, maxZ });

  /** Проверяет, что клетка попадает в прямоугольные границы текущей арены. */
  const isWithinBounds = (cell) => {
    const norm = normalizeCell(cell);
    return norm.x >= minX && norm.x <= maxX && norm.z >= minZ && norm.z <= maxZ;
  };

  const isBlocked = (cell) => blocked.has(createCellKey(normalizeCell(cell)));

  const getOccupiedUnitId = (cell) => occupiedByCell.get(createCellKey(normalizeCell(cell))) ?? null;

  const isOccupied = (cell) => getOccupiedUnitId(cell) !== null;

  /**
   * Определяет, можно ли пройти в клетку с учётом стен, границ и занятости юнитами.
   * Опция allowOccupiedByUnitId нужна, чтобы разрешить клетку, где уже стоит текущий юнит.
   */
  const isCellWalkable = (cell, options = {}) => {
    const norm = normalizeCell(cell);
    const allowOccupiedByUnitId = options.allowOccupiedByUnitId ?? null;

    if (!isWithinBounds(norm) || isBlocked(norm)) {
      return false;
    }

    const occupiedBy = getOccupiedUnitId(norm);
    if (!occupiedBy) {
      return true;
    }

    return allowOccupiedByUnitId !== null && occupiedBy === allowOccupiedByUnitId;
  };

  const setOccupied = (cell, unitId) => {
    const key = createCellKey(normalizeCell(cell));
    if (occupiedByCell.get(key) === unitId) {
      return;
    }

    occupiedByCell.set(key, unitId);
    occupancyRevision += 1;
  };

  const clearOccupied = (cell) => {
    if (occupiedByCell.delete(createCellKey(normalizeCell(cell)))) {
      occupancyRevision += 1;
    }
  };

  const moveOccupant = (fromCell, toCell, unitId) => {
    clearOccupied(fromCell);
    setOccupied(toCell, unitId);
  };

  const getNeighbors = (cell) => {
    const norm = normalizeCell(cell);
    return [
      { x: norm.x + 1, z: norm.z },
      { x: norm.x - 1, z: norm.z },
      { x: norm.x, z: norm.z + 1 },
      { x: norm.x, z: norm.z - 1 }
    ];
  };

  const resolveMovementCost = (fromCell, toCell, options = {}) => {
    const movementCost = options.movementCost;
    if (typeof movementCost === 'function') {
      const resolvedCost = movementCost(normalizeCell(fromCell), normalizeCell(toCell));
      if (!Number.isFinite(resolvedCost) || resolvedCost <= 0) {
        return null;
      }
      return resolvedCost;
    }

    return 1;
  };

  /**
   * Ищет путь с минимальной стоимостью между двумя клетками (вариант Dijkstra на четырёх соседях).
   * Возвращает последовательность клеток для анимации шага юнита или `null`, если путь недоступен.
   */
  const findPath = (startCell, goalCell, options = {}) => {
    const start = normalizeCell(startCell);
    const goal = normalizeCell(goalCell);
    const allowOccupiedByUnitId = options.allowOccupiedByUnitId ?? null;

    if (!isCellWalkable(start, { allowOccupiedByUnitId })) {
      return null;
    }

    if (!isCellWalkable(goal, { allowOccupiedByUnitId })) {
      return null;
    }

    const queue = [start];
    const bestCostByCell = new Map([[createCellKey(start), 0]]);
    const cameFrom = new Map();

    while (queue.length > 0) {
      queue.sort((a, b) => (bestCostByCell.get(createCellKey(a)) ?? Infinity) - (bestCostByCell.get(createCellKey(b)) ?? Infinity));
      const current = queue.shift();
      const currentKey = createCellKey(current);
      const currentCost = bestCostByCell.get(currentKey) ?? Infinity;

      if (current.x === goal.x && current.z === goal.z) {
        const path = [goal];
        let walkKey = currentKey;

        while (cameFrom.has(walkKey)) {
          const previous = cameFrom.get(walkKey);
          path.unshift(previous);
          walkKey = createCellKey(previous);
        }

        return path;
      }

      for (const neighbor of getNeighbors(current)) {
        const neighborKey = createCellKey(neighbor);
        if (!isCellWalkable(neighbor, { allowOccupiedByUnitId })) {
          continue;
        }

        const stepCost = resolveMovementCost(current, neighbor, options);
        if (stepCost === null) {
          continue;
        }

        const candidateCost = currentCost + stepCost;
        if (candidateCost >= (bestCostByCell.get(neighborKey) ?? Infinity)) {
          continue;
        }

        bestCostByCell.set(neighborKey, candidateCost);
        cameFrom.set(neighborKey, current);

        if (!queue.some((entry) => createCellKey(entry) === neighborKey)) {
          queue.push(neighbor);
        }
      }
    }

    return null;
  };

  const calculatePathCost = (path, options = {}) => {
    if (!Array.isArray(path) || path.length <= 1) {
      return 0;
    }

    let cost = 0;
    for (let index = 1; index < path.length; index += 1) {
      const stepCost = resolveMovementCost(path[index - 1], path[index], options);
      if (stepCost === null) {
        return Infinity;
      }
      cost += stepCost;
    }

    return cost;
  };

  /**
   * Вычисляет все клетки, в которые юнит может дойти за доступный бюджет перемещения.
   * Используется для боевой подсветки и ограничения интеракции курсором.
   */
  const getReachableCells = (startCell, maxCost, options = {}) => {
    const start = normalizeCell(startCell);
    const allowOccupiedByUnitId = options.allowOccupiedByUnitId ?? null;
    const maxAllowedCost = Number.isFinite(maxCost) ? Math.max(0, maxCost) : 0;

    if (!isCellWalkable(start, { allowOccupiedByUnitId })) {
      return [];
    }

    const queue = [start];
    const startKey = createCellKey(start);
    const bestCostByCell = new Map([[startKey, 0]]);

    while (queue.length > 0) {
      queue.sort((a, b) => (bestCostByCell.get(createCellKey(a)) ?? Infinity) - (bestCostByCell.get(createCellKey(b)) ?? Infinity));
      const current = queue.shift();
      const currentKey = createCellKey(current);
      const currentCost = bestCostByCell.get(currentKey) ?? Infinity;

      for (const neighbor of getNeighbors(current)) {
        const neighborKey = createCellKey(neighbor);

        if (!isCellWalkable(neighbor, { allowOccupiedByUnitId })) {
          continue;
        }

        const stepCost = resolveMovementCost(current, neighbor, options);
        if (stepCost === null) {
          continue;
        }

        const nextCost = currentCost + stepCost;
        if (nextCost > maxAllowedCost || nextCost >= (bestCostByCell.get(neighborKey) ?? Infinity)) {
          continue;
        }

        bestCostByCell.set(neighborKey, nextCost);
        if (!queue.some((entry) => createCellKey(entry) === neighborKey)) {
          queue.push(neighbor);
        }
      }
    }

    return Array.from(bestCostByCell.entries())
      .map(([key, cost]) => {
        const [x, z] = key.split(',').map((value) => Number.parseInt(value, 10));
        return { x, z, cost };
      })
      .filter((cell) => cell.cost <= maxAllowedCost);
  };

  return {
    bounds,
    isWithinBounds,
    isBlocked,
    isOccupied,
    getOccupiedUnitId,
    isCellWalkable,
    setOccupied,
    clearOccupied,
    moveOccupant,
    findPath,
    calculatePathCost,
    getReachableCells,
    getOccupancyRevision: () => occupancyRevision,
    toCellKey: createCellKey
  };
}
