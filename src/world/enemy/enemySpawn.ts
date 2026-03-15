// @ts-nocheck
import { createWorldGridMapper } from '../spatial/worldGrid.ts';
import { CharacterSpawner } from '../character/characterRuntimeServices.ts';

const DEFAULT_ENEMY_SPAWN = { x: 2, y: 0, z: 2 };

export function spawnEnemyCharacter(runtime, enemyCharacter, options = {}) {
  const spawner = new CharacterSpawner(runtime, {
    gridMapper: options.gridMapper ?? createWorldGridMapper()
  });

  return spawner.spawn(enemyCharacter, {
    spawn: options.spawn,
    fallbackSpawn: DEFAULT_ENEMY_SPAWN,
    markerNames: options.markerNames ?? []
  });
}
