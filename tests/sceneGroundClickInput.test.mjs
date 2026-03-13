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
    triggerPointerDown: ({ button = 0 } = {}) => {
      observer?.({ type: 1, event: { button } });
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
  const gridMapper = {
    worldToGridCell: ({ x, z }) => ({ x: Math.floor(x), z: Math.floor(z) })
  };

  attachSceneGroundMovementInput(runtime, movementTargetState, gridMapper);
  runtime.triggerPointerDown();

  assert.deepEqual(movementTargetState.getTarget(), { x: 1, z: 3 });
  assert.equal(movementTargetState.getClearCount(), 0);
});

test('uses mesh metadata gridCell when available', () => {
  const point = { x: 2.25, y: 0, z: 5.75, clone: () => ({ x: 2.25, y: 0, z: 5.75 }) };
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedMesh: { name: 'Ground', parent: null, metadata: { gridCell: { x: 7, z: -2 } } },
      pickedPoint: point
    }
  });
  const movementTargetState = createMovementTargetState();
  const gridMapper = {
    worldToGridCell: () => ({ x: 999, z: 999 })
  };

  attachSceneGroundMovementInput(runtime, movementTargetState, gridMapper);
  runtime.triggerPointerDown();

  assert.deepEqual(movementTargetState.getTarget(), { x: 7, z: -2 });
  assert.equal(movementTargetState.getClearCount(), 0);
});

test('rejects blocked destination cell and clears stale movement target', () => {
  const point = { x: 1.2, y: 2, z: 3.7, clone: () => ({ x: 1.2, y: 2, z: 3.7 }) };
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedMesh: { name: 'Ground', parent: null },
      pickedPoint: point
    }
  });
  const movementTargetState = createMovementTargetState();
  movementTargetState.setTarget({ x: 9, z: 9 });
  const gridMapper = {
    worldToGridCell: ({ x, z }) => ({ x: Math.floor(x), z: Math.floor(z) })
  };
  const grid = {
    isCellWalkable: ({ x, z }) => !(x === 1 && z === 3)
  };

  attachSceneGroundMovementInput(runtime, movementTargetState, gridMapper, grid);
  runtime.triggerPointerDown();

  assert.equal(movementTargetState.getTarget(), null);
  assert.equal(movementTargetState.getClearCount(), 1);
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


test('ignores right-click while orbiting camera controls are active', () => {
  const point = { x: 4, y: 0, z: 6, clone: () => ({ x: 4, y: 0, z: 6 }) };
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedMesh: { name: 'Ground', parent: null },
      pickedPoint: point
    }
  });
  runtime.inputState = { camera: { isOrbiting: true } };

  const movementTargetState = createMovementTargetState();

  attachSceneGroundMovementInput(runtime, movementTargetState);
  runtime.triggerPointerDown({ button: 2 });

  assert.equal(movementTargetState.getTarget(), null);
  assert.equal(movementTargetState.getClearCount(), 0);
});

test('ignores right-click ground picks even when camera is not orbiting', () => {
  const point = { x: 4, y: 0, z: 6, clone: () => ({ x: 4, y: 0, z: 6 }) };
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedMesh: { name: 'Ground', parent: null },
      pickedPoint: point
    }
  });

  const movementTargetState = createMovementTargetState();

  attachSceneGroundMovementInput(runtime, movementTargetState);
  runtime.triggerPointerDown({ button: 2 });

  assert.equal(movementTargetState.getTarget(), null);
  assert.equal(movementTargetState.getClearCount(), 0);
});
