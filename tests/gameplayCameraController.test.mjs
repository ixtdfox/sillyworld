import test from 'node:test';
import assert from 'node:assert/strict';
import { attachGameplayIsometricCamera } from '../src/ui/rendering/camera/gameplayCameraController.ts';

class Vector3 {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  add(other) {
    return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  clone() {
    return new Vector3(this.x, this.y, this.z);
  }

  copyFrom(other) {
    this.x = other.x;
    this.y = other.y;
    this.z = other.z;
  }

  static Lerp(start, end, amount) {
    return new Vector3(
      start.x + (end.x - start.x) * amount,
      start.y + (end.y - start.y) * amount,
      start.z + (end.z - start.z) * amount
    );
  }
}

function createObservable() {
  let callback = null;
  return {
    add: (nextCallback) => {
      callback = nextCallback;
      return nextCallback;
    },
    remove: () => {
      callback = null;
    },
    emit: (payload) => callback?.(payload)
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function createRuntime() {
  const pointerObservable = createObservable();
  const beforeRenderObservable = createObservable();
  const canvasListeners = new Map();
  const canvas = {
    addEventListener: (eventName, callback) => canvasListeners.set(eventName, callback),
    removeEventListener: (eventName) => canvasListeners.delete(eventName),
    hasEvent: (eventName) => canvasListeners.has(eventName)
  };

  class FreeCamera {
    constructor(name, position) {
      this.name = name;
      this.position = position;
      this.disposed = false;
      this.minZ = 0;
      this.maxZ = 0;
      this.target = null;
    }

    setTarget(target) {
      this.target = target;
    }

    isDisposed() {
      return this.disposed;
    }

    dispose() {
      this.disposed = true;
    }
  }

  const scene = {
    activeCamera: {
      dispose: () => {}
    },
    onPointerObservable: pointerObservable,
    onBeforeRenderObservable: beforeRenderObservable
  };

  return {
    runtime: {
      BABYLON: {
        Vector3,
        FreeCamera,
        PointerEventTypes: {
          POINTERDOWN: 1,
          POINTERUP: 2,
          POINTERMOVE: 3
        }
      },
      scene,
      engine: {
        getRenderingCanvas: () => canvas
      }
    },
    pointerObservable,
    beforeRenderObservable,
    canvas
  };
}

test('orbits on RMB drag, keeps follow behavior, and stops orbit on RMB release', () => {
  const { runtime, pointerObservable, beforeRenderObservable, canvas } = createRuntime();
  const followTarget = {
    name: 'playerRoot',
    position: new Vector3(0, 0, 0)
  };

  const detach = attachGameplayIsometricCamera(runtime, followTarget, {
    positionLerpFactor: 1,
    targetLerpFactor: 1,
    rotationSensitivity: 1
  });

  beforeRenderObservable.emit();
  const initialPosition = runtime.scene.activeCamera.position.clone();
  const initialTarget = runtime.scene.activeCamera.target.clone();
  const initialDistance = distance(initialPosition, initialTarget);

  pointerObservable.emit({ type: 1, event: { button: 0, clientX: 10, clientY: 10 } });
  pointerObservable.emit({ type: 3, event: { button: 0, movementX: 40, movementY: -20, clientX: 50, clientY: -10 } });
  beforeRenderObservable.emit();
  const afterLeftDragPosition = runtime.scene.activeCamera.position.clone();

  assert.deepEqual(afterLeftDragPosition, initialPosition);

  const pointerDownInfo = { type: 1, event: { button: 2, clientX: 100, clientY: 100 }, skipOnPointerObservable: false };
  pointerObservable.emit(pointerDownInfo);
  pointerObservable.emit({ type: 3, event: { movementX: 30, movementY: 15, clientX: 130, clientY: 115 }, skipOnPointerObservable: false });
  beforeRenderObservable.emit();
  const afterOrbitPosition = runtime.scene.activeCamera.position.clone();
  const afterOrbitTarget = runtime.scene.activeCamera.target.clone();

  assert.equal(pointerDownInfo.skipOnPointerObservable, true);
  assert.notDeepEqual(afterOrbitPosition, initialPosition);
  assert.equal(Math.round(distance(afterOrbitPosition, afterOrbitTarget) * 1000) / 1000, Math.round(initialDistance * 1000) / 1000);

  followTarget.position = new Vector3(4, 0, 2);
  beforeRenderObservable.emit();
  const followedTarget = runtime.scene.activeCamera.target.clone();
  assert.deepEqual(followedTarget, new Vector3(4, 1.2, 2));

  const releaseInfo = { type: 2, event: { button: 2, clientX: 130, clientY: 115 }, skipOnPointerObservable: false };
  pointerObservable.emit(releaseInfo);
  const frozenPosition = runtime.scene.activeCamera.position.clone();
  pointerObservable.emit({ type: 3, event: { movementX: 80, movementY: -50, clientX: 210, clientY: 65 } });
  beforeRenderObservable.emit();

  assert.equal(releaseInfo.skipOnPointerObservable, true);
  assert.deepEqual(runtime.scene.activeCamera.position, frozenPosition);
  assert.equal(canvas.hasEvent('contextmenu'), true);

  detach();
  assert.equal(canvas.hasEvent('contextmenu'), false);
});
