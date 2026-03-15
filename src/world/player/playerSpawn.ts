// @ts-nocheck
import { createWorldGridMapper } from '../spatial/worldGrid.ts';
import { CharacterSpawner } from '../character/characterRuntimeServices.ts';

const DEFAULT_PLAYER_SPAWN = { x: 0, y: 0, z: 0 };
const SPAWN_MARKER_NAMES = ['PlayerSpawn', 'player_spawn', 'spawn_player'];

export function spawnPlayerCharacter(runtime, playerCharacter, options = {}) {
  const spawner = new CharacterSpawner(runtime, {
    gridMapper: options.gridMapper ?? createWorldGridMapper()
  });

  return spawner.spawn(playerCharacter, {
    spawn: options.spawn,
    fallbackSpawn: DEFAULT_PLAYER_SPAWN,
    markerNames: SPAWN_MARKER_NAMES
  });
}
