import { SCHEMA_VERSION } from './constants/types.ts';
import type { CharacterState, GameState, GameStateSeed } from './contracts.ts';
import { createDefaultWorld } from './entities/world.ts';
import { createDefaultPlayer } from './entities/player.ts';
import { createDefaultItems } from './entities/items.ts';
import { createDefaultCharacters } from './entities/characters.ts';
import { createDefaultMaps } from './entities/maps.ts';
import { createDefaultSetting } from './entities/setting.ts';

export function createGameState(seed: GameStateSeed = {}): GameState {
  const maps = createDefaultMaps(seed.maps);

  return {
    schemaVersion: SCHEMA_VERSION,
    world: createDefaultWorld(seed.world),
    player: createDefaultPlayer(seed.player),
    characters: createDefaultCharacters(seed.characters as CharacterState[] | undefined),
    items: createDefaultItems(seed.items),
    maps,
    setting: createDefaultSetting(seed.setting, maps),
    updatedAt: Date.now()
  };
}
