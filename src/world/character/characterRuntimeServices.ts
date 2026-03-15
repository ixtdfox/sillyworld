// @ts-nocheck
import { createWorldGridMapper } from '../spatial/worldGrid.ts';
import { loadAndNormalizeEntityCharacter } from '../../render/shared/entityCharacterLoader.ts';

const DEFAULT_SPAWN = Object.freeze({ x: 0, y: 0, z: 0 });

/**
 * CharacterRuntime owns scene-bound lifecycle state for one spawned character instance.
 * This object intentionally excludes world/domain state so scene reloads can recreate it
 * without mutating persistence structures.
 */
export class CharacterRuntime {
  constructor(loadedCharacter, runtimeMetadata = {}) {
    this.rootNode = loadedCharacter.rootNode;
    this.normalizationConfig = loadedCharacter.normalizationConfig;
    this.normalizationMetrics = loadedCharacter.normalizationMetrics;
    this.gameplayDimensions = loadedCharacter.gameplayDimensions;
    this.normalizationDebug = loadedCharacter.normalizationDebug;
    this.meshes = loadedCharacter.meshes ?? [];
    this.skeletons = loadedCharacter.skeletons ?? [];
    this.animationGroups = loadedCharacter.animationGroups ?? [];
    this.gridCell = null;
    this.runtimeMetadata = {
      controllerId: runtimeMetadata.controllerId ?? null,
      role: runtimeMetadata.role ?? null,
      archetypeId: runtimeMetadata.archetypeId ?? null,
      animationProfile: runtimeMetadata.animationProfile ?? 'humanoid_biped',
      animationState: runtimeMetadata.animationState ?? null,
      animationGroupNames: runtimeMetadata.animationGroupNames ?? [],
      lastSpawnCell: runtimeMetadata.lastSpawnCell ?? null
    };
  }

  ensureRootNode() {
    if (!this.rootNode) {
      throw new Error('Cannot use character runtime without a root node.');
    }

    return this.rootNode;
  }

  setGridCell(cell) {
    this.gridCell = cell;
    if (this.rootNode) {
      this.rootNode.gridCell = cell;
    }
    this.runtimeMetadata.lastSpawnCell = cell;
  }

  placeAt(position, cell) {
    const rootNode = this.ensureRootNode();
    rootNode.position.copyFrom(position);
    this.setGridCell(cell);
    return position;
  }

  getAnimationGroups() {
    return this.animationGroups;
  }

  setAnimationState(state) {
    this.runtimeMetadata.animationState = state;
  }

  recordAnimationGroupNames() {
    this.runtimeMetadata.animationGroupNames = this.animationGroups.map((group) => group?.name ?? null);
  }
}

/**
 * Factory centralizes model loading + normalization so wrappers differ only by archetype/config
 * and runtime role/controller metadata.
 */
export class CharacterRuntimeFactory {
  constructor(runtime) {
    this.runtime = runtime;
  }

  async createCharacterRuntime(options = {}) {
    const {
      entityLabel,
      modelFile,
      normalizationConfigId,
      resolveAssetPath,
      runtimeMetadata = {}
    } = options;

    const loaded = await loadAndNormalizeEntityCharacter(this.runtime, {
      entityLabel,
      modelFile,
      normalizationConfigId,
      resolveAssetPath
    });

    return new CharacterRuntime(loaded, runtimeMetadata);
  }
}

/**
 * Spawner guarantees that requested world coordinates are snapped to a legal grid cell center,
 * then grounded against terrain Y before mutating the runtime transform.
 */
export class CharacterSpawner {
  constructor(runtime, options = {}) {
    this.runtime = runtime;
    this.gridMapper = options.gridMapper ?? createWorldGridMapper();
    this.groundMeshName = options.groundMeshName ?? 'Ground';
  }

  resolveGroundY({ x, z, fallbackY = 0 }) {
    const groundMesh = this.runtime.scene?.getMeshByName?.(this.groundMeshName) ?? null;
    if (!groundMesh || groundMesh.isEnabled?.() === false || groundMesh.isVisible === false) {
      return fallbackY;
    }

    const origin = new this.runtime.BABYLON.Vector3(x, fallbackY + 25, z);
    const ray = new this.runtime.BABYLON.Ray(origin, new this.runtime.BABYLON.Vector3(0, -1, 0), 200);
    const hit = this.runtime.scene.pickWithRay(ray, (mesh) => mesh === groundMesh);
    return hit?.hit && hit.pickedPoint ? hit.pickedPoint.y : fallbackY;
  }

  resolveSpawnPlacement(options = {}) {
    const {
      spawn = null,
      fallbackSpawn = DEFAULT_SPAWN,
      markerNames = [],
      fallbackY = fallbackSpawn.y ?? DEFAULT_SPAWN.y,
      resolveY
    } = options;

    let markerPosition = null;
    for (const markerName of markerNames) {
      const marker = this.runtime.scene?.getNodeByName?.(markerName);
      if (marker?.position) {
        markerPosition = marker.position;
        break;
      }
    }

    const requestedX = spawn?.x ?? markerPosition?.x ?? fallbackSpawn.x;
    const requestedZ = spawn?.z ?? markerPosition?.z ?? fallbackSpawn.z;
    const requestedY = spawn?.y ?? markerPosition?.y ?? fallbackY;

    const spawnCell = this.gridMapper.worldToGridCell({ x: requestedX, z: requestedZ });
    const world = this.gridMapper.gridCellToWorld(spawnCell, {
      resolveY: ({ x, z }) => (
        typeof resolveY === 'function'
          ? resolveY({ x, z, fallbackY: requestedY })
          : this.resolveGroundY({ x, z, fallbackY: requestedY })
      )
    });

    return {
      spawnCell,
      spawnPosition: new this.runtime.BABYLON.Vector3(world.x, world.y, world.z)
    };
  }

  spawn(characterRuntime, options = {}) {
    const { spawnCell, spawnPosition } = this.resolveSpawnPlacement(options);
    return characterRuntime.placeAt(spawnPosition, spawnCell);
  }
}

/**
 * Shared animation runtime component stores discoverable animation data/state so role-specific
 * controllers can focus on choosing states instead of mutating runtime bookkeeping.
 */
export class CharacterAnimationController {
  constructor(characterRuntime) {
    this.characterRuntime = characterRuntime;
  }

  initialize(options = {}) {
    const defaultState = options.defaultState ?? 'idle';
    this.characterRuntime.recordAnimationGroupNames();
    this.characterRuntime.setAnimationState(defaultState);
    return {
      animationGroups: this.characterRuntime.getAnimationGroups(),
      defaultState
    };
  }

  setState(nextState) {
    this.characterRuntime.setAnimationState(nextState);
  }

  getAnimationGroups() {
    return this.characterRuntime.getAnimationGroups();
  }
}
