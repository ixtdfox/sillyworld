// @ts-nocheck
import { isSecondaryPointerAction, setCameraOrbiting } from '../shared/pointerInputGuards.ts';

const DEFAULT_CAMERA_CONFIG = {
  distance: 14,
  elevationDegrees: 55,
  yawDegrees: -45,
  minPitchDegrees: 20,
  maxPitchDegrees: 80,
  rotationSensitivity: 0.2,
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

  const lookAtOffset = new BABYLON.Vector3(0, config.targetHeight, 0);
  const pointerEventTypes = BABYLON.PointerEventTypes ?? {};
  const pointerDownType = pointerEventTypes.POINTERDOWN ?? 1;
  const pointerUpType = pointerEventTypes.POINTERUP ?? 2;
  const pointerMoveType = pointerEventTypes.POINTERMOVE ?? 4;
  let yawDegrees = config.yawDegrees;
  let pitchDegrees = Math.min(config.maxPitchDegrees, Math.max(config.minPitchDegrees, config.elevationDegrees));
  let isOrbiting = false;
  let lastClientX = null;
  let lastClientY = null;

  const resolveCameraOffset = () => createOffsetVector(BABYLON, config.distance, pitchDegrees, yawDegrees);
  const canvas = runtime.engine?.getRenderingCanvas?.() ?? runtime.scene?.getEngine?.()?.getRenderingCanvas?.() ?? null;

  const onContextMenu = (event) => {
    event.preventDefault();
  };

  if (canvas) {
    canvas.addEventListener('contextmenu', onContextMenu);
  }

  console.log('[SillyRPG] Gameplay camera setup start', {
    mode: 'isometric-follow',
    ...config
  });

  const initialTarget = followTarget.position.add(lookAtOffset);
  const initialPosition = initialTarget.add(resolveCameraOffset());

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

  const pointerObserver = runtime.scene.onPointerObservable.add((pointerInfo) => {
    const event = pointerInfo?.event;

    if (pointerInfo?.type === pointerDownType && isSecondaryPointerAction(pointerInfo)) {
      isOrbiting = true;
      setCameraOrbiting(runtime, true);
      lastClientX = typeof event?.clientX === 'number' ? event.clientX : null;
      lastClientY = typeof event?.clientY === 'number' ? event.clientY : null;
      pointerInfo.skipOnPointerObservable = true;
      return;
    }

    if (pointerInfo?.type === pointerUpType && isSecondaryPointerAction(pointerInfo)) {
      isOrbiting = false;
      setCameraOrbiting(runtime, false);
      lastClientX = null;
      lastClientY = null;
      pointerInfo.skipOnPointerObservable = true;
      return;
    }

    if (!isOrbiting || pointerInfo?.type !== pointerMoveType) {
      return;
    }

    const hasMovementDeltas = typeof event?.movementX === 'number' && typeof event?.movementY === 'number';
    const deltaX = hasMovementDeltas
      ? event.movementX
      : (typeof event?.clientX === 'number' && typeof lastClientX === 'number' ? event.clientX - lastClientX : 0);
    const deltaY = hasMovementDeltas
      ? event.movementY
      : (typeof event?.clientY === 'number' && typeof lastClientY === 'number' ? event.clientY - lastClientY : 0);

    yawDegrees -= deltaX * config.rotationSensitivity;
    const nextPitch = pitchDegrees - deltaY * config.rotationSensitivity;
    pitchDegrees = Math.min(config.maxPitchDegrees, Math.max(config.minPitchDegrees, nextPitch));

    lastClientX = typeof event?.clientX === 'number' ? event.clientX : lastClientX;
    lastClientY = typeof event?.clientY === 'number' ? event.clientY : lastClientY;
    pointerInfo.skipOnPointerObservable = true;
  });

  const beforeRenderObserver = runtime.scene.onBeforeRenderObservable.add(() => {
    const desiredTarget = followTarget.position.add(lookAtOffset);
    const desiredPosition = desiredTarget.add(resolveCameraOffset());

    smoothedTarget = BABYLON.Vector3.Lerp(smoothedTarget, desiredTarget, config.targetLerpFactor);
    smoothedPosition = BABYLON.Vector3.Lerp(smoothedPosition, desiredPosition, config.positionLerpFactor);

    camera.position.copyFrom(smoothedPosition);
    camera.setTarget(smoothedTarget);
  });

  return () => {
    setCameraOrbiting(runtime, false);
    runtime.scene.onPointerObservable.remove(pointerObserver);
    runtime.scene.onBeforeRenderObservable.remove(beforeRenderObserver);
    if (canvas) {
      canvas.removeEventListener('contextmenu', onContextMenu);
    }
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
