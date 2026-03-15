// @ts-nocheck
import {
  DEFAULT_ENEMY_ARCHETYPE_ID,
  resolveEnemyArchetype
} from '../entity/entityArchetypes.ts';
import { CharacterAnimationController, CharacterRuntimeFactory } from '../character/characterRuntimeServices.ts';

export async function loadEnemyCharacter(runtime, options = {}) {
  const enemyArchetypeId = options.enemyArchetypeId ?? DEFAULT_ENEMY_ARCHETYPE_ID;
  const enemyArchetype = resolveEnemyArchetype(enemyArchetypeId);
  const enemyFile = options.enemyFile ?? enemyArchetype.modelFile;
  const normalizationConfigId = options.enemyNormalizationId ?? enemyArchetype.normalizationConfigId;
  const factory = new CharacterRuntimeFactory(runtime);

  const enemyRuntime = await factory.createCharacterRuntime({
    entityLabel: enemyArchetype.entityLabel,
    modelFile: enemyFile,
    normalizationConfigId,
    resolveAssetPath: options.resolveAssetPath,
    runtimeMetadata: {
      role: 'enemy',
      archetypeId: enemyArchetypeId,
      controllerId: options.controllerId ?? 'enemy_ai',
      animationProfile: 'humanoid_biped'
    }
  });

  new CharacterAnimationController(enemyRuntime).initialize({ defaultState: 'idle' });
  return enemyRuntime;
}
