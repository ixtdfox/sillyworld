// @ts-nocheck
import { loadWorldScene } from './worldSceneLoader.ts';
import { loadPlayerCharacter } from '../player/playerCharacterLoader.ts';
import { loadEnemyCharacter } from '../enemy/enemyCharacterLoader.ts';
import { spawnPlayerCharacter } from '../player/playerSpawn.ts';
import { DEFAULT_ENEMY_PERCEPTION_SETTINGS } from '../../../world/enemy/enemyPerception.ts';
import { createEnemyAmbientBehavior } from '../../../world/enemy/enemyAmbientBehavior.ts';
import { createWorldGridMapper } from '../../../world/spatial/worldGrid.ts';
import type { AssetResolver, PositionLike, PositionNodeLike, RuntimeDispose } from '../shared/runtimeContracts.ts';

const DEFAULT_ENEMY_SPAWN: Readonly<{ x: number; z: number }> = Object.freeze({ x: 2, z: 2 });

interface BabylonRuntimeSubset {
  BABYLON: {
    Vector3: new (x: number, y: number, z: number) => PositionLike;
    Ray: new (origin: PositionLike, direction: PositionLike, length: number) => unknown;
  };
  scene: {
    pickWithRay: (
      ray: unknown,
      predicate: (mesh: { isEnabled?: () => boolean; isVisible?: boolean }) => boolean
    ) => { hit?: boolean; pickedPoint?: { y: number } } | null;
  };
}

interface EntityLike {
  rootNode?: PositionNodeLike & {
    position: PositionNodeLike['position'] & { copyFrom: (position: unknown) => void; y: number };
    dispose?: (doNotRecurse?: boolean, disposeMaterialAndTextures?: boolean) => void;
    gridCell?: { x: number; z: number };
  };
  normalizationDebug?: unknown;
  gameplayDimensions?: { interactionRadius?: number };
  gridCell?: { x: number; z: number };
}

interface DistrictExplorationOptions {
  districtId?: string;
  sceneFile?: string;
  sceneContainerName?: string;
  playerFile?: string;
  enemyFile?: string;
  enemySpawn?: { x: number; z: number };
  playerNormalizationId?: string;
  enemyNormalizationId?: string;
  enemyArchetypeId?: string;
  enemyVisionAngleDegrees?: number;
  enemyVisionDistance?: number;
  enemyFacingDirection?: { x: number; y: number; z: number };
  enemyPatrolPoints?: { x: number; y?: number; z: number }[];
  resolveAssetPath?: AssetResolver;
}

const resolveGroundY = ({ runtime, x, z, fallbackY = 0 }: { runtime: BabylonRuntimeSubset; x: number; z: number; fallbackY?: number }) => {
  const origin = new runtime.BABYLON.Vector3(x, fallbackY + 25, z);
  const ray = new runtime.BABYLON.Ray(origin, new runtime.BABYLON.Vector3(0, -1, 0), 200);

  const hit = runtime.scene.pickWithRay(ray, (mesh) => mesh?.isEnabled?.() && Boolean(mesh.isVisible));
  return hit?.hit && hit.pickedPoint ? hit.pickedPoint.y : fallbackY;
};

function placeEnemyOnGround(runtime: BabylonRuntimeSubset, enemyEntity: EntityLike, gridMapper, spawnPreset = DEFAULT_ENEMY_SPAWN) {
  if (!enemyEntity?.rootNode) {
    throw new Error('Cannot place enemy character without a root node.');
  }

  const spawnCell = gridMapper.worldToGridCell({ x: spawnPreset.x, z: spawnPreset.z });
  const world = gridMapper.gridCellToWorld(spawnCell, {
    resolveY: ({ x, z }) => resolveGroundY({ runtime, x, z, fallbackY: 0 })
  });

  enemyEntity.rootNode.position.copyFrom(new runtime.BABYLON.Vector3(world.x, world.y, world.z));
  enemyEntity.rootNode.gridCell = spawnCell;
  enemyEntity.gridCell = spawnCell;
  return enemyEntity.rootNode.position;
}

