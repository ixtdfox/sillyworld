import { SCHEMA_VERSION } from './constants/types.js';
import { createDefaultWorld } from './entities/world.js';
import { createDefaultPlayer } from './entities/player.js';
import { createDefaultItems } from './entities/items.js';
import { createDefaultCharacters } from './entities/characters.js';
import { createDefaultMaps } from './entities/maps.js';

export function createGameState(seed = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    world: createDefaultWorld(seed.world),
    player: createDefaultPlayer(seed.player),
    characters: createDefaultCharacters(seed.characters),
    items: createDefaultItems(seed.items),
    maps: createDefaultMaps(seed.maps),
    updatedAt: Date.now()
  };
}
