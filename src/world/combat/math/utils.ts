/** Выполняет `manhattanDistance` в ходе выполнения связанного игрового сценария. */
export function manhattanDistance(cellA, cellB) {
    return Math.abs(cellA.x - cellB.x) + Math.abs(cellA.z - cellB.z);
}