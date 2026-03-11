import { resolvePlayerNormalizationConfigId } from './entityNormalization.js';
import { loadAndNormalizeEntityCharacter } from './entityCharacterLoader.js';

const PLAYER_FILE = 'assets/character.glb';

export async function loadPlayerCharacter(runtime, options = {}) {
  const playerFile = options.playerFile ?? PLAYER_FILE;
  const normalizationConfigId = resolvePlayerNormalizationConfigId(options);

  return loadAndNormalizeEntityCharacter(runtime, {
    entityLabel: 'Player',
    modelFile: playerFile,
    normalizationConfigId
  });
}
