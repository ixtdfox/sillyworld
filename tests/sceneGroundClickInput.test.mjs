import test from 'node:test';
import assert from 'node:assert/strict';
import { attachSceneGroundMovementInput } from '../src/ui/rendering/scene/sceneGroundMovementInput.ts';

function createRuntime({ pickResult }) {
  let observer = null;

  return {
    BABYLON: {
      PointerEventTypes: {
        POINTERDOWN: 1
      }
    },
    scene: {
      pointerX: 100,
      pointerY: 200,
      pick: () => pickResult,
      onPointerObservable: {
        add: (callback) => {
          observer = callback;
          return callback;
        },
        remove: () => {
          observer = null;
        }
      }
    },
    triggerPointerDown: () => {
      observer?.({ type: 1 });
    },
    hasObserver: () => Boolean(observer)
  };
}

function createMovementTargetState() {
  let target = null;
  let clearCount = 0;

  return {
    getTarget: () => target,
    setTarget: (nextTarget) => {
      target = nextTarget;
    },
    clearTarget: () => {
      clearCount += 1;
      target = null;
    },
    getClearCount: () => clearCount
  };
}

test('accepts Ground picks and sets movement target', () => {
  const point = { x: 1, y: 2, z: 3, clone: () => ({ x: 1, y: 2, z: 3 }) };
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedMesh: { name: 'Ground', parent: null },
      pickedPoint: point
    }
  });
  const movementTargetState = createMovementTargetState();

  attachSceneGroundMovementInput(runtime, movementTargetState);
  runtime.triggerPointerDown();

  assert.deepEqual(movementTargetState.getTarget(), { x: 1, y: 2, z: 3 });
  assert.equal(movementTargetState.getClearCount(), 0);
});

test('rejects Wall picks and clears stale movement target', () => {
  const point = { x: 1, y: 2, z: 3, clone: () => ({ x: 1, y: 2, z: 3 }) };
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedMesh: { name: 'Wall', parent: null },
      pickedPoint: point
    }
  });
  const movementTargetState = createMovementTargetState();
  movementTargetState.setTarget({ x: 9, y: 9, z: 9 });

  attachSceneGroundMovementInput(runtime, movementTargetState);
  runtime.triggerPointerDown();

  assert.equal(movementTargetState.getTarget(), null);
  assert.equal(movementTargetState.getClearCount(), 1);
});

test('rejects no-hit picks and clears stale movement target', () => {
  const runtime = createRuntime({
    pickResult: {
      hit: false,
      pickedMesh: null,
      pickedPoint: null
    }
  });
  const movementTargetState = createMovementTargetState();
  movementTargetState.setTarget({ x: 9, y: 9, z: 9 });

  attachSceneGroundMovementInput(runtime, movementTargetState);
  runtime.triggerPointerDown();

  assert.equal(movementTargetState.getTarget(), null);
  assert.equal(movementTargetState.getClearCount(), 1);
});
