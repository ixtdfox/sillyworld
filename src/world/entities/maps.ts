import { indexBy } from '../utils/object.ts';

export function createDefaultMaps(seed = {}) {
  return {
    levelConfigs: seed.levelConfigs || {},
    nodesById: seed.nodesById || indexBy(seed.nodes || [], 'id')
  };
}
