import { Cell } from '../../spatial/cell/Cell.ts';

/** Выполняет `manhattanDistance` в ходе выполнения связанного игрового сценария. */
export function manhattanDistance(cellA, cellB) {
    if (!cellA || !cellB) {
        return Infinity;
    }
    return Cell.from(cellA).manhattanDistanceTo(cellB);
}
