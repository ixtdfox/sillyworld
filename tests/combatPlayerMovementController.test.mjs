import test from 'node:test';
import assert from 'node:assert/strict';

import { attachCombatPlayerMovementController } from '../src/world/player/combatPlayerMovementController.ts';
import { Cell } from '../src/world/spatial/cell/Cell.ts';

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
        POINTERDOWN: 1,
        POINTERUP: 2
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
    click: (payload = {}) => pointer.emit({ type: 1, event: { button: 0 }, ...payload }),
    pointerUp: (payload = {}) => pointer.emit({ type: 2, ...payload })
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
    isAlive: true,
    mp: 1,
    rootNode: { position: new Vector3(0, 0, 0) },
    gridCell: new Cell(0, 0)
  };

  let moved = false;
  const detach = attachCombatPlayerMovementController(runtime, {
    combatState: {
      status: 'active',
      getActiveUnit: () => playerUnit
    },
    playerUnit,
    gridMapper: {
      worldToGridCell: () => new Cell(2, 0),
      gridCellToWorld: () => ({ x: 2, y: 0, z: 0 })
    },
    grid: {
      findPath: () => [new Cell(0, 0), new Cell(1, 0), new Cell(2, 0)],
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
    isAlive: true,
    mp: 6,
    rootNode: { position: new Vector3(0, 0, 0) },
    gridCell: new Cell(0, 0)
  };

  let moved = false;
  const detach = attachCombatPlayerMovementController(runtime, {
    combatState: {
      status: 'active',
      getActiveUnit: () => playerUnit
    },
    playerUnit,
    gridMapper: {
      worldToGridCell: () => new Cell(2, 0),
      gridCellToWorld: (cell) => ({ x: cell.x, y: 0, z: cell.z })
    },
    grid: {
      findPath: () => [new Cell(0, 0), new Cell(1, 0), new Cell(2, 0)],
      moveOccupant: (_fromCell, toCell) => {
        moved = true;
        assert.deepEqual(toCell, new Cell(2, 0));
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
  assert.deepEqual(playerUnit.gridCell, new Cell(2, 0));
  detach();
});


test('ignores unreachable tile selections returned by authoritative movement check', () => {
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedPoint: { x: 5, y: 0, z: 0 },
      pickedMesh: { name: 'Ground', parent: null }
    }
  });

  const playerUnit = {
    id: 'player_1',
    isAlive: true,
    mp: 4,
    rootNode: { position: new Vector3(0, 0, 0) },
    gridCell: new Cell(0, 0)
  };

  let completeCalled = false;
  const detach = attachCombatPlayerMovementController(runtime, {
    combatState: {
      status: 'active',
      getActiveUnit: () => playerUnit,
      tryMoveActiveUnit: () => ({ success: false, reason: 'unreachable' }),
      completeUnitMovement: () => {
        completeCalled = true;
      }
    },
    playerUnit,
    gridMapper: {
      worldToGridCell: () => new Cell(5, 0),
      gridCellToWorld: () => ({ x: 5, y: 0, z: 0 })
    },
    grid: {
      findPath: () => [new Cell(0, 0), new Cell(5, 0)],
      moveOccupant: () => {
        completeCalled = true;
      }
    },
    resolveGroundY: () => 0
  });

  runtime.click();
  runtime.tick();

  assert.equal(playerUnit.mp, 4);
  assert.deepEqual(playerUnit.gridCell, new Cell(0, 0));
  assert.equal(completeCalled, false);
  detach();
});

test('uses authoritative movement completion when available', () => {
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedPoint: { x: 2, y: 0, z: 0 },
      pickedMesh: { name: 'Ground', parent: null }
    }
  });

  const playerUnit = {
    id: 'player_1',
    isAlive: true,
    mp: 3,
    rootNode: { position: new Vector3(0, 0, 0) },
    gridCell: new Cell(0, 0)
  };

  const moveCalls = [];
  const detach = attachCombatPlayerMovementController(runtime, {
    combatState: {
      status: 'active',
      getActiveUnit: () => playerUnit,
      tryMoveActiveUnit: () => ({
        success: true,
        path: [new Cell(0, 0), new Cell(1, 0), new Cell(2, 0)],
        pathCost: 3,
        destinationCell: new Cell(2, 0)
      }),
      completeUnitMovement: ({ unitId, destinationCell, pathCost }) => {
        moveCalls.push({ unitId, destinationCell, pathCost });
        playerUnit.gridCell = destinationCell;
        playerUnit.mp = Math.max(0, playerUnit.mp - pathCost);
      }
    },
    playerUnit,
    gridMapper: {
      worldToGridCell: () => new Cell(2, 0),
      gridCellToWorld: (cell) => ({ x: cell.x, y: 0, z: cell.z })
    },
    grid: {
      findPath: () => {
        throw new Error('fallback pathfinding should not be called');
      },
      moveOccupant: () => {
        throw new Error('grid updates should be handled by combat state');
      }
    },
    resolveGroundY: () => 0
  });

  runtime.click();
  for (let i = 0; i < 6; i += 1) {
    runtime.tick();
  }

  assert.equal(moveCalls.length, 1);
  assert.deepEqual(moveCalls[0], {
    unitId: 'player_1',
    destinationCell: new Cell(2, 0),
    pathCost: 3
  });
  assert.equal(playerUnit.mp, 0);
  assert.deepEqual(playerUnit.gridCell, new Cell(2, 0));

  runtime.click();
  runtime.tick();
  assert.equal(moveCalls.length, 1);
  detach();
});


