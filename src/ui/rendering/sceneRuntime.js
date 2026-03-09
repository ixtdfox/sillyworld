import { createBabylonWorldRuntime, ensureBabylonRuntime } from './babylonRuntime.js';
import { loadPlayerCharacter } from './playerCharacterLoader.js';
import { spawnPlayerCharacter } from './playerSpawn.js';
import { loadWorldScene } from './worldSceneLoader.js';

export async function mountSceneRuntime(canvas) {
  await ensureBabylonRuntime();
  const runtime = createBabylonWorldRuntime(canvas);

  try {
    await loadWorldScene(runtime);

    const playerCharacter = await loadPlayerCharacter(runtime);
    spawnPlayerCharacter(runtime, playerCharacter);
  } catch (error) {
    runtime.dispose();
    throw error;
  }

  return () => {
    runtime.dispose();
  };
}
