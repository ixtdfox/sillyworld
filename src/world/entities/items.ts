import type { GameStateSeed, ItemsState } from '../contracts.ts';
import { indexBy } from '../utils/object.ts';

export function createDefaultItems(seed: GameStateSeed['items'] = {}): ItemsState {
  return {
    defsById: seed.defsById || indexBy(seed.defs || [], 'defId'),
    instancesById: seed.instancesById || indexBy(seed.instances || [], 'instanceId'),
    nodeInventory: seed.nodeInventory || {}
  };
}
