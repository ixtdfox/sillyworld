import { SCHEMA_VERSION } from './constants/types.js';
import { createDefaultWorld } from './entities/world.js';
import { createDefaultPlayer } from './entities/player.js';
import { createDefaultItems } from './entities/items.js';
import { createDefaultCharacters } from './entities/characters.js';
import { createDefaultMaps } from './entities/maps.js';
import { createDefaultSetting } from './entities/setting.js';

export function createGameState(seed = {}) {
  const maps = createDefaultMaps(seed.maps);

  return {
    schemaVersion: SCHEMA_VERSION,
    world: createDefaultWorld(seed.world),
    player: createDefaultPlayer(seed.player),
    characters: createDefaultCharacters(seed.characters),
    items: createDefaultItems(seed.items),
    maps,
    setting: createDefaultSetting(seed.setting, maps),
    updatedAt: Date.now()
  };
}
