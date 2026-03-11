import { resolveAsset } from '../../st_bridge/asset.js';
import { applyEntityNormalization, resolveEntityNormalizationConfig } from './entityNormalization.js';
import {
  applyEntityCollisionFromDimensions,
  createEntityGameplayDimensions
} from './entityGameplayDimensions.js';

export function resolveImportedRootNode(result) {
  const firstTransformNode = result.transformNodes.find((node) => !node.parent);
  if (firstTransformNode) {
    return firstTransformNode;
  }

  const firstMesh = result.meshes.find((mesh) => !mesh.parent);
  return firstMesh ?? result.meshes[0] ?? null;
}

export async function loadAndNormalizeEntityCharacter(runtime, options = {}) {
  const {
    entityLabel,
    modelFile,
    normalizationConfigId
  } = options;

  if (typeof entityLabel !== 'string' || entityLabel.length === 0) {
    throw new Error('Cannot load entity character: entityLabel must be a non-empty string.');
  }

  if (typeof modelFile !== 'string' || modelFile.length === 0) {
    throw new Error(`Cannot load ${entityLabel} character: modelFile must be a non-empty string.`);
  }

  if (typeof normalizationConfigId !== 'string' || normalizationConfigId.length === 0) {
    throw new Error(`Cannot load ${entityLabel} character: normalizationConfigId must be a non-empty string.`);
  }

  console.log(`[SillyRPG] ${entityLabel} GLB loading start:`, modelFile);

  try {
    const result = await runtime.BABYLON.SceneLoader.ImportMeshAsync('', '', resolveAsset(modelFile), runtime.scene);
    const rootNode = resolveImportedRootNode(result);
    const normalizationConfig = resolveEntityNormalizationConfig(normalizationConfigId);

    if (!rootNode) {
      throw new Error(`Unable to resolve a root node from imported model: ${modelFile}`);
    }

    applyEntityNormalization(runtime, { rootNode }, normalizationConfig);
    const gameplayDimensions = createEntityGameplayDimensions(normalizationConfig);
    applyEntityCollisionFromDimensions(runtime, rootNode, gameplayDimensions);

    console.log(`[SillyRPG] ${entityLabel} GLB loading success:`, modelFile);

    return {
      rootNode,
      normalizationConfig,
      gameplayDimensions,
      meshes: result.meshes,
      skeletons: result.skeletons,
      animationGroups: result.animationGroups
    };
  } catch (error) {
    console.error(`[SillyRPG] ${entityLabel} GLB loading failure:`, modelFile, error);
    throw error;
  }
}
