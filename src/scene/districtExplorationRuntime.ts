// @ts-nocheck
import { loadWorldScene } from './worldSceneLoader.ts';
import { loadPlayerCharacter } from '../world/player/playerCharacterLoader.ts';
import { loadEnemyCharacter } from '../world/enemy/enemyCharacterLoader.ts';
import { spawnPlayerCharacter } from '../world/player/playerSpawn.ts';
import { DEFAULT_ENEMY_PERCEPTION_SETTINGS } from '../world/enemy/enemyPerception.ts';
import { createEnemyAmbientBehavior } from '../world/enemy/enemyAmbientBehavior.ts';
import { createWorldGridMapper } from '../world/spatial/worldGrid.ts';
import { snapActorToNearestValidGridCell } from '../render/shared/gridAlignment.ts';
import type { AssetResolver, PositionLike, PositionNodeLike, RuntimeDispose } from '../render/shared/runtimeContracts.ts';

const DEFAULT_ENEMY_SPAWN: Readonly<{ x: number; z: number }> = Object.freeze({ x: 2, z: 2 });

/** Определяет контракт `BabylonRuntimeSubset` для согласованного взаимодействия модулей в контексте `scene/districtExplorationRuntime`. */
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

/** Определяет контракт `EntityLike` для согласованного взаимодействия модулей в контексте `scene/districtExplorationRuntime`. */
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

/** Определяет контракт `DistrictExplorationOptions` для согласованного взаимодействия модулей в контексте `scene/districtExplorationRuntime`. */
interface DistrictExplorationOptions {
  districtId?: string;
  sceneFile?: string;
  sceneContainerName?: string;
  playerFile?: string;
  enemyFile?: string;
  playerSpawn?: { x: number; z: number };
  enemySpawn?: { x: number; z: number };
  playerNormalizationId?: string;
  enemyNormalizationId?: string;
  enemyArchetypeId?: string;
  enemyVisionAngleDegrees?: number;
  enemyVisionDistance?: number;
  playerFacingDirection?: { x: number; y: number; z: number };
  enemyFacingDirection?: { x: number; y: number; z: number };
  enemyPatrolPoints?: { x: number; y?: number; z: number }[];
  skipEnemyPatrol?: boolean;
  resolveAssetPath?: AssetResolver;
}


/** Выполняет `yawFromDirection` в ходе выполнения связанного игрового сценария. */
function yawFromDirection(direction: { x: number; z: number }): number {
  return Math.atan2(direction.x, direction.z);
}

/** Обновляет `setRootYaw` в ходе выполнения связанного игрового сценария. */
function setRootYaw(rootNode: PositionNodeLike | undefined, yaw: number): void {
  if (!rootNode || !Number.isFinite(yaw)) return;
  if (rootNode.rotationQuaternion !== undefined) {
    rootNode.rotationQuaternion = null;
  }
  rootNode.rotation = rootNode.rotation ?? { x: 0, y: 0, z: 0 };
  rootNode.rotation.y = yaw;
}

const resolveGroundY = ({ runtime, x, z, fallbackY = 0 }) => {
  const groundMesh = runtime?.scene?.getMeshByName?.('Ground') ?? null;
  if (!groundMesh || groundMesh.isEnabled?.() === false || groundMesh.isVisible === false) {
    return fallbackY;
  }

  const origin = new runtime.BABYLON.Vector3(x, fallbackY + 25, z);
  const ray = new runtime.BABYLON.Ray(
      origin,
      new runtime.BABYLON.Vector3(0, -1, 0),
      200
  );

  const hit = runtime.scene.pickWithRay(ray, (mesh) => mesh === groundMesh);
  return hit?.hit && hit.pickedPoint ? hit.pickedPoint.y : fallbackY;
};

/** Выполняет `placeEnemyOnGround` в ходе выполнения связанного игрового сценария. */
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

/** Определяет `resolveEnemyPatrolData` в ходе выполнения связанного игрового сценария. */
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

/** Создаёт и настраивает `createDistrictExplorationRuntime` в ходе выполнения связанного игрового сценария. */
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
  spawnPlayerCharacter(runtime, playerEntity, { gridMapper, spawn: options.playerSpawn });

  const isWorldCellValid = (cell: { x: number; z: number }) => (
    cell.x >= gridMapper.minX
    && cell.x <= gridMapper.maxX
    && cell.z >= gridMapper.minZ
    && cell.z <= gridMapper.maxZ
  );

  snapActorToNearestValidGridCell({
    runtime,
    actor: playerEntity,
    gridMapper,
    isCellValid: isWorldCellValid,
    resolveY: ({ x, z, fallbackY = 0 }) => resolveGroundY({ runtime, x, z, fallbackY }),
    reason: 'exploration_init_player',
    logger: console
  });

  const enemyEntity = (await loadEnemyCharacter(runtime, {
    enemyFile: options.enemyFile,
    enemyNormalizationId: options.enemyNormalizationId,
    enemyArchetypeId: options.enemyArchetypeId,
    resolveAssetPath: options.resolveAssetPath
  })) as EntityLike;
  placeEnemyOnGround(runtime, enemyEntity, gridMapper, options.enemySpawn);
  snapActorToNearestValidGridCell({
    runtime,
    actor: enemyEntity,
    gridMapper,
    isCellValid: isWorldCellValid,
    resolveY: ({ x, z, fallbackY = 0 }) => resolveGroundY({ runtime, x, z, fallbackY }),
    reason: 'exploration_init_enemy',
    logger: console
  });

  const initialFacingDirection = options.enemyFacingDirection ?? { x: 0, y: 0, z: -1 };

  if (options.playerFacingDirection) {
    setRootYaw(playerEntity.rootNode, yawFromDirection(options.playerFacingDirection));
  }

  setRootYaw(enemyEntity.rootNode, yawFromDirection(initialFacingDirection));

  const patrolData = options.skipEnemyPatrol
    ? { patrolCells: [], patrolPointsWorld: [] }
    : resolveEnemyPatrolData(runtime, gridMapper, options.enemySpawn, options.enemyPatrolPoints);
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
