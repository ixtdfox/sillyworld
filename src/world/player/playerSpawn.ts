// @ts-nocheck
/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей. Фокус файла — состояние и поведение игрока в исследовании и связанных действиях.
 */
import { createWorldGridMapper } from '../spatial/worldGrid.ts';

const DEFAULT_PLAYER_SPAWN = { x: 0, y: 0, z: 0 };
const SPAWN_MARKER_NAMES = ['PlayerSpawn', 'player_spawn', 'spawn_player'];

/** Выполняет `findSpawnMarker` в ходе выполнения связанного игрового сценария. */
function findSpawnMarker(scene) {
  for (const markerName of SPAWN_MARKER_NAMES) {
    const marker = scene.getNodeByName(markerName);
    if (marker?.position) {
      return marker.position;
    }
  }

  return null;
}

/** Определяет `resolveGroundY` в ходе выполнения связанного игрового сценария. */
function resolveGroundY({ scene, BABYLON, x, z, fallbackY }) {
  const groundMesh = scene?.getMeshByName?.('Ground') ?? null;
  if (!groundMesh || groundMesh.isEnabled?.() === false || groundMesh.isVisible === false) {
    return fallbackY;
  }

  const origin = new BABYLON.Vector3(x, fallbackY + 25, z);
  const ray = new BABYLON.Ray(
      origin,
      new BABYLON.Vector3(0, -1, 0),
      200
  );

  const hit = scene.pickWithRay(ray, (mesh) => mesh === groundMesh);
  return hit?.hit && hit.pickedPoint ? hit.pickedPoint.y : fallbackY;
}

/** Определяет `resolveSpawnPosition` в ходе выполнения связанного игрового сценария. */
function resolveSpawnPosition({ scene, BABYLON, gridMapper, forcedSpawn }) {
  const markerPosition = findSpawnMarker(scene);
  const x = forcedSpawn?.x ?? markerPosition?.x ?? DEFAULT_PLAYER_SPAWN.x;
  const z = forcedSpawn?.z ?? markerPosition?.z ?? DEFAULT_PLAYER_SPAWN.z;
  const fallbackY = markerPosition?.y ?? DEFAULT_PLAYER_SPAWN.y;
  const spawnCell = gridMapper.worldToGridCell({ x, z });
  const centered = gridMapper.gridCellToWorld(spawnCell, {
    resolveY: ({ x: worldX, z: worldZ }) => resolveGroundY({ scene, BABYLON, x: worldX, z: worldZ, fallbackY })
  });

  return {
    spawnCell,
    spawnPosition: new BABYLON.Vector3(centered.x, centered.y, centered.z)
  };
}

/** Выполняет `spawnPlayerCharacter` в ходе выполнения связанного игрового сценария. */
export function spawnPlayerCharacter(runtime, playerCharacter, options = {}) {
  if (!playerCharacter?.rootNode) {
    throw new Error('Cannot spawn player character without a root node.');
  }

  const gridMapper = options.gridMapper ?? createWorldGridMapper();
  const { spawnCell, spawnPosition } = resolveSpawnPosition({ ...runtime, gridMapper, forcedSpawn: options.spawn });
  playerCharacter.rootNode.position.copyFrom(spawnPosition);
  playerCharacter.gridCell = spawnCell;

  return spawnPosition;
}
