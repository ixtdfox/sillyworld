import { indexBy } from '../utils/object.js';

export function createDefaultMaps(seed = {}) {
  return {
    levelConfigs: seed.levelConfigs || {},
    nodesById: seed.nodesById || indexBy(seed.nodes || [], 'id')
  };
}
