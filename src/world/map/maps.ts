import type { MapNodeState, MapsState } from '../contracts.ts';
import { indexBy } from '../utils/object.ts';

type MapsSeed = Partial<MapsState> & { nodes?: MapNodeState[] };

export function createDefaultMaps(seed: MapsSeed = {}): MapsState {
  return {
    levelConfigs: seed.levelConfigs ?? {},
    nodesById: seed.nodesById ?? indexBy(seed.nodes ?? [], 'id')
  };
}
