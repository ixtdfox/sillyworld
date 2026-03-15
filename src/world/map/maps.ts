import type { MapNodeState, MapsState } from '../contracts.ts';
import { indexBy } from '../utils/object.ts';

/** Описывает тип `MapsSeed`, который формализует структуру данных в модуле `world/map/maps`. */
type MapsSeed = Partial<MapsState> & { nodes?: MapNodeState[] };

/** Создаёт и настраивает `createDefaultMaps` в ходе выполнения связанного игрового сценария. */
export function createDefaultMaps(seed: MapsSeed = {}): MapsState {
  return {
    levelConfigs: seed.levelConfigs ?? {},
    nodesById: seed.nodesById ?? indexBy(seed.nodes ?? [], 'id')
  };
}
