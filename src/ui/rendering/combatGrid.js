function createCellKey(cell) {
  return `${cell.x},${cell.z}`;
}

function normalizeCell(cell) {
  return {
    x: Math.trunc(cell.x),
    z: Math.trunc(cell.z)
  };
}

function toCellMap(cells = []) {
  const map = new Set();
  for (const cell of cells) {
    map.add(createCellKey(normalizeCell(cell)));
  }
  return map;
}

export function createCombatGrid({ minX, maxX, minZ, maxZ, blockedCells = [] }) {
  const blocked = toCellMap(blockedCells);
  const occupiedByCell = new Map();

  const isWithinBounds = (cell) => {
    const norm = normalizeCell(cell);
    return norm.x >= minX && norm.x <= maxX && norm.z >= minZ && norm.z <= maxZ;
  };

  const isBlocked = (cell) => blocked.has(createCellKey(normalizeCell(cell)));

  const getOccupiedUnitId = (cell) => occupiedByCell.get(createCellKey(normalizeCell(cell))) ?? null;

  const isOccupied = (cell) => getOccupiedUnitId(cell) !== null;

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
    occupiedByCell.set(createCellKey(normalizeCell(cell)), unitId);
  };

  const clearOccupied = (cell) => {
    occupiedByCell.delete(createCellKey(normalizeCell(cell)));
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
    const visited = new Set([createCellKey(start)]);
    const cameFrom = new Map();

    while (queue.length > 0) {
      const current = queue.shift();
      const currentKey = createCellKey(current);

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
        if (visited.has(neighborKey)) {
          continue;
        }

        if (!isCellWalkable(neighbor, { allowOccupiedByUnitId })) {
          continue;
        }

        visited.add(neighborKey);
        cameFrom.set(neighborKey, current);
        queue.push(neighbor);
      }
    }

    return null;
  };

  return {
    isWithinBounds,
    isBlocked,
    isOccupied,
    getOccupiedUnitId,
    isCellWalkable,
    setOccupied,
    clearOccupied,
    moveOccupant,
    findPath,
    toCellKey: createCellKey
  };
}
