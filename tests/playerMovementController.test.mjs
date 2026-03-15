import test from 'node:test';
import assert from 'node:assert/strict';

import { Character, CharacterRelations, PlayerController } from '../src/world/character/index.ts';
import { CharacterMovementOrchestrator } from '../src/world/movement/characterMovementOrchestrator.ts';

function createVector3Class() {
  return class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }

    subtract(other) {
      return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
    }

    length() {
      return Math.hypot(this.x, this.y, this.z);
    }

    normalize() {
      const len = this.length() || 1;
      return new Vector3(this.x / len, this.y / len, this.z / len);
    }

    scale(multiplier) {
      return new Vector3(this.x * multiplier, this.y * multiplier, this.z * multiplier);
    }

    addInPlace(other) {
      this.x += other.x;
      this.y += other.y;
      this.z += other.z;
      return this;
    }

    copyFrom(other) {
      this.x = other.x;
      this.y = other.y;
      this.z = other.z;
    }
  };
}

function createRuntime() {
  let beforeRender = null;

  return {
    BABYLON: { Vector3: createVector3Class() },
    engine: {
      getDeltaTime: () => 250
    },
    scene: {
      onBeforeRenderObservable: {
        add: (callback) => {
          beforeRender = callback;
          return callback;
        },
        remove: () => {
          beforeRender = null;
        }
      }
    },
    renderFrames: (count = 1) => {
      for (let index = 0; index < count; index += 1) {
        beforeRender?.();
      }
    }
  };
}

function createMovementTargetState(initialTarget = null) {
  let target = initialTarget;

  return {
    hasTarget: () => Boolean(target),
    getTarget: () => target,
    clearTarget: () => {
      target = null;
    }
  };
}

function createExplorationMovement({ runtime, player, movementTargetState, gridMapper, grid, onMovingStateChange = () => {} }) {
  const character = new Character({
    identity: { id: 'scene:player', name: 'Player', kind: 'player' },
    controller: new PlayerController(() => (movementTargetState.hasTarget() ? movementTargetState.getTarget() : null)),
    relations: new CharacterRelations('scene:player'),
    runtimeState: {
      cell: player.gridCell ?? null,
      currentNodeId: null,
      homeNodeId: null,
      hpCurrent: 1
    }
  });

  return new CharacterMovementOrchestrator(runtime, {
    character,
    rootNode: player.rootNode,
    moveSpeed: 4,
    gridMapper,
    grid,
    resolveGroundY: ({ fallbackY = 0 }) => fallbackY,
    BABYLON: runtime.BABYLON,
    onMovingStateChange,
    onMovementRejected: (queueResult) => {
      if (queueResult.reason === 'same_cell' || queueResult.reason === 'path_not_found' || queueResult.reason === 'invalid_cells') {
        movementTargetState.clearTarget();
      }
    },
    onDestinationReached: () => movementTargetState.clearTarget(),
    onCellUpdated: (cell) => {
      player.gridCell = cell;
    }
  });
}

test('exploration movement follows grid path and clears target after reaching destination', () => {
  const runtime = createRuntime();
  const Vector3 = runtime.BABYLON.Vector3;
  const player = {
    rootNode: { position: new Vector3(0.5, 0, 0.5) },
    gridCell: { x: 0, z: 0 }
  };

  const movementTargetState = createMovementTargetState({ x: 2, z: 0 });
  const movingStates = [];
  const gridMapper = {
    worldToGridCell: ({ x, z }) => ({ x: Math.floor(x), z: Math.floor(z) }),
    gridCellToWorld: ({ x, z }, transform = {}) => ({
      x: x + 0.5,
      y: typeof transform.resolveY === 'function' ? transform.resolveY({ x: x + 0.5, z: z + 0.5 }) : 0,
      z: z + 0.5
    })
  };

  const orchestrator = createExplorationMovement({
    runtime,
    player,
    movementTargetState,
    gridMapper,
    grid: {
      findPath: () => [{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 2, z: 0 }],
      isCellWalkable: () => true
    },
    onMovingStateChange: (isMoving) => movingStates.push(isMoving)
  });

  orchestrator.attach();
  runtime.renderFrames(8);

  assert.equal(movementTargetState.hasTarget(), false);
  assert.deepEqual(player.gridCell, { x: 2, z: 0 });
  assert.equal(player.rootNode.position.x, 2.5);
  assert.equal(player.rootNode.position.z, 0.5);
  assert.deepEqual(movingStates, [true, false]);
});

test('exploration movement rejects unreachable destination and clears target', () => {
  const runtime = createRuntime();
  const Vector3 = runtime.BABYLON.Vector3;
  const player = {
    rootNode: { position: new Vector3(0.5, 0, 0.5) },
    gridCell: { x: 0, z: 0 }
  };

  const movementTargetState = createMovementTargetState({ x: 3, z: 0 });
  const gridMapper = {
    worldToGridCell: ({ x, z }) => ({ x: Math.floor(x), z: Math.floor(z) }),
    gridCellToWorld: ({ x, z }) => ({ x: x + 0.5, y: 0, z: z + 0.5 })
  };

  const orchestrator = createExplorationMovement({
    runtime,
    player,
    movementTargetState,
    gridMapper,
    grid: {
      findPath: () => null,
      isCellWalkable: () => true
    }
  });

  orchestrator.attach();
  runtime.renderFrames(1);

  assert.equal(movementTargetState.hasTarget(), false);
  assert.equal(player.gridCell.x, 0);
  assert.equal(player.gridCell.z, 0);
});
