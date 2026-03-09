import { resolveAsset } from '../../st_bridge/asset.js';
import { createBabylonWorldRuntime, ensureBabylonRuntime } from './babylonRuntime.js';

const SCENE_FILE = 'assets/scene_test.glb';

export async function mountSceneRuntime(canvas) {
  await ensureBabylonRuntime();
  const runtime = createBabylonWorldRuntime(canvas);

  console.log('[SillyRPG] Scene GLB loading start:', SCENE_FILE);

  try {
    await runtime.BABYLON.SceneLoader.AppendAsync('', resolveAsset(SCENE_FILE), runtime.scene);
    console.log('[SillyRPG] Scene GLB loading success:', SCENE_FILE);
  } catch (error) {
    console.error('[SillyRPG] Scene GLB loading failure:', SCENE_FILE, error);
    throw error;
  }

  return () => {
    runtime.dispose();
  };
}
