import { ASSET_PATHS } from '../../core/assets/assetCatalog.js';

const SCENE_FILE = ASSET_PATHS.scenes.districtExploration;
const GROUND_MESH_NAME = 'Ground';

function resolveSceneRoots(result) {
  const roots = [];
  for (const node of result.transformNodes) {
    if (!node.parent) {
      roots.push(node);
    }
  }

  for (const mesh of result.meshes) {
    if (!mesh.parent) {
      roots.push(mesh);
    }
  }

  return roots;
}

function resolveGroundMesh({ scene, importedMeshes }) {
  const importedGroundMesh = importedMeshes.find((mesh) => mesh.name === GROUND_MESH_NAME);
  if (importedGroundMesh) {
    return importedGroundMesh;
  }

  return scene.getMeshByName(GROUND_MESH_NAME) ?? null;
}

export async function loadWorldScene(runtime, options = {}) {
  const sceneFile = options.sceneFile ?? SCENE_FILE;
  const resolveAssetPath = options.resolveAssetPath ?? ((path) => path);
  const containerName = options.containerName ?? 'districtSceneRoot';

  console.log('[SillyRPG] Scene GLB loading start:', sceneFile);

  try {
    const result = await runtime.BABYLON.SceneLoader.ImportMeshAsync('', '', resolveAssetPath(sceneFile), runtime.scene);
    const sceneContainer = new runtime.BABYLON.TransformNode(containerName, runtime.scene);
    const sceneRoots = resolveSceneRoots(result);
    for (const node of sceneRoots) {
      node.setParent(sceneContainer);
    }

    const groundMesh = resolveGroundMesh({ scene: runtime.scene, importedMeshes: result.meshes });

    console.log('[SillyRPG] Scene GLB loading success:', sceneFile);

    return {
      sceneFile,
      sceneContainer,
      sceneRoots,
      meshes: result.meshes,
      cameras: result.cameras ?? [],
      groundMesh
    };
  } catch (error) {
    console.error('[SillyRPG] Scene GLB loading failure:', sceneFile, error);
    throw error;
  }
}
