import test from 'node:test';
import assert from 'node:assert/strict';

import { createCombatMovementRangeHighlighter } from '../src/ui/rendering/combatMovementRangeHighlighter.ts';

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
    emit: () => observer?.()
  };
}

class FakeMesh {
  constructor(name) {
    this.name = name;
    this.position = { x: 0, y: 0, z: 0 };
    this.metadata = {};
    this.rotation = { x: 0, y: 0, z: 0 };
  }

  dispose() {
    this.disposed = true;
  }
}

function createRuntime({ pick }) {
  const beforeRender = createObservable();

  const colorFactory = {
    FromHexString: () => ({
      toLinearSpace: () => ({ scale: () => ({ r: 50, g: 100, b: 150 }) }),
      scale: () => ({})
    }),
    Black: () => ({})
  };

  class DynamicTexture {
    constructor() {
      this.context = {
        clearRect: () => {},
        fillRect: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} }),
        strokeRect: () => {}
      };
    }

    getContext() {
      return this.context;
    }

    update() {}
    dispose() {}
  }

  class StandardMaterial {
    dispose() {}
  }

  return {
    BABYLON: {
      Color3: colorFactory,
      DynamicTexture,
      StandardMaterial,
      MeshBuilder: {
        CreateGround: (name) => new FakeMesh(name)
      }
    },
    scene: {
      pointerX: 0,
      pointerY: 0,
      pick,
      onBeforeRenderObservable: beforeRender
    },
    tick: () => beforeRender.emit()
  };
}

test('updates and clears hovered movement destination during move mode', () => {
  let hoverPick = {
    hit: true,
    pickedPoint: { x: 1, y: 0, z: 0 },
    pickedMesh: { name: 'ground' }
  };

  const runtime = createRuntime({ pick: () => hoverPick });

  const combatState = {
    status: 'active',
    phase: 'turn_active',
    inputMode: 'move',
    combatScene: { sceneContainer: null },
    getActiveUnit: () => playerUnit,
    gridMapper: {
      cellSize: 1,
      originWorldX: 0,
      originWorldZ: 0,
      worldToGridCell: () => ({ x: 1, z: 0 }),
      gridCellToWorld: (cell) => ({ x: cell.x, y: 0, z: cell.z })
    }
  };

  const playerUnit = {
    id: 'player_1',
    isAlive: true,
    mp: 3,
    gridCell: { x: 0, z: 0 }
  };

  const grid = {
    bounds: { minX: -2, maxX: 2, minZ: -2, maxZ: 2 },
    toCellKey: (cell) => `${cell.x},${cell.z}`,
    getReachableCells: () => [{ x: 0, z: 0 }, { x: 1, z: 0 }],
    getOccupancyRevision: () => 0,
    isWithinBounds: () => true,
    findPath: (_from, to) => [{ x: 0, z: 0 }, { x: to.x, z: to.z }]
  };

  const highlighter = createCombatMovementRangeHighlighter(runtime, {
    combatState,
    playerUnit,
    grid,
    isVisible: () => combatState.inputMode === 'move'
  });

  runtime.tick();
  assert.deepEqual(combatState.hoveredMovementDestination, {
    cell: { x: 1, z: 0 },
    isReachable: true
  });
  assert.deepEqual(combatState.hoveredMovementPath, [{ x: 0, z: 0 }, { x: 1, z: 0 }]);

  combatState.playerMovementInProgress = true;
  runtime.tick();
  assert.equal(combatState.hoveredMovementDestination, null);
  assert.equal(combatState.hoveredMovementPath, null);

  highlighter.dispose();
});
