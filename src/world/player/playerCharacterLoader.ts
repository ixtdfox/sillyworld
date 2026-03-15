// @ts-nocheck
import { loadAndNormalizeEntityCharacter } from '../../render/shared/entityCharacterLoader.ts';
import { PLAYER_CHARACTER_ARCHETYPE } from '../entity/entityArchetypes.ts';

/** Загружает `loadPlayerCharacter` в ходе выполнения связанного игрового сценария. */
export async function loadPlayerCharacter(runtime, options = {}) {
  const playerFile = options.playerFile ?? PLAYER_CHARACTER_ARCHETYPE.modelFile;
  const normalizationConfigId = options.playerNormalizationId ?? PLAYER_CHARACTER_ARCHETYPE.normalizationConfigId;

  return loadAndNormalizeEntityCharacter(runtime, {
    entityLabel: PLAYER_CHARACTER_ARCHETYPE.entityLabel,
    modelFile: playerFile,
    normalizationConfigId,
    resolveAssetPath: options.resolveAssetPath
  });
}
