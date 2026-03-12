import type { GameStateSeed, ItemDefinitionState, ItemInstanceState, ItemsState } from '../contracts.ts';
import { indexBy } from '../utils/object.ts';

type ItemsSeed = Partial<ItemsState> & {
  defs?: ItemDefinitionState[];
  instances?: ItemInstanceState[];
};

export function createDefaultItems(seed: ItemsSeed = {}): ItemsState {
  return {
    defsById: seed.defsById ?? indexBy(seed.defs ?? [], 'defId'),
    instancesById: seed.instancesById ?? indexBy(seed.instances ?? [], 'instanceId'),
    nodeInventory: seed.nodeInventory ?? {}
  };
}