test('resolves destination cell from highlighted mesh names', () => {
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedPoint: { x: 99, y: 0, z: 99 },
      pickedMesh: { name: 'combatMoveHighlight_2_1', parent: null }
    }
  });

  const playerUnit = {
    id: 'player_1',
    isAlive: true,
    mp: 6,
    rootNode: { position: new Vector3(0, 0, 0) },
    gridCell: new Cell(0, 0)
  };

  let finalMove = null;
  const detach = attachCombatPlayerMovementController(runtime, {
    combatState: {
      status: 'active',
      phase: 'turn_active',
      getActiveUnit: () => playerUnit,
      completeUnitMovement: ({ destinationCell, pathCost }) => {
        finalMove = { destinationCell, pathCost };
        playerUnit.gridCell = destinationCell;
        playerUnit.mp -= pathCost;
      }
    },
    playerUnit,
    gridMapper: {
      worldToGridCell: () => new Cell(-9, -9),
      gridCellToWorld: (cell) => ({ x: cell.x, y: 0, z: cell.z })
    },
    grid: {
      findPath: (_from, to) => [new Cell(0, 0), Cell.from(to)],
      calculatePathCost: () => 1,
      moveOccupant: () => {}
    },
    resolveGroundY: () => 0
  });

  runtime.click();
  runtime.tick();
  runtime.tick();

  assert.deepEqual(finalMove, {
    destinationCell: new Cell(2, 1),
    pathCost: 1
  });
  assert.deepEqual(playerUnit.gridCell, new Cell(2, 1));
  detach();
});

test('ignores movement clicks when combat phase is not turn_active', () => {
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedPoint: { x: 2, y: 0, z: 0 },
      pickedMesh: { name: 'Ground', parent: null }
    }
  });

  const playerUnit = {
    id: 'player_1',
    isAlive: true,
    mp: 6,
    rootNode: { position: new Vector3(0, 0, 0) },
    gridCell: new Cell(0, 0)
  };

  let attempted = false;
  const detach = attachCombatPlayerMovementController(runtime, {
    combatState: {
      status: 'active',
      phase: 'resolving',
      getActiveUnit: () => playerUnit,
      tryMoveActiveUnit: () => {
        attempted = true;
        return { success: true, path: [{ x: 0, z: 0 }, { x: 1, z: 0 }], pathCost: 1 };
      }
    },
    playerUnit,
    gridMapper: {
      worldToGridCell: () => ({ x: 1, z: 0 }),
      gridCellToWorld: (cell) => ({ x: cell.x, y: 0, z: cell.z })
    },
    grid: {
      findPath: () => [{ x: 0, z: 0 }, { x: 1, z: 0 }],
      moveOccupant: () => {
        attempted = true;
      }
    },
    resolveGroundY: () => 0
  });

  runtime.click();
  runtime.tick();

  assert.equal(attempted, false);
  assert.deepEqual(playerUnit.gridCell, new Cell(0, 0));
  assert.equal(playerUnit.mp, 6);
  detach();
});


test('does not queue movement when UI interaction guard is active', () => {
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedPoint: { x: 2, y: 0, z: 0 },
      pickedMesh: { name: 'Ground', parent: null }
    }
  });

  const playerUnit = {
    id: 'player_1',
    isAlive: true,
    mp: 6,
    rootNode: { position: new Vector3(0, 0, 0) },
    gridCell: new Cell(0, 0)
  };

  let attempted = false;
  const combatState = {
    status: 'active',
    phase: 'turn_active',
    uiPointerGuardReason: 'combat_hud_button',
    getActiveUnit: () => playerUnit,
    consumeUiPointerGuard: () => true,
    tryMoveActiveUnit: () => {
      attempted = true;
      return { success: true, path: [{ x: 0, z: 0 }, { x: 1, z: 0 }], pathCost: 1, destinationCell: { x: 1, z: 0 } };
    }
  };

  const detach = attachCombatPlayerMovementController(runtime, {
    combatState,
    playerUnit,
    gridMapper: {
      worldToGridCell: () => ({ x: 1, z: 0 }),
      gridCellToWorld: (cell) => ({ x: cell.x, y: 0, z: cell.z })
    },
    grid: {
      findPath: () => [{ x: 0, z: 0 }, { x: 1, z: 0 }],
      moveOccupant: () => {}
    },
    resolveGroundY: () => 0
  });

  runtime.click();
  runtime.tick();

  assert.equal(attempted, false);
  assert.deepEqual(playerUnit.gridCell, new Cell(0, 0));
  assert.equal(playerUnit.mp, 6);
  detach();
});

