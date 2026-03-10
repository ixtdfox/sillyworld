import { resolveAsset } from '../../st_bridge/asset.js';

const ENEMY_FILE = 'assets/enemy.glb';

function resolveEnemyRoot(result) {
  const firstTransformNode = result.transformNodes.find((node) => !node.parent);
  if (firstTransformNode) {
    return firstTransformNode;
  }

  const firstMesh = result.meshes.find((mesh) => !mesh.parent);
  return firstMesh ?? result.meshes[0] ?? null;
}

export async function loadEnemyCharacter(runtime, options = {}) {
  const enemyFile = options.enemyFile ?? ENEMY_FILE;

  console.log('[SillyRPG] Enemy GLB loading start:', enemyFile);

  try {
    const result = await runtime.BABYLON.SceneLoader.ImportMeshAsync('', '', resolveAsset(enemyFile), runtime.scene);
    const rootNode = resolveEnemyRoot(result);

    console.log('[SillyRPG] Enemy GLB loading success:', enemyFile);

    return {
      rootNode,
      meshes: result.meshes,
      skeletons: result.skeletons,
      animationGroups: result.animationGroups
    };
  } catch (error) {
    console.error('[SillyRPG] Enemy GLB loading failure:', enemyFile, error);
    throw error;
  }
}
