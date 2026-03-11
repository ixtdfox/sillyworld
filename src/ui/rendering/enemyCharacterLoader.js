import { resolveEnemyNormalizationConfigId } from './entityNormalization.js';
import { loadAndNormalizeEntityCharacter } from './entityCharacterLoader.js';

const ENEMY_FILE = 'assets/enemy.glb';

export async function loadEnemyCharacter(runtime, options = {}) {
  const enemyFile = options.enemyFile ?? ENEMY_FILE;
  const normalizationConfigId = resolveEnemyNormalizationConfigId(options);

  return loadAndNormalizeEntityCharacter(runtime, {
    entityLabel: 'Enemy',
    modelFile: enemyFile,
    normalizationConfigId
  });
}
