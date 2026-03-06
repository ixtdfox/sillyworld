import { indexBy } from '../utils/object.js';

export function createDefaultItems(seed = {}) {
  return {
    defsById: seed.defsById || indexBy(seed.defs || [], 'defId'),
    instancesById: seed.instancesById || indexBy(seed.instances || [], 'instanceId'),
    nodeInventory: seed.nodeInventory || {}
  };
}
