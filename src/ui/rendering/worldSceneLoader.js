import { resolveAsset } from '../../st_bridge/asset.js';

const SCENE_FILE = 'assets/scene_test.glb';

export async function loadWorldScene(runtime, options = {}) {
  const sceneFile = options.sceneFile ?? SCENE_FILE;

  console.log('[SillyRPG] Scene GLB loading start:', sceneFile);

  try {
    await runtime.BABYLON.SceneLoader.AppendAsync('', resolveAsset(sceneFile), runtime.scene);
    console.log('[SillyRPG] Scene GLB loading success:', sceneFile);
  } catch (error) {
    console.error('[SillyRPG] Scene GLB loading failure:', sceneFile, error);
    throw error;
  }
}
