/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей. Фокус файла — инвентарь: вес, экипировка, перенос предметов и представление слотов.
 */
import type { ItemDefinitionState, ItemInstanceState, ItemsState } from '../contracts.ts';
import { indexBy } from '../utils/object.ts';

/** Описывает тип `ItemsSeed`, который формализует структуру данных в модуле `world/inventory/items`. */
type ItemsSeed = Partial<ItemsState> & {
  defs?: ItemDefinitionState[];
  instances?: ItemInstanceState[];
};

/** Создаёт и настраивает `createDefaultItems` в ходе выполнения связанного игрового сценария. */
export function createDefaultItems(seed: ItemsSeed = {}): ItemsState {
  return {
    defsById: seed.defsById ?? indexBy(seed.defs ?? [], 'defId'),
    instancesById: seed.instancesById ?? indexBy(seed.instances ?? [], 'instanceId'),
    nodeInventory: seed.nodeInventory ?? {}
  };
}
