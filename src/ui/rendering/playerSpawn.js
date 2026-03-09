const DEFAULT_PLAYER_SPAWN = { x: 0, y: 0, z: 0 };
const SPAWN_MARKER_NAMES = ['PlayerSpawn', 'player_spawn', 'spawn_player'];

function findSpawnMarker(scene) {
  for (const markerName of SPAWN_MARKER_NAMES) {
    const marker = scene.getNodeByName(markerName);
    if (marker?.position) {
      return marker.position;
    }
  }

  return null;
}

function resolveGroundY({ scene, BABYLON, x, z, fallbackY }) {
  const origin = new BABYLON.Vector3(x, fallbackY + 25, z);
  const ray = new BABYLON.Ray(origin, new BABYLON.Vector3(0, -1, 0), 200);

  const hit = scene.pickWithRay(ray, (mesh) => mesh?.isEnabled?.() && mesh.isVisible);
  return hit?.hit && hit.pickedPoint ? hit.pickedPoint.y : fallbackY;
}

function resolveSpawnPosition({ scene, BABYLON }) {
  const markerPosition = findSpawnMarker(scene);
  const x = markerPosition?.x ?? DEFAULT_PLAYER_SPAWN.x;
  const z = markerPosition?.z ?? DEFAULT_PLAYER_SPAWN.z;
  const fallbackY = markerPosition?.y ?? DEFAULT_PLAYER_SPAWN.y;
  const y = resolveGroundY({ scene, BABYLON, x, z, fallbackY });

  return new BABYLON.Vector3(x, y, z);
}

export function spawnPlayerCharacter(runtime, playerCharacter) {
  if (!playerCharacter?.rootNode) {
    throw new Error('Cannot spawn player character without a root node.');
  }

  const spawnPosition = resolveSpawnPosition(runtime);
  playerCharacter.rootNode.position.copyFrom(spawnPosition);

  console.log('[SillyRPG] Player spawn position:', {
    x: spawnPosition.x,
    y: spawnPosition.y,
    z: spawnPosition.z
  });

  return spawnPosition;
}
