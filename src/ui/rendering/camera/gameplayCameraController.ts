// @ts-nocheck
const DEFAULT_CAMERA_CONFIG = {
  distance: 14,
  elevationDegrees: 55,
  yawDegrees: -45,
  targetHeight: 1.2,
  positionLerpFactor: 0.12,
  targetLerpFactor: 0.2
};

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function createOffsetVector(BABYLON, distance, elevationDegrees, yawDegrees) {
  const elevation = toRadians(elevationDegrees);
  const yaw = toRadians(yawDegrees);

  const horizontalDistance = distance * Math.cos(elevation);
  const x = Math.cos(yaw) * horizontalDistance;
  const y = distance * Math.sin(elevation);
  const z = Math.sin(yaw) * horizontalDistance;

  return new BABYLON.Vector3(x, y, z);
}

export function attachGameplayIsometricCamera(runtime, followTarget, options = {}) {
  if (!followTarget?.position) {
    throw new Error('Cannot attach gameplay camera without a follow target node.');
  }

  const BABYLON = runtime.BABYLON;
  const config = {
    ...DEFAULT_CAMERA_CONFIG,
    ...options
  };

  const cameraOffset = createOffsetVector(BABYLON, config.distance, config.elevationDegrees, config.yawDegrees);
  const lookAtOffset = new BABYLON.Vector3(0, config.targetHeight, 0);

  console.log('[SillyRPG] Gameplay camera setup start', {
    mode: 'isometric-follow',
    ...config
  });

  const initialTarget = followTarget.position.add(lookAtOffset);
  const initialPosition = initialTarget.add(cameraOffset);

  const camera = new BABYLON.FreeCamera('gameplayCamera', initialPosition, runtime.scene);
  camera.setTarget(initialTarget);
  camera.minZ = 0.1;
  camera.maxZ = 1000;

  runtime.scene.activeCamera?.dispose();
  runtime.scene.activeCamera = camera;
  runtime.camera = camera;

  console.log('[SillyRPG] Gameplay camera created', {
    position: { x: initialPosition.x, y: initialPosition.y, z: initialPosition.z },
    target: { x: initialTarget.x, y: initialTarget.y, z: initialTarget.z }
  });
  console.log('[SillyRPG] Gameplay camera follow target attached', {
    targetName: followTarget.name ?? 'unnamed-node'
  });

  let smoothedPosition = initialPosition.clone();
  let smoothedTarget = initialTarget.clone();

  const beforeRenderObserver = runtime.scene.onBeforeRenderObservable.add(() => {
    const desiredTarget = followTarget.position.add(lookAtOffset);
    const desiredPosition = desiredTarget.add(cameraOffset);

    smoothedTarget = BABYLON.Vector3.Lerp(smoothedTarget, desiredTarget, config.targetLerpFactor);
    smoothedPosition = BABYLON.Vector3.Lerp(smoothedPosition, desiredPosition, config.positionLerpFactor);

    camera.position.copyFrom(smoothedPosition);
    camera.setTarget(smoothedTarget);
  });

  return () => {
    runtime.scene.onBeforeRenderObservable.remove(beforeRenderObserver);
    const detachedCameraWasActive = runtime.scene.activeCamera === camera;
    const detachedCameraPosition = camera.position?.clone?.();
    if (!camera.isDisposed()) {
      camera.dispose();
    }

    if (detachedCameraWasActive) {
      const fallbackCamera = new BABYLON.FreeCamera(
        'gameplayCameraDetachedFallback',
        detachedCameraPosition ?? new BABYLON.Vector3(0, 8, -10),
        runtime.scene
      );
      fallbackCamera.setTarget(new BABYLON.Vector3(0, 0, 0));
      fallbackCamera.minZ = 0.1;
      fallbackCamera.maxZ = 1000;
      runtime.scene.activeCamera = fallbackCamera;
      runtime.camera = fallbackCamera;
      console.debug('[SillyRPG] Gameplay camera detached; fallback camera activated.');
    }
  };
}
