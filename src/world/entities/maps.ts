import type { GameStateSeed, MapsState } from '../contracts.ts';
import { indexBy } from '../utils/object.ts';

export function createDefaultMaps(seed: GameStateSeed['maps'] = {}): MapsState {
  return {
    levelConfigs: seed.levelConfigs || {},
    nodesById: seed.nodesById || indexBy(seed.nodes || [], 'id')
  };
}
