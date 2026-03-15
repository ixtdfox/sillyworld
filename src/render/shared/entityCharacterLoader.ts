// @ts-nocheck
import { applyEntityNormalization } from './entityNormalization.ts';
import { resolveEntityNormalizationConfig } from '../../world/entity/entityNormalization.ts';
import {
  applyEntityCollisionFromDimensions
} from './entityGameplayDimensions.ts';
import { createEntityGameplayDimensions } from '../../world/entity/entityGameplayDimensions.ts';

/** Определяет `resolveImportedRootNode` в ходе выполнения связанного игрового сценария. */
export function resolveImportedRootNode(result) {
  const firstTransformNode = result.transformNodes.find((node) => !node.parent);
  if (firstTransformNode) {
    return firstTransformNode;
  }

  const firstMesh = result.meshes.find((mesh) => !mesh.parent);
  return firstMesh ?? result.meshes[0] ?? null;
}

/** Загружает `loadAndNormalizeEntityCharacter` в ходе выполнения связанного игрового сценария. */
export async function loadAndNormalizeEntityCharacter(runtime, options = {}) {
  const {
    entityLabel,
    modelFile,
    normalizationConfigId,
    resolveAssetPath = (path) => path
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
    const result = await runtime.BABYLON.SceneLoader.ImportMeshAsync('', '', resolveAssetPath(modelFile), runtime.scene);
    const rootNode = resolveImportedRootNode(result);
    const normalizationConfig = resolveEntityNormalizationConfig(normalizationConfigId);

    if (!rootNode) {
      throw new Error(`Unable to resolve a root node from imported model: ${modelFile}`);
    }

    const normalizationMetrics = applyEntityNormalization(runtime, { rootNode }, normalizationConfig);
    const gameplayDimensions = createEntityGameplayDimensions(normalizationConfig);
    applyEntityCollisionFromDimensions(runtime, rootNode, gameplayDimensions);

    const normalizationDebug = {
      entityId: normalizationConfigId,
      targetHeight: normalizationMetrics.targetHeight,
      currentHeight: normalizationMetrics.sourceHeight,
      scaleFactor: normalizationMetrics.scaleFactor,
      collisionRadius: gameplayDimensions.collisionRadius,
      collisionHeight: gameplayDimensions.collisionHeight,
      attackRange: gameplayDimensions.attackRange
    };

    console.log(`[SillyRPG] ${entityLabel} GLB loading success:`, modelFile);

    return {
      rootNode,
      normalizationConfig,
      normalizationMetrics,
      gameplayDimensions,
      normalizationDebug,
      meshes: result.meshes,
      skeletons: result.skeletons,
      animationGroups: result.animationGroups
    };
  } catch (error) {
    console.error(`[SillyRPG] ${entityLabel} GLB loading failure:`, modelFile, error);
    throw error;
  }
}
