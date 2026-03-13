import test from 'node:test';
import assert from 'node:assert/strict';
import {
  attachSceneEncounterInteractionInput,
  ENCOUNTER_INTERACTION_DISTANCE
} from '../src/ui/rendering/scene/sceneEncounterInteractionInput.ts';

function createRuntime({ pickResult }) {
  let observer = null;

  return {
    BABYLON: {
      PointerEventTypes: {
        POINTERDOWN: 1
      },
      Vector3: {
        Distance: (a, b) => {
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dz = a.z - b.z;
          return Math.hypot(dx, dy, dz);
        }
      }
    },
    scene: {
      pointerX: 100,
      pointerY: 100,
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
      const pointerInfo = { type: 1, skipOnPointerObservable: false };
      observer?.(pointerInfo);
      return pointerInfo;
    }
  };
}

function createNode(name, position, parent = null) {
  return { name, position, parent };
}

test('starts encounter when clicking enemy within interaction distance', () => {
  const enemyRoot = createNode('enemyRoot', { x: 2, y: 0, z: 0 });
  const enemyChild = createNode('enemyMesh', { x: 2, y: 0, z: 0 }, enemyRoot);
  const playerRoot = createNode('playerRoot', { x: 0, y: 0, z: 0 });
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedMesh: enemyChild
    }
  });

  let encounterCount = 0;
  attachSceneEncounterInteractionInput(runtime, {
    playerRoot,
    enemyRoot,
    onEncounterStart: () => {
      encounterCount += 1;
    }
  });

  const pointerInfo = runtime.triggerPointerDown();

  assert.equal(pointerInfo.skipOnPointerObservable, true);
  assert.equal(encounterCount, 1);
});

test('does not start encounter when player is out of range', () => {
  const enemyRoot = createNode('enemyRoot', { x: 50, y: 0, z: 0 });
  const playerRoot = createNode('playerRoot', { x: 0, y: 0, z: 0 });
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedMesh: enemyRoot
    }
  });

  let encounterCount = 0;
  attachSceneEncounterInteractionInput(runtime, {
    playerRoot,
    enemyRoot,
    onEncounterStart: () => {
      encounterCount += 1;
    }
  });

  const pointerInfo = runtime.triggerPointerDown();

  assert.equal(pointerInfo.skipOnPointerObservable, true);
  assert.equal(encounterCount, 0);
});

test('prevents double encounter start when enemy is clicked repeatedly', () => {
  const enemyRoot = createNode('enemyRoot', { x: 1, y: 0, z: 0 });
  const playerRoot = createNode('playerRoot', { x: 0, y: 0, z: 0 });
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedMesh: enemyRoot
    }
  });

  let encounterCount = 0;
  attachSceneEncounterInteractionInput(runtime, {
    playerRoot,
    enemyRoot,
    interactionDistance: ENCOUNTER_INTERACTION_DISTANCE,
    onEncounterStart: () => {
      encounterCount += 1;
    }
  });

  runtime.triggerPointerDown();
  runtime.triggerPointerDown();

  assert.equal(encounterCount, 1);
});
