// @ts-nocheck
import { PLAYER_CHARACTER_ARCHETYPE } from '../entity/entityArchetypes.ts';
import { CharacterAnimationController, CharacterRuntimeFactory } from '../character/characterRuntimeServices.ts';

export async function loadPlayerCharacter(runtime, options = {}) {
  const playerFile = options.playerFile ?? PLAYER_CHARACTER_ARCHETYPE.modelFile;
  const normalizationConfigId = options.playerNormalizationId ?? PLAYER_CHARACTER_ARCHETYPE.normalizationConfigId;
  const factory = new CharacterRuntimeFactory(runtime);

  const playerRuntime = await factory.createCharacterRuntime({
    entityLabel: PLAYER_CHARACTER_ARCHETYPE.entityLabel,
    modelFile: playerFile,
    normalizationConfigId,
    resolveAssetPath: options.resolveAssetPath,
    runtimeMetadata: {
      role: 'player',
      archetypeId: PLAYER_CHARACTER_ARCHETYPE.archetypeId,
      controllerId: options.controllerId ?? 'player_input',
      animationProfile: 'humanoid_biped'
    }
  });

  new CharacterAnimationController(playerRuntime).initialize({ defaultState: 'idle' });
  return playerRuntime;
}
