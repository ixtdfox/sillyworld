import { SCHEMA_VERSION } from './constant/types.ts';
import type { CharacterState, GameState, GameStateSeed } from './contracts.ts';
import { createDefaultWorld } from './entity/world.ts';
import { createDefaultPlayer } from './player/player.ts';
import { createDefaultItems } from './inventory/items.ts';
import { createDefaultCharacters } from './character/characters.ts';
import { createDefaultMaps } from './map/maps.ts';
import { createDefaultSetting } from './map/setting.ts';

/** Создаёт и настраивает `createGameState` в ходе выполнения связанного игрового сценария. */
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
