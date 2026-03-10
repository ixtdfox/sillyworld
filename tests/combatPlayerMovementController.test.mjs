import test from 'node:test';
import assert from 'node:assert/strict';

import { attachCombatPlayerMovementController } from '../src/ui/rendering/combatPlayerMovementController.js';

class Vector3 {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  subtract(other) {
    return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  length() {
    return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
  }

  normalize() {
    const len = this.length() || 1;
    return new Vector3(this.x / len, this.y / len, this.z / len);
  }

  scale(value) {
    return new Vector3(this.x * value, this.y * value, this.z * value);
  }

  addInPlace(other) {
    this.x += other.x;
    this.y += other.y;
    this.z += other.z;
  }

  copyFrom(other) {
    this.x = other.x;
    this.y = other.y;
    this.z = other.z;
  }
}

function createObservable() {
  let observer = null;
  return {
    add: (cb) => {
      observer = cb;
      return cb;
    },
    remove: () => {
      observer = null;
    },
    emit: (payload = {}) => {
      observer?.(payload);
    }
  };
}

function createRuntime({ pickResult }) {
  const pointer = createObservable();
  const beforeRender = createObservable();

  return {
    BABYLON: {
      Vector3,
      PointerEventTypes: {
        POINTERDOWN: 1
      }
    },
    engine: {
      getDeltaTime: () => 1000
    },
    scene: {
      pointerX: 0,
      pointerY: 0,
      pick: () => pickResult,
      onPointerObservable: pointer,
      onBeforeRenderObservable: beforeRender
    },
    tick: () => beforeRender.emit(),
    click: () => pointer.emit({ type: 1 })
  };
}

test('does not start movement when path cost exceeds MP', () => {
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedPoint: { x: 3, y: 0, z: 0 },
      pickedMesh: { name: 'Ground', parent: null }
    }
  });

  const playerUnit = {
    id: 'player_1',
    mp: 1,
    rootNode: { position: new Vector3(0, 0, 0) },
    gridCell: { x: 0, z: 0 }
  };

  let moved = false;
  const detach = attachCombatPlayerMovementController(runtime, {
    combatState: {
      getActiveUnit: () => playerUnit
    },
    playerUnit,
    gridMapper: {
      worldToGridCell: () => ({ x: 2, z: 0 }),
      gridCellToWorld: () => ({ x: 2, y: 0, z: 0 })
    },
    grid: {
      findPath: () => [{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 2, z: 0 }],
      moveOccupant: () => {
        moved = true;
      }
    },
    resolveGroundY: () => 0
  });

  runtime.click();
  runtime.tick();

  assert.equal(playerUnit.mp, 1);
  assert.equal(playerUnit.gridCell.x, 0);
  assert.equal(moved, false);
  detach();
});

test('moves unit along path and spends MP', () => {
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedPoint: { x: 2, y: 0, z: 0 },
      pickedMesh: { name: 'Ground', parent: null }
    }
  });

  const playerUnit = {
    id: 'player_1',
    mp: 6,
    rootNode: { position: new Vector3(0, 0, 0) },
    gridCell: { x: 0, z: 0 }
  };

  let moved = false;
  const detach = attachCombatPlayerMovementController(runtime, {
    combatState: {
      getActiveUnit: () => playerUnit
    },
    playerUnit,
    gridMapper: {
      worldToGridCell: () => ({ x: 2, z: 0 }),
      gridCellToWorld: (cell) => ({ x: cell.x, y: 0, z: cell.z })
    },
    grid: {
      findPath: () => [{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 2, z: 0 }],
      moveOccupant: (_fromCell, toCell) => {
        moved = true;
        assert.deepEqual(toCell, { x: 2, z: 0 });
      }
    },
    resolveGroundY: () => 0
  });

  runtime.click();
  for (let i = 0; i < 6; i += 1) {
    runtime.tick();
  }

  assert.equal(moved, true);
  assert.equal(playerUnit.mp, 4);
  assert.deepEqual(playerUnit.gridCell, { x: 2, z: 0 });
  detach();
});
