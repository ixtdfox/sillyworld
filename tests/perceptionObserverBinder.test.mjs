import test from 'node:test';
import assert from 'node:assert/strict';

import { createPerceptionObserverBinder } from '../src/scene/perceptionObserverBinder.ts';

function createRuntime() {
  const observers = new Map();
  let nextId = 1;
  return {
    observers,
    runtime: {
      BABYLON: {
        Vector3: class Vector3 {
          constructor(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
          }
        }
      },
      engine: { getDeltaTime: () => 16 },
      scene: {
        onBeforeRenderObservable: {
          add(callback) {
            const id = nextId++;
            observers.set(id, callback);
            return id;
          },
          remove(id) {
            observers.delete(id);
          }
        }
      }
    }
  };
}

function tickFirstObserver(observers) {
  const iterator = observers.values();
  const callback = iterator.next().value;
  callback?.();
}

function createNodePosition(x, y, z) {
  return {
    x,
    y,
    z,
    copyFrom(next) {
      this.x = next.x;
      this.y = next.y;
      this.z = next.z;
    }
  };
}

test('perception observer triggers combat when perceived character is hostile', () => {
  const { runtime, observers } = createRuntime();
  const triggered = [];
  const updated = [];
  const explorationRuntime = {
    enemyMeshRoot: { position: createNodePosition(0, 0, 0) },
    playerMeshRoot: { position: createNodePosition(0, 0, 1) },
    worldGridMapper: {
      cellSize: 1,
      worldToGridCell: ({ x, z }) => ({ x: Math.floor(x), z: Math.floor(z) }),
      gridCellToWorld: ({ x, z }) => ({ x: x + 0.5, y: 0, z: z + 0.5 })
    },
    enemyPerception: {
      visionAngleDegrees: 120,
      visionDistance: 5,
      facingDirection: { x: 0, y: 0, z: 1 }
    },
    enemyAmbientBehavior: null
  };

  const binder = createPerceptionObserverBinder(runtime, {
    getExplorationRuntime: () => explorationRuntime,
    canRun: () => true,
    isCooldownActive: () => false,
    hasLineOfSight: () => true,
    onPerceptionUpdated: (payload) => updated.push(payload),
    onCombatTriggered: (payload) => triggered.push(payload)
  });

  binder.attach();
  tickFirstObserver(observers);

  assert.equal(updated.length, 1);
  assert.equal(updated[0].canSeePlayer, true);
  assert.equal(triggered.length, 1);
  assert.equal(Number.isFinite(triggered[0].distanceToEnemy), true);
});

test('perception observer does not trigger combat when perceived character is not hostile', () => {
  const { runtime, observers } = createRuntime();
  const triggered = [];
  const explorationRuntime = {
    enemyMeshRoot: { position: createNodePosition(0, 0, 0) },
    playerMeshRoot: { position: createNodePosition(0, 0, 1) },
    worldGridMapper: {
      cellSize: 1,
      worldToGridCell: ({ x, z }) => ({ x: Math.floor(x), z: Math.floor(z) }),
      gridCellToWorld: ({ x, z }) => ({ x: x + 0.5, y: 0, z: z + 0.5 })
    },
    enemyPerception: {
      visionAngleDegrees: 120,
      visionDistance: 5,
      facingDirection: { x: 0, y: 0, z: 1 }
    },
    enemyAmbientBehavior: null
  };

  const binder = createPerceptionObserverBinder(runtime, {
    getExplorationRuntime: () => explorationRuntime,
    canRun: () => true,
    isCooldownActive: () => false,
    hasLineOfSight: () => true,
    onPerceptionUpdated: () => {},
    onCombatTriggered: (payload) => triggered.push(payload),
    isHostileCharacter: () => false
  });

  binder.attach();
  tickFirstObserver(observers);

  assert.equal(triggered.length, 0);
});
