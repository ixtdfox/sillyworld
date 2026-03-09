import { resolveAsset } from '../../st_bridge/asset.js';

const PLAYER_FILE = 'assets/character.glb';

function resolvePlayerRoot(result) {
  const firstTransformNode = result.transformNodes.find((node) => !node.parent);
  if (firstTransformNode) {
    return firstTransformNode;
  }

  const firstMesh = result.meshes.find((mesh) => !mesh.parent);
  return firstMesh ?? result.meshes[0] ?? null;
}

export async function loadPlayerCharacter(runtime, options = {}) {
  const playerFile = options.playerFile ?? PLAYER_FILE;

  console.log('[SillyRPG] Player GLB loading start:', playerFile);

  try {
    const result = await runtime.BABYLON.SceneLoader.ImportMeshAsync('', '', resolveAsset(playerFile), runtime.scene);
    const rootNode = resolvePlayerRoot(result);

    console.log('[SillyRPG] Player GLB loading success:', playerFile);

    return {
      rootNode,
      meshes: result.meshes,
      skeletons: result.skeletons,
      animationGroups: result.animationGroups
    };
  } catch (error) {
    console.error('[SillyRPG] Player GLB loading failure:', playerFile, error);
    throw error;
  }
}
