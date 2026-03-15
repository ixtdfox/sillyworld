export function resolveGroundY({ runtime, x, z, fallbackY = 0 }) {
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
}