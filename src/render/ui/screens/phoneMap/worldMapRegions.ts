import type { WorldMapRegion } from './worldMapViewport.ts';

/** Константа `WORLD_MAP_REGIONS` хранит общие настройки/данные, которые переиспользуются в модуле `render/ui/screens/phoneMap/worldMapRegions`. */
export const WORLD_MAP_REGIONS: readonly WorldMapRegion[] = Object.freeze([
  { regionId: 'northport', label: 'Northport', x: 348, y: 294 },
  { regionId: 'larkspur', label: 'Larkspur', x: 672, y: 462 },
  { regionId: 'emberfall', label: 'Emberfall', x: 930, y: 612 },
  { regionId: 'sunreach', label: 'Sunreach', x: 1120, y: 388 },
  { regionId: 'blackreef', label: 'Blackreef', x: 1210, y: 760 }
]);
