// @ts-nocheck
import { Cell } from '../../spatial/cell/Cell.ts';

/**
 * Сервис маппинга отделяет координатную интеграцию от runtime боя:
 * он переводит world-space позиции сущностей в тактические клетки и валидирует,
 * что полученная клетка совместима с текущей боевой сеткой.
 */
export class CombatWorldPositionMapper {
  constructor({ gridMapper, grid, logger = console }) {
    this.gridMapper = gridMapper;
    this.grid = grid;
    this.logger = logger;
  }

  toCell(cell) {
    return Cell.from(cell);
  }

  /**
   * Трансформация «позиция в мире -> клетка боя + диагностические данные снаппинга».
   * Этот метод используется на входе в бой, чтобы не стартовать encounter в невалидной позиции.
   *
   * Важно: после world->grid конвертации мы фиксируем координату в `Cell` и передаём её дальше
   * как канонический доменный тип, чтобы grid/runtime не разошлись в представлении клетки.
   */
  mapWorldPositionToCombatCell({ unitId, worldPosition }) {
    if (!this.gridMapper || typeof this.gridMapper.worldToGridCell !== 'function') {
      throw new Error('[SillyRPG] Combat world-position mapping requires a grid mapper.');
    }

    if (!worldPosition || !Number.isFinite(worldPosition.x) || !Number.isFinite(worldPosition.z)) {
      this.logger.warn?.('[SillyRPG] Failed to map combat participant to grid: invalid world position.', {
        unitId: unitId ?? null,
        worldPosition: worldPosition ?? null
      });
      return { cell: null, mappedCell: null };
    }

    const mappedCell = this.toCell(this.gridMapper.worldToGridCell(worldPosition));
    const expectedSnappedWorld = this.gridMapper.gridCellToWorld(mappedCell, {
      fallbackY: Number.isFinite(worldPosition.y) ? worldPosition.y : 0
    });

    if (!this.grid) {
      return { cell: mappedCell, mappedCell, expectedSnappedWorld, isWalkable: true };
    }

    const isWalkable = this.grid.isCellWalkable(mappedCell);
    if (!isWalkable) {
      this.logger.error?.('[SillyRPG] Combat entry resolved to non-walkable tactical cell.', {
        unitId: unitId ?? null,
        worldPosition,
        mappedCell,
        expectedSnappedCellCenter: expectedSnappedWorld,
        gridBounds: this.grid.bounds ?? null
      });
    }

    return { cell: mappedCell, mappedCell, expectedSnappedWorld, isWalkable };
  }

  mapCombatParticipantsFromWorldPositions({ participants = [] }) {
    return participants.map((participant) => {
      const canonicalGridCell = participant?.entity?.gridCell;
      if (canonicalGridCell && Number.isFinite(canonicalGridCell.x) && Number.isFinite(canonicalGridCell.z)) {
        const normalizedCanonicalCell = this.toCell(canonicalGridCell);

        return {
          ...participant,
          mappedCell: normalizedCanonicalCell,
          initialCell: normalizedCanonicalCell,
          usedCanonicalGridCell: true
        };
      }

      const mapping = this.mapWorldPositionToCombatCell({
        unitId: participant?.id,
        worldPosition: participant?.entity?.rootNode?.position
      });

      return {
        ...participant,
        mappedCell: mapping.mappedCell,
        initialCell: mapping.cell
      };
    });
  }
}