test('clears queued movement when movement reset version changes', () => {
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedPoint: { x: 2, y: 0, z: 0 },
      pickedMesh: { name: 'Ground', parent: null }
    }
  });

  const playerUnit = {
    id: 'player_1',
    isAlive: true,
    mp: 6,
    rootNode: { position: new Vector3(0, 0, 0) },
    gridCell: new Cell(0, 0)
  };

  const combatState = {
    status: 'active',
    phase: 'turn_active',
    pendingMovementInputResetVersion: 0,
    getActiveUnit: () => playerUnit,
    tryMoveActiveUnit: () => ({
      success: true,
      path: [new Cell(0, 0), new Cell(1, 0), new Cell(2, 0)],
      pathCost: 2,
      destinationCell: new Cell(2, 0)
    }),
    completeUnitMovement: () => {
      playerUnit.gridCell = { x: 2, z: 0 };
      playerUnit.mp = 4;
    }
  };

  const detach = attachCombatPlayerMovementController(runtime, {
    combatState,
    playerUnit,
    gridMapper: {
      worldToGridCell: () => new Cell(2, 0),
      gridCellToWorld: (cell) => ({ x: cell.x, y: 0, z: cell.z })
    },
    grid: {
      findPath: () => [new Cell(0, 0), new Cell(1, 0), new Cell(2, 0)],
      moveOccupant: () => {}
    },
    resolveGroundY: () => 0
  });

  runtime.click();
  combatState.pendingMovementInputResetVersion = 1;
  runtime.tick();
  runtime.tick();

  assert.deepEqual(playerUnit.gridCell, new Cell(0, 0));
  assert.equal(playerUnit.mp, 6);
  detach();
});


test('ignores right-click pointer input for movement selection', () => {
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedPoint: { x: 2, y: 0, z: 0 },
      pickedMesh: { name: 'Ground', parent: null }
    }
  });

  const playerUnit = {
    id: 'player_1',
    isAlive: true,
    mp: 6,
    rootNode: { position: new Vector3(0, 0, 0) },
    gridCell: new Cell(0, 0)
  };

  let moved = false;
  const detach = attachCombatPlayerMovementController(runtime, {
    combatState: {
      status: 'active',
      getActiveUnit: () => playerUnit
    },
    playerUnit,
    gridMapper: {
      worldToGridCell: () => new Cell(2, 0),
      gridCellToWorld: (cell) => ({ x: cell.x, y: 0, z: cell.z })
    },
    grid: {
      findPath: () => [new Cell(0, 0), new Cell(1, 0), new Cell(2, 0)],
      moveOccupant: () => {
        moved = true;
      }
    },
    resolveGroundY: () => 0
  });

  runtime.click({ event: { button: 2 } });
  runtime.tick();

  assert.equal(moved, false);
  assert.equal(playerUnit.mp, 6);
  assert.deepEqual(playerUnit.gridCell, new Cell(0, 0));
  detach();
});

test('ignores left-click movement selection while camera orbit drag is active', () => {
  const runtime = createRuntime({
    pickResult: {
      hit: true,
      pickedPoint: { x: 2, y: 0, z: 0 },
      pickedMesh: { name: 'Ground', parent: null }
    }
  });
  runtime.inputState = { camera: { isOrbiting: true } };

  const playerUnit = {
    id: 'player_1',
    isAlive: true,
    mp: 6,
    rootNode: { position: new Vector3(0, 0, 0) },
    gridCell: new Cell(0, 0)
  };

  let moved = false;
  const detach = attachCombatPlayerMovementController(runtime, {
    combatState: {
      status: 'active',
      getActiveUnit: () => playerUnit
    },
    playerUnit,
    gridMapper: {
      worldToGridCell: () => new Cell(2, 0),
      gridCellToWorld: (cell) => ({ x: cell.x, y: 0, z: cell.z })
    },
    grid: {
      findPath: () => [new Cell(0, 0), new Cell(1, 0), new Cell(2, 0)],
      moveOccupant: () => {
        moved = true;
      }
    },
    resolveGroundY: () => 0
  });

  runtime.click({ event: { button: 0 } });
  runtime.tick();

  assert.equal(moved, false);
  assert.equal(playerUnit.mp, 6);
  assert.deepEqual(playerUnit.gridCell, new Cell(0, 0));
  detach();
});
