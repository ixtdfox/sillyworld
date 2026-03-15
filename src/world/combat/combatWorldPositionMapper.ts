// @ts-nocheck
/**
 * Тонкий слой обратной совместимости: старые импорты продолжают работать,
 * но фактическая ответственность за world->combat mapping переехала
 * в отдельный сервисный класс `CombatWorldPositionMapper`.
 */
import { CombatWorldPositionMapper } from './mapping/CombatWorldPositionMapper.ts';

export { CombatWorldPositionMapper };

export function mapWorldPositionToCombatCell({ unitId, worldPosition, gridMapper, grid, logger = console }) {
  const mapper = new CombatWorldPositionMapper({ gridMapper, grid, logger });
  return mapper.mapWorldPositionToCombatCell({ unitId, worldPosition });
}

export function mapCombatParticipantsFromWorldPositions({ participants = [], gridMapper, grid, logger = console }) {
  const mapper = new CombatWorldPositionMapper({ gridMapper, grid, logger });
  return mapper.mapCombatParticipantsFromWorldPositions({ participants });
}