function resolveEnemyPatrolData(runtime: BabylonRuntimeSubset, gridMapper, spawnPreset = DEFAULT_ENEMY_SPAWN, patrolPoints?: { x: number; y?: number; z: number }[]) {
  const rawRoute = Array.isArray(patrolPoints) && patrolPoints.length > 0
    ? patrolPoints.map((point) => ({ x: point.x, z: point.z }))
    : [
        { x: spawnPreset.x + 1.75, z: spawnPreset.z + 0.5 },
        { x: spawnPreset.x + 1, z: spawnPreset.z + 2.25 },
        { x: spawnPreset.x - 1.5, z: spawnPreset.z + 1.25 },
        { x: spawnPreset.x - 0.75, z: spawnPreset.z - 1 }
      ];

  const patrolCells = rawRoute.map((point) => gridMapper.worldToGridCell({ x: point.x, z: point.z }));
  const patrolPointsWorld = patrolCells.map((cell) => gridMapper.gridCellToWorld(cell, {
    resolveY: ({ x, z }) => resolveGroundY({ runtime, x, z, fallbackY: 0 })
  }));

  return {
    patrolCells,
    patrolPointsWorld
  };
}

export async function createDistrictExplorationRuntime(runtime: BabylonRuntimeSubset, options: DistrictExplorationOptions = {}) {
  const districtScene = await loadWorldScene(runtime, {
    sceneFile: options.sceneFile,
    containerName: options.sceneContainerName ?? 'districtSceneRoot',
    resolveAssetPath: options.resolveAssetPath
  });

  const gridMapper = createWorldGridMapper();

  const playerEntity = (await loadPlayerCharacter(runtime, {
    playerFile: options.playerFile,
    playerNormalizationId: options.playerNormalizationId,
    resolveAssetPath: options.resolveAssetPath
  })) as EntityLike;
  spawnPlayerCharacter(runtime, playerEntity, { gridMapper });

  const enemyEntity = (await loadEnemyCharacter(runtime, {
    enemyFile: options.enemyFile,
    enemyNormalizationId: options.enemyNormalizationId,
    enemyArchetypeId: options.enemyArchetypeId,
    resolveAssetPath: options.resolveAssetPath
  })) as EntityLike;
  const enemyPosition = placeEnemyOnGround(runtime, enemyEntity, gridMapper, options.enemySpawn);
  const patrolData = resolveEnemyPatrolData(runtime, gridMapper, options.enemySpawn, options.enemyPatrolPoints);
  const initialFacingDirection = options.enemyFacingDirection ?? { x: 0, y: 0, z: -1 };
  const enemyAmbientBehavior = createEnemyAmbientBehavior({
    facingDirection: initialFacingDirection,
    patrolPoints: patrolData.patrolPointsWorld,
    patrolCells: patrolData.patrolCells
  });

  const dispose: RuntimeDispose = () => {
    enemyEntity.rootNode?.dispose?.(false, true);
    playerEntity.rootNode?.dispose?.(false, true);
    districtScene.sceneContainer?.dispose?.(false, true);
  };

  return {
    districtSceneRoot: districtScene.sceneContainer,
    districtScene,
    groundMesh: districtScene.groundMesh,
    playerEntity,
    playerMeshRoot: playerEntity.rootNode,
    enemyEntity,
    enemyMeshRoot: enemyEntity.rootNode,
    worldGridMapper: gridMapper,
    enemyPerception: {
      visionAngleDegrees: Number.isFinite(options.enemyVisionAngleDegrees)
        ? Math.max(0, options.enemyVisionAngleDegrees)
        : DEFAULT_ENEMY_PERCEPTION_SETTINGS.visionAngleDegrees,
      visionDistance: Number.isFinite(options.enemyVisionDistance)
        ? Math.max(0, options.enemyVisionDistance)
        : DEFAULT_ENEMY_PERCEPTION_SETTINGS.visionDistance,
      facingDirection: { ...enemyAmbientBehavior.facingDirection }
    },
    enemyAmbientBehavior,
    resolveGroundY: ({ x, z, fallbackY = 0 }) => resolveGroundY({ runtime, x, z, fallbackY }),
    dispose
  };
}
