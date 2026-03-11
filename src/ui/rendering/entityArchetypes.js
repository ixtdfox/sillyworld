const PLAYER_CHARACTER_FILE = 'assets/character.glb';
const HUMANOID_ENEMY_FILE = 'assets/enemy.glb';
const STONE_GOLEM_FILE = 'assets/enemy.glb';

export const PLAYER_CHARACTER_ARCHETYPE = Object.freeze({
  archetypeId: 'player',
  entityLabel: 'Player',
  modelFile: PLAYER_CHARACTER_FILE,
  normalizationConfigId: 'player'
});

export const ENEMY_CHARACTER_ARCHETYPES = Object.freeze({
  enemy_humanoid_raider: Object.freeze({
    archetypeId: 'enemy_humanoid_raider',
    entityLabel: 'Enemy Raider',
    modelFile: HUMANOID_ENEMY_FILE,
    normalizationConfigId: 'enemy_humanoid_raider'
  }),
  monster_stone_golem: Object.freeze({
    archetypeId: 'monster_stone_golem',
    entityLabel: 'Stone Golem',
    modelFile: STONE_GOLEM_FILE,
    normalizationConfigId: 'monster_stone_golem'
  })
});

export const DEFAULT_ENEMY_ARCHETYPE_ID = 'enemy_humanoid_raider';

export function resolveEnemyArchetype(archetypeId = DEFAULT_ENEMY_ARCHETYPE_ID) {
  const enemyArchetype = ENEMY_CHARACTER_ARCHETYPES[archetypeId];
  if (enemyArchetype) {
    return enemyArchetype;
  }

  throw new Error(`Unknown enemy archetype id: ${archetypeId}`);
}
