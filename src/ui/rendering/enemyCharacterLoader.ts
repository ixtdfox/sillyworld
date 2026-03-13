// @ts-nocheck
import { loadAndNormalizeEntityCharacter } from './entityCharacterLoader.ts';
import {
  DEFAULT_ENEMY_ARCHETYPE_ID,
  resolveEnemyArchetype
} from '../../world/entity/entityArchetypes.ts';

export async function loadEnemyCharacter(runtime, options = {}) {
  const enemyArchetypeId = options.enemyArchetypeId ?? DEFAULT_ENEMY_ARCHETYPE_ID;
  const enemyArchetype = resolveEnemyArchetype(enemyArchetypeId);
  const enemyFile = options.enemyFile ?? enemyArchetype.modelFile;
  const normalizationConfigId = options.enemyNormalizationId ?? enemyArchetype.normalizationConfigId;

  return loadAndNormalizeEntityCharacter(runtime, {
    entityLabel: enemyArchetype.entityLabel,
    modelFile: enemyFile,
    normalizationConfigId,
    resolveAssetPath: options.resolveAssetPath
  });
}
